'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import type {
  Announcement,
  AnnouncementSeverity,
} from '@/features/announcements/announcement.types';

const SEVERITY_BADGE: Record<AnnouncementSeverity, string> = {
  info: 'bg-blue-100 text-blue-800',
  warning: 'bg-amber-100 text-amber-800',
  critical: 'bg-red-100 text-red-800',
};

function SeverityBadge({ severity }: { severity: AnnouncementSeverity }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${SEVERITY_BADGE[severity]}`}
    >
      {severity}
    </span>
  );
}

function getStatus(startsAt: string, expiresAt: string | null): { label: string; color: string } {
  const now = Date.now();
  const start = new Date(startsAt).getTime();
  const end = expiresAt ? new Date(expiresAt).getTime() : null;

  if (now < start) return { label: 'Scheduled', color: 'text-slate-500' };
  if (end && now > end) return { label: 'Expired', color: 'text-slate-400' };
  return { label: 'Active', color: 'text-green-600 font-medium' };
}

interface FormData {
  title: string;
  body: string;
  severity: AnnouncementSeverity;
  startsAt: string;
  expiresAt: string;
  targetOrgIds: string;
}

const EMPTY_FORM: FormData = {
  title: '',
  body: '',
  severity: 'info',
  startsAt: new Date().toISOString().slice(0, 16),
  expiresAt: '',
  targetOrgIds: '',
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch('/api/platform/announcements');
      if (!res.ok) throw new Error('Failed to fetch announcements');
      setAnnouncements(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(a: Announcement) {
    setEditingId(a.id);
    setForm({
      title: a.title,
      body: a.body,
      severity: a.severity,
      startsAt: a.startsAt.slice(0, 16),
      expiresAt: a.expiresAt ? a.expiresAt.slice(0, 16) : '',
      targetOrgIds: a.targetOrgIds?.join(', ') ?? '',
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      title: form.title,
      body: form.body,
      severity: form.severity,
      startsAt: new Date(form.startsAt).toISOString(),
    };
    if (form.expiresAt) {
      payload.expiresAt = new Date(form.expiresAt).toISOString();
    }
    if (form.targetOrgIds.trim()) {
      payload.targetOrgIds = form.targetOrgIds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    try {
      const url = editingId
        ? `/api/platform/announcements/${editingId}`
        : '/api/platform/announcements';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          data.message ?? `Failed to ${editingId ? 'update' : 'create'} announcement`,
        );
      }

      toast.success(editingId ? 'Announcement updated' : 'Announcement created');
      closeForm();
      setLoading(true);
      await fetchAnnouncements();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/platform/announcements/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete announcement');
      toast.success('Announcement deleted');
      setConfirmDeleteId(null);
      setLoading(true);
      await fetchAnnouncements();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-headline text-2xl font-semibold text-slate-900">Announcements</h1>
        <button
          onClick={openCreate}
          className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
        >
          Create Announcement
        </button>
      </div>

      {/* Create / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">
              {editingId ? 'Edit Announcement' : 'Create Announcement'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  maxLength={200}
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Body</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  maxLength={2000}
                  required
                  rows={3}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Severity</label>
                <select
                  value={form.severity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, severity: e.target.value as AnnouncementSeverity }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                >
                  <option value="info">Info (Blue)</option>
                  <option value="warning">Warning (Amber)</option>
                  <option value="critical">Critical (Red)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Starts At</label>
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                    required
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Expires At <span className="text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={form.expiresAt}
                    onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Target Org IDs{' '}
                  <span className="text-slate-400">(comma-separated, empty = all)</span>
                </label>
                <textarea
                  value={form.targetOrgIds}
                  onChange={(e) => setForm((f) => ({ ...f, targetOrgIds: e.target.value }))}
                  rows={2}
                  placeholder="Leave empty to target all organizations"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs focus:border-slate-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !form.title || !form.body}
                  className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-slate-900">Delete Announcement</h3>
            <p className="mb-4 text-sm text-slate-600">
              Are you sure you want to delete this announcement? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Announcements Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded bg-slate-200" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <p className="text-sm text-slate-500">No announcements yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-500 uppercase">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-500 uppercase">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-500 uppercase">
                  Starts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-500 uppercase">
                  Expires
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {announcements.map((a) => {
                const status = getStatus(a.startsAt, a.expiresAt);
                return (
                  <tr key={a.id}>
                    <td className="max-w-xs truncate px-6 py-4 text-sm font-medium text-slate-900">
                      {a.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <SeverityBadge severity={a.severity} />
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-slate-500">
                      {new Date(a.startsAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-slate-500">
                      {a.expiresAt ? new Date(a.expiresAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                    </td>
                    <td className="space-x-3 px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => openEdit(a)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(a.id)}
                        className="text-sm font-medium text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
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
