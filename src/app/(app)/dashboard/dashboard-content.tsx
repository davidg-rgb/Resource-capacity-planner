'use client';

// Side-effect import: registers all built-in widgets in the registry
import '@/features/dashboard/widgets';

import { DashboardGrid } from '@/features/dashboard/dashboard-layout-engine';
import { TimeRangeProvider } from '@/features/dashboard/dashboard-time-range';

export function DashboardContent() {
  return (
    <TimeRangeProvider>
      <DashboardGrid dashboardId="manager" />
    </TimeRangeProvider>
  );
}
