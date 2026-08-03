import { emailLayout } from './layout';

export function volunteerConfirmationEmail(params: {
  name: string;
  type: 'volunteer' | 'internship';
}) {
  const kind = params.type === 'internship' ? 'internship application' : 'volunteer registration';
  return {
    subject: `Thank you for your ${kind} — Sai Yadadri Seva Ashram`,
    html: emailLayout({
      title: 'Thank you',
      bodyHtml: `
        <p style="font-size:16px; color:#1A1D1A;">Hi ${params.name},</p>
        <p style="font-size:14px; color:#1A1D1A; line-height:1.6;">
          Thank you for your ${kind}. Our Volunteer Coordinator has been notified and will be in
          touch soon.
        </p>
      `,
    }),
    text: `Hi ${params.name}, thank you for your ${kind}. Our Volunteer Coordinator will be in touch soon.`,
  };
}

export function volunteerStatusUpdateEmail(params: {
  name: string;
  status: 'accepted' | 'not_selected' | 'under_review';
}) {
  const statusMessage: Record<typeof params.status, string> = {
    accepted:
      'Great news — your application has been accepted! We will contact you shortly with next steps.',
    not_selected:
      'Thank you for your interest. We are unable to move forward with your application at this time, but we encourage you to apply again in the future.',
    under_review: 'Your application is now under review. We will follow up soon.',
  };

  return {
    subject: 'Update on your application — Sai Yadadri Seva Ashram',
    html: emailLayout({
      title: 'Application update',
      bodyHtml: `
        <p style="font-size:16px; color:#1A1D1A;">Hi ${params.name},</p>
        <p style="font-size:14px; color:#1A1D1A; line-height:1.6;">${statusMessage[params.status]}</p>
      `,
    }),
    text: `Hi ${params.name}, ${statusMessage[params.status]}`,
  };
}
