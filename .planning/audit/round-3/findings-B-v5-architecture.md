# Round 3 Agent B — v5.0-ARCHITECTURE.md verification

**Scanned at:** 2026-04-27
**Codebase HEAD:** `09da8fc`
**Marker count:** 18 `audit-r2 F-B-` markers present

## Round 2 fix verification (F-B-100..115)

| ID | Status |
|---|---|
| F-B-100 (HISTORIC 400→409) | **PARTIAL** — §15.10 TC-API-004 line 2180 still says `400 HISTORIC_CONFIRM_REQUIRED` |
| F-B-101 (US_WEEK_DETECTED) | **PASS** ✓ |
| F-B-102 (capacity GET shape) | **PASS** ✓ |
| F-B-103 (rangeQuarters/Years) | **PASS** ✓ |
| F-B-104 (proposal superseded log) | **PARTIAL** — §6.6:891 says `context.supersededByProposalId` but code writes `winnerId` |
| F-B-105 (ERR_* convention) | **PASS** ✓ |
| F-B-106 (coverage harness) | N/A (out of doc scope) |
| F-B-107 (ValidationError taxonomy) | **PASS** ✓ |
| F-B-108 (import aux codes) | **PASS** ✓ |
| F-B-109 (multi-tenant scoping) | **PASS** ✓ |
| F-B-110 (actuals exports collapsed) | **PARTIAL** — 5 stale residue lines |
| F-B-111 (PATCH allocations errors) | **PASS** ✓ |
| F-B-112 (submitProposal→createProposal) | **PARTIAL** — 4 stale residue lines |
| F-B-113 (actor naming) | **PASS** ✓ |
| F-B-114 (DUPLICATE_PROPOSAL removed) | **PARTIAL** — translation keys still present |
| F-B-115 (currentMonthKey + formatWeekLabel) | **PARTIAL** — patch introduced contradictory duplicate |

## Round 1 carry-over verification

| ID | Status |
|---|---|
| F-B-02 (HistoricConfirmRequiredError canonical) | **PASS** ✓ |
| F-B-08 (eslint regex shared) | **PASS** ✓ |
| F-B-12 (collectBlockers DB-clock) | **PASS** ✓ |
| F-B-14 (ERR_US_WEEK_HEADERS canonical) | **PASS** ✓ |

All 4 R1 carry-overs hold; no regressions.

## New findings (R3)

### F-B-200 (P3) — F-B-104 note uses non-existent context key
- **Doc:** §6.6:891 says `context.supersededByProposalId=<UUID>`
- **Code:** `proposal.service.ts:531` writes `context: { reason: 'superseded_by', winnerId: winner.id }`
- **Action:** doc-fix — rename to `winnerId`

### F-B-201 (P2) — F-B-110 has 5 stale residue lines
- **Doc:** §6.1:535,539,586 still reference `actual.service.distributeWeekly/distributeMonthly`. §13:1958 says `(upsert, distributeWeekly, distributeMonthly)`. §15.6 TC-AC-001..006 (2127-2132) test old method names
- **Action:** doc-fix sweep

### F-B-202 (P2) — F-B-112 has 4 stale residue lines
- **Doc:** §9 wire-trace:1590,1592; §15.5 TC-PR-001/002:2111-2112; §17 TC-PR-014:2320 — still say `submitProposal`
- **Action:** doc-fix — global rename

### F-B-203 (P3) — `DUPLICATE_PROPOSAL` translation key remains
- **Code surface:** `src/messages/keys.ts:216`, `src/messages/sv.json:701`, `src/messages/en.json:636` carry translation entry
- **Service:** zero `throw …DUPLICATE_PROPOSAL` references
- **Action:** code-fix (cosmetic) — drop dead translation keys

### F-B-204 (P2) — F-B-115 patch added duplicate, contradictory entry
- **Doc:** §6.1:508-514 (new F-B-115 lines) list `formatWeekLabel(isoWeek: { year, week })` — **wrong**
- **Doc:** §6.1:588-594 already lists `formatWeekLabel(year, week, locale)` — **correct**
- **Action:** doc-fix — delete duplicate F-B-115 lines 508-514

## Summary

| Severity | Count |
|---|---|
| P2 | 3 (F-B-201, F-B-202, F-B-204) |
| P3 | 2 (F-B-200, F-B-203) |
| **Total new** | **5** |

| R2 verdict | Count |
|---|---|
| PASS | 9 |
| PARTIAL | 6 |
| FAIL | 0 |
| N/A | 1 |

**Headline:** All R2 patches landed at the correct anchor sections, but six only swept the primary occurrence and left residue elsewhere. F-B-115 introduced a fresh contradictory duplicate. Recommend a final coordinated doc-cleanup pass for the 5 residue items.
