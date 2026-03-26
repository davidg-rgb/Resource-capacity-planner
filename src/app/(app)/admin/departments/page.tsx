'use client';

import { Check, Pencil, Plus, ShieldAlert, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';

import {
  useCreateDepartment,
  useDeleteDepartment,
  useDepartment,
  useDepartments,
  useUpdateDepartment,
} from '@/hooks/use-reference-data';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DepartmentsPage() {
  const { orgRole } = useAuth();
  const isAdmin = orgRole === 'org:admin' || orgRole === 'org:owner';

  const { data: departments, isLoading, error } = useDepartments();
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();

  const [addMode, setAddMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [checkDeleteId, setCheckDeleteId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');

  // Fetch usage count when checking delete
  const { data: deleteTarget } = useDepartment(checkDeleteId ?? '');

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <ShieldAlert size={48} className="text-outline" />
        <h2 className="font-headline text-lg font-semibold text-on-surface">Access Denied</h2>
        <p className="text-sm text-on-surface-variant">
          You need Admin privileges to manage reference data.
        </p>
      </div>
    );
  }

  const resetForm = () => {
    setName('');
    setAddMode(false);
    setEditingId(null);
    setCheckDeleteId(null);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createDepartment.mutateAsync({ name: name.trim() });
    resetForm();
  };

  const handleUpdate = async () => {
    if (!editingId || !name.trim()) return;
    await updateDepartment.mutateAsync({ id: editingId, data: { name: name.trim() } });
    resetForm();
  };

  const handleDelete = async (id: string, departmentName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${departmentName}?`)) return;
    await deleteDepartment.mutateAsync(id);
    setCheckDeleteId(null);
  };

  const startEdit = (d: { id: string; name: string }) => {
    setEditingId(d.id);
    setName(d.name);
    setAddMode(false);
    setCheckDeleteId(null);
  };

  const startAdd = () => {
    setAddMode(true);
    setEditingId(null);
    setName('');
    setCheckDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight text-on-surface">
          Departments
        </h1>
        <p className="text-sm text-on-surface-variant">Manage department categories for people</p>
      </div>

      {/* Loading */}
      {isLoading && <p className="text-sm text-on-surface-variant">Loading...</p>}

      {/* Error */}
      {error && <p className="text-sm text-red-600">{error.message}</p>}

      {/* Table */}
      {!isLoading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full border border-outline-variant/15 rounded-sm text-sm">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-4 py-3 text-left font-medium text-on-surface-variant">Name</th>
                <th className="px-4 py-3 text-right font-medium text-on-surface-variant">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {departments?.map((d) => (
                <tr key={d.id} className="border-t border-outline-variant/15 even:bg-surface-container-low/30">
                  {editingId === d.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          maxLength={100}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full rounded-sm border border-outline-variant/30 bg-surface px-3 py-2 text-sm text-on-surface focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={handleUpdate}
                            disabled={updateDepartment.isPending}
                            className="rounded-sm bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary hover:opacity-90 disabled:opacity-50"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={resetForm}
                            className="rounded-sm border border-outline-variant/30 px-3 py-1.5 text-xs text-on-surface-variant hover:bg-surface-container-high"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-on-surface">{d.name}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => startEdit(d)}
                            className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
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
                                  className="ml-1 rounded p-0.5 hover:bg-surface-container-high"
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleDelete(d.id, d.name)}
                                disabled={deleteDepartment.isPending}
                                className="rounded-sm bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                              >
                                Confirm Delete
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => setCheckDeleteId(d.id)}
                              className="rounded p-1 text-on-surface-variant hover:bg-red-100 hover:text-red-600"
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
                <tr className="border-t border-outline-variant/15">
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      maxLength={100}
                      placeholder="Department name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-sm border border-outline-variant/30 bg-surface px-3 py-2 text-sm text-on-surface focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={handleCreate}
                        disabled={createDepartment.isPending}
                        className="rounded-sm bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:opacity-90 disabled:opacity-50"
                      >
                        Add
                      </button>
                      <button
                        onClick={resetForm}
                        className="rounded-sm border border-outline-variant/30 px-3 py-2 text-xs text-on-surface-variant hover:bg-surface-container-high"
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
              className="mt-4 inline-flex items-center gap-1.5 rounded-sm bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:opacity-90"
            >
              <Plus size={14} />
              Add Department
            </button>
          )}
        </div>
      )}
    </div>
  );
}
