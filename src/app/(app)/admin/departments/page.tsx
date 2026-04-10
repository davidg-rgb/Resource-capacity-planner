'use client';

/**
 * v5.0 — Phase 43 / Plan 43-03 Task 2: REWRITTEN /admin/departments.
 *
 * Route path preserved (Phase 41 persona router links still point here),
 * v4 inline-edit body replaced with the v5 RegisterTable + RegisterDrawer
 * pattern. v4 use-reference-data.ts hooks left untouched (D-13).
 * Columns per D-17: Name (no `parent` — column does not exist in schema).
 */

import { PersonaGate } from '@/features/personas/persona-route-guard';
import { AdminRegisterPageShell } from '@/components/admin/AdminRegisterPageShell';
import { DepartmentForm, type DepartmentFormValues } from '@/components/admin/forms/DepartmentForm';
import type { RegisterTableColumn } from '@/components/admin/RegisterTable';

type DepartmentRegisterRow = {
  id: string;
  name: string;
  archivedAt: string | Date | null;
};

const columns: ReadonlyArray<RegisterTableColumn<DepartmentRegisterRow>> = [
  { key: 'name', header: 'Namn', cell: (r) => r.name },
];

export default function AdminDepartmentsPage() {
  return (
    <PersonaGate allowed={['admin']}>
      <AdminRegisterPageShell<DepartmentRegisterRow, DepartmentFormValues>
        entity="department"
        titleKey="title.department"
        descriptionKey="description.department"
        columns={columns}
        formComponent={DepartmentForm}
      />
    </PersonaGate>
  );
}
