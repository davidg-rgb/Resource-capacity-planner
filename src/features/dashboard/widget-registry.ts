import type { WidgetCategory, WidgetDefinition } from './widget-registry.types';

// ---------------------------------------------------------------------------
// Widget Registry — singleton Map keyed by widget ID
// ---------------------------------------------------------------------------

const widgetRegistry = new Map<string, WidgetDefinition>();

/**
 * Register a widget definition. Warns if a widget with the same ID already exists.
 */
export function registerWidget(def: WidgetDefinition): void {
  if (widgetRegistry.has(def.id)) {
    console.warn(
      `[widget-registry] Duplicate widget ID "${def.id}" — overwriting previous registration.`,
    );
  }
  widgetRegistry.set(def.id, def);
}

/**
 * Retrieve a single widget definition by ID.
 */
export function getWidget(id: string): WidgetDefinition | undefined {
  return widgetRegistry.get(id);
}

/**
 * Get all registered widget definitions.
 */
export function getAllWidgets(): WidgetDefinition[] {
  return Array.from(widgetRegistry.values());
}

/**
 * Get widgets that are available on a specific dashboard.
 */
export function getWidgetsByDashboard(dashboardId: string): WidgetDefinition[] {
  return Array.from(widgetRegistry.values()).filter((def) =>
    def.supportedDashboards.includes(dashboardId),
  );
}

/**
 * Get widgets filtered by category.
 */
export function getWidgetsByCategory(category: WidgetCategory): WidgetDefinition[] {
  return Array.from(widgetRegistry.values()).filter((def) => def.category === category);
}
