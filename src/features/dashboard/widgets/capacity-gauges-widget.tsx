'use client';

import React from 'react';
import { Gauge, Loader2 } from 'lucide-react';

import { CapacityGauges, type GaugeData } from '@/components/charts/capacity-gauges';
import { useUtilizationTrends } from '@/hooks/use-utilization-trends';
import { registerWidget } from '../widget-registry';
import type { WidgetProps } from '../widget-registry.types';

// ---------------------------------------------------------------------------
// Department Capacity Gauges Widget (V6)
// Transforms utilization trends data into gauge format per department
// ---------------------------------------------------------------------------

const CapacityGaugesContent = React.memo(function CapacityGaugesContent({
  timeRange: _timeRange,
}: WidgetProps) {
  const { data, isLoading, error } = useUtilizationTrends('department');

  if (error) {
    return (
      <div className="text-destructive flex items-center justify-center py-10 text-sm">
        Failed to load department capacity data
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
    return (
      <div className="text-on-surface-variant py-10 text-center text-sm">
        No department data available
      </div>
    );
  }

  // Map utilization trends entities to gauge data
  const departments: GaugeData[] = data.entities.map((entity) => ({
    id: entity.id,
    name: entity.name,
    utilizationPercent: entity.currentUtilization,
    headcount: entity.headcount,
    changePercent: entity.changePercent,
    direction: entity.direction,
  }));

  return (
    <div>
      <h4 className="font-headline mb-4 text-sm font-semibold">Department Health</h4>
      <CapacityGauges departments={departments} showTrend />
    </div>
  );
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

registerWidget({
  id: 'capacity-gauges',
  name: 'Department Capacity Gauges',
  description:
    'Radial gauges showing current utilization per department with trend indicators and headcount.',
  category: 'health-capacity',
  icon: Gauge,
  component: CapacityGaugesContent,
  defaultColSpan: 6,
  minColSpan: 4,
  supportedDashboards: ['manager'],
  dataHook: 'useUtilizationTrends',
});
