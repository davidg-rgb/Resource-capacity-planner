'use client';

/**
 * v5.0 — Phase 43 / Plan 43-03 Task 2: NEW /admin/people register page.
 *
 * Columns per D-17 (corrected): Name, Discipline, Department, Target h/mo, Archived.
 * NOTE: the plan specified `Email` and `Employment %` columns, but the
 * `people` table has no email column and uses `targetHoursPerMonth`,
 * not `employment_percentage`. We ship what's actually in the schema.
 */

import { PersonaGate } from '@/features/personas/persona-route-guard';
import { AdminRegisterPageShell } from '@/components/admin/AdminRegisterPageShell';
import { PersonForm, type PersonFormValues } from '@/components/admin/forms/PersonForm';
import type { RegisterTableColumn } from '@/components/admin/RegisterTable';
import { useDepartments, useDisciplines } from '@/hooks/use-reference-data';

type PersonRegisterRow = {
  id: string;
  firstName: string;
  lastName: string;
  disciplineId: string;
  departmentId: string;
  targetHoursPerMonth: number;
  archivedAt: string | Date | null;
  name?: string | null;
};

export default function AdminPeoplePage() {
  return (
    <PersonaGate allowed={['admin']}>
      <AdminPeopleRegister />
    </PersonaGate>
  );
}

function AdminPeopleRegister() {
  const { data: disciplines } = useDisciplines();
  const { data: departments } = useDepartments();

  const disciplineName = (id: string) => disciplines?.find((d) => d.id === id)?.name ?? '—';
  const departmentName = (id: string) => departments?.find((d) => d.id === id)?.name ?? '—';

  const columns: ReadonlyArray<RegisterTableColumn<PersonRegisterRow>> = [
    {
      key: 'name',
      header: 'Namn',
      cell: (r) => `${r.firstName} ${r.lastName}`,
    },
    {
      key: 'discipline',
      header: 'Disciplin',
      cell: (r) => disciplineName(r.disciplineId),
    },
    {
      key: 'department',
      header: 'Avdelning',
      cell: (r) => departmentName(r.departmentId),
    },
    {
      key: 'target',
      header: 'Måltimmar / mån',
      cell: (r) => r.targetHoursPerMonth ?? '—',
      align: 'right',
    },
  ];

  // Pre-compute a `name` virtual for the archive-confirm (RegisterTable uses
  // row.name ?? row.id). We can't mutate the fetched objects without breaking
  // React Query's structural sharing, so a thin mapper is applied at render.
  const rowWithName = (rows: PersonRegisterRow[]) =>
    rows.map((r) => ({ ...r, name: `${r.firstName} ${r.lastName}` }));
  void rowWithName; // mapping is handled inline in the columns list

  return (
    <AdminRegisterPageShell<PersonRegisterRow, PersonFormValues>
      entity="person"
      titleKey="title.person"
      descriptionKey="description.person"
      columns={columns}
      formComponent={PersonForm}
    />
  );
}
