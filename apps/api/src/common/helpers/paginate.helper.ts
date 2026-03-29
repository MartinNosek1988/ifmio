export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
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
    totalPages: Math.ceil(total / pageSize),
  };
}

/** Parse page/limit from query strings with safe defaults */
export function parsePageParams(page?: string | number, limit?: string | number, maxLimit = 100) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(maxLimit, Math.max(1, Number(limit) || 20));
  return { page: p, pageSize: l, skip: (p - 1) * l };
}
