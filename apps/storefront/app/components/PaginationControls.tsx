import Link from "next/link";

export function PaginationControls({
  basePath,
  page,
  pageCount,
  total,
  pageParam = "page",
  params
}: {
  basePath: string;
  page: number;
  pageCount: number;
  total: number;
  pageParam?: string;
  params: Record<string, string | number | undefined>;
}) {
  function hrefFor(nextPage: number) {
    const query = new URLSearchParams();
    Object.entries({ ...params, [pageParam]: nextPage }).forEach(([key, value]) => {
      if (value !== undefined && value !== "") query.set(key, String(value));
    });
    return `${basePath}?${query.toString()}`;
  }

  return (
    <div className="pagination" aria-label="分页">
      <span>共 {total} 条 · 第 {page} / {pageCount} 页</span>
      <div className="top-actions">
        {page > 1 ? (
          <Link className="ui-button ui-button--secondary" href={hrefFor(page - 1)}>上一页</Link>
        ) : (
          <button className="ui-button ui-button--secondary" type="button" disabled>上一页</button>
        )}
        {page < pageCount ? (
          <Link className="ui-button ui-button--secondary" href={hrefFor(page + 1)}>下一页</Link>
        ) : (
          <button className="ui-button ui-button--secondary" type="button" disabled>下一页</button>
        )}
      </div>
    </div>
  );
}
