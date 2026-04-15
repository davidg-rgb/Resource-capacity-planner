# Phase 48: Pre-flight verification - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-15
**Phase:** 48-pre-flight-verification
**Areas discussed:** Report structure & sign-off, SQL + API-500 verification method, Playwright spec classification rubric, Scope-expansion recording mechanism

---

## Gray-Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Report structure & sign-off | Monolithic vs per-check; what "one reviewer" means for solo+AI dev | ✓ |
| SQL + API-500 verification method | Which env for VERIFY-05 SQL; how to repro admin 500s | ✓ |
| Playwright spec classification rubric | Concrete rubric for keep/update/retire of 12 specs | ✓ |
| Scope-expansion recording mechanism | Where VERIFY-03/-05 expansions land (report, ROADMAP, CONTEXT) | ✓ |

**User's choice:** "run with your recommendation on all gray areas"
**Notes:** User delegated all four gray areas to Claude's recommendation. Claude captured recommended picks as locked decisions (D-01 … D-13) in CONTEXT.md, with rationale noted inline.

---

## Report Structure & Sign-off

| Option | Description | Selected |
|--------|-------------|----------|
| Monolithic `pre-flight-report.md` with per-check sections + summary table | Single file under `.planning/`, sections ordered VERIFY-01..09, each with command + raw output + verdict. Self-review checklist + reviewer-agent pass = sign-off. | ✓ |
| Per-check files + index | 9 separate files plus an index — harder to Ctrl-F, more surface to keep in sync | |
| Monolithic + human approval gate | Requires a human sign-off that doesn't exist in solo+AI dev model | |

**User's choice:** Claude's recommendation (monolithic + reviewer-agent sign-off)
**Notes:** Matches ROADMAP wording ("pre-flight-report.md under .planning/"). Reviewer-agent satisfies "signed off by one other reviewer" in an AI-dev context.

## SQL + API-500 Verification Method

| Option | Description | Selected |
|--------|-------------|----------|
| Dev Neon branch for SQL + combined static/live for API 500s | Run VERIFY-05 SQL against the branch `.env.local` points to; VERIFY-04 = code read → hypothesis → live repro + log tail → capture stack trace | ✓ |
| Production Neon for SQL | Higher fidelity but risky | |
| Live-only repro for API 500s | Skips static read; lower confidence | |
| Static-only for API 500s | No actual trace captured; lower confidence | |

**User's choice:** Claude's recommendation (dev branch + combined)
**Notes:** Dev branch has representative data; production untouched. Combined method produces both hypothesis and confirmed trace for Phase 49 planner.

## Playwright Spec Classification Rubric

| Option | Description | Selected |
|--------|-------------|----------|
| 3-signal rubric (route / selector / copy) with explicit thresholds | 0 = keep, 1-2 = update with follow-up table, 3+ or deleted-route = retire | ✓ |
| Manual read-through, subjective calls | Faster but not reviewable | |
| Binary (keep vs retire) | Loses the "update" bucket that Phase 49-53 need to reference | |

**User's choice:** Claude's recommendation (3-signal rubric)
**Notes:** Deterministic, reviewable, produces an appendix table that downstream CONTEXT.md files can ingest verbatim.

## Scope-expansion Recording Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Three-tier: report + ROADMAP/REQUIREMENTS edits + downstream CONTEXT.md | Each location serves a different consumer; atomic commit at phase close | ✓ |
| Report only | Planner might miss the expansion unless they re-read the report | |
| ROADMAP/REQUIREMENTS only | Loses the raw evidence from the report | |
| CONTEXT.md only | Not yet created when Phase 48 closes | |

**User's choice:** Claude's recommendation (three-tier)
**Notes:** Phase 48 commit updates all three locations atomically.

---

## Claude's Discretion

- Report markdown formatting (heading levels, table styling)
- Exact wording of the reviewer-agent prompt (must enforce evidence citation)
- Order in which the 9 checks are executed (recommend grouping by mechanism)

## Deferred Ideas

- Fixing admin API 500s → Phase 49 UNBREAK-03/04
- One-shot `dashboard_layouts` migration → Phase 51 LEAN-05 (triggered only if VERIFY-05 returns rows)
- Building LM department picker → Phase 49 (triggered only if VERIFY-03 shows missing)
- Playwright spec update/retire actions → owned by the wave that ships the route/selector/copy change
- Replacement specs for deleted flows → owned by the replacing wave
- Click-counter telemetry tracker → out of Phase 48 scope entirely
