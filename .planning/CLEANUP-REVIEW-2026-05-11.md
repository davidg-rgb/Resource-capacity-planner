# Cleanup Review — Resource & Project Planning (2026-05-11)

Codebase-surgeon Phase 5 self-review for the cleanup pass landed on 2026-05-11.

## Surgery summary

| Commit | Change | Net |
|---|---|---|
| `6c6feab` | Remove `allocation.errors.ts` back-compat shim + tidy 2 stale doc comments | −20 |
| `9d0475d` | Remove temp-entities client cascade (hook + route + 3 service fns + 2 types) | −265 |
| `ba8b5fb` | Move `wishes/__tests__/` into `features/proposals/__tests__/`, unexport `parseNumericValue` | net 0 (rename) |
| `de771da` | Fix stale path comment in `pm-timeline-cell.snapshots.test.tsx` (surfaced by Phase 5) | +1 / −1 |

Total: 4 commits, ~285 lines of dead code removed.

## Pass 1 — 2026-05-11

### Reality-check gate
- User chose **R** (full Reviewer 2 + Reviewer 3 in parallel).
- Reviewer 1 (Build Integrity) had already been executed inline three times — typecheck + lint + the moved test ran clean after every batch commit. The mutations-manifest invariant check also passed.

### Reviewer 2 — Reference Completeness
Hunted for surviving references to deleted symbols. For each deleted item, ran fresh greps for:
- Bare identifier name (word-bounded)
- Deleted file path as string literal
- HTTP path of deleted API route (`fetch.*temp-entities`)
- Path-alias forms (`@/hooks/use-scenario-temp-entities` etc.)
- Test fixtures, MSW handlers, Playwright `page.route`, e2e specs
- `package.json`, all `*.config.*`, `eslint.config.mjs`, `vitest.config.ts`
- `tests/invariants/mutations.json` (auto-regenerated)

**Findings:** 0 CRITICAL, 0 WARNING. All 7 deleted items cleared.

### Reviewer 3 — Framework-aware Adversarial
Tried to prove the surgeon wrong. Specific adversarial checks:
1. Was `/api/scenarios/:id/temp-entities` actually called anywhere? → No fetch calls, no URL strings outside `.planning/`.
2. DB table `scenario_temp_entities` consumers besides analytics? → Only `scenario-analytics.service.ts` (correctly retained).
3. Types `ScenarioTempEntity` / `CreateTempEntityRequest` external references? → None.
4. `parseNumericValue` external imports after the unexport? → None — only internal def + call site at lines 66 + 129 of `clipboard-handler.ts`.
5. `HistoricEditNotConfirmedError` / `ERR_HISTORIC_EDIT_NOT_CONFIRMED` external imports? → None — all production consumers already used the canonical `HistoricConfirmRequiredError`.
6. `src/components/wishes/` path references? → One stale comment in `pm-timeline-cell.snapshots.test.tsx:9` (informational, fixed in `de771da`).
7. `@keep` / `@used-by` / `// keep` markers for deleted symbols? → None.
8. e2e tests implicitly depending on the temp-entities endpoint? → None.

**Findings:** 0 CRITICAL, 0 WARNING. Surgeon's claims verified.

### Pass 1 stop condition
Zero CRITICAL and zero WARNING → loop exits at Pass 1. Cleanup is verified safe.

## Verified outcomes

- **Build:** `pnpm typecheck` and `pnpm lint` both pass with 0 errors.
- **Invariants:** `tests/invariants/mutations.json` regenerated from 24 → 22 entries; `check:mutations-manifest` passes (no drift).
- **Tests:** moved test `my-wishes-panel.phase52.test.tsx` runs green (3/3 tests pass at the new location, snapshot resolves cleanly).
- **Retained:** the `scenario_temp_entities` DB table and the `LEFT JOIN` in `scenario-analytics.service.ts` were preserved intentionally. Dropping the table requires a separate decision once analytics path is dropped too.

## Recommended actions

- None blocking.
- Optional: when the user is ready, `git push origin main` will publish 4 commits to Vercel.

## ✅ cleanup verified — safe to ship
