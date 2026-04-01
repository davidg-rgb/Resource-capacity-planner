'use client';

import React from 'react';
import { PieChart, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DisciplineChart } from '@/components/charts/discipline-chart';
import { useDisciplineBreakdown } from '@/hooks/use-dashboard';
import { registerWidget } from '../widget-registry';
import type { WidgetProps } from '../widget-registry.types';

// ---------------------------------------------------------------------------
// Discipline Chart Widget — fetches discipline breakdown data internally
// ---------------------------------------------------------------------------

const DisciplineChartContent = React.memo(function DisciplineChartContent({
  timeRange,
}: WidgetProps) {
  const t = useTranslations('widgets.disciplineChart');
  const { data, isLoading, error } = useDisciplineBreakdown(timeRange.from, timeRange.to);

  if (error) {
    return (
      <div className="text-destructive flex items-center justify-center py-10 text-sm">
        {t('error')}
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="text-on-surface-variant py-10 text-center text-sm">{t('empty')}</div>;
  }

  return (
    <div>
      <h4 className="font-headline mb-4 text-sm font-semibold">{t('title')}</h4>
      <DisciplineChart data={data} />
    </div>
  );
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

registerWidget({
  id: 'discipline-chart',
  name: 'Discipline Chart',
  description: 'Horizontal bar chart showing total hours per discipline.',
  category: 'breakdowns',
  icon: PieChart,
  component: DisciplineChartContent,
  defaultColSpan: 6,
  minColSpan: 4,
  supportedDashboards: ['manager'],
  dataHook: 'useDisciplineBreakdown',
});
