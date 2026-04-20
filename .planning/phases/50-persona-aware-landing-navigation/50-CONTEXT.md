# Phase 50: Persona-aware landing & navigation - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

A signed-in user opening the app lands on their persona's primary page — never the admin dashboard by default — with a sidebar and breadcrumb set that matches their persona. Everything gated behind `uiV6.landing`.

**In scope:**
- Root `/` client-side redirect to `getLandingRoute(persona)` (NAV-01)
- `SECTION_NAV` persona-scoped items for all 5 personas (NAV-02)
- Breadcrumb "Home" link resolving to persona landing (NAV-03)
- Persona switcher collapse to grouped `<select>` (NAV-04)
- 18 `sidebar.personaSections.*` i18n keys (NAV-05)

**Out of scope (scope guard):**
- Route deletion or redirects for `/team`, `/projects`, `/wishes` (Phase 51, LEAN-*)
- Per-journey friction fixes (Phase 52)
- Chrome polish, notification bell (Phase 53)
- Dashboard layout changes

</domain>

<decisions>
## Implementation Decisions

### D-01 — Root redirect mechanism (NAV-01)
**Client-side `PersonaRedirect` component in a new `src/app/(app)/page.tsx`.** The existing `src/app/page.tsx` stays as the server-side fallback for signed-out users (Clerk orgRole routing). When `uiV6.landing` flag is on and persona is loaded, the client component calls `getLandingRoute(persona)` and `router.replace()`.

**Why:** NAV-01 explicitly specifies client-side redirect. Server-side `page.tsx` can't read persona context (client state). Two-file split keeps signed-out routing fast (server redirect) and signed-in routing persona-aware (client redirect).

### D-02 — Sidebar structure (NAV-02)
**Separate persona-keyed entries in `SECTION_NAV`.** Each persona kind (`pm`, `line-manager`, `staff`, `rd`, `admin`) gets its own section array in the `SECTION_NAV` record. The `getSectionKey` function is replaced with persona-aware lookup: `SECTION_NAV[persona.kind]`.

**Why:** Explicit per-persona sections are auditable against the 5 journey maps in `v5.0-USER-JOURNEYS.md`. Dynamic filtering would require understanding every route-to-persona mapping — a maintenance trap. The current route-based `getSectionKey` approach disappears.

**Admin sidebar expansion:** People + Change-log links promoted into admin section alongside existing reference data (Discipliner, Avdelningar, Program).

### D-03 — Persona switcher collapse (NAV-04)
**Single `<select>` with `<optgroup>` per PersonaKind.** Replaces the current two-select approach (kind select + person/department select) with one grouped dropdown. Each optgroup shows the persona kind label; options within show person names or department names.

**How to apply:**
- Auto-select when exactly 1 Person row matches the signed-in user for a kind
- Disable kind options (optgroup) when 0 person/department matches
- Persist last-selected person to `localStorage` when >1 match (extend existing `persona.line-manager.departmentId` pattern)
- Admin viewing as PM (impersonation) requires explicit manual pick — no auto-select in that case

### D-04 — Feature flag (all NAV-* requirements)
**Single `uiV6.landing` flag** covering all NAV-01..05 changes. When off, the current behavior (orgRole-based server redirect, route-based sidebar, two-select persona switcher) is preserved.

**Why:** All 5 requirements are interdependent — a persona-scoped sidebar without a persona-aware landing is confusing; a grouped switcher without persona-scoped navigation is pointless. One flag, one toggle.

### D-05 — i18n namespace (NAV-05)
**`sidebar.personaSections.*` as specified in REQUIREMENTS.md NAV-05.** 18 new keys in both `messages/sv.json` and `messages/en.json`. Exact strings per `UI-RESTRUCTURE-PLAN-v2.md §6`.

**Why:** VERIFY-07 from Phase 48 confirmed existing `sidebar.staff` and `sidebar.projects` keys — new keys go under `personaSections` to avoid collision.

### D-06 — Breadcrumb "Home" (NAV-03)
**Breadcrumbs gain a "Home" link that resolves to `getLandingRoute(persona)`.** Snapshot tests updated to reflect the new breadcrumb structure.

### Claude's Discretion
- Implementation order of the 5 NAV requirements within the phase
- Whether `PersonaRedirect` is a separate component file or inline in `(app)/page.tsx`
- Breadcrumb component structure (reuse existing pattern or new component)
- Test file organization for the new sidebar sections

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Navigation & Sidebar
- `.planning/ui-reviews/UI-RESTRUCTURE-PLAN-v2.md` §6 — Sidebar persona section definitions, exact i18n key list
- `.planning/ui-reviews/UX-AUDIT-PERSONAS.md` — Click-count audit per journey (sidebar items must reduce these)

### Personas & Routes
- `src/features/personas/persona.routes.ts` — `getLandingRoute(persona)` implementation (already exists)
- `src/features/personas/persona.types.ts` — `PersonaKind` discriminator, `Persona` union type
- `src/components/persona/persona-switcher.tsx` — Current two-select switcher (Phase 49 state)

### Existing Sidebar
- `src/components/layout/side-nav.tsx` — Current `SECTION_NAV` route-based structure
- `src/messages/sv.json` lines 26-48 — Existing `sidebar.*` keys (collision avoidance)

### Pre-flight
- `.planning/pre-flight-report.md` — VERIFY-07 (sidebar key collision check), VERIFY-01 (getLandingRoute exists)

### Feature Flags
- No `uiV6.*` flag infrastructure exists yet — planner must create the flag mechanism

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getLandingRoute(persona)` in `persona.routes.ts` — Already maps all 5 persona kinds to landing routes
- `usePersona()` hook — Provides `persona`, `setPersona`, `departments` in client components
- `PersonaGate` — Already working with dynamic `v5.persona.kind.*` labels (Phase 49)
- `persona-switcher.tsx` (210 lines) — Phase 49's two-select approach, to be collapsed into grouped select

### Established Patterns
- `SECTION_NAV` is a static `Record<string, NavSectionDef[]>` keyed by route prefix — Phase 50 transforms this to persona-kind keys
- `useTranslations('sidebar')` for all sidebar text — new keys go under `sidebar.personaSections.*`
- `localStorage` persistence for persona selections — established in Phase 49 for department picker
- Breadcrumbs are implemented inline per page (no shared component) — `usePathname()` + manual structure

### Integration Points
- `src/app/page.tsx` — Server-side root redirect (stays for signed-out); new `src/app/(app)/page.tsx` for persona-aware client redirect
- `src/components/layout/side-nav.tsx` — Complete rewrite of `SECTION_NAV` structure
- `src/components/persona/persona-switcher.tsx` — Significant refactor from two-select to grouped select
- `src/messages/sv.json` + `src/messages/en.json` — 18 new i18n keys

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond what REQUIREMENTS.md NAV-01..05 and UI-RESTRUCTURE-PLAN-v2.md §6 define. Standard approaches are appropriate.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 50-persona-aware-landing-navigation*
*Context gathered: 2026-04-20*
