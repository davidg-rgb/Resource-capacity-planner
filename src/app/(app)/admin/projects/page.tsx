'use client';

/**
 * v5.0 — Phase 43 / Plan 43-03 Task 2: NEW /admin/projects register page.
 *
 * Columns per D-17 (corrected, schema-aligned): Name, Program, Status, Archived.
 * NOTE: the plan specified `Code`, `Lead PM`, `Start–End` columns. None
 * exist on the `projects` create surface. We ship what the schema + API
 * expose.
 */

import { AdminRegisterPageShell } from '@/components/admin/AdminRegisterPageShell';
import { ProjectForm, type ProjectFormValues } from '@/components/admin/forms/ProjectForm';
import type { RegisterTableColumn } from '@/components/admin/RegisterTable';
import { usePrograms } from '@/hooks/use-reference-data';

type ProjectRegisterRow = {
  id: string;
  name: string;
  programId: string | null;
  status: 'active' | 'planned' | 'archived';
  archivedAt: string | Date | null;
};

const STATUS_CHIP: Record<ProjectRegisterRow['status'], string> = {
  active: 'bg-green-100 text-green-800',
  planned: 'bg-blue-100 text-blue-800',
  archived: 'bg-gray-200 text-gray-700',
};

export default function AdminProjectsPage() {
  return <AdminProjectsRegister />;
}

function AdminProjectsRegister() {
  const { data: programs } = usePrograms();

  const programName = (id: string | null) =>
    id ? (programs?.find((p) => p.id === id)?.name ?? '—') : '—';

  const columns: ReadonlyArray<RegisterTableColumn<ProjectRegisterRow>> = [
    { key: 'name', header: 'Namn', cell: (r) => r.name },
    { key: 'program', header: 'Program', cell: (r) => programName(r.programId) },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => (
        <span
          className={`inline-block rounded-sm px-2 py-0.5 text-xs font-medium ${STATUS_CHIP[r.status] ?? ''}`}
        >
          {r.status}
        </span>
      ),
    },
  ];

  return (
    <AdminRegisterPageShell<ProjectRegisterRow, ProjectFormValues>
      entity="project"
      titleKey="title.project"
      descriptionKey="description.project"
      columns={columns}
      formComponent={ProjectForm}
    />
  );
}
