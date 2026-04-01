'use client';

import React, { useCallback } from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';

import { CapacityForecastChart } from '@/components/charts/capacity-forecast-chart';
import { useCapacityForecast } from '@/hooks/use-capacity-forecast';
import { useCrossLinks } from '../dashboard-cross-links';
import { registerWidget } from '../widget-registry';
import type { WidgetProps } from '../widget-registry.types';

// ---------------------------------------------------------------------------
// Capacity Forecast Widget — V1
// ---------------------------------------------------------------------------

const CapacityForecastContent = React.memo(function CapacityForecastContent({
  timeRange,
  config,
}: WidgetProps) {
  const { data, isLoading, error } = useCapacityForecast(timeRange.from, timeRange.to, {
    projectId: config?.projectId as string | undefined,
    departmentId: config?.departmentId as string | undefined,
  });

  const { emit } = useCrossLinks();

  const handleDeficitClick = useCallback(
    (month: string) => {
      emit({
        source: 'capacity-forecast',
        action: 'open-finder',
        payload: { month },
      });
    },
    [emit],
  );

  if (error) {
    return (
      <div className="text-destructive flex items-center justify-center py-10 text-sm">
        Failed to load capacity forecast
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

  if (data.months.length === 0) {
    return (
      <div className="text-on-surface-variant py-10 text-center text-sm">
        No forecast data available for the selected period
      </div>
    );
  }

  return (
    <div>
      <h4 className="font-headline mb-4 text-sm font-semibold">Capacity Forecast</h4>
      <CapacityForecastChart
        months={data.months}
        supply={data.supply}
        demand={data.demand}
        gap={data.gap}
        summary={data.summary}
        hiringTrigger={config?.hiringTrigger as number | undefined}
        onDeficitClick={handleDeficitClick}
      />
    </div>
  );
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

registerWidget({
  id: 'capacity-forecast',
  name: 'Capacity Forecast',
  description:
    'Line chart showing demand vs supply over time with gap shading and optional hiring trigger line. Click a deficit month to find available resources.',
  category: 'health-capacity',
  icon: TrendingUp,
  component: CapacityForecastContent,
  defaultColSpan: 12,
  minColSpan: 6,
  supportedDashboards: ['manager', 'project-leader'],
  dataHook: 'useCapacityForecast',
});
