'use client';

import { useCallback, useRef, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { AllCommunityModule } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Download, ChevronDown } from 'lucide-react';

import { useFlatAllocations } from '@/hooks/use-flat-allocations';
import { flatTableColumnDefs } from '@/components/flat-table/flat-table-columns';
import { FlatTableFilters } from '@/components/flat-table/flat-table-filters';
import { FlatTablePagination } from '@/components/flat-table/flat-table-pagination';

const modules = [AllCommunityModule];

export function FlatTable() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Read filter state from URL search params
  const filters = {
    personName: searchParams.get('personName') ?? undefined,
    projectId: searchParams.get('projectId') ?? undefined,
    departmentId: searchParams.get('departmentId') ?? undefined,
    monthFrom: searchParams.get('monthFrom') ?? undefined,
    monthTo: searchParams.get('monthTo') ?? undefined,
    page: searchParams.get('page') ?? '1',
    pageSize: searchParams.get('pageSize') ?? '50',
  };

  const { data, isLoading } = useFlatAllocations(filters);

  const setFilter = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset to page 1 when a non-pagination filter changes
      if (key !== 'page' && key !== 'pageSize') {
        params.delete('page');
      }
      // Reset to page 1 when pageSize changes
      if (key === 'pageSize') {
        params.delete('page');
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname],
  );

  // Build export URL from current filter params (excluding page/pageSize)
  const buildExportUrl = (format: 'xlsx' | 'csv') => {
    const exportParams = new URLSearchParams();
    if (filters.personName) exportParams.set('personName', filters.personName);
    if (filters.projectId) exportParams.set('projectId', filters.projectId);
    if (filters.departmentId) exportParams.set('departmentId', filters.departmentId);
    if (filters.monthFrom) exportParams.set('monthFrom', filters.monthFrom);
    if (filters.monthTo) exportParams.set('monthTo', filters.monthTo);
    exportParams.set('format', format);
    return `/api/allocations/export?${exportParams.toString()}`;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar + export button */}
      <div className="flex items-end justify-between gap-4">
        <FlatTableFilters filters={filters} onFilterChange={setFilter} />

        {/* Export dropdown */}
        <div className="relative" ref={exportRef}>
          <button
            type="button"
            onClick={() => setExportOpen((prev) => !prev)}
            onBlur={(e) => {
              // Close if focus leaves the dropdown entirely
              if (!exportRef.current?.contains(e.relatedTarget)) {
                setExportOpen(false);
              }
            }}
            className="bg-primary text-on-primary inline-flex items-center gap-1.5 rounded-sm px-5 py-2.5 text-xs font-semibold shadow-md transition-colors"
          >
            <Download className="h-4 w-4" />
            Export
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {exportOpen && (
            <div className="bg-surface border-outline-variant absolute top-full right-0 z-10 mt-1 flex flex-col overflow-hidden rounded-sm border shadow-md">
              <a
                href={buildExportUrl('xlsx')}
                download
                onClick={() => setExportOpen(false)}
                className="text-on-surface hover:bg-surface-container px-4 py-2 text-sm whitespace-nowrap"
              >
                Export Excel (.xlsx)
              </a>
              <a
                href={buildExportUrl('csv')}
                download
                onClick={() => setExportOpen(false)}
                className="text-on-surface hover:bg-surface-container px-4 py-2 text-sm whitespace-nowrap"
              >
                Export CSV (.csv)
              </a>
            </div>
          )}
        </div>
      </div>

      {/* AG Grid */}
      <div
        style={{ height: '600px' }}
        className="bg-surface-container-lowest border-outline-variant/10 w-full overflow-hidden rounded-sm border shadow-sm"
      >
        <AgGridReact
          modules={modules}
          rowData={data?.rows ?? []}
          columnDefs={flatTableColumnDefs}
          defaultColDef={{
            sortable: true,
            filter: false,
            resizable: true,
          }}
          suppressCellFocus={true}
          loading={isLoading}
          overlayNoRowsTemplate="No allocations found. Try adjusting your filters."
        />
      </div>

      {/* Pagination */}
      {data?.pagination && (
        <FlatTablePagination
          page={data.pagination.page}
          pageSize={data.pagination.pageSize}
          total={data.pagination.total}
          totalPages={data.pagination.totalPages}
          onPageChange={(p) => setFilter('page', String(p))}
          onPageSizeChange={(s) => setFilter('pageSize', String(s))}
        />
      )}
    </div>
  );
}
