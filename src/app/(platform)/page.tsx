'use client';

import { useEffect, useState } from 'react';

interface DashboardMetrics {
  totalOrgs: number;
  totalUsers: number;
  totalAllocations: number;
  totalPeople: number;
  orgsByStatus: Record<string, number>;
  recentlyActive: Array<{
    id: string;
    name: string;
    slug: string;
    subscriptionStatus: string;
    updatedAt: string;
  }>;
}

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

function MetricCard({
  title,
  value,
  loading,
}: {
  title: string;
  value: number | string;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      {loading ? (
        <div className="mt-2 h-8 w-20 animate-pulse rounded bg-slate-200" />
      ) : (
        <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">{value}</p>
      )}
    </div>
  );
}

export default function PlatformDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetch('/api/platform/dashboard');
        if (!res.ok) throw new Error('Failed to fetch dashboard metrics');
        setMetrics(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        {error}
      </div>
    );
  }

  const activeOrgs = metrics?.orgsByStatus?.active ?? 0;
  const trialOrgs = metrics?.orgsByStatus?.trial ?? 0;

  return (
    <div>
      <h1 className="mb-6 font-headline text-2xl font-semibold text-slate-900">Dashboard</h1>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard title="Total Organizations" value={metrics?.totalOrgs ?? 0} loading={loading} />
        <MetricCard title="Total People" value={metrics?.totalPeople ?? 0} loading={loading} />
        <MetricCard title="Total Allocations" value={metrics?.totalAllocations ?? 0} loading={loading} />
        <MetricCard title="Active Orgs" value={activeOrgs} loading={loading} />
        <MetricCard title="Trial Orgs" value={trialOrgs} loading={loading} />
        <MetricCard title="Suspended" value={metrics?.orgsByStatus?.suspended ?? 0} loading={loading} />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Recently Active Organizations</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-slate-200" />
            ))}
          </div>
        ) : metrics?.recentlyActive && metrics.recentlyActive.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {metrics.recentlyActive.map((org) => (
                  <tr key={org.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">{org.name}</td>
                    <td className="whitespace-nowrap px-6 py-4"><StatusBadge status={org.subscriptionStatus} /></td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                      {new Date(org.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No recently active organizations.</p>
        )}
      </div>
    </div>
  );
}
