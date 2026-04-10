'use client';

/**
 * v5.0 — Phase 43 / Plan 43-03 Task 2: REWRITTEN /admin/programs.
 *
 * Route preserved; v4 inline-edit replaced with RegisterTable+Drawer.
 * Columns per D-17: Name, Description.
 */

import { PersonaGate } from '@/features/personas/persona-route-guard';
import { AdminRegisterPageShell } from '@/components/admin/AdminRegisterPageShell';
import { ProgramForm, type ProgramFormValues } from '@/components/admin/forms/ProgramForm';
import type { RegisterTableColumn } from '@/components/admin/RegisterTable';

type ProgramRegisterRow = {
  id: string;
  name: string;
  description: string | null;
  archivedAt: string | Date | null;
};

const columns: ReadonlyArray<RegisterTableColumn<ProgramRegisterRow>> = [
  { key: 'name', header: 'Namn', cell: (r) => r.name },
  {
    key: 'description',
    header: 'Beskrivning',
    cell: (r) => r.description ?? '—',
  },
];

export default function AdminProgramsPage() {
  return (
    <PersonaGate allowed={['admin']}>
      <AdminRegisterPageShell<ProgramRegisterRow, ProgramFormValues>
        entity="program"
        titleKey="title.program"
        descriptionKey="description.program"
        columns={columns}
        formComponent={ProgramForm}
      />
    </PersonaGate>
  );
}
