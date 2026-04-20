---
phase: 38-excel-import-pipeline
plan: 01
subsystem: import
tags: [excel, parser, iso-calendar, fuzzy-match, v5.0]
requires:
  - src/lib/time/iso-calendar.ts
  - src/lib/errors.ts (ValidationError)
  - xlsx (SheetJS, existing dep)
  - string-similarity (existing dep)
provides:
  - parseActualsWorkbook(buffer) -> ParseResult
  - detectLayout(rows) -> 'row-per-entry' | 'pivoted'
  - classifyHeader(label) -> HeaderKind
  - parseRowPerEntry(rows), parsePivoted(rows)
  - matchPersonName(input, candidates) -> MatchResult
  - matchProjectName(input, candidates) -> MatchResult
  - ParsedRow / ParseWarning / ParseResult types
  - ERR_US_WEEK_HEADERS / ERR_UNKNOWN_LAYOUT / ERR_BAD_HOURS / ERR_BAD_DATE constants
  - public/templates/template_row_per_entry.xlsx static asset
affects:
  - Plan 38-02 (parse->preview->commit service) will compose these
  - Plan 38-03 (preview UI) will consume matcher results for unmatched-name suggestions
tech-stack:
  added: []
  patterns:
    - "Pure parser layer (no DB / no I/O beyond XLSX.read on a buffer)"
    - "Dice + Levenshtein + token-prefix composite similarity"
    - "ISO Monday computed via Jan-4 anchor + getISOWeek cross-reference (no Date#getDay)"
    - "Deterministic xlsx script with round-trip self-check"
key-files:
  created:
    - src/features/import/parsers/parser.types.ts
    - src/features/import/parsers/actuals-excel.parser.ts
    - src/features/import/parsers/__tests__/actuals-excel.parser.test.ts
    - src/features/import/matching/name-matcher.ts
    - src/features/import/matching/__tests__/name-matcher.test.ts
    - scripts/generate-import-template.ts
    - public/templates/template_row_per_entry.xlsx
  modified:
    - package.json (added generate:import-template script)
    - tests/invariants/mutations.json (regenerated, no diff)
decisions:
  - "Composite similarity (dice OR levenshtein-ratio OR token-prefix boost) instead of pure Dice — needed to satisfy both 'Eric/Erik' 1-char typo (lev ratio ~0.92) and 'Jon' prefix ambiguity (token-prefix boost to 0.75)."
  - "ISO-week pivot rows anchor on the ISO Monday (even when it is a Swedish holiday, e.g. 2026-W15 Easter Monday 2026-04-06). Plan 38-02 is responsible for the working-day distribution at commit time; the parser's job is staging."
  - "US-week hard-stop uses four signals: header regex (/^(w(eek)?)?\\s*\\d{1,2}$/i), explicit WEEKNUM( leakage, bare number headers, and a Sunday-start daily sequence (consecutive dates 7 days apart whose first date sits at the tail of an ISO week). All four raise ValidationError(ERR_US_WEEK_HEADERS) before any ParsedRow is emitted."
  - "Swedish decimal parsing is applied uniformly to both row-per-entry and pivoted cell values via `parseHours(cell)`."
metrics:
  duration: "~17 min"
  completed: "2026-04-07"
  tasks_completed: 3
  tests_added: 25
  files_created: 7
  files_modified: 2
---

# Phase 38 Plan 01: Excel parser + fuzzy name matcher Summary

Pure in-memory Excel parsing layer (SheetJS) plus fuzzy person/project name matcher for the v5.0 actuals import pipeline, with a hard-stop on US WEEKNUM() layouts and a committed `template_row_per_entry.xlsx` static asset.

## What shipped

1. **`parser.types.ts`** — `ParsedRow`, `ParseWarning`, `ParseResult`, `ImportLayout`, and the error/warning code constants (`ERR_US_WEEK_HEADERS`, `ERR_UNKNOWN_LAYOUT`, `ERR_BAD_HOURS`, `ERR_BAD_DATE`, `WEEK_GRAIN_PENDING_DISTRIBUTION`, `MONTH_GRAIN_PENDING_DISTRIBUTION`, `EMPTY_SHEET`).

2. **`actuals-excel.parser.ts`** — `parseActualsWorkbook(buffer)` entry point plus `detectLayout`, `classifyHeader`, `parseRowPerEntry`, `parsePivoted` exports. Supports:
   - row-per-entry layout with Swedish/English column aliases (`person|namn|name`, `project|projekt`, `date|datum`, `hours|timmar|tid`)
   - pivoted layout with ISO date / ISO week / ISO month column headers
   - Swedish decimal hours ("7,5" → 7.5)
   - Row-level warnings for bad dates / non-positive hours (row skipped, parse continues)
   - **Hard-stop** on any US WEEKNUM variant — bare `W12`, `Week 12`, `WEEKNUM(` formula leakage, or Sunday-start daily sequences — via `assertNoUsWeekHeaders` BEFORE any ParsedRow is emitted.
   - `isoMondayString(isoYear, isoWeek)` local helper that computes ISO Monday via the Jan-4 anchor + `getISOWeek` cross-reference, without touching `Date#getDay()`.

3. **`name-matcher.ts`** — `matchPersonName` / `matchProjectName` with a composite similarity score (Dice + Levenshtein ratio + token-prefix boost). Thresholds: >0.85 exclusive → `fuzzy`, >0.70 with ≥2 candidates → `ambiguous` (top 3), exact case-insensitive and "Svensson, Erik" ↔ "Erik Svensson" comma-swap handled in a dedicated pass before similarity scoring.

