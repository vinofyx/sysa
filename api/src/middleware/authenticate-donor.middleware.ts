import type { NextFunction, Request, Response } from 'express';

import { verifyDonorToken } from '@lib/donor-jwt';
import { DONOR_TOKEN_COOKIE } from '@config/constants';
import { ApiError } from '@utils/api-error';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      donorId?: string;
    }
  }
}

/**
 * Guards the donor-only routes (`GET /donors/me/donations`) — a stateless
 * JWT check only (no DB session lookup, unlike admin `authenticate`), which
 * is the deliberate lightweight tradeoff documented on `DonorTokenPayload`
 * in lib/donor-jwt.ts.
 */
export function authenticateDonor(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[DONOR_TOKEN_COOKIE] as string | undefined;
  if (!token) return next(ApiError.unauthorized('Please log in to view your donation history.'));

  try {
    const payload = verifyDonorToken(token);
    req.donorId = payload.sub;
    next();
  } catch {
    next(ApiError.unauthorized('Your session has expired. Please log in again.'));
  }
}
