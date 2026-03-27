'use client';

import { useCallback, useEffect, useState } from 'react';

interface AuditEntry {
  id: string;
  adminId: string;
  action: string;
  targetOrgId: string | null;
  targetUserId: string | null;
  impersonationSessionId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditResponse {
  entries: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'admin.login', label: 'Admin Login' },
  { value: 'admin.logout', label: 'Admin Logout' },
  { value: 'impersonation.start', label: 'Impersonation Start' },
  { value: 'impersonation.end', label: 'Impersonation End' },
  { value: 'tenant.suspend', label: 'Tenant Suspend' },
  { value: 'tenant.reactivate', label: 'Tenant Reactivate' },
  { value: 'tenant.delete', label: 'Tenant Delete' },
  { value: 'subscription.update', label: 'Subscription Update' },
  { value: 'user.reset_password', label: 'User Reset Password' },
  { value: 'user.force_logout', label: 'User Force Logout' },
] as const;

const ACTION_BADGE_COLORS: Record<string, string> = {
  'admin.login': 'bg-green-100 text-green-800',
  'admin.logout': 'bg-gray-100 text-gray-800',
  'impersonation.start': 'bg-amber-100 text-amber-800',
  'impersonation.end': 'bg-amber-100 text-amber-800',
  'tenant.suspend': 'bg-blue-100 text-blue-800',
  'tenant.reactivate': 'bg-blue-100 text-blue-800',
  'tenant.delete': 'bg-blue-100 text-blue-800',
  'user.reset_password': 'bg-purple-100 text-purple-800',
  'user.force_logout': 'bg-purple-100 text-purple-800',
  'subscription.update': 'bg-teal-100 text-teal-800',
};

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [adminFilter, setAdminFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (actionFilter) params.set('action', actionFilter);
      if (adminFilter) params.set('adminId', adminFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/platform/audit?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch audit log');
      const data: AuditResponse = await res.json();
      setEntries(data.entries);
      setTotal(data.total);
    } catch {
      // silently fail, show empty
      setEntries([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, actionFilter, adminFilter, startDate, endDate]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [actionFilter, adminFilter, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function getTarget(entry: AuditEntry): string {
    if (entry.targetUserId && entry.targetOrgId) {
      return `User: ${entry.targetUserId.slice(0, 12)}... / Org: ${entry.targetOrgId.slice(0, 8)}...`;
    }
    if (entry.targetOrgId) return `Org: ${entry.targetOrgId.slice(0, 8)}...`;
    if (entry.targetUserId) return `User: ${entry.targetUserId.slice(0, 12)}...`;
    return '-';
  }

  return (
    <div>
      <h1 className="font-headline mb-6 text-2xl font-semibold text-slate-900">Audit Log</h1>

      {/* Filters */}
      <div className="mb-6 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Action</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Admin ID</label>
          <input
            type="text"
            value={adminFilter}
            onChange={(e) => setAdminFilter(e.target.value)}
            placeholder="Filter by admin..."
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-slate-200" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No audit entries found
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Timestamp</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Admin</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Action</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Target</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">IP Address</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600 tabular-nums">
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-800">
                    {entry.adminId.slice(0, 12)}...
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        ACTION_BADGE_COLORS[entry.action] ?? 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{getTarget(entry)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {entry.ipAddress ?? '-'}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-xs text-slate-500">
                    {entry.details ? JSON.stringify(entry.details) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <span>
          {total} total entries &middot; Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
