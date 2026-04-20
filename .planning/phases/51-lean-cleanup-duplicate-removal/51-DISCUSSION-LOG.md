# Phase 51: Lean cleanup — duplicate removal - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 51-lean-cleanup-duplicate-removal
**Mode:** `--auto --chain`
**Areas discussed:** Redirect strategy, Widget deletion sequencing, /input duplicate removal, Layout trimming scope, Defensive fallback behavior, PDF regression approach, Feature flag rollback story

---

## Redirect strategy

| Option | Description | Selected |
|--------|-------------|----------|
| next.config.ts redirects() with 308 | Server-side permanent redirects per UI-RESTRUCTURE-PLAN-v2.md §2.1-2.3 | [auto] |
| Client-side router.replace() | Would miss direct URL entry and external bookmarks | |

**User's choice:** [auto] next.config.ts redirects() with permanent: true (308)
**Notes:** Matches the plan exactly. Query strings preserved by 308.

---

## Widget deletion sequencing

| Option | Description | Selected |
|--------|-------------|----------|
| Migration-first | Run VERIFY-05 SQL on prod, ship UPDATE migration, then delete files | [auto] |
| Delete-first with fallback | Delete files and rely on widget-registry fallback for any broken layouts | |

**User's choice:** [auto] Migration-first (recommended by VERIFY-05 mandate)
**Notes:** VERIFY-05 found 1 affected row on dev Neon branch. Production count must be re-verified at kick-off.

---

## /input duplicate removal

| Option | Description | Selected |
|--------|-------------|----------|
| Remove right-side flat list | Keep left sidebar picker only | [auto] |
| Remove left sidebar picker | Keep right-side list only | |

**User's choice:** [auto] Remove right-side flat list, keep left sidebar picker
**Notes:** WIDGET-INVENTORY §3 item #8 confirms both lists go to same destination.

---

## Layout trimming scope

| Option | Description | Selected |
|--------|-------------|----------|
| Per success criteria #4 | Strip kpi-cards/capacity-forecast/availability-finder from PL; replace utilization-heat-map with summary-card in manager | [auto] |
| Minimal trim | Only remove dead widgets, keep duplicate placements | |

**User's choice:** [auto] Per success criteria #4 (recommended default)
**Notes:** Matches ROADMAP success criteria exactly.

---

## Defensive fallback behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Placeholder card with widget ID | "Widget ej tillgänglig" + widget ID for debugging | [auto] |
| Silent skip | Don't render anything for unknown IDs | |
| Error boundary | Throw and let React error boundary catch | |

**User's choice:** [auto] Placeholder card with widget ID
**Notes:** Per UI-RESTRUCTURE-PLAN-v2.md §2.7 — graceful degradation.

---

## PDF regression approach

| Option | Description | Selected |
|--------|-------------|----------|
| Snapshot comparison | Before/after PDF from /api/reports/team-heatmap | [auto] |
| Visual diff only | Manual comparison without committed test | |

**User's choice:** [auto] Snapshot comparison (recommended per §2.6)
**Notes:** Regression test committed to test suite.

---

## Feature flag rollback story

| Option | Description | Selected |
|--------|-------------|----------|
| Flag-gated with deferred deletion | Physical file deletion only after flag stable in prod | [auto] |
| Immediate deletion at flag-ON | Delete files when flag enabled | |

**User's choice:** [auto] Flag-gated with deferred deletion (recommended per §4 kill-switch)
**Notes:** Dead widget files stay on disk but de-registered from widgets/index.ts when flag ON.

---

## Claude's Discretion

- Implementation order within the phase (migration-first is locked; rest is flexible)
- Summary-card widget structure (new file vs inline)
- Test file organization
- Whether to add uiV6.leanTrim to FLAG_ROUTE_MAP

## Deferred Ideas

None — discussion stayed within phase scope.
