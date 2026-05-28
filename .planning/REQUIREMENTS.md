# Requirements: Nordic Capacity v7.0 — Foundation & Quality

**Defined:** 2026-05-11
**Core Value:** Close architectural debt accumulated through v1–v6 and rehab dev-env quality so v8.0 features land on a clean foundation.

This milestone has zero new product features. Every requirement is debt cleanup, quality restoration, or polish that was deferred from prior milestones. Each maps to a deferred item from `.planning/CODE-REVIEW-2026-05-10.md`, `.planning/UI-REVIEW-2026-05-11.md`, or `.planning/STATE.md` Blockers.

## v7.0 Requirements

### Audit-Spine Completion (DEBT)

Route all register-table mutations through the single audited service so the universal `change_log` invariant covers every mutating path. Source: HI-03 from 2026-05-10 code review.

- [ ] **AUDIT-01**: `/api/people/*` PUT/POST/DELETE flow through `register.service.ts` so every mutation emits a `change_log` row
- [ ] **AUDIT-02**: `/api/projects/*` PUT/POST/DELETE flow through `register.service.ts`
- [ ] **AUDIT-03**: `/api/programs/*` PUT/POST/DELETE flow through `register.service.ts`
- [ ] **AUDIT-04**: `/api/departments/*` PUT/POST/DELETE flow through `register.service.ts`
- [ ] **AUDIT-05**: `/api/disciplines/*` PUT/POST/DELETE flow through `register.service.ts`
- [ ] **AUDIT-06**: Per-entity contract test asserts a `change_log` row is written for every PUT/POST/DELETE via the route (one test per entity)
- [ ] **AUDIT-07**: `MUTATION_PREFIX_REGEX` expanded to include `execute|promote|apply|cancel|stage` verbs (MED-03)

### Tenant-Isolation Completion (DEBT)

Decide and execute the `withTenant()` coverage decision. Currently 8 of 16 tenant-scoped tables route through the wrapper, 8 use direct `eq(organizationId, orgId)` predicates. Source: MED-02.

- [x] **TENANT-01**: ADR documenting the chosen direction — extend `withTenant()` to all 16 tables OR remove the wrapper and standardize on direct predicates → **DONE (Phase 55):** `.planning/adr/ADR-V7-01-tenant-isolation.md` — chose REMOVE wrapper (census: 139 direct sites vs 1 vestigial wrapper usage)
- [x] **TENANT-02**: Implementation of the chosen direction — touch every tenant-scoped query so coverage is binary, not half-and-half → **DONE (Phase 55):** migrated the 1 `withTenant()` caller (`seedDefaults`) to direct inserts; deleted `src/lib/tenant.ts`; `grep withTenant( src` → 0
- [x] **TENANT-03**: Runtime invariant test asserting no mixed pattern survives (regex or AST check) → **DONE (Phase 55):** tightened `tenant-isolation.static.test.ts` to `requireRole+orgId` only + a `TC-API-TENANT-REJECTED` guard failing CI if `withTenant(` reappears anywhere in `src/`

### Change-Log Enum Expansion (DEBT)

Three entity types never made it into the `change_log_entity` enum, so their mutations are silently `@no-change-log`. Source: deferred from 2026-05-10 audit (v7.0 audit-coverage expansion).

- [ ] **CHLOG-01**: Schema migration adds `scenario`, `scenario_allocation`, `import_session` to `change_log_entity` enum
- [ ] **CHLOG-02**: Remove `@no-change-log` escape hatches from scenario service mutations that wrote them via the deferred enum
- [ ] **CHLOG-03**: Mutations-manifest regenerated; CI invariant `check:mutations-manifest` passes

### E2E CI Rehab (QUALITY)

The Playwright E2E CI job was disabled on 2026-04-28 (`a60b493`) after a latent bug stack accumulated. Drizzle driver fix has landed; Clerk key + others remain.

- [ ] **E2E-01**: Diagnose the Clerk key issue blocking E2E runs (capture in a one-line readme line)
- [ ] **E2E-02**: Restore CI workflow `.github/workflows/*` to run Playwright on PR + main pushes
- [ ] **E2E-03**: Full 11-spec persona journey suite runs green in CI (PM × 4, LM × 3, Staff × 1, R&D × 2, Admin × 1)
- [ ] **E2E-04**: axe-core a11y assertions still pass against the live build

### Dev-Env Harness (QUALITY)

Three documented harness gaps from STATE.md Blockers — none affect production but block local + CI test runs.

- [ ] **QUAL-04**: `/api/test/seed` works under neon-http driver (rewrite to multiple statements; no transaction)
- [ ] **QUAL-05**: `/api/v5/proposals/queue/count` and `/api/v5/capacity/overcommit/count` return live data in dev Turbopack (currently 404 → counts read 0)
- [ ] **QUAL-06**: `requireRole()` honors `E2E_TEST` proxy bypass at all route layers (currently returns 401 even with bypass set)

### Localization Completeness (POLISH)

The codebase has accumulated hardcoded English/Swedish strings outside the i18n message bundles. Phase 22 Swedish localization was also deferred from v3.0.

