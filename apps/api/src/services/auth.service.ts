import msImpl from 'ms';

import { comparePassword, hashPassword } from '@lib/password';
import { signAccessToken } from '@lib/jwt';
import { generateOpaqueToken, hashToken } from '@lib/tokens';
import { writeAuditLog } from '@lib/audit-log';
import { sendMail } from '@integrations/email/mailer';
import {
  verificationEmail,
  passwordResetEmail,
  passwordChangedNotice,
  accountLockedNotice,
} from '@integrations/email/templates/auth.templates';
import { env } from '@config/env';
import { ApiError } from '@utils/api-error';

import * as adminUserRepo from '@repositories/admin-user.repository';
import * as sessionRepo from '@repositories/session.repository';
import * as passwordResetRepo from '@repositories/password-reset-token.repository';
import * as emailVerificationRepo from '@repositories/email-verification-token.repository';

interface RequestContext {
  userAgent?: string;
  ipAddress?: string;
}

interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    emailVerified: boolean;
  };
}

/** Parses a duration string like "15m" or "7d" into milliseconds. */
function ms(value: string): number {
  return msImpl(value as Parameters<typeof msImpl>[0]) as number;
}

function refreshExpiry(): Date {
  return new Date(Date.now() + ms(env.JWT_REFRESH_EXPIRES_IN));
}

async function issueSession(
  adminUserId: string,
  ctx: RequestContext,
): Promise<{ sessionId: string; refreshToken: string }> {
  const refreshToken = generateOpaqueToken();
  const session = await sessionRepo.create({
    adminUserId,
    refreshTokenHash: hashToken(refreshToken),
    userAgent: ctx.userAgent,
    ipAddress: ctx.ipAddress,
    expiresAt: refreshExpiry(),
  });
  return { sessionId: session.id, refreshToken };
}

export async function login(
  email: string,
  password: string,
  ctx: RequestContext,
): Promise<AuthResult> {
  const user = await adminUserRepo.findByEmail(email);

  // Constant-shaped error for "not found" and "wrong password" — never reveal
  // which one it was (prevents account enumeration).
  const invalidCredentials = () => ApiError.unauthorized('Invalid email or password');

  if (!user) {
    throw invalidCredentials();
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new ApiError(
      423,
      'ACCOUNT_LOCKED',
      `Account is locked until ${user.lockedUntil.toISOString()} due to too many failed login attempts.`,
    );
  }

  if (!user.active) {
    throw ApiError.forbidden('This account has been deactivated. Contact a Super Admin.');
  }

  const passwordMatches = await comparePassword(password, user.passwordHash);

  if (!passwordMatches) {
    const attempts = user.failedLoginAttempts + 1;
    const maxAttempts = env.ACCOUNT_LOCK_MAX_ATTEMPTS;
    const lockedUntil =
      attempts >= maxAttempts
        ? new Date(Date.now() + env.ACCOUNT_LOCK_DURATION_MINUTES * 60_000)
        : null;

    await adminUserRepo.recordFailedLogin(user.id, lockedUntil, attempts);
    await writeAuditLog({
      adminUserId: user.id,
      action: 'LOGIN_FAILED',
      entityType: 'admin_user',
      entityId: user.id,
      afterState: { failedLoginAttempts: attempts },
    });

    if (lockedUntil) {
      await writeAuditLog({
        adminUserId: user.id,
        action: 'ACCOUNT_LOCKED',
        entityType: 'admin_user',
        entityId: user.id,
        afterState: { lockedUntil },
      });
      const { subject, html, text } = accountLockedNotice({
        name: user.name,
        unlocksAt: lockedUntil,
      });
      void sendMail({ to: user.email, subject, html, text });
    }

    throw invalidCredentials();
  }

  if (!user.emailVerified) {
    throw ApiError.forbidden(
      'Please verify your email before logging in. Use "Resend verification email" if you need a new link.',
    );
  }

  const { sessionId, refreshToken } = await issueSession(user.id, ctx);
  const accessToken = signAccessToken({
    sub: user.id,
    sid: sessionId,
    role: user.role.name,
    type: 'admin',
  });

  await adminUserRepo.recordSuccessfulLogin(user.id, ctx.ipAddress);
  await writeAuditLog({
    adminUserId: user.id,
    action: 'LOGIN_SUCCESS',
    entityType: 'admin_user',
    entityId: user.id,
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      emailVerified: user.emailVerified,
    },
  };
}

export async function refresh(
  refreshTokenPlaintext: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const session = await sessionRepo.findByRefreshTokenHash(hashToken(refreshTokenPlaintext));

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw ApiError.unauthorized('Refresh token is invalid, revoked, or expired');
  }

  const user = await adminUserRepo.findById(session.adminUserId);
  if (!user || !user.active) {
    throw ApiError.unauthorized('Account is no longer active');
  }

  const newRefreshToken = generateOpaqueToken();
  await sessionRepo.rotate(session.id, hashToken(newRefreshToken), refreshExpiry());

  const accessToken = signAccessToken({
    sub: user.id,
    sid: session.id,
    role: user.role.name,
    type: 'admin',
  });

  await writeAuditLog({
    adminUserId: user.id,
    action: 'TOKEN_REFRESHED',
    entityType: 'session',
    entityId: session.id,
  });

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(adminUserId: string, sessionId: string): Promise<void> {
  await sessionRepo.revoke(sessionId);
  await writeAuditLog({
    adminUserId,
    action: 'LOGOUT',
    entityType: 'session',
    entityId: sessionId,
  });
}

export async function logoutAllDevices(adminUserId: string): Promise<void> {
  await sessionRepo.revokeAllForUser(adminUserId);
  await writeAuditLog({
    adminUserId,
    action: 'LOGOUT_ALL_DEVICES',
    entityType: 'admin_user',
    entityId: adminUserId,
  });
}

