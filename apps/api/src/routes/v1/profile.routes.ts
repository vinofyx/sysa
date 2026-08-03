import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '@middleware/authenticate.middleware';
import { validate } from '@middleware/validate.middleware';
import { updateProfileSchema } from '@validation/profile.schema';
import * as profileService from '@services/profile.service';

export const profileRouter = Router();

profileRouter.use(authenticate);

profileRouter.get('/', async (req, res, next) => {
  try {
    const profile = await profileService.getMyProfile(req.user!.id);
    res.status(200).json({ profile });
  } catch (error) {
    next(error);
  }
});

profileRouter.patch('/', validate({ body: updateProfileSchema }), async (req, res, next) => {
  try {
    const input = req.body as z.infer<typeof updateProfileSchema>;
    const profile = await profileService.updateMyProfile(req.user!.id, input);
    res.status(200).json({ profile });
  } catch (error) {
    next(error);
  }
});
