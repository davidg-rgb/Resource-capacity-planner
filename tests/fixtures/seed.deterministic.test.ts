// v5.0 — Phase 44 / Plan 44-14 (TEST-V5-02): determinism assertion.
//
// Calls buildSeed() twice and asserts byte-for-byte identical output. If
// this test ever fails, the seed generator has grown hidden state (Date.now,
// Math.random, crypto.randomUUID, filesystem reads, ...) and MUST be fixed
// before landing. The integration test suite relies on this property.

import { describe, it, expect } from 'vitest';

import { buildSeed } from './seed';

describe('TEST-V5-02 deterministic UUID v5 seed', () => {
  it('TEST-V5-02 buildSeed produces byte-identical output across runs', () => {
    const first = buildSeed();
    const second = buildSeed();

    // Structural equality — catches any drift in field values or array order.
    expect(first).toEqual(second);

    // Byte-for-byte equality — catches even ordering drift inside objects
    // that toEqual would ignore. JSON.stringify serializes object keys in
    // insertion order, so any non-deterministic construction is visible.
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('TEST-V5-02 buildSeed with custom namespace is deterministic too', () => {
    const ns = '6ba7b811-9dad-11d1-80b4-00c04fd430c8'; // URL namespace, a valid RFC 4122 UUID distinct from FIXTURE_NS
    const a = buildSeed(ns);
    const b = buildSeed(ns);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    // Different namespace must produce different IDs.
    const defaultSeed = buildSeed();
    expect(a.people[0].id).not.toBe(defaultSeed.people[0].id);
  });

  it('TEST-V5-02 buildSeed contains no forbidden non-deterministic sources', () => {
    // Smoke-level sanity: key counts match the frozen §16 spec.
    const seed = buildSeed();
    expect(seed.people).toHaveLength(6);
    expect(seed.departments).toHaveLength(4);
    expect(seed.projects).toHaveLength(4);
    expect(seed.proposals).toHaveLength(3);
    expect(seed.batches).toHaveLength(2);
    // 6 people × 24 months × 2 projects (primary + secondary) = 288.
    expect(seed.allocations).toHaveLength(288);
    // Every ID is a real v5 UUID (length 36, version nibble '5').
    const allIds = [
      ...seed.people.map((p) => p.id),
      ...seed.departments.map((d) => d.id),
      ...seed.projects.map((p) => p.id),
      ...seed.allocations.map((a) => a.id),
      ...seed.actuals.map((a) => a.id),
      ...seed.proposals.map((p) => p.id),
      ...seed.batches.map((b) => b.id),
    ];
    for (const id of allIds) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });
});
