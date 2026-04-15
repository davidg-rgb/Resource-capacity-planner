# Phase 48: Pre-flight verification - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Grep / SQL / log-verify the 9 assumptions enumerated in `UI-RESTRUCTURE-PLAN-v2.md` §Wave −1 before any code change lands for v6.0. Produces `pre-flight-report.md` under `.planning/` that either passes every VERIFY-0N gate or explicitly expands downstream phase scope (Phase 49 for missing LM picker, Phase 51 for custom-dashboard data migration).

**In scope:**
- The 9 VERIFY-0N checks exactly as listed in REQUIREMENTS.md §v6.0
- Producing `pre-flight-report.md`
- Updating ROADMAP.md / REQUIREMENTS.md when a check expands downstream scope

**Out of scope (scope guard):**
- Any source-code change
- Fixing the admin API 500s (belongs in Phase 49 UNBREAK-03/04)
- Running the VERIFY-05 one-shot migration (belongs in Phase 51 LEAN-05)
- Adding or removing a VERIFY-0N check — the set is frozen

</domain>

<decisions>
## Implementation Decisions

### Report structure
- **D-01:** Single monolithic file at `.planning/pre-flight-report.md` (matches ROADMAP Phase 48 wording). Top-level summary table lists VERIFY-01..09 with pass/fail/expanded-scope verdict. Below the table, one section per check containing: (a) check statement, (b) exact command executed, (c) raw output captured verbatim, (d) verdict, (e) impact notes (scope-expansion trigger or follow-up task).
- **D-02:** Swedish/English mix follows project convention — body in English, user-facing copy citations preserved in Swedish.

### Sign-off mechanism
- **D-03:** Self-review checklist embedded at the top of the report (every verdict cell must cite the command + raw output that justifies it; no hand-waved passes). Second-agent reviewer pass is spawned by the executor at the end of the phase — reviewer agent reads the report and confirms each verdict is backed by captured evidence. Reviewer approval = sign-off.
- **D-04:** No human approval gate. Solo + AI dev model; the reviewer agent is the "one other reviewer" the roadmap calls for.

### SQL execution environment (VERIFY-05)
- **D-05:** Run the corrected `dashboard_layouts` SQL against the same Neon branch the local dev server connects to (per `.env.local` `DATABASE_URL`). Production Neon is NOT touched from Phase 48. If the dev branch has no representative data, note that in the report and defer the authoritative run to Phase 51 kick-off (still behind `uiV6.leanTrim`, so no rollout risk).
- **D-06:** Capture the result as raw SQL output in the report, not a paraphrase. Zero rows → Phase 51 LEAN-05 ships as a straight code delete. >0 rows → Phase 51 scope expands to include the one-shot migration already drafted in UI-RESTRUCTURE-PLAN-v2 §2.5 Wave 2.

### Admin API 500 root cause (VERIFY-04)
- **D-07:** Combined static + live method. Start with static code read of `src/app/api/admin/change-log/route.ts` and `src/app/api/admin/people/route.ts` (+ their services) to form a hypothesis. Then `pnpm dev` + hit each endpoint once while tailing the server log; capture the full stack trace verbatim in the report. Report records both the hypothesis and the confirmed trace.
- **D-08:** Fix does NOT ship in Phase 48. The root-cause note feeds Phase 49 UNBREAK-03/04 planning.

### Playwright spec classification rubric (VERIFY-06)
- **D-09:** Inventory every `e2e/**/*.spec.ts` file produced by Phase 47. For each spec, the report records three binary signals:
  1. **Route-touched** — spec visits any of `/`, `/team`, `/team/*`, `/projects`, `/wishes`, or any path whose sidebar/breadcrumb rewrites in Waves 1–4
  2. **Selector-touched** — spec queries persona-switcher, sidebar, breadcrumb, top-nav, notification bell, or any of the 3 dead widget IDs
  3. **Copy-touched** — spec asserts literal text for any string whose i18n key moves under `sidebar.personaSections.*`
- **D-10:** Classification rule:
  - 0 signals → **keep** (no follow-up)
  - 1–2 signals → **update** (report lists the affected file + line ranges as a follow-up task; Phase 49–53 planners reference this list)
  - 3 signals OR spec targets a deleted route → **retire** (follow-up = delete in the wave that deletes the route; replacement spec belongs to the same wave)
- **D-11:** "Update" follow-ups are captured as a table in the report appendix so downstream phase CONTEXT.md files can ingest them verbatim.

