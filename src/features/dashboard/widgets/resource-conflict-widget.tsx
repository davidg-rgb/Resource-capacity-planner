'use client';

// v6.0 — Phase 53 / Plan 53-05 (POLISH-05): the widget body was extracted
// into `src/components/alerts/resource-conflicts-panel.tsx`. This file now
// keeps the widget registration intact (id `resource-conflicts`, same
// supportedDashboards + dataHook) so LEGACY_LAYOUTS — which still
// references this widget in 3 slots — renders identically when
// `uiV6Polish` is OFF. DEFAULT_LAYOUTS has been stripped of
// `resource-conflicts` in Plan 53-05 (3 slots removed); tenants on the
// post-polish layout reach the panel through `/alerts?tab=conflicts`.

import { AlertOctagon } from 'lucide-react';

import { ResourceConflictsPanel } from '@/components/alerts/resource-conflicts-panel';
import { registerWidget } from '../widget-registry';
import type { WidgetProps } from '../widget-registry.types';

// ---------------------------------------------------------------------------
// Widget component — thin delegate to the extracted panel
// ---------------------------------------------------------------------------

function ResourceConflictWidgetComponent({ timeRange }: WidgetProps) {
  return <ResourceConflictsPanel timeRange={timeRange} />;
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

registerWidget({
  id: 'resource-conflicts',
  name: 'Resource Conflicts',
  description:
    'Overallocated people with per-project breakdown, resolution suggestions, and manual redistribution.',
  category: 'alerts-actions',
  icon: AlertOctagon,
  component: ResourceConflictWidgetComponent,
  defaultColSpan: 12,
  minColSpan: 6,
  supportedDashboards: ['manager', 'project-leader'],
  dataHook: 'useConflicts',
});
