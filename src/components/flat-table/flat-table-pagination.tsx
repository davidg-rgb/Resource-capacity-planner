'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

type FlatTablePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

export function FlatTablePagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: FlatTablePaginationProps) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between py-3">
      {/* Row count */}
      <span className="text-on-surface-variant text-sm">
        Showing {start}–{end} of {total}
      </span>

      {/* Page navigation */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="border-outline-variant text-on-surface disabled:text-on-surface/30 hover:bg-surface-container inline-flex items-center rounded-md border p-1.5 transition-colors disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <span className="text-on-surface text-sm">
          Page {totalPages === 0 ? 0 : page} of {totalPages}
        </span>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="border-outline-variant text-on-surface disabled:text-on-surface/30 hover:bg-surface-container inline-flex items-center rounded-md border p-1.5 transition-colors disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Page size selector */}
      <div className="flex items-center gap-2">
        <label htmlFor="page-size" className="text-on-surface-variant text-sm">
          Rows per page
        </label>
        <select
          id="page-size"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="border-outline-variant bg-surface text-on-surface rounded-md border px-2 py-1 text-sm"
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
    </div>
  );
}
