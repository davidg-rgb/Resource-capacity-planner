---
phase: 2
slug: database-schema-tenant-isolation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (installed as part of Phase 2) |
| **Config file** | `vitest.config.ts` — Wave 0 gap |
| **Quick run command** | `pnpm vitest run --reporter=verbose` |
| **Full suite command** | `pnpm vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm lint && pnpm typecheck`
- **After every plan wave:** Run `pnpm vitest run && pnpm lint && pnpm typecheck && pnpm build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | FOUND-04 | unit | Schema inspection test | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | FOUND-01 | unit | `organization_id` column check | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | FOUND-02 | integration | `vitest run tests/tenant-isolation.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | FOUND-05 | integration | `tsx drizzle/seed.ts` + count query | ❌ W0 | ⬜ pending |
| 02-01-05 | 01 | 1 | FOUND-07 | integration | `curl localhost:3000/api/health` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Vitest installed as dev dependency
- [ ] `vitest.config.ts` — configure with path aliases matching tsconfig
- [ ] Test database setup — separate Neon branch or test DATABASE_URL
- [ ] `tests/tenant-isolation.test.ts` — tenant isolation integration test

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `pnpm db:migrate` creates all tables on Neon | FOUND-04 | Requires live Neon connection | Run migration against Neon, verify via `psql` or Neon console |
| Seed script populates demo org | FOUND-05 | Requires live Neon connection | Run `tsx drizzle/seed.ts`, verify data in Neon console |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
