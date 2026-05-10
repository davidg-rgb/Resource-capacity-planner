import type { WidgetDefinition } from './widget-registry.types';

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
 * LO-04: registry size. Used by the dashboard layout route to detect the
 * "server-side empty registry" case explicitly instead of probing for a
 * specific widget ID (which silently breaks if that widget is renamed).
 */
export function getRegistrySize(): number {
  return widgetRegistry.size;
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
 * Remove all registered widgets. For test isolation only.
 */
export function clearRegistry(): void {
  widgetRegistry.clear();
}
