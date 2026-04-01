'use client';

import React from 'react';
import { LayoutDashboard } from 'lucide-react';

import { KPICard } from '@/components/charts/kpi-card';
import { useDashboardKPIs } from '@/hooks/use-dashboard';
import { registerWidget } from '../widget-registry';
import type { WidgetProps } from '../widget-registry.types';

// ---------------------------------------------------------------------------
// KPI Cards Widget — adapts the 4 KPICards to WidgetProps interface
// ---------------------------------------------------------------------------

const KPICardsContent = React.memo(function KPICardsContent({ timeRange }: WidgetProps) {
  const { data: kpis, isLoading, error } = useDashboardKPIs(timeRange.from, timeRange.to);

  if (error) {
    return <div className="text-sm text-red-600">Failed to load KPI data</div>;
  }

  if (isLoading || !kpis) {
    return (
      <div className="grid gap-6 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-surface-container-lowest border-primary/10 h-28 animate-pulse rounded-sm border-b-2"
          />
        ))}
      </div>
    );
  }

  if (kpis.totalPeople === 0) {
    return (
      <div className="bg-surface-container-low text-on-surface-variant rounded-sm p-6 text-sm">
        No team members found. Add people to see capacity metrics.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
      <KPICard
        title="Total Resources"
        value={kpis.totalPeople}
        badge="+4 New"
        variant="primary"
        href="/dashboard/team"
      />
      <KPICard
        title="Avg Utilization"
        value={`${kpis.utilizationPercent}%`}
        subtitle="Optimal Range"
        variant="primary"
        href="/dashboard/team"
      />
      <KPICard
        title="Overloaded"
        value={kpis.overloadedCount}
        badge="High Priority"
        variant="error"
        href="/dashboard/team?status=over"
      />
      <KPICard
        title="Unallocated"
        value={kpis.underutilizedCount}
        subtitle="Available Bench"
        variant="outline"
        href="/dashboard/team?status=under"
      />
    </div>
  );
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

registerWidget({
  id: 'kpi-cards',
  name: 'KPI Cards',
  description:
    'Key performance indicators: headcount, utilization, overloaded, and unallocated counts.',
  category: 'health-capacity',
  icon: LayoutDashboard,
  component: KPICardsContent,
  defaultColSpan: 12,
  minColSpan: 6,
  supportedDashboards: ['manager', 'project-leader'],
  dataHook: 'useDashboardKPIs',
});
