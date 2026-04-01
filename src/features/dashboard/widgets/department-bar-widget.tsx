'use client';

import React from 'react';
import { BarChart3, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DepartmentBarChart } from '@/components/charts/department-bar-chart';
import { useDepartmentUtilization } from '@/hooks/use-dashboard';
import { registerWidget } from '../widget-registry';
import type { WidgetProps } from '../widget-registry.types';

// ---------------------------------------------------------------------------
// Department Bar Chart Widget — fetches data internally via hook
// ---------------------------------------------------------------------------

const DepartmentBarContent = React.memo(function DepartmentBarContent({ timeRange }: WidgetProps) {
  const t = useTranslations('widgets.departmentBar');
  const { data, isLoading, error } = useDepartmentUtilization(timeRange.from, timeRange.to);

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
      <DepartmentBarChart data={data} />
    </div>
  );
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

registerWidget({
  id: 'department-bar-chart',
  name: 'Department Bar Chart',
  description: 'Horizontal bar chart showing utilization percentage per department.',
  category: 'breakdowns',
  icon: BarChart3,
  component: DepartmentBarContent,
  defaultColSpan: 6,
  minColSpan: 4,
  supportedDashboards: ['manager'],
  dataHook: 'useDepartmentUtilization',
});
