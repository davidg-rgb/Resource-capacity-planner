# Phase 50: Persona-aware landing & navigation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 50-persona-aware-landing-navigation
**Areas discussed:** Root redirect mechanism, Sidebar structure, Persona switcher redesign, Feature flag rollout
**Mode:** --auto (all recommended defaults selected)

---

## Root Redirect Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Client-side PersonaRedirect | New `(app)/page.tsx` with `router.replace(getLandingRoute(persona))` | ✓ |
| Server-side middleware | Redirect in Next.js middleware using cookie/session | |
| Shared page with conditional | Single page.tsx with both paths | |

**User's choice:** Client-side PersonaRedirect component [auto-selected: recommended]
**Notes:** NAV-01 explicitly specifies client-side. Server page.tsx stays for signed-out fallback.

## Root Redirect — Fallback

| Option | Description | Selected |
|--------|-------------|----------|
| Clerk orgRole routing | Existing behavior for signed-out / no-persona users | ✓ |
| Default to /dashboard | Always fall back to dashboard | |

**User's choice:** Clerk orgRole-based routing [auto-selected: recommended]

---

## Sidebar Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Persona-keyed SECTION_NAV | Separate section arrays per persona kind | ✓ |
| Dynamic filtering | Single config filtered by persona at runtime | |
| Route-based with persona overlay | Keep route-based, add persona sections on top | |

**User's choice:** Separate persona-keyed entries [auto-selected: recommended]
**Notes:** Auditable against 5 journey maps. Admin sidebar expands with People + Change-log.

---

## Persona Switcher Redesign

| Option | Description | Selected |
|--------|-------------|----------|
| Grouped select with optgroup | Single `<select>` with `<optgroup>` per kind | ✓ |
| Keep two selects | Extend Phase 49 pattern with visual grouping | |
| Dropdown menu | Custom non-native dropdown with sections | |

**User's choice:** Single `<select>` with `<optgroup>` [auto-selected: recommended per NAV-04]
**Notes:** Auto-select 1 match, disable 0 matches, localStorage persist >1 match.

---

## Feature Flag Rollout

| Option | Description | Selected |
|--------|-------------|----------|
| Single uiV6.landing flag | One flag for all NAV-01..05 | ✓ |
| Per-requirement flags | Separate flag per NAV requirement | |

**User's choice:** Single `uiV6.landing` flag [auto-selected: recommended]
**Notes:** All 5 requirements are interdependent.

---

## Claude's Discretion

- Implementation order within the phase
- PersonaRedirect file structure
- Breadcrumb component approach
- Test file organization

## Deferred Ideas

None — discussion stayed within phase scope.