export async function listSessions(adminUserId: string, currentSessionId: string) {
  const sessions = await sessionRepo.findActiveByUser(adminUserId);
  return sessions.map((s) => ({
    id: s.id,
    userAgent: s.userAgent,
    ipAddress: s.ipAddress,
    createdAt: s.createdAt,
    lastUsedAt: s.lastUsedAt,
    expiresAt: s.expiresAt,
    current: s.id === currentSessionId,
  }));
}

export async function revokeSession(adminUserId: string, sessionId: string): Promise<void> {
  const session = await sessionRepo.findById(sessionId);
  if (!session || session.adminUserId !== adminUserId) {
    throw ApiError.notFound('Session not found');
  }
  await sessionRepo.revoke(sessionId);
  await writeAuditLog({
    adminUserId,
    action: 'LOGOUT',
    entityType: 'session',
    entityId: sessionId,
  });
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await adminUserRepo.findByEmail(email);

  // Always behave identically whether or not the account exists — prevents
  // user enumeration via response-timing/content differences.
  if (!user) return;

  await passwordResetRepo.invalidateAllForUser(user.id);

  const token = generateOpaqueToken();
  await passwordResetRepo.create({
    adminUserId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + env.PASSWORD_RESET_TOKEN_TTL_MINUTES * 60_000),
  });

  const resetUrl = `${env.WEB_URL}/reset-password/${token}`;
  const { subject, html, text } = passwordResetEmail({ name: user.name, resetUrl });
  await sendMail({ to: user.email, subject, html, text });

  await writeAuditLog({
    adminUserId: user.id,
    action: 'PASSWORD_RESET_REQUESTED',
    entityType: 'admin_user',
    entityId: user.id,
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const record = await passwordResetRepo.findValidByHash(hashToken(token));
  if (!record) {
    throw ApiError.badRequest('This password reset link is invalid or has expired.');
  }

  const passwordHash = await hashPassword(newPassword);
  await adminUserRepo.update(record.adminUserId, {
    passwordHash,
    passwordChangedAt: new Date(),
    failedLoginAttempts: 0,
    lockedUntil: null,
  });
  await passwordResetRepo.markUsed(record.id);
  await sessionRepo.revokeAllForUser(record.adminUserId);

  const user = await adminUserRepo.findById(record.adminUserId);
  if (user) {
    const { subject, html, text } = passwordChangedNotice({ name: user.name });
    void sendMail({ to: user.email, subject, html, text });
  }

  await writeAuditLog({
    adminUserId: record.adminUserId,
    action: 'PASSWORD_RESET_COMPLETED',
    entityType: 'admin_user',
    entityId: record.adminUserId,
  });
}

export async function changePassword(
  adminUserId: string,
  currentSessionId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await adminUserRepo.findById(adminUserId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const matches = await comparePassword(currentPassword, user.passwordHash);
  if (!matches) {
    throw ApiError.badRequest('Current password is incorrect.');
  }

  const passwordHash = await hashPassword(newPassword);
  await adminUserRepo.update(adminUserId, { passwordHash, passwordChangedAt: new Date() });

  // Force re-authentication on every OTHER device, but keep the current session
  // alive so the user isn't immediately logged out of the tab they just used.
  await sessionRepo.revokeAllForUserExcept(adminUserId, currentSessionId);

  const { subject, html, text } = passwordChangedNotice({ name: user.name });
  void sendMail({ to: user.email, subject, html, text });

  await writeAuditLog({
    adminUserId,
    action: 'PASSWORD_CHANGED',
    entityType: 'admin_user',
    entityId: adminUserId,
  });
}

export async function sendEmailVerification(adminUserId: string): Promise<void> {
  const user = await adminUserRepo.findById(adminUserId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  if (user.emailVerified) {
    throw ApiError.badRequest('Email is already verified.');
  }

  await emailVerificationRepo.invalidateAllForUser(user.id);

  const token = generateOpaqueToken();
  await emailVerificationRepo.create({
    adminUserId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS * 60 * 60_000),
  });

  const verifyUrl = `${env.WEB_URL}/verify-email/${token}`;
  const { subject, html, text } = verificationEmail({ name: user.name, verifyUrl });
  await sendMail({ to: user.email, subject, html, text });

  await writeAuditLog({
    adminUserId: user.id,
    action: 'EMAIL_VERIFICATION_REQUESTED',
    entityType: 'admin_user',
    entityId: user.id,
  });
}

/**
 * Public-facing resend, keyed by email rather than an authenticated session —
 * an unverified user can never log in (login requires `emailVerified`), so they
 * have no session to authenticate a resend request with. Silently no-ops for a
 * nonexistent or already-verified email, matching forgotPassword's
 * anti-enumeration behavior.
 */
export async function resendVerificationByEmail(email: string): Promise<void> {
  const user = await adminUserRepo.findByEmail(email);
  if (!user || user.emailVerified) return;
  await sendEmailVerification(user.id);
}

export async function verifyEmail(token: string): Promise<void> {
  const record = await emailVerificationRepo.findValidByHash(hashToken(token));
  if (!record) {
    throw ApiError.badRequest('This verification link is invalid or has expired.');
  }

  await adminUserRepo.update(record.adminUserId, {
    emailVerified: true,
    emailVerifiedAt: new Date(),
  });
  await emailVerificationRepo.markUsed(record.id);

  await writeAuditLog({
    adminUserId: record.adminUserId,
    action: 'EMAIL_VERIFIED',
    entityType: 'admin_user',
    entityId: record.adminUserId,
  });
}
