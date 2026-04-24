'use client';

// Side-effect import: registers all built-in widgets in the registry
import '@/features/dashboard/widgets';

import { StrategicAlertsBanner } from '@/components/alerts/strategic-alerts-banner';
import { DashboardGrid } from '@/features/dashboard/dashboard-layout-engine';
import { TimeRangeProvider } from '@/features/dashboard/dashboard-time-range';
import { useFlags } from '@/features/flags/flag.context';

export function DashboardContent() {
  // v6.0 Phase 53 POLISH-06: banner component from Plan 04; mounted here above
  // the manager grid when the polish flag is ON. Banner self-hides when alert
  // count is 0; flag-off path preserves the legacy widget-based alerts panel
  // via LEGACY_LAYOUTS.
  const flags = useFlags();

  return (
    <TimeRangeProvider>
      {flags.uiV6Polish && <StrategicAlertsBanner />}
      <DashboardGrid dashboardId="manager" />
    </TimeRangeProvider>
  );
}
