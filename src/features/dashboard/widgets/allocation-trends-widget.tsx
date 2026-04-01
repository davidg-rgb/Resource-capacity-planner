'use client';

import React from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';

import { AllocationTrendsChart } from '@/components/project-view/allocation-trends-chart';
import { useProjectStaffing } from '@/hooks/use-project-staffing';
import { registerWidget } from '../widget-registry';
import type { WidgetProps } from '../widget-registry.types';

// ---------------------------------------------------------------------------
// Allocation Trends Widget — wraps existing project-view component
// ---------------------------------------------------------------------------

const AllocationTrendsContent = React.memo(function AllocationTrendsContent({
  timeRange,
  config,
}: WidgetProps) {
  const projectId = config?.projectId as string | undefined;
  const { data, isLoading, error } = useProjectStaffing(projectId, timeRange.from, timeRange.to);

  if (!projectId) {
    return (
      <div className="text-on-surface-variant py-10 text-center text-sm">
        Select a project to view allocation trends
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive flex items-center justify-center py-10 text-sm">
        Failed to load allocation trends
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

  if (data.people.length === 0) {
    return (
      <div className="text-on-surface-variant py-10 text-center text-sm">
        No staffing data for this project in the selected period
      </div>
    );
  }

  return <AllocationTrendsChart people={data.people} months={data.months} />;
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

registerWidget({
  id: 'allocation-trends',
  name: 'Allocation Trends',
  description:
    'Monthly allocation bar chart for a selected project showing total hours trend over time.',
  category: 'timelines-planning',
  icon: TrendingUp,
  component: AllocationTrendsContent,
  defaultColSpan: 6,
  minColSpan: 4,
  supportedDashboards: ['project-leader', 'manager'],
  dataHook: 'useProjectStaffing',
});
