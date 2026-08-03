import { prisma } from '@lib/prisma';
import { logger } from '@lib/logger';

export type AuditAction =
  // Auth (Phase 4)
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'ACCOUNT_LOCKED'
  | 'LOGOUT'
  | 'LOGOUT_ALL_DEVICES'
  | 'TOKEN_REFRESHED'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_COMPLETED'
  | 'EMAIL_VERIFICATION_REQUESTED'
  | 'EMAIL_VERIFIED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DEACTIVATED'
  | 'USER_REACTIVATED'
  | 'ROLE_CREATED'
  | 'ROLE_UPDATED'
  | 'ROLE_DELETED'
  | 'PROFILE_UPDATED'
  // Generic CRUD verbs (Phase 5) — paired with a specific `entityType` string
  // (e.g. 'testimonial', 'donation', 'event') to disambiguate which module a
  // given entry belongs to, rather than enumerating one action name per
  // module here (kept centrally maintainable as new modules are added).
  | 'CREATED'
  | 'UPDATED'
  | 'DELETED'
  | 'RESTORED'
  | 'STATUS_CHANGED'
  | 'PUBLISHED'
  | 'UNPUBLISHED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'REORDERED'
  | 'BULK_DELETED'
  | 'BULK_UPDATED'
  | 'EXPORTED'
  | 'UPLOADED'
  | 'SETTINGS_UPDATED';

interface WriteAuditLogInput {
  adminUserId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  beforeState?: unknown;
  afterState?: unknown;
}

/**
 * Appends an entry to the immutable audit log (documentation/12-Security-Requirements.md
 * §7 "Insufficient Logging & Monitoring" mitigation; the `audit_log` table's application-level
 * contract is append-only — see design/12-Database-ERD.md §5 "Referential Integrity Summary").
 *
 * Failure to write an audit entry never blocks the underlying action — it's logged to
 * Winston instead, since losing an audit trail entry is a lesser failure than, e.g.,
 * blocking a legitimate login because of a transient DB hiccup on the log write.
 */
export async function writeAuditLog(input: WriteAuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        adminUserId: input.adminUserId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        beforeState: input.beforeState === undefined ? undefined : (input.beforeState as object),
        afterState: input.afterState === undefined ? undefined : (input.afterState as object),
      },
    });
  } catch (error) {
    logger.error('Failed to write audit log entry', {
      action: input.action,
      adminUserId: input.adminUserId,
      error: error instanceof Error ? error.message : error,
    });
  }
}
