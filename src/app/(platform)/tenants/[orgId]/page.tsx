'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { FLAG_NAMES, type FlagName } from '@/features/flags/flag.types';

const FLAG_LABELS: Record<FlagName, string> = {
  dashboards: 'Dashboards & Charts',
  pdfExport: 'PDF Export',
  alerts: 'Alerts',
  onboarding: 'Onboarding Wizard',
};

interface ImpersonateUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

interface TenantDetail {
  id: string;
  clerkOrgId: string;
  name: string;
  slug: string;
  subscriptionStatus: string;
  suspendedAt: string | null;
  suspendedReason: string | null;
  trialEndsAt: string | null;
  creditBalanceCents: number;
  platformNotes: string | null;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  trial: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-red-100 text-red-800',
  past_due: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Suspend dialog
  const [showSuspend, setShowSuspend] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  // Delete dialog
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  // Purge dialog
  const [showPurge, setShowPurge] = useState(false);
  const [purgeConfirm, setPurgeConfirm] = useState('');

  // Impersonation
  const [impersonateQuery, setImpersonateQuery] = useState('');
  const [impersonateResults, setImpersonateResults] = useState<ImpersonateUser[]>([]);
  const [impersonateLoading, setImpersonateLoading] = useState(false);
  const [impersonateError, setImpersonateError] = useState('');
  const impersonateDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Feature flags state
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [flagsLoading, setFlagsLoading] = useState(true);

  const fetchFlags = useCallback(async () => {
    try {
      const res = await fetch(`/api/platform/flags/${orgId}`);
      if (!res.ok) throw new Error('Failed to fetch flags');
      const rows: { flagName: string; enabled: boolean }[] = await res.json();
      const flagMap: Record<string, boolean> = {};
      for (const row of rows) {
        flagMap[row.flagName] = row.enabled;
      }
      setFlags(flagMap);
    } catch {
      // Flags section will show all as disabled
    } finally {
      setFlagsLoading(false);
    }
  }, [orgId]);

