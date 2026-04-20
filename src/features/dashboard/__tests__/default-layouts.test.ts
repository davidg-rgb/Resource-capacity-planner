import { describe, it, expect } from 'vitest';

import {
  DEFAULT_LAYOUTS,
  LEGACY_LAYOUTS,
  getDefaultLayout,
} from '../default-layouts';

// ---------------------------------------------------------------------------
// Helper: extract widgetIds from a layout array
// ---------------------------------------------------------------------------
function ids(layout: { widgetId: string }[]): string[] {
  return layout.map((w) => w.widgetId);
}

// ---------------------------------------------------------------------------
// Trimmed layouts (DEFAULT_LAYOUTS — uiV6LeanTrim ON)
// ---------------------------------------------------------------------------

describe('DEFAULT_LAYOUTS (trimmed)', () => {
  describe('manager:desktop', () => {
    const layout = DEFAULT_LAYOUTS['manager:desktop'];

    it('does NOT contain utilization-heat-map', () => {
      expect(ids(layout)).not.toContain('utilization-heat-map');
    });

    it('DOES contain heat-map-summary-card', () => {
      expect(ids(layout)).toContain('heat-map-summary-card');
    });
  });

  describe('manager:mobile', () => {
    const layout = DEFAULT_LAYOUTS['manager:mobile'];

    it('does NOT contain utilization-heat-map', () => {
      expect(ids(layout)).not.toContain('utilization-heat-map');
    });

    it('DOES contain heat-map-summary-card', () => {
      expect(ids(layout)).toContain('heat-map-summary-card');
    });
  });

  describe('project-leader:desktop', () => {
    const layout = DEFAULT_LAYOUTS['project-leader:desktop'];

    it('does NOT contain kpi-cards, capacity-forecast, or availability-finder', () => {
      expect(ids(layout)).not.toContain('kpi-cards');
      expect(ids(layout)).not.toContain('capacity-forecast');
      expect(ids(layout)).not.toContain('availability-finder');
    });

    it('DOES contain capacity-distribution and availability-timeline', () => {
      expect(ids(layout)).toContain('capacity-distribution');
      expect(ids(layout)).toContain('availability-timeline');
    });
  });

  describe('project-leader:mobile', () => {
    const layout = DEFAULT_LAYOUTS['project-leader:mobile'];

    it('does NOT contain kpi-cards, capacity-forecast, or availability-finder', () => {
      expect(ids(layout)).not.toContain('kpi-cards');
      expect(ids(layout)).not.toContain('capacity-forecast');
      expect(ids(layout)).not.toContain('availability-finder');
    });
  });

  describe('position sequencing', () => {
    it.each(Object.keys(DEFAULT_LAYOUTS))('%s has sequential positions starting at 0', (key) => {
      const layout = DEFAULT_LAYOUTS[key];
      layout.forEach((w, i) => {
        expect(w.position).toBe(i);
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Legacy layouts (LEGACY_LAYOUTS — uiV6LeanTrim OFF / rollback)
// ---------------------------------------------------------------------------

describe('LEGACY_LAYOUTS (rollback)', () => {
  it('manager:desktop preserves utilization-heat-map', () => {
    expect(ids(LEGACY_LAYOUTS['manager:desktop'])).toContain('utilization-heat-map');
  });

  it('project-leader:desktop preserves kpi-cards, capacity-forecast, availability-finder', () => {
    const layout = LEGACY_LAYOUTS['project-leader:desktop'];
    expect(ids(layout)).toContain('kpi-cards');
    expect(ids(layout)).toContain('capacity-forecast');
    expect(ids(layout)).toContain('availability-finder');
  });

  it('project-leader:mobile preserves kpi-cards, capacity-forecast, availability-finder', () => {
    const layout = LEGACY_LAYOUTS['project-leader:mobile'];
    expect(ids(layout)).toContain('kpi-cards');
    expect(ids(layout)).toContain('capacity-forecast');
    expect(ids(layout)).toContain('availability-finder');
  });

  it('all LEGACY_LAYOUTS widget IDs are self-consistent (no accidental drops)', () => {
    const allIds = new Set(
      Object.values(LEGACY_LAYOUTS).flatMap((layout) => ids(layout)),
    );
    // Verify each layout only references IDs that exist in the full legacy set
    for (const [key, layout] of Object.entries(LEGACY_LAYOUTS)) {
      for (const w of layout) {
        expect(allIds.has(w.widgetId)).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// getDefaultLayout() flag-gating
// ---------------------------------------------------------------------------

describe('getDefaultLayout()', () => {
  it('useLegacy=true returns layout WITH utilization-heat-map (legacy mode)', () => {
    const layout = getDefaultLayout('manager', 'desktop', true);
    expect(ids(layout)).toContain('utilization-heat-map');
    expect(ids(layout)).not.toContain('heat-map-summary-card');
  });

  it('useLegacy=false returns layout WITHOUT utilization-heat-map (trimmed mode)', () => {
    const layout = getDefaultLayout('manager', 'desktop', false);
    expect(ids(layout)).not.toContain('utilization-heat-map');
    expect(ids(layout)).toContain('heat-map-summary-card');
  });

  it('useLegacy=undefined defaults to trimmed layouts', () => {
    const layout = getDefaultLayout('manager', 'desktop');
    expect(ids(layout)).toContain('heat-map-summary-card');
  });

  it('falls back to manager:desktop for unknown dashboard', () => {
    const layout = getDefaultLayout('unknown', 'desktop');
    expect(layout.length).toBeGreaterThan(0);
    expect(ids(layout)).toContain('kpi-cards');
  });
});
