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

// SystemHealthMetrics type imported from service to avoid duplication
type SystemHealthMetrics = import('@/features/platform/platform-health.service').SystemHealthMetrics;

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function latencyColorClass(ms: number): string {
  if (ms < 0) return 'text-slate-400';
  if (ms < 100) return 'text-green-600';
  if (ms <= 500) return 'text-amber-600';
  return 'text-red-600';
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
        <p className="mt-2 text-3xl font-semibold text-slate-900 tabular-nums">{value}</p>
      )}
    </div>
  );
}

export default function PlatformDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [health, setHealth] = useState<SystemHealthMetrics | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

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

    async function fetchHealth() {
      try {
        const res = await fetch('/api/platform/health');
        if (!res.ok) throw new Error('Failed to fetch health metrics');
        setHealth(await res.json());
      } catch {
        // Health fetch failure is non-critical — dashboard still loads
      } finally {
        setHealthLoading(false);
      }
    }

    fetchMetrics();
    fetchHealth();
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
    );
  }

  const activeOrgs = metrics?.orgsByStatus?.active ?? 0;
  const trialOrgs = metrics?.orgsByStatus?.trial ?? 0;

  return (
    <div>
      <h1 className="font-headline mb-6 text-2xl font-semibold text-slate-900">Dashboard</h1>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard title="Total Organizations" value={metrics?.totalOrgs ?? 0} loading={loading} />
        <MetricCard title="Total People" value={metrics?.totalPeople ?? 0} loading={loading} />
        <MetricCard
          title="Total Allocations"
          value={metrics?.totalAllocations ?? 0}
          loading={loading}
        />
        <MetricCard title="Active Orgs" value={activeOrgs} loading={loading} />
        <MetricCard title="Trial Orgs" value={trialOrgs} loading={loading} />
        <MetricCard
          title="Suspended"
          value={metrics?.orgsByStatus?.suspended ?? 0}
          loading={loading}
        />
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
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-500 uppercase">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {metrics.recentlyActive.map((org) => (
                  <tr key={org.id}>
                    <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-slate-900">
                      {org.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={org.subscriptionStatus} />
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-slate-500">
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

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">System Health</h2>
        <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">DB Latency</p>
            {healthLoading ? (
              <div className="mt-2 h-8 w-20 animate-pulse rounded bg-slate-200" />
            ) : (
              <p className={`mt-2 text-3xl font-semibold tabular-nums ${health ? latencyColorClass(health.dbLatencyMs) : 'text-slate-400'}`}>
                {health && health.dbLatencyMs >= 0 ? `${health.dbLatencyMs}ms` : 'N/A'}
              </p>
            )}
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">DB Status</p>
            {healthLoading ? (
              <div className="mt-2 h-8 w-20 animate-pulse rounded bg-slate-200" />
            ) : (
              <p className={`mt-2 text-3xl font-semibold ${health?.dbConnected ? 'text-green-600' : 'text-red-600'}`}>
                {health?.dbConnected ? 'Connected' : 'Disconnected'}
              </p>
            )}
          </div>
          <MetricCard
            title="Active Connections"
            value={health ? health.activeConnections : 'N/A'}
            loading={healthLoading}
          />
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Error Rate</p>
            {healthLoading ? (
              <div className="mt-2 h-8 w-20 animate-pulse rounded bg-slate-200" />
            ) : (
              <p className={`mt-2 text-3xl font-semibold tabular-nums ${health && health.recentErrors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {health ? (health.recentErrors === 0 ? 'None' : `${health.recentErrors} err`) : 'N/A'}
              </p>
            )}
          </div>
          <MetricCard
            title="Memory (RSS)"
            value={health ? `${health.memoryUsageMb.rss} MB` : 'N/A'}
            loading={healthLoading}
          />
          <MetricCard
            title="Heap Used"
            value={health ? `${health.memoryUsageMb.heapUsed} MB` : 'N/A'}
            loading={healthLoading}
          />
        </div>
        {!healthLoading && health && (
          <p className="text-xs text-slate-400">
            Version {health.version} | Uptime {formatUptime(health.uptime)}
          </p>
        )}
      </div>
    </div>
  );
}
