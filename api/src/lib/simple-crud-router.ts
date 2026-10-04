import { Router, type Request, type Response, type NextFunction } from 'express';
import type { ZodType } from 'zod';

import { authenticate } from '@middleware/authenticate.middleware';
import { requirePermission } from '@middleware/authorize.middleware';
import { validate } from '@middleware/validate.middleware';
import { paginationQuerySchema, idParamSchema, bulkReorderSchema } from '@validation/common.schema';
import { toSkipTake, paginate } from '@utils/pagination';
import { writeAuditLog } from '@lib/audit-log';
import { ApiError } from '@utils/api-error';

/**
 * Narrow shape every "simple content" repository implements (Hero Banners,
 * Testimonials, Social Links, Navigation Items, Activities, Event Categories —
 * all of which are: paginated list, get-by-id, create, update, soft-delete,
 * optionally reorder). Building one generic, fully-tested router for this
 * shape — rather than hand-writing six near-identical route files — keeps API
 * behavior (pagination shape, audit logging, error handling) consistent
 * across every module, per the Phase 5 "maintain API consistency" requirement.
 *
 * Bespoke modules with real business logic (Donations, Volunteers, Events,
 * Gallery, Documents) do NOT use this factory — they have their own
 * hand-written routers, since their workflows go well beyond plain CRUD.
 */
export interface SimpleContentRepo<TEntity> {
  findMany(params: {
    skip?: number;
    take?: number;
    active?: boolean;
  }): Promise<[TEntity[], number]>;
  findById(id: string): Promise<TEntity | null>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create(data: any): Promise<TEntity>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update(id: string, data: any): Promise<TEntity>;
  softDelete(id: string): Promise<TEntity>;
  reorder?(items: { id: string; displayOrder: number }[]): Promise<unknown>;
}

export interface SimpleCrudRouterOptions {
  /** Used as `entityType` in audit log entries and in generic 404 messages. */
  entityType: string;
  viewPermission: string;
  managePermission: string;
  createSchema: ZodType;
  updateSchema: ZodType;
  supportsReorder?: boolean;
}

function getEntityId(entity: unknown): string | undefined {
  if (entity && typeof entity === 'object' && 'id' in entity) {
    return String((entity as { id: unknown }).id);
  }
  return undefined;
}

export function buildSimpleCrudRouter<TEntity>(
  repo: SimpleContentRepo<TEntity>,
  options: SimpleCrudRouterOptions,
): Router {
  const router = Router();
  router.use(authenticate);

  router.get(
    '/',
    requirePermission(options.viewPermission),
    validate({ query: paginationQuerySchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const query = req.query as unknown as { page: number; pageSize: number };
        const { skip, take } = toSkipTake(query);
        const [rows, total] = await repo.findMany({ skip, take });
        res.status(200).json(paginate(rows, total, query));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/:id',
    requirePermission(options.viewPermission),
    validate({ params: idParamSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params as unknown as { id: string };
        const row = await repo.findById(id);
        if (!row) throw ApiError.notFound(`${options.entityType} not found`);
        res.status(200).json({ data: row });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/',
    requirePermission(options.managePermission),
    validate({ body: options.createSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const row = await repo.create(req.body);
        await writeAuditLog({
          adminUserId: req.user!.id,
          action: 'CREATED',
          entityType: options.entityType,
          entityId: getEntityId(row),
          afterState: req.body as object,
        });
        res.status(201).json({ data: row });
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    '/:id',
    requirePermission(options.managePermission),
    validate({ params: idParamSchema, body: options.updateSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params as unknown as { id: string };
        const before = await repo.findById(id);
        if (!before) throw ApiError.notFound(`${options.entityType} not found`);
        const row = await repo.update(id, req.body);
        await writeAuditLog({
          adminUserId: req.user!.id,
          action: 'UPDATED',
          entityType: options.entityType,
          entityId: id,
          beforeState: before as object,
          afterState: req.body as object,
        });
        res.status(200).json({ data: row });
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    '/:id',
    requirePermission(options.managePermission),
    validate({ params: idParamSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params as unknown as { id: string };
        const before = await repo.findById(id);
        if (!before) throw ApiError.notFound(`${options.entityType} not found`);
        await repo.softDelete(id);
        await writeAuditLog({
          adminUserId: req.user!.id,
          action: 'DELETED',
          entityType: options.entityType,
          entityId: id,
          beforeState: before as object,
        });
        res.status(200).json({ success: true });
      } catch (error) {
        next(error);
      }
    },
  );

  if (options.supportsReorder && repo.reorder) {
    router.patch(
      '/bulk/reorder',
      requirePermission(options.managePermission),
      validate({ body: bulkReorderSchema }),
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { items } = req.body as { items: { id: string; displayOrder: number }[] };
          await repo.reorder!(items);
          await writeAuditLog({
            adminUserId: req.user!.id,
            action: 'REORDERED',
            entityType: options.entityType,
          });
          res.status(200).json({ success: true });
        } catch (error) {
          next(error);
        }
      },
    );
  }

  return router;
}
