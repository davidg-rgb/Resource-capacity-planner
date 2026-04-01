'use client';

import React from 'react';
import { PieChart } from 'lucide-react';

import { DisciplineProgress } from '@/components/charts/discipline-progress';
import { registerWidget } from '../widget-registry';
import type { WidgetProps } from '../widget-registry.types';

// ---------------------------------------------------------------------------
// Discipline Progress Widget — renders the demo discipline utilization bars
// ---------------------------------------------------------------------------

const DisciplineProgressContent = React.memo(function DisciplineProgressContent(
  _props: WidgetProps,
) {
  return <DisciplineProgress />;
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

registerWidget({
  id: 'discipline-progress',
  name: 'Discipline Utilization',
  description: 'Progress bars showing utilization percentage per discipline (SW, HW, Mek).',
  category: 'breakdowns',
  icon: PieChart,
  component: DisciplineProgressContent,
  defaultColSpan: 4,
  minColSpan: 4,
  supportedDashboards: ['manager'],
  dataHook: 'static',
});
