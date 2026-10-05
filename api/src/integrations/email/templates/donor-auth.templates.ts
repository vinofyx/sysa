import { emailLayout } from './layout';

export function donorOtpEmail(params: { otp: string }) {
  return {
    subject: 'Your donation history login code — Sai Yadadri Seva Ashram',
    html: emailLayout({
      title: 'Your login code',
      bodyHtml: `
        <p style="font-size:16px; color:#1A1D1A;">Hi,</p>
        <p style="font-size:14px; color:#1A1D1A; line-height:1.6;">
          Use this code to view your donation history. It expires in 5 minutes.
        </p>
        <p style="font-size:28px; font-weight:700; letter-spacing:6px; color:#1B6B3F; margin:20px 0;">${params.otp}</p>
        <p style="font-size:12px; color:#6B7269;">If you didn't request this, you can safely ignore this email.</p>
      `,
    }),
    text: `Your donation history login code is ${params.otp}. It expires in 5 minutes.`,
  };
}
