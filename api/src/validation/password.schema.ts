import { z } from 'zod';

import {
  PASSWORD_COMPLEXITY_REGEX,
  PASSWORD_MIN_LENGTH,
  PASSWORD_POLICY_DESCRIPTION,
} from '@config/constants';

/**
 * Shared password-strength schema (documentation/12-Security-Requirements.md §3 SEC-AUTH-02),
 * reused by change-password, reset-password, and the create-user (Super Admin invites a new
 * admin) flows so the policy is defined in exactly one place.
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .regex(PASSWORD_COMPLEXITY_REGEX, PASSWORD_POLICY_DESCRIPTION);
