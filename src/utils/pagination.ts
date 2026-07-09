export const pageSizeOptions = [10, 20, 50, 100];

export function responsePageSize(
  response: { pageSize?: number; page_size?: number },
  fallback: number,
) {
  return response.pageSize || response.page_size || fallback;
}
