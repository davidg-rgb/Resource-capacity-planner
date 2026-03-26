# Phase 3: Authentication & App Shell - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 03-authentication-app-shell
**Areas discussed:** Clerk org flow, App shell layout, Webhook sync strategy, Role enforcement

---

## Gray Areas Presented

| Area | Description |
|------|-------------|
| Clerk org flow | Sign-up + org creation flow, invited vs new users |
| App shell layout | Top nav items, side nav behavior, shell chrome |
| Webhook sync strategy | Default reference data seeded on org creation |
| Role enforcement | Granularity of role checks (per-route vs per-action) |

**User's choice:** "Based on architecture.md and the resource-planner-scope.md file, do you need any further clarifications on these questions?"

**Notes:** User directed that all four gray areas are fully specified in ARCHITECTURE.md and resource-planner-scope.md. No interactive discussion needed — decisions extracted directly from existing documentation.

---

## Extraction Summary

All decisions were extracted from:
- ARCHITECTURE.md §2.2 (roles), §3/ADR-005 (Clerk), §5 (file structure), §6.16-6.17 (tenant context, middleware), §8 (API contracts), §11.1 (error taxonomy), §14 (implementation roadmap)
- resource-planner-scope.md (original requirements)

No ambiguity found — documentation is comprehensive for all four gray areas.

## Claude's Discretion

- Default departments to seed on org creation
- Exact side nav items per section
- Onboarding page content (route only needed in Phase 3)
- Breadcrumb implementation details

## Deferred Ideas

- Full onboarding wizard (F-028) — Post-MVP
- SSO/SAML (F-023) — Enterprise feature
- Google OAuth — Available via Clerk, not required for MVP
