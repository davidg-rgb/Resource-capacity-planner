# Phase 33: Foundations — ISO calendar + Swedish holidays — Context

**Gathered:** 2026-04-07
**Status:** Ready for planning
**Source:** Frozen architecture (`.planning/v5.0-ARCHITECTURE.md` §6.1, §15 TC-CAL-*)

<domain>
## Phase Boundary

This phase delivers a single foundational module — `lib/time/iso-calendar.ts` — that becomes the sole source of truth for all date/week/holiday logic used throughout the v5.0 build. Nothing else in v5.0 works without it: the actuals pipeline (largest-remainder distribution across working days), the import pipeline (validating Excel week headers, rejecting US `WEEKNUM()`), the proposal period math, the timeline rendering (53-week column layouts), and the historic-edit guardrail (current month calculation) all call into this module.

**In scope:**
- `lib/time/iso-calendar.ts` module with ISO 8601 week math and Swedish holiday detection
- Hardcoded Swedish holidays for 2026–2030 (source table in ARCHITECTURE.md §6.1)
- Helper functions: `getISOWeek`, `getISOWeekYear`, `getISOWeeksInYear`, `isSwedishHoliday`, `workingDaysInRange`, `isLeap53WeekYear` (or equivalent)
- Formatting helpers for Swedish display (`v.14`, `vecka 14, 2026`)
- Eslint rule (or equivalent enforcement) that forbids other modules from importing `date-fns` week APIs directly or calling `Date#getDay/getDate` for day-of-week decisions — everything must route through `iso-calendar.ts`
- Unit tests covering the TC-CAL-* assertions from ARCHITECTURE.md §15

**Out of scope (belongs to later phases):**
- Role switcher, i18n catalog, historic-edit helper → Phase 34
- Universal `change_log` enforcement → Phase 35
- Any DB schema or migrations → Phase 36+
- Timeline UI rendering → Phase 40–42
- Calendar integration with `actuals.service` distribution → Phase 37

</domain>

<decisions>
## Implementation Decisions

All items below are **locked** — they come directly from the frozen architecture and the 6 client decisions Q1–Q6.

### Week numbering
- **ISO 8601 only.** Monday start. Week 1 = week containing the first Thursday of the year. (ARCHITECTURE.md §6.1, FEEDBACK.md "ISO 8601 / 53-week year")
- **53-week years exist and must be handled first-class.** Next 53-week years: 2026, 2032, 2037. v5.0 ships *into* 2026 — we hit it immediately.
- Never use `Date#getDay` (returns Sunday=0), never use `date-fns` `getWeek()` without `{ weekStartsOn: 1, firstWeekContainsDate: 4 }`. Prefer `getISOWeek` / `getISOWeekYear` from `date-fns` if used, or implement directly.

### Swedish holidays 2026–2030
Hardcoded in the module. Source table (ARCHITECTURE.md §6.1):

| Year | Easter Sun | Good Fri | Easter Mon | Ascension | Midsummer Eve |
|------|------------|----------|------------|-----------|---------------|
| 2026 | Apr 5      | Apr 3    | Apr 6      | May 14    | Jun 19        |
| 2027 | Mar 28     | Mar 26   | Mar 29     | May 6     | Jun 25        |
| 2028 | Apr 16     | Apr 14   | Apr 17     | May 25    | Jun 23        |
| 2029 | Apr 1      | Mar 30   | Apr 2      | May 10    | Jun 22        |
| 2030 | Apr 21     | Apr 19   | Apr 22     | May 30    | Jun 21        |

Fixed-date holidays every year: New Year (Jan 1), Epiphany (Jan 6), May Day (May 1), National Day (Jun 6), Christmas Eve (Dec 24), Christmas (Dec 25), Boxing Day (Dec 26), New Year's Eve (Dec 31).

**For years outside 2026–2030:** throw `ValidationError` with code `ERR_HOLIDAY_YEAR_OUT_OF_RANGE`. Do not compute Easter dynamically — explicit range is safer and avoids Computus bugs.

### Working-day semantics
`workingDaysInRange(startDate, endDate)` returns the count of Mon–Fri days that are NOT Swedish holidays. Used by the actuals distribution algorithm (ADR-010).

### Display formats
- Short: `v.14` (lowercase `v`, period, week number, no year)
- Long: `vecka 14, 2026`
- Component consumers pick the format via helper call — do not inline formatting elsewhere.

### Enforcement layer
At least one mechanism (eslint rule preferred; lint script fallback acceptable) that fails CI when a file outside `lib/time/` imports `date-fns`'s week helpers or reads `.getDay()` for day-of-week decisions. Exceptions whitelisted explicitly.

