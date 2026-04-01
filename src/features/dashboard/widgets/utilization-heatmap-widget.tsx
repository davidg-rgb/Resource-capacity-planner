'use client';

import React from 'react';
import { Grid3X3 } from 'lucide-react';

import { UtilizationHeatMap } from '@/components/charts/utilization-heat-map';
import { registerWidget } from '../widget-registry';
import type { WidgetProps } from '../widget-registry.types';

// ---------------------------------------------------------------------------
// Utilization HeatMap Widget — renders the static demo heat map
// ---------------------------------------------------------------------------

const UtilizationHeatMapContent = React.memo(function UtilizationHeatMapContent(
  _props: WidgetProps,
) {
  return <UtilizationHeatMap />;
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

registerWidget({
  id: 'utilization-heat-map',
  name: 'Utilization Heat Map',
  description: 'Departmental utilization heat map showing monthly capacity across departments.',
  category: 'health-capacity',
  icon: Grid3X3,
  component: UtilizationHeatMapContent,
  defaultColSpan: 12,
  minColSpan: 6,
  supportedDashboards: ['manager'],
  dataHook: 'static',
});
