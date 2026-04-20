# Phase 49: Unbreak broken persona surfaces - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<guiding_principle>
## Operating Lens

**Personas and user stories exist primarily to drive testing and UI walk-through — they are the mechanism by which we verify core needs are delivered, not an end in themselves.**

When a gray area surfaces in this phase, prefer the option that:
1. Reduces test-surface drift (single source of truth over parallel namespaces)
2. Keeps the persona walk-through path honest (raw i18n keys rendering as primary UI = failed walk-through)
3. Reuses existing scaffolds rather than introducing new components

</guiding_principle>

<domain>
## Phase Boundary

Make every persona landing page render real content on first load: no raw i18n keys as primary text, no "Kunde inte ladda…" error states on the golden path, no placeholders where a component is expected. Close the nine UNBREAK-0N gates produced by Phase 48's pre-flight.

**In scope:**
- LM department picker (UNBREAK-01, -02, -08) — extend existing scaffold
- PM Home empty-state fallthrough (UNBREAK-03)
- Admin change-log + people API 500 repro + fix (UNBREAK-04, -05)
- PersonaGate error copy using `allowed` prop (UNBREAK-06)
- PersonaGate i18n namespace fix (UNBREAK-09)
- Playwright spec updates for the 12 specs classified in Phase 48 VERIFY-06 (UNBREAK-07)

**Out of scope (scope guard):**
- Persona-aware landing redirect (Phase 50, NAV-01..05)
- Any `/team`, `/projects`, `/wishes` route deletion or `next.config.redirects[]` work (Phase 51, LEAN-*)
- Feature-flag gating — Phase 49 unbreaks on the unflagged code path; later waves add flags
- Dashboard layout changes
- Any work on `uiV6.*` flags

</domain>

<decisions>
## Implementation Decisions

### D-01 — PersonaGate i18n namespace (UNBREAK-09, closes VERIFY-08)
**Rewire PersonaGate to read the existing `v5.persona.kind.*` (singular) namespace.** Do NOT add a parallel `kinds.*` (plural) namespace.

**Why:** The singular namespace is the established convention — `persona-switcher.tsx:72,86` already uses `useTranslations('v5.persona')` + `t('kind.${nextKind}')`. Duplicating it would create two sources of truth that test writers must remember; i18n drift is the slowest failure to detect. PersonaGate is the outlier; fix the outlier, not the convention.

**How to apply:** In the PersonaGate lookup site, translate the `lineManager` discriminator value to the hyphenated key `line-manager` when reading the i18n table (the keys are `kind.pm`, `kind.line-manager`, `kind.staff`, `kind.rd`, `kind.admin`). No change to `src/messages/sv.json` or `src/messages/en.json`.

### D-02 — Department picker location + shape (UNBREAK-01/02/08, closes VERIFY-03)
**The department picker lives inside `src/components/persona/persona-switcher.tsx` — NOT a standalone component.**

**Why:** The architectural intent is already encoded in the codebase:
- `persona-switcher.tsx:55-58` has a scaffold comment: `// Department picker lands in Phase 41; keep a harmless placeholder identifier...` with `departmentId: ''` waiting for a real picker.
- Both LM page fallback copy reads "Select a department **in the persona switcher**" (`line-manager/page.tsx:70`, `line-manager/timeline/page.tsx:127`) — the UX contract already points users there.
- No `DepartmentPicker` component file exists; no architecture doc (v3, v5) formalizes one. Building a new component would create a second surface to test.

**How to apply:**
1. In `persona-switcher.tsx`, when `persona.kind === 'line-manager'`, render a secondary `<select>` below the kind selector listing the user's departments (fetched via `useQuery` following the existing `fetchPeople` pattern; endpoint TBD at planner research step — most likely `/api/departments` or `/api/people?role=line-manager` returning `{ departments: [{ id, name }] }`).
2. Replace `departmentId: ''` (line 58) with the selected department's ID; propagate through `buildPersona`.
3. Update `useLineManagerContext()` (or wherever departmentId is consumed) to react to the selection.
4. **Edge cases** (follow UI-RESTRUCTURE-PLAN-v2 §1.4 edge-case handling):
   - 0 departments → disable the LM persona option with a tooltip: "Admin måste koppla ditt användarkonto till en avdelning först"
   - 1 department → auto-select it (no dropdown needed)
   - >1 departments → persist last selection in `localStorage` key `persona.line-manager.departmentId`
