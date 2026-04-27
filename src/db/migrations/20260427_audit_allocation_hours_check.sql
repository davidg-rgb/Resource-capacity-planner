-- v6.0 audit-r2 / R2-P1-10 (F-A-105) — defense-in-depth CHECK constraint.
--
-- ARCHITECTURE.md §7 (allocation contract) requires `allocations.hours`
-- to live in the closed range [0, 744] — 744 = 31 days × 24 hours, the
-- ceiling for a single calendar month. The application layer enforces
-- this via Zod schemas + the BadHoursError thrown by the planning
-- service, but the DB schema itself has historically had no CHECK
-- constraint. R1 fix F-A-011 closed the application-side gap; this
-- migration closes the DB-side gap so a direct INSERT (e.g. from an
-- ad-hoc psql session, a future bulk-import path that bypasses the
-- service, or a buggy migration) cannot violate the invariant.
--
-- Idempotent guard: ADD CONSTRAINT IF NOT EXISTS isn't supported on
-- legacy PG versions, so the DO block checks pg_constraint first.
--
-- NOT wired into drizzle-kit's journal. Operator applies this once
-- manually against the target environment (matches the precedent set
-- by 20260422_polish_* migrations and Phase 51 LEAN-11).
--
-- Runbook: .planning/runbooks/r2-allocation-hours-check.md

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'allocations_hours_within_month_max'
  ) THEN
    ALTER TABLE allocations
      ADD CONSTRAINT allocations_hours_within_month_max
      CHECK (hours >= 0 AND hours <= 744);
  END IF;
END
$$;
