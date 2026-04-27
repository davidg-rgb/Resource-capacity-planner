# Fix Agent 1 Report — Regression Restoration

## Mission summary

Commit `27ac599` ("feat(51-02): dashboard_layouts JSONB migration + heat-map-summary-card widget + dead widget de-registration") accidentally rewound 3 files to pre-v6.0 state, undoing Phase 49 + Phase 50 work. The commit's stated scope was the SQL migration + new widget — the file restorations were collateral damage that escaped review.

All three files have been restored, with post-regression patches re-ported on top of the canonical pre-regression state. Atomic commits captured one fix per CONS finding, plus the homeDepartmentId plumbing for CONS-P0-05.

## Commits made

- `577eca2` `fix(audit-r1): CONS-P0-02 restore persona-keyed SECTION_NAV in side-nav`
- `047ea78` `fix(audit-r1): CONS-P0-03 restore persona-aware breadcrumbs + D-CR-06 link/key fixes`
- `9527f02` `fix(audit-r1): CONS-P0-04+RV-01 restore department picker + grouped select in persona-switcher`
- `2d43e58` `fix(audit-r1): CONS-P0-05 plumb homeDepartmentId through buildPersona for PM direct-edit gate`

(Commit ordering above matches the user's specified ordering. Two unrelated parallel-agent commits — `fc22bea` CONS-P1-05 specs and `a13a0a0` CONS-P0-06 rename — landed between commits 2 and 3 from concurrent work; they did not conflict with mine.)

## Tests passing after restoration

All tests pass with the restored components.

| Test file | Result |
|---|---|
| `src/components/layout/__tests__/breadcrumbs.test.tsx` | 9/9 pass |
| `src/components/layout/__tests__/side-nav.test.tsx` | 5/5 pass |
| `src/components/persona/__tests__/persona-switcher.test.tsx` | 16/16 pass |
| `src/components/persona/__tests__/persona-switcher.lm-suffix.test.tsx` | 3/3 pass |
| `src/components/persona/__tests__/persona.contract.test.tsx` | 7/7 pass |
| `src/components/persona/__tests__/notification-bell.test.tsx` | 9/9 pass |
| `src/components/persona/__tests__/pending-wish-chip.test.tsx` | 6/6 pass |
| `src/components/layout/__tests__/top-nav.visibleFor.test.tsx` | 7/7 pass |
| `src/features/proposals/__tests__/edit-gate.test.ts` | 10/10 pass |

Combined sweep of `src/components/persona/__tests__/` + `src/components/layout/__tests__/` + edit-gate: **72/72 pass**.

## Restoration strategy per file

### `src/components/layout/side-nav.tsx`
- Pre-regression canonical: `65c186f` (Phase 50-02). No post-regression commits touched this file, so a straight restoration was used.
- Commit body: `577eca2`.

### `src/components/layout/breadcrumbs.tsx`
- Pre-regression canonical: `765a98b` (Phase 50-02). No post-regression commits touched this file.
- Folded in two D-CR-06 review enhancements that the canonical state didn't have:
  - `key={`${i}-${segment}`}` instead of `key={segment}` (avoids React duplicate-key collisions on paths with repeated segments such as `/admin/admin`).
  - Empty pathname `/` with flag OFF now renders a bare Home anchor instead of an empty nav.
- **Skipped** the persona-acronym label-map (`pm → 'PM'`, `rd → 'R&D'`, `lm → 'LM'`) — the canonical snapshot tests assert literal lowercase `pm`/`rd` text content via `screen.getByText('pm')`, and the constraint forbids editing tests to fit a feature change. See "Issues encountered" below.
- Commit body: `047ea78`.

### `src/components/persona/persona-switcher.tsx`
- Pre-regression canonical: `d437c69` (Phase 50-03 merge — grouped persona switcher Wave 2).
- Re-ported two post-regression commits that built on the broken baseline:
  - `ab9fc7c` (Phase 52-04 LM-01 / D-06): LM `<option>` count suffix `(N)` when persona is line-manager, `uiV6PerJourney` flag is ON, and queue count > 0. Lives in `LegacyPersonaSwitcher` because the lm-suffix tests use legacy mode (set `uiV6PerJourney: true` but `uiV6Landing: false`).
  - `0277d4c` (Phase 52 WR-05): `handleKindChange` reverts `<select>` DOM value to `persona.kind` when `buildPersona()` returns null, so the dropdown doesn't lie when PM/Staff are picked before `/api/people` resolves.
- Split into two atomic commits:
  - `9527f02`: pure restoration (4-arg `buildPersona`).
  - `2d43e58`: CONS-P0-05 enhancement adding optional 5th `homeDepartmentId` parameter and the lookup logic in all 3 PM code-paths (grouped `handleChange`, legacy `handleKindChange`, legacy `handlePersonChange`).

### CONS-P0-05 plumbing (`src/components/persona/persona-switcher.tsx` only)
- Verified `/api/people` (route `src/app/api/people/route.ts` → service `listPeople`) already returns `departmentId` in the response payload because `db.select().from(schema.people)` projects every column. No API change was required, only the client-side type addition + lookup logic.
- `Persona` type at `src/features/personas/persona.types.ts:7` already had the optional `homeDepartmentId?: string` field — it was just never populated. Now populated for every PM persona built by either switcher.
- The pure edit-gate at `src/features/proposals/edit-gate.ts:34-40` is now reachable for PMs editing in their home department; previously the `'direct'` branch was effectively dead because `persona.homeDepartmentId` was always undefined in production.

## Issues encountered

1. **D-CR-06 label-map skipped due to test-contract conflict.** The user-instructed enhancement to map `pm → 'PM'`, `rd → 'R&D'`, `lm → 'LM'` would force a rewrite of the existing `breadcrumbs.test.tsx` snapshot file plus the `screen.getByText('pm')` assertion at line 86. The constraint "do NOT change tests beyond fixing references that the restored components no longer match" makes the label-map mutually exclusive with the canonical test contract. Documented in commit `047ea78`'s body and noted here for follow-up: this is a pure-cosmetic improvement that should land in a separate commit pair (`feat(...): label-map for persona acronyms` + `test(...): update breadcrumbs snapshot/assertions`).

2. **Pre-commit lint-staged swept 6 unrelated files into commit `9527f02`.** Concurrent work by parallel fix agents had left 6 files (3 i18n message files, 3 persona-route-guard test/source files) with already-staged or working-tree changes that prettier reformatted when lint-staged ran. The persona-switcher restoration itself is +256/-21 lines on the target file alone; the other 6 files in that commit are formatting-only. Not a regression, but a cleaner alternative would have been to coordinate file-locking across the parallel-agent batch.

3. **Pre-existing typecheck noise.** `pnpm tsc --noEmit` reports 7 errors before any of my changes:
   - 3 `.next/types/validator.ts` errors for stale build-artifact references to non-existent page modules
   - 1 `e2e/helpers/a11y.ts` missing `@axe-core/playwright`
   - 3 `*.tsx` files missing `focus-trap-react`

   None of them touch the files I restored — verified by filtering `tsc` output for `persona-switcher`, `side-nav`, `breadcrumbs`, `edit-gate` (zero hits). I did not install missing packages because the constraint says "Do NOT touch package.json or install new packages".

## Verification

- `pnpm tsc --noEmit`: 7 pre-existing errors unrelated to restored files; 0 errors in the restored files (filtered).
- `pnpm vitest run src/components/persona/__tests__/ src/components/layout/__tests__/ src/features/proposals/__tests__/edit-gate.test.ts`: **72/72 pass** in 4.26s.
- All 4 atomic commits landed locally; nothing pushed to remote (per constraint).
- `.tmp-restore/` scratch directory cleaned up.
