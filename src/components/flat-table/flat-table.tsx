'use client';

import { useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { AllCommunityModule } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';

import { useFlatAllocations } from '@/hooks/use-flat-allocations';
import { flatTableColumnDefs } from '@/components/flat-table/flat-table-columns';
import { FlatTableFilters } from '@/components/flat-table/flat-table-filters';
import { FlatTablePagination } from '@/components/flat-table/flat-table-pagination';

const modules = [AllCommunityModule];

export function FlatTable() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read filter state from URL search params
  const filters = {
    personName: searchParams.get('personName') ?? undefined,
    disciplineId: searchParams.get('disciplineId') ?? undefined,
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
  const buildExportUrl = () => {
    const exportParams = new URLSearchParams();
    if (filters.personName) exportParams.set('personName', filters.personName);
    if (filters.disciplineId) exportParams.set('disciplineId', filters.disciplineId);
    if (filters.projectId) exportParams.set('projectId', filters.projectId);
    if (filters.departmentId) exportParams.set('departmentId', filters.departmentId);
    if (filters.monthFrom) exportParams.set('monthFrom', filters.monthFrom);
    if (filters.monthTo) exportParams.set('monthTo', filters.monthTo);
    exportParams.set('format', 'xlsx');
    return `/api/allocations/export?${exportParams.toString()}`;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar + export button */}
      <div className="flex items-end justify-between gap-4">
        <FlatTableFilters filters={filters} onFilterChange={setFilter} />

        {/* Export button */}
        <a
          href={buildExportUrl()}
          download
          className="bg-primary text-on-primary flex items-center gap-2 rounded-sm px-5 py-2.5 text-xs font-semibold shadow-md transition-opacity hover:opacity-90"
        >
          <span className="material-symbols-outlined text-lg">download</span>
          Export to Excel
        </a>
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

      {/* Pagination / Stats */}
      {data?.pagination && (
        <FlatTablePagination
          page={data.pagination.page}
          pageSize={data.pagination.pageSize}
          total={data.pagination.total}
          totalPages={data.pagination.totalPages}
          totalHours={data.totalHours ?? 0}
          onPageChange={(p) => setFilter('page', String(p))}
          onPageSizeChange={(s) => setFilter('pageSize', String(s))}
        />
      )}
    </div>
  );
}
