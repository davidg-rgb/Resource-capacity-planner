import type { ColDef } from 'ag-grid-community';

import type { FlatTableRow } from '@/features/allocations/allocation.types';

export const flatTableColumnDefs: ColDef<FlatTableRow>[] = [
  {
    field: 'personName',
    headerName: 'Person',
    sortable: true,
    flex: 2,
    minWidth: 150,
    cellClass: 'font-medium',
  },
  {
    field: 'discipline',
    headerName: 'Discipline',
    sortable: true,
    width: 110,
    cellRenderer: (params: { value: string }) => {
      if (!params.value) return '';
      const span = document.createElement('span');
      span.className =
        'bg-secondary-container text-on-secondary-fixed rounded-full px-2 py-0.5 text-[10px] font-bold uppercase';
      span.textContent = params.value;
      return span;
    },
  },
  {
    field: 'departmentName',
    headerName: 'Department',
    sortable: true,
    flex: 1,
    minWidth: 120,
  },
  {
    field: 'projectName',
    headerName: 'Project',
    sortable: true,
    flex: 2,
    minWidth: 150,
  },
  {
    field: 'programName',
    headerName: 'Program',
    sortable: true,
    flex: 1,
    minWidth: 120,
    valueFormatter: (params) => params.value ?? '',
  },
  {
    field: 'month',
    headerName: 'Month',
    sortable: true,
    width: 100,
  },
  {
    field: 'hours',
    headerName: 'Hours',
    sortable: true,
    width: 90,
    cellClass: 'tabular-nums text-right font-bold',
  },
];
