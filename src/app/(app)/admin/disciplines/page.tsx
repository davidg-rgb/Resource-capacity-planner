'use client';

/**
 * v5.0 — Phase 43 / Plan 43-03 Task 2: REWRITTEN /admin/disciplines.
 *
 * Route preserved; v4 inline-edit replaced with RegisterTable+Drawer.
 * Columns per D-17: Name, Abbreviation (no `color` — not in schema).
 */

import { AdminRegisterPageShell } from '@/components/admin/AdminRegisterPageShell';
import { DisciplineForm, type DisciplineFormValues } from '@/components/admin/forms/DisciplineForm';
import type { RegisterTableColumn } from '@/components/admin/RegisterTable';

type DisciplineRegisterRow = {
  id: string;
  name: string;
  abbreviation: string;
  archivedAt: string | Date | null;
};

const columns: ReadonlyArray<RegisterTableColumn<DisciplineRegisterRow>> = [
  { key: 'name', header: 'Namn', cell: (r) => r.name },
  { key: 'abbreviation', header: 'Förkortning', cell: (r) => r.abbreviation },
];

export default function AdminDisciplinesPage() {
  return (
    <AdminRegisterPageShell<DisciplineRegisterRow, DisciplineFormValues>
      entity="discipline"
      titleKey="title.discipline"
      descriptionKey="description.discipline"
      columns={columns}
      formComponent={DisciplineForm}
    />
  );
}
