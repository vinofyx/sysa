import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { env } from '@config/env';
import { validate } from '@middleware/validate.middleware';
import { prisma } from '@lib/prisma';
import { logger } from '@lib/logger';
import { sendMail } from '@integrations/email/mailer';
import {
  newsletterAdminNotificationEmail,
  newsletterSubscriberConfirmationEmail,
} from '@integrations/email/templates/newsletter.templates';
import { submitContactFormSchema, subscribeNewsletterSchema } from '@validation/contact.schema';

export const contactRouter = Router();

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// Public — Contact Us form (design/05-Wireframes.md "Contact Us").
contactRouter.post(
  '/',
  submitLimiter,
  validate({ body: submitContactFormSchema }),
  async (req, res, next) => {
    try {
      const submission = await prisma.contactSubmission.create({ data: req.body });
      res.status(201).json({
        data: submission,
        message: "Thank you for reaching out — we'll get back to you soon.",
      });
    } catch (error) {
      next(error);
    }
  },
);

// Public — homepage/footer newsletter signup. Idempotent by email (re-subscribing
// after a prior unsubscribe simply flips the flag back on). Distinguishes an
// already-active subscriber from a brand-new one so the frontend can show the
// right toast (success vs. "you're already on the list") instead of a single
// generic message for both cases.
contactRouter.post(
  '/newsletter',
  submitLimiter,
  validate({ body: subscribeNewsletterSchema }),
  async (req, res, next) => {
    try {
      const { email } = req.body as { email: string };
      const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
      const alreadySubscribed = !!existing?.subscribed;

      const subscriber = await prisma.newsletterSubscriber.upsert({
        where: { email },
        create: { email },
        update: { subscribed: true, unsubscribedAt: null },
      });

      // Only for a genuinely new (or re-activated) subscription — an already-
      // active subscriber re-submitting the same email shouldn't get a fresh
      // "thank you" or trigger another admin notification. `sendMail` already
      // no-ops/logs rather than throwing when SMTP isn't configured or a send
      // fails (see mailer.ts), matching how every other transactional email
      // in this app behaves — a delivery hiccup never costs a real, already-
      // stored subscription.
      if (!alreadySubscribed) {
        const confirmation = newsletterSubscriberConfirmationEmail();
        const adminNotice = newsletterAdminNotificationEmail({
          subscriberEmail: email,
          subscribedAt: subscriber.subscribedAt,
        });
        await Promise.all([
          sendMail({ to: email, ...confirmation }),
          sendMail({ to: env.NEWSLETTER_ADMIN_EMAIL, ...adminNotice }),
        ]).catch((error) => {
          logger.error('Newsletter subscription emails failed to send', {
            email,
            error: error instanceof Error ? error.message : error,
          });
        });
      }

      res.status(201).json({
        alreadySubscribed,
        message: alreadySubscribed
          ? 'This email address is already subscribed.'
          : 'Subscribed — thank you for staying connected.',
      });
    } catch (error) {
      next(error);
    }
  },
);
