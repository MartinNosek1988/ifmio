export type UUID = string;
export type ISODate = string;

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  path?: string;
  timestamp?: string;
}
