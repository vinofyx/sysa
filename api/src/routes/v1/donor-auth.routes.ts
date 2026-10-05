import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

import { validate } from '@middleware/validate.middleware';
import { requestDonorOtpSchema, verifyDonorOtpSchema } from '@validation/donation-checkout.schema';
import { setDonorTokenCookie, clearDonorTokenCookie } from '@lib/cookies';
import * as donorAuthService from '@services/donor-auth.service';

export const donorAuthRouter = Router();

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

donorAuthRouter.post(
  '/request-otp',
  otpLimiter,
  validate({ body: requestDonorOtpSchema }),
  async (req, res, next) => {
    try {
      const { email } = req.body as z.infer<typeof requestDonorOtpSchema>;
      await donorAuthService.requestOtp(email);
      // Anti-enumeration: identical response whether or not the email has a donation history.
      res
        .status(200)
        .json({ message: 'If that email has donated before, a login code has been sent.' });
    } catch (error) {
      next(error);
    }
  },
);

donorAuthRouter.post(
  '/verify-otp',
  otpLimiter,
  validate({ body: verifyDonorOtpSchema }),
  async (req, res, next) => {
    try {
      const { email, otp } = req.body as z.infer<typeof verifyDonorOtpSchema>;
      const token = await donorAuthService.verifyOtp(email, otp);
      setDonorTokenCookie(res, token);
      res.status(200).json({ message: 'Logged in.' });
    } catch (error) {
      next(error);
    }
  },
);

donorAuthRouter.post('/logout', (_req, res) => {
  clearDonorTokenCookie(res);
  res.status(200).json({ message: 'Logged out.' });
});