5. Remove the `selectDepartment` i18n fallback copy from both LM pages once a selected department is guaranteed at render.

### D-03 — Admin API 500 reproduction method (UNBREAK-04/05)
**Use the `claude-in-chrome` MCP tools to reproduce the 500s from an authenticated admin browser session; capture stack traces from `pnpm dev` stdout concurrently.**

**Why:** Phase 48 VERIFY-04 couldn't repro without an auth session — Clerk middleware returns 307 to cold curl requests. Claude Chrome extension maintains the Clerk cookie; navigating `/admin` + `/admin/people` while tailing dev logs yields the actual stack.

**How to apply:**
1. Start dev server in background (`pnpm dev` with `run_in_background: true`); capture its log stream
2. Use `mcp__claude-in-chrome__navigate` to open `/admin` and `/admin/people` in an already-signed-in tab
3. Use `mcp__claude-in-chrome__read_console_messages` + `mcp__claude-in-chrome__read_network_requests` to capture the 500 response body + request detail
4. Grep the dev-server log tail for the stack trace at the matching timestamp
5. Record raw capture into the phase's RESEARCH.md before planning the fix
6. Fix hypothesis from Phase 48 static read: environmental migration drift on the Neon branch — but do NOT fix blind. Confirm via the live trace first.

### D-04 — PM empty-state (UNBREAK-03)
Straight code fix at `src/app/(app)/pm/page.tsx:60`: the page currently stays on the loading spinner when `data.projects.length === 0`. Fall through to the existing empty-state translation. No gray area — just the fix.

### D-05 — PersonaGate copy from `allowed` prop (UNBREAK-06)
PersonaGate already receives an `allowed` prop; the error message ignores it. Rewrite the error to read `allowed`, translate to the Swedish/English persona label via D-01's lookup, render "Kunde inte ladda — denna sida är för {allowedLabel}-personan". No i18n file changes needed.

### D-06 — Playwright spec updates (UNBREAK-07)
Phase 48 VERIFY-06 classified all 12 specs as `update` because each one hits `page.goto('/')` which NAV-01 will redefine in Phase 50. **Phase 49 updates them to survive the current unbroken path** (no /team, /projects, /wishes removals yet — those are Phase 51). Per-spec update is enumerated in `pre-flight-report.md §VERIFY-06` appendix. Each spec gets a single commit; Phase 49 does NOT add new specs for UNBREAK-01..09 (those land with the Phase 50/51/52 flag work).

### Claude's Discretion
- Exact dropdown visual styling inside persona-switcher — match existing kind-select styles (Tailwind tokens)
- Department fetch endpoint — planner researches; most likely reuses existing `/api/people` or introduces `/api/departments`
- PersonaGate file path (rename/relocate) — hold current location unless rewire requires it
- Order of UNBREAK-0N implementation — sequence by code-touch proximity (persona-switcher cluster, then admin APIs, then PM, then spec sweep)

