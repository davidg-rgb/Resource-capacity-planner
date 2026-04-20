/**
 * Lean Trim Integration Test — Phase 51 LEAN-01..LEAN-10
 *
 * Verifies all 10 LEAN requirements at the code level:
 *   LEAN-01..03: 308 redirects in next.config.ts
 *   LEAN-04:     /input page empty-state (no duplicate people list)
 *   LEAN-06:     Dead widgets de-registered from registry
 *   LEAN-07:     PL layout trimmed (no kpi-cards, capacity-forecast, availability-finder)
 *   LEAN-08:     Manager layout has heat-map-summary-card, no utilization-heat-map
 *   LEAN-09:     Defensive fallback (covered by widget-fallback.test.ts; cross-referenced)
 *   LEAN-10:     LEGACY_LAYOUTS rollback verification (SC-7 compliance)
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Side-effect import registers all built-in widgets
import '../../dashboard/widgets/index';
import { getWidget, clearRegistry } from '../../dashboard/widget-registry';
import {
  DEFAULT_LAYOUTS,
  LEGACY_LAYOUTS,
  getDefaultLayout,
} from '../../dashboard/default-layouts';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function ids(layout: { widgetId: string }[]): string[] {
  return layout.map((w) => w.widgetId);
}

// ---------------------------------------------------------------------------
// LEAN-01..03: Redirect config assertions
// ---------------------------------------------------------------------------

describe('LEAN-01..03: 308 permanent redirects', () => {
  let configContent: string;

  beforeAll(() => {
    const configPath = resolve(process.cwd(), 'next.config.ts');
    configContent = readFileSync(configPath, 'utf-8');
  });

  it('LEAN-01: /team redirects to /admin/people', () => {
    expect(configContent).toContain("source: '/team'");
    expect(configContent).toContain("destination: '/admin/people'");
  });

  it('LEAN-01: /team/:path* redirects to /admin/people/:path*', () => {
    expect(configContent).toContain("source: '/team/:path*'");
    expect(configContent).toContain("destination: '/admin/people/:path*'");
  });

  it('LEAN-02: /projects redirects to /admin/projects', () => {
    expect(configContent).toContain("source: '/projects'");
    expect(configContent).toContain("destination: '/admin/projects'");
  });

  it('LEAN-03: /wishes redirects to /pm/wishes', () => {
    expect(configContent).toContain("source: '/wishes'");
    expect(configContent).toContain("destination: '/pm/wishes'");
  });

  it('all redirects are permanent (308)', () => {
    // Count occurrences of permanent: true
    const permanentCount = (configContent.match(/permanent:\s*true/g) ?? []).length;
    expect(permanentCount).toBeGreaterThanOrEqual(4);
  });
});

// ---------------------------------------------------------------------------
// LEAN-04: /input page empty-state (no duplicate people list)
// ---------------------------------------------------------------------------

describe('LEAN-04: /input page empty-state', () => {
  let pageContent: string;

  beforeAll(() => {
    const pagePath = resolve(process.cwd(), 'src/app/(app)/input/page.tsx');
    pageContent = readFileSync(pagePath, 'utf-8');
  });

  it('does NOT import usePeople hook', () => {
    expect(pageContent).not.toContain('usePeople');
  });

  it('does NOT render a <ul> element (no people list)', () => {
    expect(pageContent).not.toContain('<ul');
  });

  it('contains empty-state prompt text', () => {
    expect(pageContent).toContain('Valj en person');
  });
});

// ---------------------------------------------------------------------------
// LEAN-06: Dead widgets de-registered from registry
// ---------------------------------------------------------------------------

describe('LEAN-06: dead widgets return undefined from getWidget', () => {
  it('discipline-progress is not registered', () => {
    expect(getWidget('discipline-progress')).toBeUndefined();
  });

  it('discipline-demand is not registered', () => {
    expect(getWidget('discipline-demand')).toBeUndefined();
  });

  it('project-impact is not registered', () => {
    expect(getWidget('project-impact')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// LEAN-07: Project Leader layout trim
// ---------------------------------------------------------------------------

describe('LEAN-07: project-leader layout trimmed', () => {
  const removedWidgets = ['kpi-cards', 'capacity-forecast', 'availability-finder'];

  describe('project-leader:desktop', () => {
    const layout = DEFAULT_LAYOUTS['project-leader:desktop'];

    it('does not contain removed widgets', () => {
      for (const widget of removedWidgets) {
        expect(ids(layout), `unexpected widget: ${widget}`).not.toContain(widget);
      }
    });

    it('still has widgets (not accidentally emptied)', () => {
      expect(layout.length).toBeGreaterThan(0);
    });
  });

  describe('project-leader:mobile', () => {
    const layout = DEFAULT_LAYOUTS['project-leader:mobile'];

    it('does not contain removed widgets', () => {
      for (const widget of removedWidgets) {
        expect(ids(layout), `unexpected widget: ${widget}`).not.toContain(widget);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// LEAN-08: Manager layout trim (utilization-heat-map -> heat-map-summary-card)
// ---------------------------------------------------------------------------

describe('LEAN-08: manager layout trim', () => {
  it('manager:desktop has heat-map-summary-card', () => {
    expect(ids(DEFAULT_LAYOUTS['manager:desktop'])).toContain('heat-map-summary-card');
  });

  it('manager:desktop does NOT have utilization-heat-map', () => {
    expect(ids(DEFAULT_LAYOUTS['manager:desktop'])).not.toContain('utilization-heat-map');
  });

  it('manager:mobile has heat-map-summary-card', () => {
    expect(ids(DEFAULT_LAYOUTS['manager:mobile'])).toContain('heat-map-summary-card');
  });

  it('manager:mobile does NOT have utilization-heat-map', () => {
    expect(ids(DEFAULT_LAYOUTS['manager:mobile'])).not.toContain('utilization-heat-map');
  });
});

// ---------------------------------------------------------------------------
// LEAN-09: Defensive fallback (cross-reference)
// ---------------------------------------------------------------------------

describe('LEAN-09: defensive widget fallback (cross-reference)', () => {
  it('getWidget returns undefined for unknown IDs (contract verified in widget-fallback.test.ts)', () => {
    // This cross-references the dedicated widget-fallback.test.ts from Plan 01
    // which verifies the dashboard-layout-engine renders a placeholder for unknown IDs.
    // Here we just confirm the registry contract holds.
    expect(getWidget('completely-fake-widget-id')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// LEAN-10: LEGACY_LAYOUTS rollback verification (SC-7 off-state)
// ---------------------------------------------------------------------------

describe('LEAN-10: LEGACY_LAYOUTS rollback verification', () => {
  const requiredKeys = [
    'manager:desktop',
    'manager:mobile',
    'project-leader:desktop',
    'project-leader:mobile',
  ];

  it('contains all 4 layout keys', () => {
    for (const key of requiredKeys) {
      expect(LEGACY_LAYOUTS).toHaveProperty(key);
    }
  });

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

  it('getDefaultLayout with useLegacy=true returns layout containing utilization-heat-map', () => {
    const layout = getDefaultLayout('manager', 'desktop', true);
    expect(ids(layout)).toContain('utilization-heat-map');
  });

  it('getDefaultLayout with useLegacy=true does NOT contain heat-map-summary-card', () => {
    const layout = getDefaultLayout('manager', 'desktop', true);
    expect(ids(layout)).not.toContain('heat-map-summary-card');
  });
});
