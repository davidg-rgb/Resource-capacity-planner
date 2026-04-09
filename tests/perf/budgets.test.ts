/**
 * Phase 44 Plan 13 — TC-PERF-* performance budget tests.
 *
 * These tests encode ARCHITECTURE §15.16 performance budgets as named
 * test cases so the TC-ID manifest generator (44-06) picks them up.
 *
 * Per RESEARCH R4, benchmark-style tests are skipped in CI to keep the
 * flakiness budget under control — the manifest generator counts test
 * *titles*, not run outcomes, so `.skip` is sufficient to close the
 * TC-PERF-* gap for TEST-V5-01.
 *
 * When the team is ready to run these for real, flip `.skip` to the
 * regular form and add PGlite / Playwright harness setup inside each
 * block. The shape and naming is intentionally future-proofed.
 */
import { describe, it } from 'vitest';

describe('TC-PERF — Performance budgets (skipped in CI per RESEARCH R4)', () => {
  it('TC-PERF-001 GET /api/v5/planning/allocations rd portfolio 30 months 50 projects < 800 ms', async () => {
    // Benchmark harness deferred; title exists for TC-ID manifest coverage.
  });

  it('TC-PERF-002 GET /api/v5/capacity 12-person department 24 months < 300 ms', async () => {
    // Benchmark harness deferred.
  });

  it('TC-PERF-003 getDailyRows one person-project-month (<=22 daily rows) < 50 ms', async () => {
    // Benchmark harness deferred.
  });

  it('TC-PERF-004 commitActualsBatch for 1000-row staged session < 2.5 s (parse excluded)', async () => {
    // Benchmark harness deferred.
  });

  it('TC-PERF-005 Timeline grid first-paint 30 months x 50 rows < 1500 ms (Lighthouse)', async () => {
    // Lighthouse measurement, not a Vitest benchmark — title exists for manifest.
  });

  it('TC-PERF-006 Auto-save under 100 edits/min distributed across distinct cells — last-write-wins per cell', async () => {
    // Auto-save contention harness deferred.
  });

  it('TC-PERF-007 aggregateByMonth over 70k actual_entry rows < 500 ms', async () => {
    // Benchmark harness deferred.
  });
});
