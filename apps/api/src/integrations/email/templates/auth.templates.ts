import { emailLayout, button } from './layout';

export function verificationEmail(params: { name: string; verifyUrl: string }) {
  return {
    subject: 'Verify your email — Sai Yadadri Seva Ashram Admin',
    html: emailLayout({
      title: 'Verify your email',
      bodyHtml: `
        <p style="font-size:16px; color:#1A1D1A;">Hi ${params.name},</p>
        <p style="font-size:14px; color:#1A1D1A; line-height:1.6;">
          An admin account has been created for you on the Sai Yadadri Seva Ashram platform.
          Please verify your email address to activate it.
        </p>
        ${button(params.verifyUrl, 'Verify Email')}
        <p style="font-size:12px; color:#6B7269; margin-top:24px;">
          After verifying, use "Forgot Password" on the login page to set your password.
          This link expires soon — if it has expired, ask an administrator to resend it.
        </p>
        <p style="font-size:12px; color:#6B7269;">If you did not expect this email, you can ignore it.</p>
      `,
    }),
    text: `Hi ${params.name}, verify your email for the Sai Yadadri Seva Ashram admin platform: ${params.verifyUrl}`,
  };
}

export function passwordResetEmail(params: { name: string; resetUrl: string }) {
  return {
    subject: 'Reset your password — Sai Yadadri Seva Ashram Admin',
    html: emailLayout({
      title: 'Reset your password',
      bodyHtml: `
        <p style="font-size:16px; color:#1A1D1A;">Hi ${params.name},</p>
        <p style="font-size:14px; color:#1A1D1A; line-height:1.6;">
          We received a request to reset your password. Click below to choose a new one.
        </p>
        ${button(params.resetUrl, 'Reset Password')}
        <p style="font-size:12px; color:#6B7269; margin-top:24px;">
          This link expires soon. If you didn't request this, you can safely ignore this email —
          your password will not be changed.
        </p>
      `,
    }),
    text: `Reset your password for the Sai Yadadri Seva Ashram admin platform: ${params.resetUrl}`,
  };
}

export function passwordChangedNotice(params: { name: string }) {
  return {
    subject: 'Your password was changed — Sai Yadadri Seva Ashram Admin',
    html: emailLayout({
      title: 'Password changed',
      bodyHtml: `
        <p style="font-size:16px; color:#1A1D1A;">Hi ${params.name},</p>
        <p style="font-size:14px; color:#1A1D1A; line-height:1.6;">
          This is a confirmation that your admin account password was just changed.
          If this wasn't you, contact a Super Admin immediately.
        </p>
      `,
    }),
    text: `Your Sai Yadadri Seva Ashram admin password was just changed. If this wasn't you, contact a Super Admin immediately.`,
  };
}

export function accountLockedNotice(params: { name: string; unlocksAt: Date }) {
  return {
    subject: 'Account temporarily locked — Sai Yadadri Seva Ashram Admin',
    html: emailLayout({
      title: 'Account locked',
      bodyHtml: `
        <p style="font-size:16px; color:#1A1D1A;">Hi ${params.name},</p>
        <p style="font-size:14px; color:#1A1D1A; line-height:1.6;">
          Your account was temporarily locked after too many failed login attempts.
          It will unlock automatically at ${params.unlocksAt.toISOString()}, or you can reset your
          password to unlock it immediately.
        </p>
      `,
    }),
    text: `Your account was locked after too many failed login attempts. It unlocks at ${params.unlocksAt.toISOString()}.`,
  };
}