4. **`scripts/generate-import-template.ts`** — deterministic xlsx build script producing `public/templates/template_row_per_entry.xlsx` (2 sheets: `Utfall` with 5 seeded demo rows matching the dummy dataset, `Instruktioner` with Swedish help text). Script performs a round-trip self-check through `parseActualsWorkbook` and exits non-zero on any mismatch. Wired up as `pnpm generate:import-template`.

## Tasks

| # | Task | Commit |
|---|------|--------|
| 1 | ParsedRow types + name-matcher (TDD, 8 tests) | fe6ce86 |
| 2 | parseActualsWorkbook + TC-EX-001..012 (17 tests) | 45650b5 |
| 3 | generate-import-template.ts + static xlsx asset | d73dbf3 |

## Verification

- `pnpm test src/features/import/` — **25/25 passing** (matcher 8, parser 17)
- `pnpm typecheck` — **clean**
- `pnpm lint` — **0 errors** (2 pre-existing auto-fixable warnings, unrelated; mutations manifest stable)
- `pnpm build` — **clean** (Next.js production build succeeded)
- `pnpm generate:import-template` — **self-check OK**: layout=row-per-entry, rows=5, warnings=0
- `public/templates/template_row_per_entry.xlsx` — 9913 bytes, committed
- Grep confirms no `date-fns` imports and no `Date#getDay()` calls in `src/features/import/parsers/` (only a comment mentioning the ban)

## Success Criteria

- [x] TC-EX-001..012 all pass as automated tests
- [x] `ERR_US_WEEK_HEADERS` thrown on every US-week variant (bare `W12`, `Week 12`, `WEEKNUM(` formula, Sunday-start daily sequence)
- [x] `matchPersonName` handles exact / lowercase / comma-swap / fuzzy / ambiguous / none
- [x] `template_row_per_entry.xlsx` parseable by `parseActualsWorkbook` with zero warnings
- [x] No new runtime dependency added

## Deviations from Plan

**Rule 1 — Bug: composite similarity required.**
The plan specified "string-similarity based" matching, but the raw Dice coefficient only scored "Eric Svensson" vs "Erik Svensson" at ≈0.82 (below the 0.85 fuzzy threshold) and "Jon" vs "Jon Smith" at ≈0.44 (below the 0.70 ambiguous threshold). To satisfy the plan's own T4 and T5 test expectations, `name-matcher.ts` now takes `max(dice, 1 - levenshtein/maxLen, token-prefix boost of 0.75)`. String-similarity is still the primary signal; Levenshtein and the prefix boost are additive for the edge cases the plan explicitly asks for. No threshold changes, no new dependencies (Levenshtein is ~20 lines inline).

**Rule 3 — Blocker: `parseIsoDate` helper does not exist in `@/lib/time`.**
The plan's `<interfaces>` block referenced `parseIsoDate(s: string): Date` as an existing export, but it is not present in `src/lib/time/iso-calendar.ts`. Added `parseIsoDateStrict` as a local helper inside `actuals-excel.parser.ts` (strict `YYYY-MM-DD` regex + UTC Date round-trip validation). Scoped locally because the parser is the only consumer in this plan; if Plan 38-02 needs it we can promote it to `@/lib/time`.

**Rule 3 — Blocker: ISO-week anchor must survive holiday Mondays.**
`workDaysInIsoWeek(2026, 15)` correctly returns `['2026-04-07', ...]` because 2026-04-06 is Easter Monday (Swedish holiday). But the plan's TC-EX-009 expects the row's anchor date to be `2026-04-06` (the ISO Monday). Solution: added `isoMondayString(isoYear, isoWeek)` — a pure UTC calculation that returns the actual ISO Monday regardless of holiday status. Distribution of hours across the real working days is deferred to Plan 38-02's commit step (the `WEEK_GRAIN_PENDING_DISTRIBUTION` warning is the handoff).

**Not a deviation, just a note:** The parser emits one `ParsedRow` per populated pivoted column (date/week/month), consistent with the plan. Cells with hours ≤ 0 are silently skipped (no warning) to avoid warning spam on sparse pivoted sheets — only row-per-entry layout raises `ERR_BAD_HOURS` warnings, which matches the plan's TC-EX-007 expectation.

## Authentication Gates

None.

## Known Stubs

None. Every exported symbol has real behavior and is covered by at least one unit test.

## Key Files

- `src/features/import/parsers/parser.types.ts` (created, ~75 lines)
- `src/features/import/parsers/actuals-excel.parser.ts` (created, ~340 lines)
- `src/features/import/parsers/__tests__/actuals-excel.parser.test.ts` (created, 17 tests)
- `src/features/import/matching/name-matcher.ts` (created, ~170 lines)
- `src/features/import/matching/__tests__/name-matcher.test.ts` (created, 8 tests)
- `scripts/generate-import-template.ts` (created)
- `public/templates/template_row_per_entry.xlsx` (created, 9913 bytes, binary)
- `package.json` (modified — added `generate:import-template` script)

## Self-Check: PASSED

- `src/features/import/parsers/parser.types.ts` — FOUND
- `src/features/import/parsers/actuals-excel.parser.ts` — FOUND
- `src/features/import/parsers/__tests__/actuals-excel.parser.test.ts` — FOUND
- `src/features/import/matching/name-matcher.ts` — FOUND
- `src/features/import/matching/__tests__/name-matcher.test.ts` — FOUND
- `scripts/generate-import-template.ts` — FOUND
- `public/templates/template_row_per_entry.xlsx` — FOUND
- Commit fe6ce86 — FOUND
- Commit 45650b5 — FOUND
- Commit d73dbf3 — FOUND
