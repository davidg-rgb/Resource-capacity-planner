# Round 3 Consolidated Findings

**Scanned at:** 2026-04-27
**Codebase HEAD:** `09da8fc` (post Round-2 fixes)

## Headline

**Convergence achieved at the code level.** All P0s from Rounds 1 and 2 verified holding. **0 NEW P0**, **1 NEW P1** (doc-only), **6 NEW P2**, **8 NEW P3**, plus **3 pre-existing test-debt items**.

## R1 + R2 fix verification (cross-agent)

| Round | Verdict |
|---|---|
| Round 1 P0 (9 items) | ALL PASS |
| Round 1 P1 (12 code-fixes) | ALL PASS |
| Round 2 P0 (2 items) | ALL PASS |
| Round 2 P1 (10 items) | ALL PASS |
| Round 2 cheap P2 (4 items) | ALL PASS |
| Round 2 doc-modernization | PASS for primary anchors; **6 patches have residue elsewhere in v5.0-ARCHITECTURE.md** |

## NEW findings — Round 3

### P1 (1 item, doc-only)

#### R3-P1-01 — Plan §2 still asserts `permanent: true` (308) — contradicts shipped code (R1 D-CR-16)
- **Source:** Agent C (C-R3-P1-1)
- **Doc:** `UI-RESTRUCTURE-PLAN-v2.md:118-126` shows redirect block with `permanent: true`; narrative says "Permanent (308) redirects preserve the request method..."
- **Code:** `next.config.ts` ships `permanent: false` (307) for `/team*`, `/projects` per R1 D-CR-16 deliberate "mid-rollout, don't pin destination prematurely" rationale
- **Action:** doc-fix — annotate §2 with R3 deferral note (similar to R2 P1-08 pattern)

### P2 (6 items)

#### R3-P2-01..03 — v5.0-ARCHITECTURE.md doc residue from R2 sweep (Agent B)
- **F-B-201:** F-B-110 has 5 stale `distributeWeekly`/`distributeMonthly` references at §6.1:535,539,586; §13:1958; §15.6 TC-AC-001..006:2127-2132
- **F-B-202:** F-B-112 has 4 stale `submitProposal` references at §9 wire-trace:1590,1592; §15.5 TC-PR-001/002:2111-2112; §17 TC-PR-014:2320
- **F-B-204:** F-B-115 patch added contradictory duplicate at §6.1:508-514 vs correct entry at :588-594
- **Action:** doc-fix sweep — single commit clearing all 3

#### R3-P2-04 — F-B-100 partial: §15.10 TC-API-004 line 2180 still says 400
- **Source:** Agent B
- **Action:** doc-fix — change `400` → `409` in TC-API-004

#### R3-P2-05 — Plan §6 i18n key inventory undercounts by 1 (now 19, table lists 18)
- **Source:** Agent C (C-R3-P2-2)
- **Action:** doc-fix — append `sidebar.personaSections.adminMembers` row + bump count 18 → 19

#### R3-P2-06 — Misleading nav label "Reference Data" → "Disciplines"
- **Source:** Agent D (D-CR-200)
- **File:** `src/components/layout/side-nav.tsx:143`
- **Action:** code-fix — change `labelKey: 'referenceData'` → `labelKey: 'disciplines'`

#### R3-P2-07 — Dead-link twin in `person-sidebar.tsx` (mirrors R2-P1-03)
- **Source:** Agent D (D-CR-201)
- **File:** `src/components/person/person-sidebar.tsx:46-71`
- **Action:** code-fix — remove New Entry button; point Help at `/help`; drop Archive

### P3 (8 items, mostly cosmetic)

- **R3-P3-01:** F-B-200 — F-B-104 note uses non-existent context key `supersededByProposalId` (code uses `winnerId`). Doc-fix.
- **R3-P3-02:** F-B-203 — `DUPLICATE_PROPOSAL` translation key remains in `keys.ts:216`, `sv.json:701`, `en.json:636` despite no service throwing it. Code-fix (cosmetic).
- **R3-P3-03:** D-CR-202 — Orphan `sidebar.newEntry`, `sidebar.archive` keys after R2-P1-03. Code-fix (cosmetic).
- **R3-P3-04:** D-CR-203 — Stale `nav.members`, `nav.membersDesc` keys after R2-P1-09. Code-fix (cosmetic).
- **R3-P3-05:** C-R3-P3-3 — side-nav admin section mixes flat + namespaced i18n keys (cosmetic consistency).
- **R3-P3-06:** C-R3-P3-4 — Empty stub dirs `src/app/(app)/team/` + `src/app/(app)/wishes/` still ship.
- **R3-P3-07:** F-A-200 — 14 residual partially-flat error sites (not user-visible breakage).
- **R3-P3-08:** F-A-201 — D-CR-107 alignment confirmation (non-actionable).

### Pre-existing test debt (3 items)

- **TD-01:** `top-nav.visibleFor.test.tsx` Tests 1, 3, 4, 5, 7 still expect `/projects` + `/team` after R1 C-P2-1 changed to `/admin/projects`/`/admin/people`. **Update expectations only; no source change.**
- **TD-02:** `lean-trim-integration.test.ts` asserts ≥4 `permanent: true`; only 1 since R1 D-CR-16 changed to 307. **Update assertion to match shipped behavior.**
- **TD-03:** `change-log.coverage.test.ts archiveRegisterRow` stub-harness bug (DB stub returns wrong shape).

## Recommended Round 3 fix scope

Single fix agent — small, fast cleanup pass:

1. **R3-P1-01** doc-fix plan §2 redirect status drift
2. **R3-P2-01..04** v5.0-ARCHITECTURE.md doc residue sweep (single commit covering F-B-201, 202, 204, R3-P2-04)
3. **R3-P2-05** plan §6 i18n key count
4. **R3-P2-06, R3-P2-07** code-fixes (label fix + person-sidebar cleanup)
5. **TD-01, TD-02** test-debt fixes
6. **TD-03** change-log harness fix
7. **R3-P3-01..04** cosmetic doc/key cleanup (orphan keys, F-B-200 rename)

P3-05..08 deferred (cosmetic / non-actionable).

## Round 4 expectation

After R3 fixes, Round 4 should find **0 P0/P1/P2** and at most a handful of P3s. We're targeting genuine convergence.
