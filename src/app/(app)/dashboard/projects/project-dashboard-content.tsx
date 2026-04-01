'use client';

// Side-effect import: registers all built-in widgets in the registry
import '@/features/dashboard/widgets';

import { DashboardGrid } from '@/features/dashboard/dashboard-layout-engine';
import { TimeRangeProvider } from '@/features/dashboard/dashboard-time-range';

interface ProjectDashboardContentProps {
  projectId?: string;
}

/**
 * Project leader dashboard using the 'project-leader' dashboard ID.
 * The DashboardGrid will load the project-leader default layout from
 * default-layouts.ts (or a user-customized layout if saved).
 */
export function ProjectDashboardContent({ projectId: _projectId }: ProjectDashboardContentProps) {
  return (
    <TimeRangeProvider>
      <DashboardGrid dashboardId="project-leader" />
    </TimeRangeProvider>
  );
}
