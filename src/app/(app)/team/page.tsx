'use client';

import { useAuth } from '@clerk/nextjs';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import type { PersonRow } from '@/features/people/person.types';
import {
  useCreatePerson,
  useDeletePerson,
  useDepartments,
  useDisciplines,
  usePeople,
  useUpdatePerson,
} from '@/hooks/use-people';

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

interface FormState {
  firstName: string;
  lastName: string;
  disciplineId: string;
  departmentId: string;
  targetHoursPerMonth: number;
}

const EMPTY_FORM: FormState = {
  firstName: '',
  lastName: '',
  disciplineId: '',
  departmentId: '',
  targetHoursPerMonth: 160,
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TeamPage() {
  const { orgRole } = useAuth();
  const canEdit = orgRole === 'org:admin' || orgRole === 'org:owner' || orgRole === 'org:planner';

  const { data: people, isLoading, error } = usePeople();
  const { data: departments } = useDepartments();
  const { data: disciplines } = useDisciplines();

  const createPerson = useCreatePerson();
  const updatePerson = useUpdatePerson();
  const deletePerson = useDeletePerson();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [successMsg, setSuccessMsg] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ---- success toast auto-clear ----

  useEffect(() => {
    if (!successMsg) return;
    const timer = setTimeout(() => setSuccessMsg(''), 3000);
    return () => clearTimeout(timer);
  }, [successMsg]);

  // ---- helpers ----

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }, []);

  const openEdit = useCallback((person: PersonRow) => {
    setEditingId(person.id);
    setForm({
      firstName: person.firstName,
      lastName: person.lastName,
      disciplineId: person.disciplineId,
      departmentId: person.departmentId,
      targetHoursPerMonth: person.targetHoursPerMonth,
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
      if (!form.firstName.trim()) {
        setErrors((prev) => ({ ...prev, firstName: 'First name is required' }));
        return;
      }
      if (editingId) {
        await updatePerson.mutateAsync({ id: editingId, data: form });
        setSuccessMsg('Person updated successfully');
      } else {
        await createPerson.mutateAsync(form);
        setSuccessMsg('Person created successfully');
      }
      closeForm();
    },
    [editingId, form, updatePerson, createPerson, closeForm],
  );

  const handleDelete = useCallback(
    async (person: PersonRow) => {
      if (!window.confirm(`Are you sure you want to remove ${person.firstName} ${person.lastName}? This will archive them.`)) {
        return;
      }
      await deletePerson.mutateAsync(person.id);
      setSuccessMsg(`${person.firstName} ${person.lastName} removed`);
    },
    [deletePerson],
  );

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // ---- department / discipline name lookup ----

  const departmentName = (id: string) =>
    departments?.find((d) => d.id === id)?.name ?? '--';
  const disciplineName = (id: string) =>
    disciplines?.find((d) => d.id === id)?.name ?? '--';

  // ---- render ----

  return (
    <>
      <Breadcrumbs />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-semibold tracking-tight text-on-surface">
            Team
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Manage people in your organization.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-on-primary shadow-sm hover:bg-primary/90"
          >
            <Plus size={16} />
            Add Person
          </button>
        )}
      </div>

      {/* Success toast */}
      {successMsg && (
        <div className="mt-4 rounded-md bg-green-50 border border-green-200 p-3 text-sm font-medium text-green-800">
          {successMsg}
        </div>
      )}

      {/* Form dialog */}
      {showForm && (
        <div className="mt-4 rounded-lg border border-outline-variant bg-surface-container p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-headline text-lg font-semibold text-on-surface">
              {editingId ? 'Edit Person' : 'New Person'}
            </h2>
            <button onClick={closeForm} className="text-on-surface-variant hover:text-on-surface">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-on-surface">First Name</span>
              <input
                type="text"
                required
                maxLength={100}
                value={form.firstName}
                onChange={(e) => {
                  updateField('firstName', e.target.value);
                  if (errors.firstName) setErrors((prev) => { delete prev.firstName; return { ...prev }; });
                }}
                className="mt-1 block w-full rounded-sm border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
              />
              {errors.firstName && <p className="text-sm text-red-600 mt-1">{errors.firstName}</p>}
            </label>

            <label className="block">
              <span className="text-sm font-medium text-on-surface">Last Name</span>
              <input
                type="text"
                required
                maxLength={100}
                value={form.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                className="mt-1 block w-full rounded-sm border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-on-surface">Department</span>
              <select
                required
                value={form.departmentId}
                onChange={(e) => updateField('departmentId', e.target.value)}
                className="mt-1 block w-full rounded-sm border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
              >
                <option value="">Select department...</option>
                {departments?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-on-surface">Discipline</span>
              <select
                required
                value={form.disciplineId}
                onChange={(e) => updateField('disciplineId', e.target.value)}
                className="mt-1 block w-full rounded-sm border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
              >
                <option value="">Select discipline...</option>
                {disciplines?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-on-surface">Target Hours / Month</span>
              <input
                type="number"
                min={1}
                max={744}
                value={form.targetHoursPerMonth}
                onChange={(e) => updateField('targetHoursPerMonth', Number(e.target.value))}
                className="mt-1 block w-full rounded-sm border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface tabular-nums focus:border-primary focus:outline-none"
              />
            </label>

            <div className="flex items-end gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={createPerson.isPending || updatePerson.isPending}
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
          Failed to load people: {error.message}
        </div>
      )}

      {/* People table */}
      {!isLoading && !error && (
        <div className="mt-6 overflow-x-auto">
          {people && people.length === 0 ? (
            <p className="py-8 text-center text-sm text-on-surface-variant">
              No people yet. Click &quot;Add Person&quot; to get started.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Department</th>
                  <th className="py-2 pr-4 font-medium">Discipline</th>
                  <th className="py-2 pr-4 font-medium tabular-nums">Target h/mo</th>
                  {canEdit && <th className="py-2 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {people?.map((person) => (
                  <tr key={person.id} className="text-on-surface">
                    <td className="py-2.5 pr-4 font-medium">
                      {person.firstName} {person.lastName}
                    </td>
                    <td className="py-2.5 pr-4">{departmentName(person.departmentId)}</td>
                    <td className="py-2.5 pr-4">{disciplineName(person.disciplineId)}</td>
                    <td className="py-2.5 pr-4 tabular-nums">{person.targetHoursPerMonth}</td>
                    {canEdit && (
                      <td className="py-2.5">
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEdit(person)}
                            className="rounded p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(person)}
                            disabled={deletePerson.isPending}
                            className="rounded p-1 text-on-surface-variant hover:bg-error-container hover:text-on-error-container disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 size={16} />
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
