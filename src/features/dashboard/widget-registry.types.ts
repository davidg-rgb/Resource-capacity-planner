import type { LucideIcon } from 'lucide-react';
import type { FlagName } from '@/features/flags/flag.types';

// ---------------------------------------------------------------------------
// Widget Category
// ---------------------------------------------------------------------------

export type WidgetCategory =
  | 'health-capacity'
  | 'timelines-planning'
  | 'breakdowns'
  | 'alerts-actions';

// ---------------------------------------------------------------------------
// Widget Props — passed to every widget component at render time
// ---------------------------------------------------------------------------

export interface WidgetProps {
  timeRange: { from: string; to: string };
  config?: Record<string, unknown>;
  isEditMode: boolean;
}

// ---------------------------------------------------------------------------
// Widget Definition — the registry entry for a single widget type
// ---------------------------------------------------------------------------

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  category: WidgetCategory;
  icon: LucideIcon;
  component: React.ComponentType<WidgetProps>;
  defaultColSpan: 4 | 6 | 12;
  minColSpan: 4 | 6;
  supportedDashboards: string[];
  requiredFeatureFlag?: FlagName;
  dataHook: string;
}

// ---------------------------------------------------------------------------
// Widget Placement — a positioned widget within a layout
// ---------------------------------------------------------------------------

export interface WidgetPlacement {
  widgetId: string;
  position: number;
  colSpan: 4 | 6 | 12;
  config?: Record<string, unknown>;
  timeRangeOverride?: { from: string; to: string } | null;
}

// ---------------------------------------------------------------------------
// Dashboard Layout Data — the full persisted layout structure
// ---------------------------------------------------------------------------

export interface DashboardLayoutData {
  dashboardId: string;
  deviceClass: 'desktop' | 'mobile';
  widgets: WidgetPlacement[];
  version: number;
}
