'use client';

import React from 'react';
import { TrendingUp } from 'lucide-react';

import { ProjectImpact } from '@/components/charts/project-impact';
import { registerWidget } from '../widget-registry';
import type { WidgetProps } from '../widget-registry.types';

// ---------------------------------------------------------------------------
// Project Impact Widget — renders the project impact cards
// ---------------------------------------------------------------------------

const ProjectImpactContent = React.memo(function ProjectImpactContent(_props: WidgetProps) {
  return <ProjectImpact />;
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

registerWidget({
  id: 'project-impact',
  name: 'Project Impact',
  description: 'Key projects with resource impact and priority ranking.',
  category: 'breakdowns',
  icon: TrendingUp,
  component: ProjectImpactContent,
  defaultColSpan: 4,
  minColSpan: 4,
  supportedDashboards: ['manager'],
  dataHook: 'static',
});
