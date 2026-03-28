'use client';

import { Check, Pencil, Plus, ShieldAlert, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';

import {
  useCreateDiscipline,
  useDeleteDiscipline,
  useDiscipline,
  useDisciplines,
  useUpdateDiscipline,
} from '@/hooks/use-reference-data';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DisciplinesPage() {
  const { orgRole } = useAuth();
  const isAdmin = orgRole === 'org:admin' || orgRole === 'org:owner';

  const { data: disciplines, isLoading, error } = useDisciplines();
  const createDiscipline = useCreateDiscipline();
  const updateDiscipline = useUpdateDiscipline();
  const deleteDiscipline = useDeleteDiscipline();

  const [addMode, setAddMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [checkDeleteId, setCheckDeleteId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');

  // Fetch usage count when checking delete
  const { data: deleteTarget } = useDiscipline(checkDeleteId ?? '');

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <ShieldAlert size={48} className="text-outline" />
        <h2 className="font-headline text-on-surface text-lg font-semibold">Access Denied</h2>
        <p className="text-on-surface-variant text-sm">
          You need Admin privileges to manage reference data.
        </p>
      </div>
    );
  }

  const resetForm = () => {
    setName('');
    setAbbreviation('');
    setAddMode(false);
    setEditingId(null);
    setCheckDeleteId(null);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createDiscipline.mutateAsync({ name: name.trim(), abbreviation: abbreviation.trim() });
    resetForm();
  };

  const handleUpdate = async () => {
    if (!editingId || !name.trim()) return;
    await updateDiscipline.mutateAsync({
      id: editingId,
      data: { name: name.trim(), abbreviation: abbreviation.trim() },
    });
    resetForm();
  };

  const handleDelete = async (id: string, disciplineName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${disciplineName}?`)) return;
    await deleteDiscipline.mutateAsync(id);
    setCheckDeleteId(null);
  };

  const startEdit = (d: { id: string; name: string; abbreviation: string }) => {
    setEditingId(d.id);
    setName(d.name);
    setAbbreviation(d.abbreviation);
    setAddMode(false);
    setCheckDeleteId(null);
  };

  const startAdd = () => {
    setAddMode(true);
    setEditingId(null);
    setName('');
    setAbbreviation('');
    setCheckDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-on-surface text-2xl font-semibold tracking-tight">
          Disciplines
        </h1>
        <p className="text-on-surface-variant text-sm">Manage discipline categories for people</p>
      </div>

      {/* Loading */}
      {isLoading && <p className="text-on-surface-variant text-sm">Loading...</p>}

      {/* Error */}
      {error && <p className="text-sm text-red-600">{error.message}</p>}

      {/* Table */}
      {!isLoading && !error && (
        <div className="overflow-x-auto">
          <table className="border-outline-variant/15 w-full rounded-sm border text-sm">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="text-on-surface-variant px-4 py-3 text-left font-medium">Name</th>
                <th className="text-on-surface-variant px-4 py-3 text-left font-medium">
                  Abbreviation
                </th>
                <th className="text-on-surface-variant px-4 py-3 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {disciplines?.map((d) => (
                <tr
                  key={d.id}
                  className="border-outline-variant/15 even:bg-surface-container-low/30 border-t"
                >
                  {editingId === d.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          maxLength={50}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="border-outline-variant/30 bg-surface text-on-surface focus:ring-primary w-full rounded-sm border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          maxLength={10}
                          value={abbreviation}
                          onChange={(e) => setAbbreviation(e.target.value)}
                          className="border-outline-variant/30 bg-surface text-on-surface focus:ring-primary w-full rounded-sm border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={handleUpdate}
                            disabled={updateDiscipline.isPending}
                            className="bg-primary text-on-primary rounded-sm px-3 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={resetForm}
                            className="border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high rounded-sm border px-3 py-1.5 text-xs"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="text-on-surface px-4 py-3">{d.name}</td>
                      <td className="text-on-surface px-4 py-3">{d.abbreviation}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => startEdit(d)}
                            className="text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface rounded p-1"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          {checkDeleteId === d.id ? (
                            deleteTarget && deleteTarget.usageCount > 0 ? (
                              <span className="inline-flex items-center gap-1 text-xs text-red-600">
                                Assigned to {deleteTarget.usageCount} people. Remove assignments
                                before deleting.
                                <button
                                  onClick={() => setCheckDeleteId(null)}
                                  className="hover:bg-surface-container-high ml-1 rounded p-0.5"
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleDelete(d.id, d.name)}
                                disabled={deleteDiscipline.isPending}
                                className="rounded-sm bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                              >
                                Confirm Delete
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => setCheckDeleteId(d.id)}
                              className="text-on-surface-variant rounded p-1 hover:bg-red-100 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}

              {/* Add row */}
              {addMode && (
                <tr className="border-outline-variant/15 border-t">
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      maxLength={50}
                      placeholder="Discipline name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="border-outline-variant/30 bg-surface text-on-surface focus:ring-primary w-full rounded-sm border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="Abbr"
                      value={abbreviation}
                      onChange={(e) => setAbbreviation(e.target.value)}
                      className="border-outline-variant/30 bg-surface text-on-surface focus:ring-primary w-full rounded-sm border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={handleCreate}
                        disabled={createDiscipline.isPending}
                        className="bg-primary text-on-primary rounded-sm px-4 py-2 text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                      >
                        Add
                      </button>
                      <button
                        onClick={resetForm}
                        className="border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high rounded-sm border px-3 py-2 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {!addMode && (
            <button
              onClick={startAdd}
              className="bg-primary text-on-primary mt-4 inline-flex items-center gap-1.5 rounded-sm px-4 py-2 text-xs font-semibold hover:opacity-90"
            >
              <Plus size={14} />
              Add Discipline
            </button>
          )}
        </div>
      )}
    </div>
  );
}