### Claude's Discretion
- File layout inside `lib/time/` (single file vs split: calendar.ts + holidays.ts + formatters.ts)
- Whether to implement ISO week math directly or wrap `date-fns` with a strict config preset — either is fine as long as the public API is stable and the TC-CAL-* tests pass
- Unit test framework choice (project already uses Vitest — stick with it)
- Eslint rule name and implementation — pick what fits the existing lint config
- Error code exact string for out-of-range holiday years, as long as it's in the AppError taxonomy

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture (frozen)
- `.planning/v5.0-ARCHITECTURE.md` §6.1 — ISO calendar module spec, Swedish holiday table, 53-week year rationale
- `.planning/v5.0-ARCHITECTURE.md` §15 — TC-CAL-* testable assertions (the contract this phase must satisfy)
- `.planning/v5.0-ARCHITECTURE.md` §14 — Stage 0.1 in the implementation roadmap
- `.planning/v5.0-FEEDBACK.md` — Original client requirement driving ISO/53-week handling (line "SE market view weeks differently then US")

### Requirements
- `.planning/REQUIREMENTS.md` — FOUND-V5-01, FOUND-V5-02

### Existing codebase touchpoints (read before writing)
- `src/lib/` — existing lib layout, see if there's an existing `src/lib/time/` or similar
- `package.json` — check whether `date-fns` is already installed and what version
- `eslint.config.*` / `.eslintrc*` — where to add the enforcement rule
- `src/db/schema.ts` — no changes, but note that `allocations` uses monthly grain today; v5.0 day-grain actuals build on top of this module

</canonical_refs>

<specifics>
## Specific Ideas

### Public API shape (target)

```ts
// lib/time/iso-calendar.ts

export function getISOWeek(date: Date): number;
export function getISOWeekYear(date: Date): number;
export function getISOWeeksInYear(year: number): 52 | 53;
export function isISO53WeekYear(year: number): boolean;

export function isSwedishHoliday(date: Date): boolean;
export function getSwedishHolidays(year: number): { date: Date; name: string }[];
export function workingDaysInRange(start: Date, end: Date): Date[]; // returns actual working Date objects, not just count
export function countWorkingDays(start: Date, end: Date): number;

export function formatWeekShort(date: Date): string;   // "v.14"
export function formatWeekLong(date: Date): string;    // "vecka 14, 2026"
export function formatWeekRange(start: Date, end: Date): string;
```

The exact names can be adjusted by the planner, but the set of capabilities above must be covered.

### Test coverage (TC-CAL-*)

From ARCHITECTURE.md §15 — the planner must enumerate each TC-CAL-* assertion and map it to a test case. Notable ones:

- **TC-CAL-001** 2026 has 53 ISO weeks
- **TC-CAL-002** Week 1 of 2027 starts on Monday Jan 4 (because 2026-12-31 falls in W53)
- **TC-CAL-003** Midsummer Eve 2026 = Fri 2026-06-19 is a holiday
- **TC-CAL-004** Jan 1 2026 (Thu) is a holiday AND is in ISO week 1
- **TC-CAL-005** `workingDaysInRange(2026-04-01, 2026-04-30)` excludes Good Fri (Apr 3) + Easter Mon (Apr 6) + May Day falls outside (boundary test)
- **TC-CAL-006** `getSwedishHolidays(2031)` throws `ERR_HOLIDAY_YEAR_OUT_OF_RANGE`
- **TC-CAL-007** `formatWeekShort(2026-06-15)` returns `"v.25"` (Swedish convention)
- **TC-CAL-008** Lint rule flags `date.getDay()` usage outside `lib/time/`

Planner must pull the full TC-CAL-* list from §15 and ensure each has a test.

### Leverage, not reinvent
- `date-fns` may already be installed. If so, wrap its ISO helpers (`getISOWeek`, `getISOWeekYear`) instead of re-implementing. If not, implement directly using the standard algorithm: week number = `floor((day_of_year - day_of_week + 10) / 7)`.

</specifics>

<deferred>
## Deferred Ideas

- **Dynamic Easter computation (Computus algorithm)** — Explicitly deferred. The client's horizon is 2026–2030; hardcoding is safer. Revisit if v6.0 planning demands longer horizon.
- **Non-Swedish locale support** — v5.0 is SE-only. Norwegian / Danish / Finnish holidays are out of scope for this phase and milestone.
- **Half-day holidays** — Some Swedish employers treat Midsummer Eve / Christmas Eve / New Year's Eve as half-days. Deferred: treat as full holidays for now. If client pushes, add a per-holiday `isHalfDay` flag in a later phase.
- **Configurable working week** — Some sites work Mon–Sat. Not for v5.0. Hardcode Mon–Fri.

</deferred>

---

*Phase: 33-foundations-iso-calendar-swedish-holidays*
*Context gathered: 2026-04-07 — derived from frozen architecture, no discuss-phase run needed*
