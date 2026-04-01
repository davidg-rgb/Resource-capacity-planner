'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TrendingUp, Loader2 } from 'lucide-react';

import { UtilizationSparklines } from '@/components/charts/utilization-sparklines';
import { useUtilizationTrends } from '@/hooks/use-utilization-trends';
import { registerWidget } from '../widget-registry';
import type { WidgetProps } from '../widget-registry.types';

// ---------------------------------------------------------------------------
// Utilization Trend Sparklines Widget (V4)
// Mini line charts per department/person with trend direction
// ---------------------------------------------------------------------------

const UtilizationSparklinesContent = React.memo(function UtilizationSparklinesContent({
  timeRange,
}: WidgetProps) {
  const t = useTranslations('widgets.sparklines');
  const [viewMode, setViewMode] = useState<'department' | 'person'>('department');
  const limit = viewMode === 'person' ? 10 : undefined;
  const { data, isLoading, error } = useUtilizationTrends(
    viewMode,
    limit,
    timeRange.from,
    timeRange.to,
  );

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

  if (data.entities.length === 0) {
    return <div className="text-on-surface-variant py-10 text-center text-sm">{t('empty')}</div>;
  }

  return (
    <div>
      <h4 className="font-headline mb-4 text-sm font-semibold">{t('title')}</h4>
      <UtilizationSparklines
        entities={data.entities}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
    </div>
  );
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

registerWidget({
  id: 'utilization-sparklines',
  name: 'Utilization Trend Sparklines',
  description:
    'Mini sparkline charts showing 6-month utilization trends per department or top 10 people with direction indicators.',
  category: 'health-capacity',
  icon: TrendingUp,
  component: UtilizationSparklinesContent,
  defaultColSpan: 6,
  minColSpan: 4,
  supportedDashboards: ['manager'],
  dataHook: 'useUtilizationTrends',
});