- [ ] **L10N-01**: `src/app/(app)/input/[personId]/page.tsx` — hardcoded Swedish moved to `v5.*` namespace (`Laddar allokeringar...`, `Person hittades inte`, `Välj projekt...`, etc.)
- [ ] **L10N-02**: `src/components/person/person-analytics.tsx` — inline Swedish strings (`Allokeringstrend`, `Projektfördelning`, `Kapacitetsinsikt`, `Inga allokeringar i intervallet`, etc.) moved to i18n
- [ ] **L10N-03**: Repo-wide grep for any other ungated string literals matching `[A-ZÅÄÖ][a-zåäö]{4,}` inside JSX (excluding test fixtures); each surfaced to i18n
- [ ] **L10N-04**: sv + en parity check — every key in `sv.json` exists in `en.json` and vice versa (lint script or test)

### Responsive Design Baseline (POLISH)

The app was deferred from v6.0 as "not responsive." Mobile-first pass on the highest-impact surfaces.

- [ ] **RESP-01**: Persona home pages (PM, LM, Staff, R&D, Admin) render usable on 375px viewport (one-column flow, scrollable headers)
- [ ] **RESP-02**: Heatmap (`/dashboard/team`) collapses cleanly on mobile (sticky-left column stays, horizontal scroll for months works)
- [ ] **RESP-03**: Allocation grid (`/input/[personId]`) responsive treatment for mobile — read-only mode if AG Grid edit affordances don't translate
- [ ] **RESP-04**: Dashboard widgets stack to single column on narrow viewports; no overflow into negative-x layout regions

### A11y Consistency (POLISH)

Three a11y categories surfaced by 2026-05-11 frontend audit Phase 6 review as deferred. Site-wide cleanup.

- [ ] **A11Y-01**: All `animate-pulse` and `animate-spin` get `motion-reduce:animate-none` fallbacks (Tailwind plugin or per-class)
- [ ] **A11Y-02**: All interactive elements (buttons, links, toggles) have visible `focus-visible:ring-*` or `focus-visible:outline-*` treatment
- [ ] **A11Y-03**: Touch-target audit — every primary-action interactive element ≥ 44×44pt (WCAG 2.2 AA upgrade); document exceptions in a per-element comment

## v8+ Requirements (deferred)

### Feature Expansion

- **COUNTER-01**: Counter-proposal flow for LM approval (deferred from v5.0)
- **NOTIF-01**: Email/Slack notification channel (currently in-app only)

### Architecture

- **PERM-01**: Real role-based permissions replacing persona "UX shortcut" (ADR-004 revisit)
- **LEGACY-01**: `LEGACY_LAYOUTS` code path cleanup once all tenants migrated off `uiV6.polish` flag-off path
- **QUAD-01..03**: Phase 54 Dashboard quadrant redesign (deferred indefinitely; telemetry-gated)

## Out of Scope (v7.0)

| Feature | Reason |
|---------|--------|
| Counter-proposal flow | Deferred from v5.0; no client push yet |
| Email/Slack notifications | No client demand; in-app sufficient |
| Real RBAC (replace persona) | ADR-004 still valid; persona shortcut working in prod |
| Stripe billing | 1-2 orgs initially, manual billing sufficient |
| SSO / SAML | No client demand |
| Public API | No integration demand |
| Department-level scoping | Adds complexity without clear client need |
| Dark mode | Continued from prior milestones |
| Weekly granularity | Clients plan monthly |
| Dashboard quadrant redesign | Phase 53 telemetry showed no signal at 2026-04-22 |
| Mobile native app | Web-first responsive baseline (RESP-*) is the v7.0 ask |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUDIT-01 | Phase 54 | Pending |
| AUDIT-02 | Phase 54 | Pending |
| AUDIT-03 | Phase 54 | Pending |
| AUDIT-04 | Phase 54 | Pending |
| AUDIT-05 | Phase 54 | Pending |
| AUDIT-06 | Phase 54 | Pending |
| AUDIT-07 | Phase 54 | Pending |
| TENANT-01 | Phase 55 | Done (2026-05-28) |
| TENANT-02 | Phase 55 | Done (2026-05-28) |
| TENANT-03 | Phase 55 | Done (2026-05-28) |
| CHLOG-01 | Phase 56 | Pending |
| CHLOG-02 | Phase 56 | Pending |
| CHLOG-03 | Phase 56 | Pending |
| E2E-01 | Phase 57 | Pending |
| E2E-02 | Phase 57 | Pending |
| E2E-03 | Phase 57 | Pending |
| E2E-04 | Phase 57 | Pending |
| QUAL-04 | Phase 58 | Pending |
| QUAL-05 | Phase 58 | Pending |
| QUAL-06 | Phase 58 | Pending |
| L10N-01 | Phase 59 | Pending |
| L10N-02 | Phase 59 | Pending |
| L10N-03 | Phase 59 | Pending |
| L10N-04 | Phase 59 | Pending |
| RESP-01 | Phase 60 | Pending |
| RESP-02 | Phase 60 | Pending |
| RESP-03 | Phase 60 | Pending |
| RESP-04 | Phase 60 | Pending |
| A11Y-01 | Phase 61 | Pending |
| A11Y-02 | Phase 61 | Pending |
| A11Y-03 | Phase 61 | Pending |

**Coverage:**
- v7.0 requirements: 31 total
- Mapped to phases: 31 ✓
- Unmapped: 0

---
*Requirements defined: 2026-05-11*
*Last updated: 2026-05-11 — roadmap created, all 31 requirements mapped to Phases 54–61*
