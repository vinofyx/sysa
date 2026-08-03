export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/** `skip`/`take` for a Prisma `findMany` call, derived from 1-indexed page params. */
export function toSkipTake({ page, pageSize }: PaginationParams): { skip: number; take: number } {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

/**
 * Wraps a `[rows, total]` tuple (the standard `Promise.all([findMany, count])`
 * pattern used by every module's repository — see design/13-API-Architecture.md
 * §6) into the consistent paginated envelope every list endpoint returns.
 */
export function paginate<T>(
  rows: T[],
  total: number,
  params: PaginationParams,
): PaginatedResult<T> {
  return {
    data: rows,
    pagination: {
      page: params.page,
      pageSize: params.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
    },
  };
}
