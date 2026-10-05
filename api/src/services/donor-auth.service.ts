import { randomInt } from 'node:crypto';

import { sendMail } from '@integrations/email/mailer';
import { donorOtpEmail } from '@integrations/email/templates/donor-auth.templates';
import { hashToken } from '@lib/tokens';
import { signDonorToken } from '@lib/donor-jwt';
import { writeAuditLog } from '@lib/audit-log';
import { logger } from '@lib/logger';
import { ApiError } from '@utils/api-error';

import * as donorRepo from '@repositories/donor.repository';
import * as donorOtpRepo from '@repositories/donor-otp.repository';

const OTP_TTL_MINUTES = 5;
const MAX_VERIFY_ATTEMPTS = 5;

function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/**
 * Lightweight, optional donor login — request step (design/13-API-Architecture.md
 * §4.2). Anti-enumeration: responds identically whether or not the email
 * belongs to a donor (same pattern as `auth.service.ts`'s forgot-password),
 * and only a donor who has actually donated before (has a `Donor` row) can
 * receive a code — there is no "sign up" here, only "prove you're this donor."
 */
export async function requestOtp(email: string): Promise<void> {
  const donor = await donorRepo.findByEmail(email);
  if (!donor) {
    logger.info(`Donor OTP requested for an email with no donation history: ${email}`);
    return;
  }

  await donorOtpRepo.invalidateAllForEmail(email);

  const otp = generateOtp();
  await donorOtpRepo.create({
    donorEmail: email,
    otpHash: hashToken(otp),
    expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000),
  });

  await sendMail({ to: email, ...donorOtpEmail({ otp }) });
  await writeAuditLog({ action: 'DONOR_OTP_REQUESTED', entityType: 'donor', entityId: donor.id });
}

export async function verifyOtp(email: string, otp: string): Promise<string> {
  const donor = await donorRepo.findByEmail(email);
  const record = donor ? await donorOtpRepo.findLatestValid(email) : null;

  if (!donor || !record) {
    throw ApiError.badRequest('Invalid or expired code.');
  }

  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    throw ApiError.tooManyRequests('Too many attempts. Please request a new code.');
  }

  if (record.otpHash !== hashToken(otp)) {
    await donorOtpRepo.incrementAttempts(record.id);
    throw ApiError.badRequest('Invalid or expired code.');
  }

  await donorOtpRepo.markUsed(record.id);
  await writeAuditLog({ action: 'DONOR_OTP_VERIFIED', entityType: 'donor', entityId: donor.id });

  return signDonorToken(donor.id);
}
