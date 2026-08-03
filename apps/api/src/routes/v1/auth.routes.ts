import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';

import { authenticate } from '@middleware/authenticate.middleware';
import { validate } from '@middleware/validate.middleware';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  sessionIdParamSchema,
  verifyEmailSchema,
} from '@validation/auth.schema';
import { z } from 'zod';
import { setAccessTokenCookie, setRefreshTokenCookie, clearAuthCookies } from '@lib/cookies';
import { REFRESH_TOKEN_COOKIE } from '@config/constants';
import { ApiError } from '@utils/api-error';
import * as authService from '@services/auth.service';

export const authRouter = Router();

/**
 * Auth endpoints get a stricter rate limit than the general API baseline
 * (documentation/12-Security-Requirements.md SEC-INFRA-04 / design/13-API-Architecture.md §9)
 * to slow down credential-stuffing and reset/verification-spam attempts.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts, please try again later' },
  },
});

function requestContext(req: Request) {
  return { userAgent: req.headers['user-agent'], ipAddress: req.ip };
}

authRouter.post('/login', authLimiter, validate({ body: loginSchema }), async (req, res, next) => {
  try {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const result = await authService.login(email, password, requestContext(req));

    setAccessTokenCookie(res, result.accessToken);
    setRefreshTokenCookie(res, result.refreshToken);

    res.status(200).json({ user: result.user });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/refresh', authLimiter, async (req: Request, res: Response, next) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    if (!refreshToken) {
      throw ApiError.unauthorized('No refresh token provided');
    }

    const result = await authService.refresh(refreshToken);
    setAccessTokenCookie(res, result.accessToken);
    setRefreshTokenCookie(res, result.refreshToken);

    res.status(200).json({ success: true });
  } catch (error) {
    clearAuthCookies(res);
    next(error);
  }
});

authRouter.post('/logout', authenticate, async (req, res, next) => {
  try {
    await authService.logout(req.user!.id, req.user!.sessionId);
    clearAuthCookies(res);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout-all', authenticate, async (req, res, next) => {
  try {
    await authService.logoutAllDevices(req.user!.id);
    clearAuthCookies(res);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/sessions', authenticate, async (req, res, next) => {
  try {
    const sessions = await authService.listSessions(req.user!.id, req.user!.sessionId);
    res.status(200).json({ sessions });
  } catch (error) {
    next(error);
  }
});

authRouter.delete(
  '/sessions/:sessionId',
  authenticate,
  validate({ params: sessionIdParamSchema }),
  async (req, res, next) => {
    try {
      const { sessionId } = req.params as unknown as z.infer<typeof sessionIdParamSchema>;
      await authService.revokeSession(req.user!.id, sessionId);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

authRouter.post(
  '/forgot-password',
  authLimiter,
  validate({ body: forgotPasswordSchema }),
  async (req, res, next) => {
    try {
      const { email } = req.body as z.infer<typeof forgotPasswordSchema>;
      await authService.forgotPassword(email);
      // Always the same response, whether or not the email exists (anti-enumeration).
      res
        .status(200)
        .json({ message: 'If an account exists for that email, a reset link has been sent.' });
    } catch (error) {
      next(error);
    }
  },
);

authRouter.post(
  '/reset-password',
  authLimiter,
  validate({ body: resetPasswordSchema }),
  async (req, res, next) => {
    try {
      const { token, newPassword } = req.body as z.infer<typeof resetPasswordSchema>;
      await authService.resetPassword(token, newPassword);
      res.status(200).json({ message: 'Password has been reset. Please log in.' });
    } catch (error) {
      next(error);
    }
  },
);

authRouter.post(
  '/change-password',
  authenticate,
  validate({ body: changePasswordSchema }),
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body as z.infer<typeof changePasswordSchema>;
      await authService.changePassword(
        req.user!.id,
        req.user!.sessionId,
        currentPassword,
        newPassword,
      );
      res.status(200).json({ message: 'Password changed successfully.' });
    } catch (error) {
      next(error);
    }
  },
);

authRouter.post(
  '/verify-email',
  authLimiter,
  validate({ body: verifyEmailSchema }),
  async (req, res, next) => {
    try {
      const { token } = req.body as z.infer<typeof verifyEmailSchema>;
      await authService.verifyEmail(token);
      res.status(200).json({ message: 'Email verified. You can now log in.' });
    } catch (error) {
      next(error);
    }
  },
);

authRouter.post(
  '/resend-verification',
  authLimiter,
  validate({ body: forgotPasswordSchema }),
  async (req, res, next) => {
    try {
      const { email } = req.body as z.infer<typeof forgotPasswordSchema>;
      await authService.resendVerificationByEmail(email);
      res.status(200).json({
        message: 'If an account exists for that email, a verification link has been sent.',
      });
    } catch (error) {
      next(error);
    }
  },
);

authRouter.get('/me', authenticate, (req, res) => {
  res.status(200).json({ user: req.user });
});