  async function handleToggleFlag(flagName: string, enabled: boolean) {
    try {
      const res = await fetch(`/api/platform/flags/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flagName, enabled }),
      });
      if (!res.ok) throw new Error('Failed to update flag');
      setFlags((prev) => ({ ...prev, [flagName]: enabled }));
      toast.success('Flag updated');
    } catch {
      toast.error('Failed to update flag');
    }
  }

  const fetchTenant = useCallback(async () => {
    try {
      const res = await fetch(`/api/platform/tenants/${orgId}`);
      if (!res.ok) throw new Error('Failed to fetch tenant');
      setTenant(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchTenant();
    fetchFlags();
  }, [fetchTenant, fetchFlags]);

  async function handleSuspend() {
    if (!suspendReason.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/platform/tenants/${orgId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: suspendReason }),
      });
      if (!res.ok) throw new Error('Suspend failed');
      setShowSuspend(false);
      setSuspendReason('');
      await fetchTenant();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReactivate() {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/platform/tenants/${orgId}/reactivate`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Reactivate failed');
      await fetchTenant();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (deleteConfirm !== tenant?.name) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/platform/tenants/${orgId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: deleteConfirm }),
      });
      if (!res.ok) throw new Error('Delete failed');
      router.push('/platform/tenants');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  }

  function handleExport() {
    toast.info('Exporting tenant data...');
    window.open(`/api/platform/tenants/${orgId}/export`, '_blank');
  }

  async function handlePurge() {
    if (purgeConfirm !== tenant?.name) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/platform/tenants/${orgId}/purge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmName: purgeConfirm }),
      });
      if (!res.ok) throw new Error('Purge failed');
      const data = await res.json();
      const counts = data.deletedCounts;
      toast.success(
        `Purged: ${counts.people} people, ${counts.projects} projects, ${counts.allocations} allocations`,
      );
      setShowPurge(false);
      setPurgeConfirm('');
      await fetchTenant();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Purge failed');
    } finally {
      setActionLoading(false);
    }
  }

  // Impersonation user search
  useEffect(() => {
    if (impersonateDebounce.current) clearTimeout(impersonateDebounce.current);
    if (!impersonateQuery.trim()) {
      setImpersonateResults([]);
      return;
    }
    impersonateDebounce.current = setTimeout(async () => {
      setImpersonateLoading(true);
      try {
        const res = await fetch(
          `/api/platform/users?query=${encodeURIComponent(impersonateQuery)}`,
        );
        if (!res.ok) throw new Error('Search failed');
        const data: ImpersonateUser[] = await res.json();
        setImpersonateResults(data);
      } catch {
        setImpersonateResults([]);
      } finally {
        setImpersonateLoading(false);
      }
    }, 300);
    return () => {
      if (impersonateDebounce.current) clearTimeout(impersonateDebounce.current);
    };
  }, [impersonateQuery]);

  async function handleImpersonate(userId: string) {
    setImpersonateError('');
    setActionLoading(true);
    try {
      const res = await fetch('/api/platform/impersonation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId, targetOrgId: orgId }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? 'Impersonation failed');
      }
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      setImpersonateError(err instanceof Error ? err.message : 'Impersonation failed');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-64 animate-pulse rounded bg-slate-200" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
    );
  }

  if (!tenant) return null;

  const canSuspend =
    tenant.subscriptionStatus === 'active' || tenant.subscriptionStatus === 'trial';
  const canReactivate = tenant.subscriptionStatus === 'suspended';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-headline text-2xl font-semibold text-slate-900">{tenant.name}</h1>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[tenant.subscriptionStatus] ?? 'bg-gray-100 text-gray-800'}`}
        >
          {tenant.subscriptionStatus}
        </span>
      </div>

      {/* Org Info Card */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Organization Details</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-slate-500">Slug</dt>
            <dd className="mt-1 text-sm text-slate-900">{tenant.slug}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Clerk Org ID</dt>
            <dd className="mt-1 font-mono text-sm text-slate-900">{tenant.clerkOrgId}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">People Count</dt>
            <dd className="mt-1 text-sm text-slate-900 tabular-nums">{tenant.userCount}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Created</dt>
            <dd className="mt-1 text-sm text-slate-900">
              {new Date(tenant.createdAt).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Trial Ends</dt>
            <dd className="mt-1 text-sm text-slate-900">
              {tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toLocaleDateString() : 'N/A'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Credit Balance</dt>
            <dd className="mt-1 text-sm text-slate-900 tabular-nums">
              ${(tenant.creditBalanceCents / 100).toFixed(2)}
            </dd>
          </div>
          {tenant.platformNotes && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-slate-500">Platform Notes</dt>
              <dd className="mt-1 text-sm text-slate-900">{tenant.platformNotes}</dd>
            </div>
          )}
          {tenant.suspendedReason && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-slate-500">Suspension Reason</dt>
              <dd className="mt-1 text-sm text-red-700">{tenant.suspendedReason}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Feature Flags */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Feature Flags</h2>
        {flagsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-slate-200" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {FLAG_NAMES.map((flagName) => (
              <div key={flagName} className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-slate-700">
                    {FLAG_LABELS[flagName]}
                  </span>
                </div>
                <button
                  onClick={() => handleToggleFlag(flagName, !flags[flagName])}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    flags[flagName]
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {flags[flagName] ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mb-6 flex flex-wrap gap-3">
        {canSuspend && (
          <button
            onClick={() => setShowSuspend(true)}
            disabled={actionLoading}
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            Suspend
          </button>
        )}
        {canReactivate && (
          <button
            onClick={handleReactivate}
            disabled={actionLoading}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            Reactivate
          </button>
        )}
        <button
          onClick={handleExport}
          disabled={actionLoading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Export Data
        </button>
        <button
          onClick={() => setShowPurge(true)}
          disabled={actionLoading}
          className="rounded-md border border-red-300 bg-red-100 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-200 disabled:opacity-50"
        >
          Purge Data
        </button>
        <button
          onClick={() => setShowDelete(true)}
          disabled={actionLoading}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          Delete
        </button>
      </div>

      {/* Suspend Dialog */}
      {showSuspend && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-amber-800">Suspend Organization</h3>
          <textarea
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="Reason for suspension..."
            className="mb-3 w-full rounded-md border border-amber-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
            rows={3}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSuspend}
              disabled={actionLoading || !suspendReason.trim()}
              className="rounded-md bg-amber-600 px-3 py-1.5 text-sm text-white hover:bg-amber-700 disabled:opacity-50"
            >
              Confirm Suspend
            </button>
            <button
              onClick={() => {
                setShowSuspend(false);
                setSuspendReason('');
              }}
              className="rounded-md bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {showDelete && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-red-800">Delete Organization</h3>
          <p className="mb-3 text-sm text-red-700">
            This action is permanent. Type <strong>{tenant.name}</strong> to confirm.
          </p>
          <input
            type="text"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder={tenant.name}
            className="mb-3 w-full rounded-md border border-red-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={actionLoading || deleteConfirm !== tenant.name}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
            >
              Confirm Delete
            </button>
            <button
              onClick={() => {
                setShowDelete(false);
                setDeleteConfirm('');
              }}
              className="rounded-md bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Purge Dialog */}
      {showPurge && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-red-800">Purge All Tenant Data (GDPR)</h3>
          <p className="mb-3 text-sm text-red-700">
            This will permanently delete ALL data for this organization (people, projects,
            allocations, etc.) but keep the organization record. Type <strong>{tenant.name}</strong>{' '}
            to confirm.
          </p>
          <input
            type="text"
            value={purgeConfirm}
            onChange={(e) => setPurgeConfirm(e.target.value)}
            placeholder={tenant.name}
            className="mb-3 w-full rounded-md border border-red-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handlePurge}
              disabled={actionLoading || purgeConfirm !== tenant.name}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
            >
              Confirm Purge
            </button>
            <button
              onClick={() => {
                setShowPurge(false);
                setPurgeConfirm('');
              }}
              className="rounded-md bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Impersonate User */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Impersonate User</h2>
        <input
          type="text"
          value={impersonateQuery}
          onChange={(e) => setImpersonateQuery(e.target.value)}
          placeholder="Search for a user to impersonate..."
          className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        {impersonateError && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {impersonateError}
          </div>
        )}
        {impersonateLoading ? (
          <div className="h-10 animate-pulse rounded bg-slate-200" />
        ) : impersonateResults.length > 0 ? (
          <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
            {impersonateResults.map((user) => (
              <div key={user.id} className="flex items-center justify-between px-3 py-2">
                <div>
                  <span className="text-sm text-slate-800">
                    {[user.firstName, user.lastName].filter(Boolean).join(' ') || 'N/A'}
                  </span>
                  <span className="ml-2 font-mono text-xs text-slate-500">
                    {user.email ?? user.id}
                  </span>
                </div>
                <button
                  onClick={() => handleImpersonate(user.id)}
                  disabled={actionLoading}
                  className="rounded bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200 disabled:opacity-50"
                >
                  Impersonate
                </button>
              </div>
            ))}
          </div>
        ) : impersonateQuery.trim() ? (
          <p className="text-sm text-slate-500">No users found</p>
        ) : (
          <p className="text-sm text-slate-500">
            Search for a user by name or email to begin impersonation.
          </p>
        )}
      </div>
    </div>
  );
}
