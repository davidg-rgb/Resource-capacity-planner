'use client';

import { Archive, Pencil, Plus, X } from 'lucide-react';
import { useCallback, useState } from 'react';

import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import type { ProjectRow } from '@/features/projects/project.types';
import {
  useArchiveProject,
  useCreateProject,
  useProjects,
  usePrograms,
  useUpdateProject,
} from '@/hooks/use-projects';

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

interface FormState {
  name: string;
  programId: string;
  status: 'active' | 'planned';
}

const EMPTY_FORM: FormState = {
  name: '',
  programId: '',
  status: 'active',
};

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    planned: 'bg-blue-100 text-blue-800',
    archived: 'bg-gray-100 text-gray-600',
  };

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.archived}`}
    >
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProjectsPage() {
  const { data: projects, isLoading, error } = useProjects();
  const { data: programs } = usePrograms();

  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const archiveProject = useArchiveProject();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // ---- helpers ----

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }, []);

  const openEdit = useCallback((project: ProjectRow) => {
    setEditingId(project.id);
    setForm({
      name: project.name,
      programId: project.programId ?? '',
      status: project.status === 'archived' ? 'active' : (project.status as 'active' | 'planned'),
    });
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const payload = {
        name: form.name,
        programId: form.programId || null,
        status: form.status,
      };
      if (editingId) {
        await updateProject.mutateAsync({ id: editingId, data: payload });
      } else {
        await createProject.mutateAsync(payload);
      }
      closeForm();
    },
    [editingId, form, updateProject, createProject, closeForm],
  );

  const handleArchive = useCallback(
    async (project: ProjectRow) => {
      if (
        !window.confirm(
          `Are you sure you want to archive ${project.name}? It will be hidden from active views.`,
        )
      ) {
        return;
      }
      await archiveProject.mutateAsync(project.id);
    },
    [archiveProject],
  );

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // ---- program name lookup ----

  const programName = (id: string | null) =>
    id ? (programs?.find((p) => p.id === id)?.name ?? '--') : 'None';

  // ---- render ----

  return (
    <>
      <Breadcrumbs />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-semibold tracking-tight text-on-surface">
            Projects
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Manage projects in your organization.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-on-primary shadow-sm hover:bg-primary/90"
        >
          <Plus size={16} />
          Add Project
        </button>
      </div>

      {/* Form dialog */}
      {showForm && (
        <div className="mt-4 rounded-lg border border-outline-variant bg-surface-container p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-headline text-lg font-semibold text-on-surface">
              {editingId ? 'Edit Project' : 'New Project'}
            </h2>
            <button onClick={closeForm} className="text-on-surface-variant hover:text-on-surface">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-on-surface">Project Name</span>
              <input
                type="text"
                required
                maxLength={200}
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="mt-1 block w-full rounded-sm border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-on-surface">Program</span>
              <select
                value={form.programId}
                onChange={(e) => updateField('programId', e.target.value)}
                className="mt-1 block w-full rounded-sm border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
              >
                <option value="">None</option>
                {programs?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-on-surface">Status</span>
              <select
                value={form.status}
                onChange={(e) => updateField('status', e.target.value as 'active' | 'planned')}
                className="mt-1 block w-full rounded-sm border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
              >
                <option value="active">Active</option>
                <option value="planned">Planned</option>
              </select>
            </label>

            <div className="flex items-end gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={createProject.isPending || updateProject.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary shadow-sm hover:bg-primary/90 disabled:opacity-50"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-md border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="mt-8 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mt-4 rounded-md bg-error-container p-3 text-sm text-on-error-container">
          Failed to load projects: {error.message}
        </div>
      )}

      {/* Projects table */}
      {!isLoading && !error && (
        <div className="mt-6 overflow-x-auto">
          {projects && projects.length === 0 ? (
            <p className="py-8 text-center text-sm text-on-surface-variant">
              No projects yet. Click &quot;Add Project&quot; to get started.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Program</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {projects?.map((project) => (
                  <tr key={project.id} className="text-on-surface">
                    <td className="py-2.5 pr-4 font-medium">{project.name}</td>
                    <td className="py-2.5 pr-4">{programName(project.programId)}</td>
                    <td className="py-2.5 pr-4">
                      <StatusBadge status={project.status} />
                    </td>
                    <td className="py-2.5">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(project)}
                          className="rounded p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleArchive(project)}
                          disabled={archiveProject.isPending}
                          className="rounded p-1 text-on-surface-variant hover:bg-error-container hover:text-on-error-container disabled:opacity-50"
                          title="Archive"
                        >
                          <Archive size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}
