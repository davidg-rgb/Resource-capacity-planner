'use client';

import React, { useState } from 'react';
import { Layers, Loader2 } from 'lucide-react';

import { StackedAreaDistributionChart } from '@/components/charts/stacked-area-chart';
import { useCapacityDistribution } from '@/hooks/use-capacity-distribution';
import { registerWidget } from '../widget-registry';
import type { WidgetProps } from '../widget-registry.types';

// ---------------------------------------------------------------------------
// Group-by toggle options
// ---------------------------------------------------------------------------

const GROUP_OPTIONS = [
  { value: 'project' as const, label: 'Project' },
  { value: 'department' as const, label: 'Department' },
  { value: 'discipline' as const, label: 'Discipline' },
];

const MAX_GROUPS = 8; // Top 7 + "Other" bucket

// ---------------------------------------------------------------------------
// Capacity Distribution Widget — V5 Stacked Area
// ---------------------------------------------------------------------------

const CapacityDistributionContent = React.memo(function CapacityDistributionContent({
  timeRange,
  config,
}: WidgetProps) {
  const defaultGroupBy = (config?.groupBy as 'project' | 'department' | 'discipline') ?? 'project';
  const [groupBy, setGroupBy] = useState<'project' | 'department' | 'discipline'>(defaultGroupBy);

  const { data, isLoading, error } = useCapacityDistribution(
    timeRange.from,
    timeRange.to,
    groupBy,
    MAX_GROUPS,
  );

  if (error) {
    return (
      <div className="text-destructive flex items-center justify-center py-10 text-sm">
        Failed to load capacity distribution
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

  if (data.groups.length === 0) {
    return (
      <div className="text-on-surface-variant py-10 text-center text-sm">
        No distribution data available for the selected period
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h4 className="font-headline text-sm font-semibold">Capacity Distribution</h4>
        <div className="flex gap-1 rounded-md border p-0.5 text-xs">
          {GROUP_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setGroupBy(opt.value)}
              className={`rounded-sm px-2 py-0.5 transition-colors ${
                groupBy === opt.value
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <StackedAreaDistributionChart
        groups={data.groups}
        other={data.other}
        supply={data.supply}
        months={data.months}
        insight={data.insight}
      />
    </div>
  );
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

registerWidget({
  id: 'capacity-distribution',
  name: 'Capacity Distribution',
  description:
    'Stacked area chart showing hours by project, department, or discipline with supply overlay and "Other" bucket.',
  category: 'breakdowns',
  icon: Layers,
  component: CapacityDistributionContent,
  defaultColSpan: 12,
  minColSpan: 6,
  supportedDashboards: ['project-leader', 'manager'],
  dataHook: 'useCapacityDistribution',
});
