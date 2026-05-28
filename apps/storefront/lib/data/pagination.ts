export interface PaginationInput {
  page?: number | string;
  pageSize?: number | string;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}

export function normalizePagination(input: PaginationInput = {}, defaultPageSize = 5) {
  const rawPage = Number(input.page);
  const rawPageSize = Number(input.pageSize);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const requestedPageSize = Number.isInteger(rawPageSize) && rawPageSize > 0 ? rawPageSize : defaultPageSize;
  const pageSize = Math.min(requestedPageSize, 20);
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip };
}

export function paginateArray<T>(items: T[], input: PaginationInput = {}, defaultPageSize = 5): PaginatedResult<T> {
  const { page, pageSize } = normalizePagination(input, defaultPageSize);
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const safeSkip = (safePage - 1) * pageSize;
  return {
    items: items.slice(safeSkip, safeSkip + pageSize),
    page: safePage,
    pageSize,
    total,
    pageCount
  };
}
