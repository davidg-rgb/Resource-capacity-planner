# Phase 49: Unbreak broken persona surfaces - Discussion Log

> **Audit trail only.** Decisions are captured in CONTEXT.md — this log preserves rationale.

**Date:** 2026-04-15
**Phase:** 49-unbreak-broken-persona-surfaces
**Source:** Inline discussion during `/gsd-plan-phase 49` entry (user opted to resolve three gray areas in-chat rather than run a full `/gsd-discuss-phase` pass)

---

## Operating Principle Stated

**User quote:** "personas / user stories are mainly for testing and UI walk-through to ensure that we deliver on core needs"

**Impact:** Captured as `<guiding_principle>` in CONTEXT.md. When two fix approaches tie on functionality, prefer the one that reduces test-surface drift and keeps persona walk-throughs honest.

---

## VERIFY-08 / UNBREAK-09 — PersonaGate namespace

| Option | Description | Selected |
|--------|-------------|----------|
| Add `v5.persona.kinds.*` (plural) | Mirror existing `kind.*` values under a second key | |
| **Rewire PersonaGate to read `v5.persona.kind.*` (singular)** | Single source of truth; PersonaGate becomes consistent with `persona-switcher.tsx`'s established convention | ✓ |

**User's choice:** Claude's recommendation (rewire)
**Rationale:** User's operating principle (personas = walk-through testing) argues against two namespaces. `persona-switcher.tsx:72,86` already uses singular; PersonaGate is the outlier. Zero locale-file churn.

## VERIFY-03 / UNBREAK-08 — Department picker location

| Option | Description | Selected |
|--------|-------------|----------|
| Build standalone `<DepartmentPicker>` component | New file under `src/components/` | |
| **Extend `persona-switcher.tsx` scaffold** | Use existing line 55-58 placeholder; add inline sub-select for the `line-manager` case | ✓ |
| Page-level pickers on `/line-manager` + `/line-manager/timeline` | Two implementation surfaces | |

**User's instruction:** "Read through all the architecture.md files and see if you can find any traces, if exists check validity and if we have implemented it. if no trace, build from scratch."

**Trace findings (captured by Claude via grep):**
- `src/components/persona/persona-switcher.tsx:55-58` — code comment reads `// Department picker lands in Phase 41; keep a harmless placeholder identifier (NOT 'stub-*')...`
- Both LM pages show fallback copy "Select a department **in the persona switcher**"
- No mention in `v3.0-ARCHITECTURE.md` or `v5.0-ARCHITECTURE.md`
- No `DepartmentPicker*` file anywhere in the tree
- `buildPersona()` already returns `{ kind: 'line-manager', departmentId: '', displayName: label }` — accepts a `departmentId`, just never receives one

**Conclusion:** Scaffold exists (~40% built). The intent is in the code, not in the architecture docs. Extend the scaffold; do not build from scratch.

## UNBREAK-04/05 — Admin API 500 reproduction

| Option | Description | Selected |
|--------|-------------|----------|
| Static-only code inspection | Lower confidence; relies on hypothesis | |
| **Claude Chrome extension (authenticated session repro)** | `mcp__claude-in-chrome__*` tools navigate signed-in `/admin` + `/admin/people`; capture 500 body, console, network, and tail dev-server stdout for stack trace | ✓ |
| Build a Playwright test harness with a seeded admin | Heavier infra; deferred | |

**User's instruction:** "we can run one through claude chrome extension"

**Rationale:** Phase 48 VERIFY-04 failed live-repro because cold curl gets 307'd by Clerk middleware. Chrome extension maintains cookies; this is the lightest-weight path to a real stack trace.

---

## Claude's Discretion

- Department fetch endpoint (planner researches — likely reuses `/api/people` or introduces `/api/departments`)
- PersonaGate file path (hold current location unless rewire requires move)
- UNBREAK-0N implementation order (suggested: persona-switcher cluster → admin APIs → PM empty-state → Playwright spec sweep)
- Dropdown visual styling (match existing Tailwind conventions in persona-switcher)

## Deferred Ideas

- NAV-01..05 landing redirect → Phase 50
- Route deletions + `next.config.redirects[]` → Phase 51
- LM approval-queue badge (LM-03, added by VERIFY-02) → Phase 52
- New Playwright specs for v6.0 flag paths → owned by the phase that ships each flag
- Dashboard trim → Phase 51
