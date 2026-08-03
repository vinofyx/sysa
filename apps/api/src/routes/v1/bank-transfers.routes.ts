import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

import { authenticate } from '@middleware/authenticate.middleware';
import { requirePermission } from '@middleware/authorize.middleware';
import { validate } from '@middleware/validate.middleware';
import { idParamSchema } from '@validation/common.schema';
import {
  listBankTransfersQuerySchema,
  rejectBankTransferSchema,
  submitBankTransferClaimSchema,
  verifyBankTransferSchema,
} from '@validation/bank-transfer.schema';
import * as bankTransferService from '@services/bank-transfer.service';

export const bankTransfersRouter = Router();

const publicSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// Public — design/03-User-Flows.md F-03 "I've made a transfer" form.
bankTransfersRouter.post(
  '/public',
  publicSubmitLimiter,
  validate({ body: submitBankTransferClaimSchema }),
  async (req, res, next) => {
    try {
      const claim = await bankTransferService.submitClaim(req.body);
      res.status(201).json({
        data: claim,
        message: 'Thank you — our Finance team will verify this and email your receipt.',
      });
    } catch (error) {
      next(error);
    }
  },
);

bankTransfersRouter.use(authenticate);

bankTransfersRouter.get(
  '/',
  requirePermission('bank_transfers:view'),
  validate({ query: listBankTransfersQuerySchema }),
  async (req, res, next) => {
    try {
      const { page, pageSize, status } = req.query as unknown as z.infer<
        typeof listBankTransfersQuerySchema
      >;
      const result = await bankTransferService.listClaims(page, pageSize, status);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);

bankTransfersRouter.get(
  '/:id',
  requirePermission('bank_transfers:view'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const claim = await bankTransferService.getClaim(id);
      res.status(200).json({ data: claim });
    } catch (error) {
      next(error);
    }
  },
);

bankTransfersRouter.post(
  '/:id/verify',
  requirePermission('bank_transfers:manage'),
  validate({ params: idParamSchema, body: verifyBankTransferSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const { paymentMethod } = req.body as z.infer<typeof verifyBankTransferSchema>;
      const claim = await bankTransferService.verifyClaim(id, paymentMethod, req.user!.id);
      res.status(200).json({ data: claim });
    } catch (error) {
      next(error);
    }
  },
);

bankTransfersRouter.post(
  '/:id/reject',
  requirePermission('bank_transfers:manage'),
  validate({ params: idParamSchema, body: rejectBankTransferSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const { internalNote } = req.body as z.infer<typeof rejectBankTransferSchema>;
      const claim = await bankTransferService.rejectClaim(id, internalNote, req.user!.id);
      res.status(200).json({ data: claim });
    } catch (error) {
      next(error);
    }
  },
);
