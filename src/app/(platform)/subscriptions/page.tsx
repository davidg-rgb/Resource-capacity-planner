'use client';

import { useEffect, useState } from 'react';

interface Tenant {
  id: string;
  name: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  platformNotes: string | null;
}

const STATUS_OPTIONS = ['trial', 'active', 'past_due', 'cancelled', 'suspended'] as const;

const STATUS_COLORS: Record<string, string> = {
  trial: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-red-100 text-red-800',
  past_due: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-800'}`}
    >
      {status}
    </span>
  );
}

interface EditState {
  subscriptionStatus: string;
  trialEndsAt: string;
  platformNotes: string;
}

export default function SubscriptionsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ subscriptionStatus: '', trialEndsAt: '', platformNotes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, []);

  async function fetchTenants() {
    try {
      const res = await fetch('/api/platform/tenants');
      if (!res.ok) throw new Error('Failed to fetch tenants');
      const data = await res.json();
      setTenants(
        data.map((t: Tenant & Record<string, unknown>) => ({
          id: t.id,
          name: t.name,
          subscriptionStatus: t.subscriptionStatus,
          trialEndsAt: t.trialEndsAt,
          platformNotes: t.platformNotes,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function startEdit(tenant: Tenant) {
    setEditingId(tenant.id);
    setEditState({
      subscriptionStatus: tenant.subscriptionStatus,
      trialEndsAt: tenant.trialEndsAt ? tenant.trialEndsAt.slice(0, 10) : '',
      platformNotes: tenant.platformNotes ?? '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState({ subscriptionStatus: '', trialEndsAt: '', platformNotes: '' });
  }

  async function saveEdit(orgId: string) {
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      const original = tenants.find((t) => t.id === orgId);
      if (editState.subscriptionStatus !== original?.subscriptionStatus) {
        body.subscriptionStatus = editState.subscriptionStatus;
      }
      if (editState.trialEndsAt) {
        body.trialEndsAt = new Date(editState.trialEndsAt).toISOString();
      }
      if (editState.platformNotes !== (original?.platformNotes ?? '')) {
        body.platformNotes = editState.platformNotes;
      }

      if (Object.keys(body).length > 0) {
        const res = await fetch(`/api/platform/subscriptions/${orgId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Save failed');
      }
      cancelEdit();
      await fetchTenants();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 font-headline text-2xl font-semibold text-slate-900">Subscriptions</h1>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded bg-slate-200" />
          ))}
        </div>
      ) : tenants.length === 0 ? (
        <p className="text-sm text-slate-500">No organizations found.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Organization</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Trial Ends</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {tenants.map((tenant) => {
                const isEditing = editingId === tenant.id;
                return (
                  <tr key={tenant.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
                      {tenant.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {isEditing ? (
                        <select
                          value={editState.subscriptionStatus}
                          onChange={(e) => setEditState({ ...editState, subscriptionStatus: e.target.value })}
                          className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      ) : (
                        <StatusBadge status={tenant.subscriptionStatus} />
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                      {isEditing ? (
                        <input
                          type="date"
                          value={editState.trialEndsAt}
                          onChange={(e) => setEditState({ ...editState, trialEndsAt: e.target.value })}
                          className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      ) : (
                        tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toLocaleDateString() : 'N/A'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {isEditing ? (
                        <textarea
                          value={editState.platformNotes}
                          onChange={(e) => setEditState({ ...editState, platformNotes: e.target.value })}
                          className="w-full min-w-[200px] rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                          rows={2}
                        />
                      ) : (
                        <span className="line-clamp-2">{tenant.platformNotes ?? '-'}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(tenant.id)}
                            disabled={saving}
                            className="text-sm font-medium text-green-600 hover:text-green-800 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-sm font-medium text-slate-500 hover:text-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(tenant)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
