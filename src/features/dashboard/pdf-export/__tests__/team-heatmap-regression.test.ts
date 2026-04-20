/**
 * PDF Regression Test — Team Heatmap Layout Integrity
 *
 * Verifies that the manager dashboard layout used by the PDF export (/api/reports/team-heatmap)
 * has no unresolvable widget references after the Phase 51 lean trim.
 *
 * Per D-06: structural regression test proving no layout references a deleted/unregistered widget,
 * which would cause blank tiles in the PDF.
 */
import { describe, it, expect } from 'vitest';

// Side-effect import registers all built-in widgets
import '../../widgets/index';
import { DEFAULT_LAYOUTS } from '../../default-layouts';
import { getWidget } from '../../widget-registry';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function widgetIds(layoutKey: string): string[] {
  const layout = DEFAULT_LAYOUTS[layoutKey];
  if (!layout) throw new Error(`Layout key "${layoutKey}" not found in DEFAULT_LAYOUTS`);
  return layout.map((w) => w.widgetId);
}

// ---------------------------------------------------------------------------
// PDF export uses the manager:desktop layout — verify all widget IDs resolve
// ---------------------------------------------------------------------------

describe('team-heatmap PDF regression — widget resolution', () => {
  describe('manager:desktop layout', () => {
    const ids = widgetIds('manager:desktop');

    it('has at least 1 widget (not accidentally emptied)', () => {
      expect(ids.length).toBeGreaterThan(0);
    });

    it('every widgetId resolves via getWidget()', () => {
      for (const id of ids) {
        const def = getWidget(id);
        expect(def, `Widget "${id}" is not registered`).toBeDefined();
      }
    });

    it('contains heat-map-summary-card (the replacement widget)', () => {
      expect(ids).toContain('heat-map-summary-card');
    });

    it('does NOT contain utilization-heat-map (trimmed out)', () => {
      expect(ids).not.toContain('utilization-heat-map');
    });
  });

  describe('manager:mobile layout', () => {
    const ids = widgetIds('manager:mobile');

    it('has at least 1 widget (not accidentally emptied)', () => {
      expect(ids.length).toBeGreaterThan(0);
    });

    it('every widgetId resolves via getWidget()', () => {
      for (const id of ids) {
        const def = getWidget(id);
        expect(def, `Widget "${id}" is not registered`).toBeDefined();
      }
    });

    it('contains heat-map-summary-card', () => {
      expect(ids).toContain('heat-map-summary-card');
    });

    it('does NOT contain utilization-heat-map', () => {
      expect(ids).not.toContain('utilization-heat-map');
    });
  });
});
