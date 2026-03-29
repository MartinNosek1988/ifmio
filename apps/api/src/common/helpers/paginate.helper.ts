export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  /** @deprecated Use pageSize instead. Will be removed in v2. */
  limit: number;
  totalPages: number;
}

export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResponse<T> {
  return {
    data,
    total,
    page,
    pageSize,
    limit: pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/** Parse page/limit from query strings with safe defaults */
export function parsePageParams(page?: string | number, limit?: string | number, maxLimit = 100) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(maxLimit, Math.max(1, Number(limit) || 20));
  return { page: p, pageSize: l, skip: (p - 1) * l };
}