### Folded Todos
None.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase-48 evidence + downstream expansion
- `.planning/pre-flight-report.md` §VERIFY-01 — confirms `getLandingRoute` exists (relevant to persona-switcher's `router.push(getLandingRoute(next))`)
- `.planning/pre-flight-report.md` §VERIFY-03 — DepartmentPicker evidence + picker-absent proof
- `.planning/pre-flight-report.md` §VERIFY-04 — admin-500 static hypothesis (repro deferred to this phase)
- `.planning/pre-flight-report.md` §VERIFY-06 — full 12-spec Playwright inventory with per-spec update targets
- `.planning/pre-flight-report.md` §VERIFY-08 — persona-kinds namespace evidence (`kind.*` singular confirmed)
- `.planning/pre-flight-report.md` §Scope-Expansion Summary — UNBREAK-08, UNBREAK-09 origin

### Plan source of truth
- `.planning/ui-reviews/UI-RESTRUCTURE-PLAN-v2.md` §Wave 0 — 0.1–0.5 sub-task list
- `.planning/ui-reviews/UI-RESTRUCTURE-PLAN-v2.md` §1.4 — persona-switcher edge cases (0/1/>1 rows, localStorage persistence)

### Requirements + roadmap
- `.planning/REQUIREMENTS.md` §v6.0 UNBREAK-01 … UNBREAK-09 — locked scope (9 requirements)
- `.planning/ROADMAP.md` §Phase 49 — goal + success criteria + 2 `Expanded by VERIFY-0N` lines

### Session context
- `.planning/v6.0-HANDOFF.md` §Locked decisions — what NOT to touch (flags, routes, dashboards)
- `.planning/STATE.md` — current milestone state

### Target files (verified to exist during scout)
- `src/components/persona/persona-switcher.tsx` — lines 40-99 (scaffold + buildPersona + handlers); add department sub-select here
- `src/app/(app)/line-manager/page.tsx:68-72` — empty state that should disappear once picker fills
- `src/app/(app)/line-manager/timeline/page.tsx:123-129` — same, timeline variant
- `src/app/(app)/pm/page.tsx:60` — PM empty-state fallthrough site
- `src/features/personas/persona-route-guard.ts` — PersonaGate (exact line number: planner to confirm)
- `src/messages/sv.json`, `src/messages/en.json` — `v5.persona.kind.*` keys live here; NO edits required per D-01
- `e2e/**/*.spec.ts` — 12 Playwright specs (enumerated in pre-flight-report §VERIFY-06)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `persona-switcher.tsx` fetch pattern — `useQuery` + `fetchPeople` at lines 38-44 — mirror for `fetchDepartments`
- `buildPersona()` switch — already accepts a `line-manager` case returning `departmentId` — just needs a real value
- `safeT()` fallback helper — used at both LM empty-state sites; will become dead code after picker lands (remove in the same commit to avoid dead fallbacks)
- `useTranslations('v5.persona')` + `t('kind.${nextKind}')` — confirms singular-namespace convention, directly reusable for PersonaGate rewire

### Established Patterns
- Persona-scoped `useQuery` keys (e.g., `['personas-people-picker']`) — follow the same keying pattern for departments
- `router.push(getLandingRoute(next))` in the kind-change handler — reuse; department-change handler should also re-route to `/line-manager` if user is already there
- `localStorage` persistence — `persona-switcher.tsx` likely already reads/writes persona state; extend for `persona.line-manager.departmentId`

### Integration Points
- `useLineManagerContext()` (or equivalent hook) — consumer of `departmentId`; verify it re-renders when departmentId changes (may need `useEffect` or context bump)
- Clerk auth middleware returns 307 on unauthenticated `/api/admin/*` — constrains D-03 to browser-session repros only
- Dev server log stream — must be captured live during D-03 repro; can't be retrieved post-facto from Clerk proxy

### Creative Options
- Picker-as-switcher-extension (D-02) keeps the single persona context simple; alternative (standalone picker per page) would double the state surface
- PersonaGate rewire (D-01) is a one-line `kind` → `kind.replace(/([A-Z])/g, '-$1').toLowerCase()` transform at the lookup — 0 test churn vs 10+ test file edits for parallel namespace

</code_context>

<specifics>
## Specific Ideas

- Department dropdown should match Swedish locale by default (`"Avdelning"` label, matches existing Swedish-first UI convention)
- Empty-state copy on LM pages becomes unreachable once picker fills — remove the `safeT(t, 'home.selectDepartment', ...)` calls in the same commit as the picker lands; do not leave dead fallbacks
- For UNBREAK-04/05 repro, capture the git SHA of the Neon migration state that produced the 500 — essential for distinguishing code bugs from environmental drift

</specifics>

<deferred>
## Deferred Ideas

- **Persona-aware landing redirect** (NAV-01..05) → Phase 50
- **`/team`, `/projects`, `/wishes` deletion + redirects** → Phase 51
- **New Playwright specs for v6.0 flag paths** → Phases 50, 51, 52 (each owns its own spec additions)
- **Dashboard layout trim** → Phase 51
- **LM approval-queue badge** (LM-03 added by VERIFY-02) → Phase 52
- **PersonaGate architectural rewrite** — out of scope; only the i18n lookup shifts

### Reviewed Todos (not folded)
None — no pending todos in queue.

</deferred>

---

*Phase: 49-unbreak-broken-persona-surfaces*
*Context gathered: 2026-04-15*
