import { describe, it, expect } from 'vitest';

import sv from '../sv.json';
import en from '../en.json';
import { V5_KEYS, flattenKeys } from '../keys';

function resolve(obj: unknown, dotted: string): unknown {
  return dotted.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object' && k in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, obj);
}

const svV5 = (sv as Record<string, unknown>).v5 as Record<string, unknown>;
const enV5 = (en as Record<string, unknown>).v5 as Record<string, unknown>;

describe('messages/keys.ts (FOUND-V5-05)', () => {
  it('FOUND-V5-05-a: every key in messages/keys.ts exists in sv.json', () => {
    const missing: string[] = [];
    for (const key of V5_KEYS) {
      const v = resolve(sv, key);
      if (typeof v !== 'string') missing.push(key);
    }
    expect(missing, `Missing in sv.json: ${missing.join(', ')}`).toEqual([]);
  });

  it('FOUND-V5-05-b: sv.json and en.json have identical key sets under v5.*', () => {
    const svKeys = flattenKeys(svV5).sort();
    const enKeys = flattenKeys(enV5).sort();
    expect(enKeys).toEqual(svKeys);
  });

  it('FOUND-V5-05-c: every sv.json value under v5.* is a non-empty string (EN may be empty)', () => {
    const empty: string[] = [];
    for (const k of flattenKeys(svV5)) {
      const v = resolve(svV5, k);
      if (typeof v !== 'string' || v.length === 0) empty.push(`v5.${k}`);
    }
    expect(empty, `Empty sv.json values: ${empty.join(', ')}`).toEqual([]);
  });

  it('FOUND-V5-05-d: ARCHITECTURE catalog coverage — required namespaces present', () => {
    const required = ['persona', 'timeline', 'approval', 'drawer', 'screens', 'errors', 'common'];
    for (const ns of required) {
      expect(typeof svV5[ns]).toBe('object');
    }
    // Spot-check the historic dialog body wording.
    const body = resolve(sv, 'v5.timeline.historic.dialogBody');
    expect(typeof body).toBe('string');
    expect(body as string).toContain('historisk planering');
    // Spot-check error taxonomy presence.
    expect(resolve(sv, 'v5.errors.HISTORIC_CONFIRM_REQUIRED')).toBeTruthy();
  });
});
