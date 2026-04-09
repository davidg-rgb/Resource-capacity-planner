// v5.0 — Phase 44 / Plan 44-14 (TEST-V5-02): frozen UUID v5 namespace.
//
// This is the SOLE namespace used by `buildSeed()` (tests/fixtures/seed.ts)
// to generate deterministic UUID v5 IDs via `uuidv5(key, FIXTURE_NS)`.
//
// WARNING: Do NOT change this value. Changing it invalidates every seeded
// ID produced by buildSeed(), which cascades into every integration test
// that imports the seed. The UUID below is a real RFC 4122 v4 UUID picked
// once and frozen for the lifetime of the test suite.
//
// Picked: 2026-04-09 during Phase 44 Wave D.
export const FIXTURE_NS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8' as const;
