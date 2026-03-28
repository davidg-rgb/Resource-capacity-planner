'use client';

import { Check, Pencil, Plus, ShieldAlert, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';

import {
  useCreateProgram,
  useDeleteProgram,
  useProgram,
  usePrograms,
  useUpdateProgram,
} from '@/hooks/use-reference-data';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProgramsPage() {
  const { orgRole } = useAuth();
  const isAdmin = orgRole === 'org:admin' || orgRole === 'org:owner';

  const { data: programs, isLoading, error } = usePrograms();
  const createProgram = useCreateProgram();
  const updateProgram = useUpdateProgram();
  const deleteProgram = useDeleteProgram();

  const [addMode, setAddMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [checkDeleteId, setCheckDeleteId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Fetch usage count when checking delete
  const { data: deleteTarget } = useProgram(checkDeleteId ?? '');

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
    setDescription('');
    setAddMode(false);
    setEditingId(null);
    setCheckDeleteId(null);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createProgram.mutateAsync({
      name: name.trim(),
      description: description.trim() || null,
    });
    resetForm();
  };

  const handleUpdate = async () => {
    if (!editingId || !name.trim()) return;
    await updateProgram.mutateAsync({
      id: editingId,
      data: { name: name.trim(), description: description.trim() || null },
    });
    resetForm();
  };

  const handleDelete = async (id: string, programName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${programName}?`)) return;
    await deleteProgram.mutateAsync(id);
    setCheckDeleteId(null);
  };

  const startEdit = (p: { id: string; name: string; description: string | null }) => {
    setEditingId(p.id);
    setName(p.name);
    setDescription(p.description ?? '');
    setAddMode(false);
    setCheckDeleteId(null);
  };

  const startAdd = () => {
    setAddMode(true);
    setEditingId(null);
    setName('');
    setDescription('');
    setCheckDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-on-surface text-2xl font-semibold tracking-tight">
          Programs
        </h1>
        <p className="text-on-surface-variant text-sm">Manage program categories for projects</p>
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
                  Description
                </th>
                <th className="text-on-surface-variant px-4 py-3 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {programs?.map((p) => (
                <tr
                  key={p.id}
                  className="border-outline-variant/15 even:bg-surface-container-low/30 border-t"
                >
                  {editingId === p.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          maxLength={100}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="border-outline-variant/30 bg-surface text-on-surface focus:ring-primary w-full rounded-sm border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          maxLength={500}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Optional description"
                          className="border-outline-variant/30 bg-surface text-on-surface focus:ring-primary w-full rounded-sm border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={handleUpdate}
                            disabled={updateProgram.isPending}
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
                      <td className="text-on-surface px-4 py-3">{p.name}</td>
                      <td className="text-on-surface-variant px-4 py-3">{p.description ?? '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => startEdit(p)}
                            className="text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface rounded p-1"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          {checkDeleteId === p.id ? (
                            deleteTarget && deleteTarget.usageCount > 0 ? (
                              <span className="inline-flex items-center gap-1 text-xs text-red-600">
                                Assigned to {deleteTarget.usageCount} projects. Remove assignments
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
                                onClick={() => handleDelete(p.id, p.name)}
                                disabled={deleteProgram.isPending}
                                className="rounded-sm bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                              >
                                Confirm Delete
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => setCheckDeleteId(p.id)}
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
                      maxLength={100}
                      placeholder="Program name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="border-outline-variant/30 bg-surface text-on-surface focus:ring-primary w-full rounded-sm border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      maxLength={500}
                      placeholder="Optional description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="border-outline-variant/30 bg-surface text-on-surface focus:ring-primary w-full rounded-sm border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={handleCreate}
                        disabled={createProgram.isPending}
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
              Add Program
            </button>
          )}
        </div>
      )}
    </div>
  );
}
