'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

import { StrategicAlerts } from '@/components/charts/strategic-alerts';
import { registerWidget } from '../widget-registry';
import type { WidgetProps } from '../widget-registry.types';

// ---------------------------------------------------------------------------
// Strategic Alerts Widget — renders capacity warnings and recommendations
// ---------------------------------------------------------------------------

const StrategicAlertsContent = React.memo(function StrategicAlertsContent(_props: WidgetProps) {
  return <StrategicAlerts />;
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

registerWidget({
  id: 'strategic-alerts',
  name: 'Strategic Alerts',
  description: 'Critical capacity alerts and resource recommendations.',
  category: 'alerts-actions',
  icon: AlertTriangle,
  component: StrategicAlertsContent,
  defaultColSpan: 12,
  minColSpan: 6,
  supportedDashboards: ['manager'],
  dataHook: 'static',
});
