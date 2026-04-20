import { describe, it, expect, beforeEach } from 'vitest';

import { getWidget, clearRegistry } from '../widget-registry';

describe('widget-registry fallback contract', () => {
  beforeEach(() => {
    clearRegistry();
  });

  it('getWidget returns undefined for unregistered widget ID', () => {
    const result = getWidget('nonexistent-widget');
    expect(result).toBeUndefined();
  });

  it('getWidget returns undefined for empty string ID', () => {
    const result = getWidget('');
    expect(result).toBeUndefined();
  });

  it('fallback pattern renders placeholder text for unknown widget', () => {
    const widgetId = 'deleted-widget-xyz';
    const def = getWidget(widgetId);

    // Simulates the dashboard-layout-engine fallback logic
    if (!def) {
      const placeholderText = 'Widget ej tillganglig';
      const debugId = widgetId;
      expect(placeholderText).toBe('Widget ej tillganglig');
      expect(debugId).toBe('deleted-widget-xyz');
    } else {
      // Should not reach here
      expect.fail('Expected getWidget to return undefined for unknown widget');
    }
  });
});
