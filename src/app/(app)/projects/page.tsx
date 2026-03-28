'use client';

import { useAuth } from '@clerk/nextjs';
import { Archive, Eye, Pencil, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

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
  const { orgRole } = useAuth();
  const canEdit = orgRole === 'org:admin' || orgRole === 'org:owner' || orgRole === 'org:planner';

  const { data: projects, isLoading, error } = useProjects();
  const { data: programs } = usePrograms();

  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const archiveProject = useArchiveProject();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      setErrors({});
      if (!form.name.trim()) {
        setErrors((prev) => ({ ...prev, name: 'Project name is required' }));
        return;
      }
      const payload = {
        name: form.name,
        programId: form.programId || null,
        status: form.status,
      };
      if (editingId) {
        await updateProject.mutateAsync({ id: editingId, data: payload });
        toast.success('Project updated successfully');
      } else {
        await createProject.mutateAsync(payload);
        toast.success('Project created successfully');
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
      toast.success(`${project.name} archived`);
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
          <h1 className="font-headline text-on-surface text-3xl font-semibold tracking-tight">
            Projects
          </h1>
          <p className="text-on-surface-variant mt-1 text-sm">
            Manage projects in your organization.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={openCreate}
            className="bg-primary text-on-primary hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium shadow-sm"
          >
            <Plus size={16} />
            Add Project
          </button>
        )}
      </div>

      {/* Form dialog */}
      {showForm && (
        <div className="border-outline-variant bg-surface-container mt-4 rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-headline text-on-surface text-lg font-semibold">
              {editingId ? 'Edit Project' : 'New Project'}
            </h2>
            <button onClick={closeForm} className="text-on-surface-variant hover:text-on-surface">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-on-surface text-sm font-medium">Project Name</span>
              <input
                type="text"
                required
                maxLength={200}
                value={form.name}
                onChange={(e) => {
                  updateField('name', e.target.value);
                  if (errors.name)
                    setErrors((prev) => {
                      delete prev.name;
                      return { ...prev };
                    });
                }}
                className="border-outline-variant bg-surface text-on-surface placeholder:text-on-surface-variant focus:border-primary mt-1 block w-full rounded-sm border px-3 py-2 text-sm focus:outline-none"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </label>

            <label className="block">
              <span className="text-on-surface text-sm font-medium">Program</span>
              <select
                value={form.programId}
                onChange={(e) => updateField('programId', e.target.value)}
                className="border-outline-variant bg-surface text-on-surface focus:border-primary mt-1 block w-full rounded-sm border px-3 py-2 text-sm focus:outline-none"
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
              <span className="text-on-surface text-sm font-medium">Status</span>
              <select
                value={form.status}
                onChange={(e) => updateField('status', e.target.value as 'active' | 'planned')}
                className="border-outline-variant bg-surface text-on-surface focus:border-primary mt-1 block w-full rounded-sm border px-3 py-2 text-sm focus:outline-none"
              >
                <option value="active">Active</option>
                <option value="planned">Planned</option>
              </select>
            </label>

            <div className="flex items-end gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={createProject.isPending || updateProject.isPending}
                className="bg-primary text-on-primary hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium shadow-sm disabled:opacity-50"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="border-outline-variant text-on-surface hover:bg-surface-container rounded-md border px-4 py-2 text-sm font-medium"
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
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-error-container text-on-error-container mt-4 rounded-md p-3 text-sm">
          Failed to load projects: {error.message}
        </div>
      )}

      {/* Projects table */}
      {!isLoading && !error && (
        <div className="mt-6 overflow-x-auto">
          {projects && projects.length === 0 ? (
            <p className="text-on-surface-variant py-8 text-center text-sm">
              No projects yet. Click &quot;Add Project&quot; to get started.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-outline-variant text-on-surface-variant border-b">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Program</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">View</th>
                  {canEdit && <th className="py-2 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-outline-variant divide-y">
                {projects?.map((project) => (
                  <tr key={project.id} className="text-on-surface">
                    <td className="py-2.5 pr-4 font-medium">{project.name}</td>
                    <td className="py-2.5 pr-4">{programName(project.programId)}</td>
                    <td className="py-2.5 pr-4">
                      <StatusBadge status={project.status} />
                    </td>
                    <td className="py-2.5 pr-4">
                      {project.status !== 'archived' && (
                        <Link
                          href={`/projects/${project.id}`}
                          className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                        >
                          <Eye size={14} /> View
                        </Link>
                      )}
                    </td>
                    {canEdit && (
                      <td className="py-2.5">
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEdit(project)}
                            className="text-on-surface-variant hover:bg-surface-container hover:text-on-surface rounded p-1"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleArchive(project)}
                            disabled={archiveProject.isPending}
                            className="text-on-surface-variant hover:bg-error-container hover:text-on-error-container rounded p-1 disabled:opacity-50"
                            title="Archive"
                          >
                            <Archive size={16} />
                          </button>
                        </div>
                      </td>
                    )}
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
