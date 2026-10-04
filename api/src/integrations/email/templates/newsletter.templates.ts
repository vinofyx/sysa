import { emailLayout } from './layout';

export function newsletterSubscriberConfirmationEmail() {
  return {
    subject: 'Thank You for Subscribing - Sai Yadadri Seva Ashram',
    html: emailLayout({
      title: 'Thank You for Subscribing',
      bodyHtml: `
        <p style="font-size:16px; color:#1A1D1A;">Dear Subscriber,</p>
        <p style="font-size:14px; color:#1A1D1A; line-height:1.6;">
          Thank you for subscribing to Sai Yadadri Seva Ashram updates.
        </p>
        <p style="font-size:14px; color:#1A1D1A; line-height:1.6;">
          You will receive updates about our programs, seva activities, events, community
          initiatives and important announcements.
        </p>
        <p style="font-size:14px; color:#1A1D1A; line-height:1.6;">
          With gratitude,<br>Sai Yadadri Seva Ashram<br>Peddakondur
        </p>
      `,
    }),
    text: [
      'Dear Subscriber,',
      '',
      'Thank you for subscribing to Sai Yadadri Seva Ashram updates.',
      '',
      'You will receive updates about our programs, seva activities, events, community initiatives and important announcements.',
      '',
      'With gratitude,',
      'Sai Yadadri Seva Ashram',
      'Peddakondur',
    ].join('\n'),
  };
}

export function newsletterAdminNotificationEmail(params: {
  subscriberEmail: string;
  subscribedAt: Date;
}) {
  const date = params.subscribedAt.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const time = params.subscribedAt.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    subject: 'New Newsletter Subscription - Sai Yadadri Seva Ashram',
    html: emailLayout({
      title: 'New Newsletter Subscription',
      bodyHtml: `
        <p style="font-size:14px; color:#1A1D1A; line-height:1.6;">
          A new visitor has subscribed to Sai Yadadri Seva Ashram updates.
        </p>
        <p style="font-size:14px; color:#1A1D1A; line-height:1.6;">
          Customer Email: <strong>${params.subscriberEmail}</strong><br>
          Subscription Date: ${date}<br>
          Subscription Time: ${time}
        </p>
      `,
    }),
    text: [
      'A new visitor has subscribed to Sai Yadadri Seva Ashram updates.',
      `Customer Email: ${params.subscriberEmail}`,
      `Subscription Date: ${date}`,
      `Subscription Time: ${time}`,
    ].join('\n'),
  };
}