### Scope-expansion recording (VERIFY-03, VERIFY-05 expansion triggers)
- **D-12:** Three-tier recording when a check expands scope:
  1. **Primary** — `pre-flight-report.md` records the finding + recommended expansion + exact requirement wording
  2. **Authoritative update** — edit `.planning/ROADMAP.md` Phase 49 / Phase 51 entry (append an `Expanded by VERIFY-0N:` line) and `.planning/REQUIREMENTS.md` (append a new sub-bullet under the affected phase's requirements block) at the END of Phase 48 execution
  3. **Downstream handoff** — Phase 49/51 `CONTEXT.md` ingests the expansion when those phases start
- **D-13:** Closing the Phase 48 commit updates all three locations atomically (or documents why an update was deferred).

### Claude's Discretion
- Report formatting (heading levels, table styling) — Claude decides; must be readable as plain markdown
- Exact wording of reviewer-agent prompt — Claude decides; must include "cite command + raw output for every verdict"
- Order in which the 9 checks are executed — Claude decides; recommend grouping by mechanism (grep cluster, SQL, live-repro, jq cluster)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Plan source of truth
- `.planning/ui-reviews/UI-RESTRUCTURE-PLAN-v2.md` §Wave −1 (Pre-flight Verification table) — exact commands, expected results, done-when criteria for every VERIFY-0N
- `.planning/ui-reviews/UI-RESTRUCTURE-PLAN-v2.md` §2.5 Wave 2 — corrected `dashboard_layouts` SQL + one-shot migration draft (trigger for scope expansion)
- `.planning/ui-reviews/UI-RESTRUCTURE-PLAN-v2.md` §6 — 18 i18n keys under `sidebar.personaSections.*` (VERIFY-07 collision check basis)

### Requirements + roadmap
- `.planning/REQUIREMENTS.md` §v6.0 VERIFY-01 … VERIFY-09 — the 9 checks, each gated to `pre-flight-report.md`
- `.planning/ROADMAP.md` §Phase 48 — goal, success criteria, downstream-scope-expansion triggers

### Journey + widget context
- `.planning/v5.0-USER-JOURNEYS.md` — 13 journeys across 5 personas; VERIFY-09 snapshot reuse anchors here
- `.planning/ui-reviews/WIDGET-INVENTORY.md` — 21 widgets catalog; lists the 3 dead widget IDs and custom-dashboard audit targets
- `.planning/ui-reviews/UX-AUDIT-PERSONAS.md` — click-count audit; context for Playwright spec classification

### Session context
- `.planning/v6.0-HANDOFF.md` — locked decisions, what NOT to do in Phase 48
- `.planning/STATE.md` — current session state, prior-milestone decisions still binding

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (verification targets, not reusable components)
- `src/features/personas/persona.routes.ts` — VERIFY-01 target (`getLandingRoute` export existence)
- `src/app/api/v5/proposals/queue/count/route.ts` (expected path) — VERIFY-02 target; may not exist
- `src/features/personas/` + `src/components/` — VERIFY-03 target (DepartmentPicker/selectDepartment component)
- `src/app/api/admin/change-log/route.ts` + `src/app/api/admin/people/route.ts` — VERIFY-04 targets
- `dashboard_layouts` table — VERIFY-05 target (Neon branch, NOT production)
- `e2e/{pm,line-manager,staff,rd,admin}/*.spec.ts` — VERIFY-06 inventory targets
- `messages/sv.json` + `messages/en.json` — VERIFY-07 (collision) + VERIFY-08 (`v5.persona.kinds.*` presence) targets
- Plan-vs-actual cell + timeline-grid components (from Phase 37/42) — VERIFY-09 snapshot comparison targets

### Established Patterns
- Phase 47 established `e2e/` directory layout with persona-scoped subfolders — VERIFY-06 iterates within that structure
- `jq` is already in the toolchain (used in prior i18n key catalog work) — safe for VERIFY-08
- Server logs surface via `pnpm dev` stdout — no structured log aggregator needed for VERIFY-04

### Integration Points
- `pre-flight-report.md` lives at `.planning/pre-flight-report.md` — not inside `.planning/phases/48-pre-flight-verification/` — because it's the milestone-wide gate consumed by every downstream v6.0 planner
- ROADMAP.md + REQUIREMENTS.md edits at end of phase are atomic with the report commit

### Creative Options
- Reviewer-agent pass at phase end (D-03) is a natural insertion point for a quality bar the solo+AI dev model otherwise lacks
- The classification rubric (D-09/D-10) is reusable as a template for future UI-restructure verification phases

</code_context>

<specifics>
## Specific Ideas

- Report heading order must mirror VERIFY-0N numbering so Ctrl-F on the requirement ID jumps to its verdict section
- Every verdict cell in the summary table cross-links to its detail section (anchor link)
- Capture the exact `git rev-parse HEAD` at the start of the verification run in the report header so future planners know which commit the evidence was gathered against

</specifics>

<deferred>
## Deferred Ideas

- **Fixing the admin API 500s** — belongs in Phase 49 (UNBREAK-03, UNBREAK-04)
- **Running the one-shot dashboard_layouts migration** — belongs in Phase 51 (LEAN-05) if VERIFY-05 returns rows
- **Building the LM department picker** — belongs in Phase 49 if VERIFY-03 shows it missing
- **Updating the 12 Playwright specs** — update/retire actions belong to the wave that owns the route/selector/copy change (49/50/51/52/53)
- **New specs for replaced flows** — belong to the wave that ships the replacement
- **Telemetry / click-counter tracker** — UI-RESTRUCTURE-PLAN §1 introduces it but it's not a Phase 48 concern

</deferred>

---

*Phase: 48-pre-flight-verification*
*Context gathered: 2026-04-15*
