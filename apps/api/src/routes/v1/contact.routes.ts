import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { validate } from '@middleware/validate.middleware';
import { prisma } from '@lib/prisma';
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
// after a prior unsubscribe simply flips the flag back on).
contactRouter.post(
  '/newsletter',
  submitLimiter,
  validate({ body: subscribeNewsletterSchema }),
  async (req, res, next) => {
    try {
      const { email } = req.body as { email: string };
      await prisma.newsletterSubscriber.upsert({
        where: { email },
        create: { email },
        update: { subscribed: true, unsubscribedAt: null },
      });
      res.status(201).json({ message: 'Subscribed — thank you for staying connected.' });
    } catch (error) {
      next(error);
    }
  },
);
