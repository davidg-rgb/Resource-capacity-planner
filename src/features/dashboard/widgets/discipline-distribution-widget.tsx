'use client';

import React from 'react';
import { PieChart, Loader2 } from 'lucide-react';

import { DisciplineDistribution } from '@/components/project-view/discipline-distribution';
import { useProjectStaffing } from '@/hooks/use-project-staffing';
import { registerWidget } from '../widget-registry';
import type { WidgetProps } from '../widget-registry.types';

// ---------------------------------------------------------------------------
// Discipline Distribution Widget — wraps existing project-view component
// ---------------------------------------------------------------------------

const DisciplineDistributionContent = React.memo(function DisciplineDistributionContent({
  timeRange,
  config,
}: WidgetProps) {
  const projectId = config?.projectId as string | undefined;
  const { data, isLoading, error } = useProjectStaffing(projectId, timeRange.from, timeRange.to);

  if (!projectId) {
    return (
      <div className="text-on-surface-variant py-10 text-center text-sm">
        Select a project to view discipline distribution
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive flex items-center justify-center py-10 text-sm">
        Failed to load discipline distribution
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

  return <DisciplineDistribution people={data.people} months={data.months} />;
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

registerWidget({
  id: 'discipline-distribution',
  name: 'Discipline Distribution',
  description:
    'Progress bars showing the discipline mix (SW, Mek, Elnik) for a selected project by allocated hours.',
  category: 'breakdowns',
  icon: PieChart,
  component: DisciplineDistributionContent,
  defaultColSpan: 6,
  minColSpan: 4,
  supportedDashboards: ['project-leader', 'manager'],
  dataHook: 'useProjectStaffing',
});
