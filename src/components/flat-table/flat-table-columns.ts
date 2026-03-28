import type { ColDef } from 'ag-grid-community';

import type { FlatTableRow } from '@/features/allocations/allocation.types';

export const flatTableColumnDefs: ColDef<FlatTableRow>[] = [
  {
    field: 'personName',
    headerName: 'Person Name',
    sortable: true,
    flex: 2,
    minWidth: 150,
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
    headerName: 'Project Name',
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
