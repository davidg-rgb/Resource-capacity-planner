'use client';

type FlatTablePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  totalHours: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

export function FlatTablePagination({
  page,
  pageSize,
  total,
  totalPages,
  totalHours,
  onPageChange,
  onPageSizeChange,
}: FlatTablePaginationProps) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const formattedHours = totalHours.toLocaleString('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  return (
    <div className="text-outline mt-4 flex items-center justify-between px-2 text-[11px] font-bold tracking-wider uppercase">
      {/* Row count */}
      <div>
        Showing {start}–{end} of {total} items
      </div>

      {/* Page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="border-outline-variant/20 text-outline hover:bg-surface-container disabled:text-outline/30 inline-flex items-center rounded-sm border p-1 transition-colors disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <span className="material-symbols-outlined text-sm">chevron_left</span>
          </button>

          <span className="text-on-surface text-[11px]">
            {totalPages === 0 ? 0 : page} / {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="border-outline-variant/20 text-outline hover:bg-surface-container disabled:text-outline/30 inline-flex items-center rounded-sm border p-1 transition-colors disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>

          <select
            id="page-size"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="border-outline-variant/20 bg-surface text-outline ml-2 rounded-sm border px-1.5 py-0.5 text-[11px] font-bold uppercase"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      )}

      {/* Total hours */}
      <div className="flex items-center gap-2">
        <span className="bg-primary h-1.5 w-1.5 rounded-full"></span>
        Total Estimated Hours:{' '}
        <span className="text-on-surface ml-1 tabular-nums">{formattedHours}</span>
      </div>
    </div>
  );
}
