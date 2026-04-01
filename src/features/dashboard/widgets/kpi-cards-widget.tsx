'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { LayoutDashboard } from 'lucide-react';

import { KPICard } from '@/components/charts/kpi-card';
import { useDashboardKPIs } from '@/hooks/use-dashboard';
import { registerWidget } from '../widget-registry';
import type { WidgetProps } from '../widget-registry.types';

// ---------------------------------------------------------------------------
// KPI Cards Widget — adapts the 4 KPICards to WidgetProps interface
// ---------------------------------------------------------------------------

const KPICardsContent = React.memo(function KPICardsContent({ timeRange }: WidgetProps) {
  const t = useTranslations('widgets.kpiCards');
  const { data: kpis, isLoading, error } = useDashboardKPIs(timeRange.from, timeRange.to);

  if (error) {
    return <div className="text-sm text-red-600">{t('error')}</div>;
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
        {t('empty')}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
      <KPICard
        title={t('totalResources')}
        value={kpis.totalPeople}
        badge={t('newBadge')}
        variant="primary"
        href="/dashboard/team"
      />
      <KPICard
        title={t('avgUtilization')}
        value={`${kpis.utilizationPercent}%`}
        subtitle={t('optimalRange')}
        variant="primary"
        href="/dashboard/team"
      />
      <KPICard
        title={t('overloaded')}
        value={kpis.overloadedCount}
        badge={t('highPriority')}
        variant="error"
        href="/dashboard/team?status=over"
      />
      <KPICard
        title={t('unallocated')}
        value={kpis.underutilizedCount}
        subtitle={t('availableBench')}
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
