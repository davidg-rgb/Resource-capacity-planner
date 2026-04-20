'use client';

import React from 'react';
import Link from 'next/link';
import { Grid3X3 } from 'lucide-react';

import { registerWidget } from '../widget-registry';
import type { WidgetProps } from '../widget-registry.types';

// ---------------------------------------------------------------------------
// Heat Map Summary Card Widget — CTA replacement for full utilization-heat-map
// ---------------------------------------------------------------------------

const HeatMapSummaryCardContent = React.memo(function HeatMapSummaryCardContent(
  _props: WidgetProps,
) {
  return (
    <div className="bg-surface-container-low rounded-sm p-6">
      <p className="text-on-surface-variant text-sm">
        Se fullstandig varmekarta for teamets belaggning.
      </p>
      <Link
        href="/dashboard/team"
        className="text-primary mt-3 inline-block text-sm font-medium hover:underline"
      >
        Oppna teamoversikt &rarr;
      </Link>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

registerWidget({
  id: 'heat-map-summary-card',
  name: 'Varmekartssammanfattning',
  description: 'Summary card with CTA link to full team heat map on /dashboard/team.',
  category: 'health-capacity',
  icon: Grid3X3,
  component: HeatMapSummaryCardContent,
  defaultColSpan: 12,
  minColSpan: 6,
  supportedDashboards: ['manager'],
  dataHook: 'useHeatMapSummary',
});
