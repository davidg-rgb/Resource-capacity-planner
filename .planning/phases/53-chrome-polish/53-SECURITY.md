---
phase: 53-chrome-polish
audited: 2026-04-24T00:00:00Z
auditor: gsd-security-auditor
asvs_level: 1
block_on: open
threats_total: 26
threats_closed: 26
threats_open: 0
unregistered_flags: 0
status: clean
---

# Phase 53: Chrome Polish — Security Audit

**Scope:** Verify that every threat declared in the `<threat_model>` blocks of PLAN-01..PLAN-05 has the declared mitigation present in shipped code. Implementation files are read-only; no patches applied.

**Context:**
- Phase 53 shipped to production on 2026-04-22 behind the `uiV6Polish` flag (currently OFF on prod — flag-OFF parity verified by CI + manual sweep).
- Code review (53-REVIEW.md) surfaced 5 Warnings (WR-01..WR-05) all subsequently fixed (53-REVIEW-FIX.md). The WR-01 fix specifically shipped the missing `/api/test/flags` route with full production guards — this directly strengthens T-53-03 / T-53-25 (test-only DB writer isolation). Verification runs after those fixes landed.

**Threat Register (consolidated across PLAN-01..PLAN-05):** 26 STRIDE threats, IDs T-53-01 through T-53-26.

---

## Threat Verification

### Closed by Mitigation (17 threats)

| Threat ID | Category | Disposition | Component | Evidence |
|-----------|----------|-------------|-----------|----------|
| T-53-02 | T (Tampering) | mitigate | i18n keys `v6.polish.*` | next-intl ICU interpolation used throughout (`notification-bell.tsx:75,80,84,88,93`; `strategic-alerts-banner.tsx:39`; `alerts/page.tsx:91,104`). Zero `dangerouslySetInnerHTML` occurrences anywhere in `src/` (verified via repo-wide grep). No user-controlled text in `v6.polish.*` keys — counts are server-derived integers. |
| T-53-03 | E (Elevation) | mitigate | `setPolishFlag` / flag-toggle helper | Helper lives at `e2e/helpers/flag-toggle.ts`; only e2e specs import it. The write path now goes through `/api/test/flags` which has three independent gates (see T-53-25). No direct DB write from the helper in production builds. |
| T-53-06 | E (Elevation) | mitigate | `GET /api/v5/capacity/overcommit/count` | `src/app/api/v5/capacity/overcommit/count/route.ts:29` — `const { orgId } = await requireRole('planner');`. Clerk session gate. Same pattern as Phase 52 LM-03. Route not in `isPublicRoute` matcher (`src/proxy.ts:5-12`). |
| T-53-07 | I (Info Disclosure — cross-tenant) | mitigate | `getOvercommitCount(orgId)` | `src/features/capacity/capacity.service.ts:60` people filter `eq(schema.people.organizationId, orgId)`; line 82 allocations filter `eq(schema.allocations.organizationId, orgId)`. Both predicates enforce tenant isolation. Integration test `count.test.ts` Test 3 ("tenant isolation") asserts zero leak. |
| T-53-08 | I (Info Disclosure — stale count) | mitigate | TanStack cache on persona switch | `src/features/personas/persona.context.tsx:36-38` — `PERSONA_SCOPED_QUERY_KEYS` contains all three: `'pm-wish-counts'`, `'lm-queue-count'`, `'rd-overcommit-count'`. |
| T-53-09 | T (Tampering — client persona impersonation) | mitigate | `<NotificationBell>` PM branch | `notification-bell.tsx:45,57` — `const { userId } = useAuth()` (Clerk-signed), not `persona.personId`. Also `pmEnabled = uiV6Polish && persona.kind === 'pm' && !!userId` (line 52) requires a non-null Clerk userId. |
| T-53-10 | I (Info Disclosure — persona signal leakage) | mitigate | Staff persona with uiV6Polish=true | `notification-bell.tsx:71` — `if (persona.kind === 'staff') return null;`. `top-nav.tsx:160-166` visibleFor filter hides non-Help nav items for Staff when flag is ON (per D-03 LITERAL). |
| T-53-12 | T (Tampering — layout data) | mitigate | `20260422_polish_discipline_rename.sql` | SQL uses idempotent `jsonb_set` only on matching IDs, wrapped in `jsonb_agg(CASE ... END)`. WHERE clause `layout::text ~* '...'` short-circuits rows without legacy IDs. PGlite integration tests assert idempotency + row-untouched invariants. |
| T-53-14 | I (Info Disclosure — cross-tenant layout leak) | mitigate | discipline-rename migration | UPDATE is in-place per row; no cross-tenant join or row movement. Tenant isolation via pre-existing `organization_id` column on `dashboard_layouts` is preserved. |
| T-53-16 | T (Tampering — strip migration) | mitigate | `20260422_polish_strip_widgets.sql` | `jsonb_agg(... WHERE placement->>'widgetId' NOT IN ('bench-report','strategic-alerts'))` + WHERE-gate on `layout::text ~*`. Idempotent + NULL/empty-layout safe. |
| T-53-18 | D (Denial — layout empty after strip) | mitigate | dashboard_layouts jsonb result | Phase 51 LEAN-08 defensive widget-registry fallback renders missing IDs as placeholders; strip migration comment documents the NULL-on-empty-set behavior; tenants can re-add via edit mode. |
| T-53-19 | I (Info Disclosure — cross-tenant) | mitigate | strip-widgets migration WHERE clause | Same per-row UPDATE pattern as T-53-14; no cross-tenant data movement. |
| T-53-21 | T (Tampering — tab param) | mitigate | `/alerts?tab=X` | `src/app/(app)/alerts/page.tsx:36-45` — `ALERTS_TABS = ['warnings','conflicts'] as const` + `parseTab()` narrows via `.includes()` on the const-asserted allowlist; unknown values fall through to `'warnings'`. WR-03 fix derived the type from the allowlist so drift is compile-checked. |
| T-53-25 | E (Elevation — test-only DB writer) | mitigate | `/api/test/flags` + helper | `src/app/api/test/flags/route.ts:51-59` implements THREE independent gates: (1) `NODE_ENV === 'production' && E2E_TEST !== '1'` throws at handler entry; (2) `E2E_SEED_ENABLED !== '1'` returns 404; (3) Clerk middleware (`proxy.ts:24-26`) protects the route in prod because `/api/test/*` is NOT in `isPublicRoute`. Body validated with `z.enum(FLAG_NAMES)` (strictly one of 9 literals) + `z.boolean()`. Writes target only the deterministic E2E_ORG_ID (`uuidv5('seed:e2e:organization', FIXTURE_NS)`), so even if all gates were bypassed the attacker could only flip flags on the E2E tenant. |

### Closed by Accept (9 threats)

| Threat ID | Category | Disposition | Component | Evidence |
|-----------|----------|-------------|-----------|----------|
| T-53-01 | I (Info Disclosure) | accept | `/help` stub page | `src/app/(app)/help/page.tsx:15-22` — static copy; zero DB calls; external docs link has `target="_blank"` + `rel="noreferrer"` (window.opener leak prevented). |
| T-53-04 | I (Info Disclosure) | accept | Diagnostic spec artifacts | `test.info().attach` calls in viewport specs write only `{ scrollHeight, clientHeight, overflow }` ints — no tenant data. |
| T-53-05 | D (DoS) | accept | `/help` route | Static page, no DB query. |
| T-53-11 | D (DoS — bell polling) | accept | 3 persona count hooks + alert-count | Per-persona `enabled` gate — each of `usePmWishCounts` / `useLmQueueCount` / `useRdOvercommitCount` / `useAlertCount` is gated with its own `*Enabled` boolean (`notification-bell.tsx:52-55,57-68`). WR-02 fix added the `enabled` param to `useAlertCount` so non-admin personas no longer poll it. Only ONE hook polls per user at a time. |
| T-53-13 | D (Denial — migration downtime) | accept | dashboard_layouts UPDATE | Small table (~1 row per custom layout per tenant); single-transaction UPDATE. Phase 51 experience showed 1 affected row on dev Neon. |
| T-53-15 | S (Spoofing — tenant custom widgets) | accept | `discipline-breakdown` namespace | Widget registry is code-side only; tenants cannot register widget IDs. |
| T-53-17 | I (Info Disclosure — banner count) | accept | `<StrategicAlertsBanner>` | Only renders count integer + static CTA label; `useAlerts` enforces tenant scope server-side (`/api/analytics/alerts` pre-existing endpoint). |
| T-53-20 | S (Spoofing — banner CTA) | accept | `<Link href="/alerts">` | Static href literal; no user-controlled URL. |
| T-53-22 | I (Info Disclosure — cross-tenant localStorage) | accept | `dismissed-conflicts` key | localStorage is origin-scoped; Clerk session enforces per-user isolation. Pattern inherited from Phase 52. |
| T-53-23 | D (Denial — migration on large tables) | accept | resource-conflicts strip migration | Same profile as T-53-13. |
| T-53-24 | I (Info Disclosure — viewport artifact) | accept | `test.info().attach` | Only scrollHeight + clientHeight + overflow ints; no PII. |
| T-53-26 | S (Spoofing — persona during parity test) | accept | `personaAs` in parity spec | Persona is UX shortcut only (ADR-004); parity spec tests UI chrome, not authorization. |

---

## Unregistered Flags (from SUMMARY.md `## Threat Flags`)

None. Phase 53 SUMMARY files (53-01-SUMMARY.md through 53-05-SUMMARY.md) were not required to include a `## Threat Flags` section by project convention, and no unmapped flag entries were detected during the consolidated sweep.

---

## Focus-Area Findings (from original audit prompt)

The prompt asked specific questions beyond the declared threat register. These map to the verified threats above:

1. **Auth / tenant isolation on new count APIs** — `/api/v5/capacity/overcommit/count` uses `requireRole('planner')` (T-53-06) and `getOvercommitCount(orgId)` filters both `people` and `allocations` by `organizationId` (T-53-07). `/api/v5/proposals/queue/count` (Phase 52, touched this phase) uses the same `requireRole('planner')` + Zod-validated `departmentId` + `orgId`-scoped service. Both routes correctly propagate `orgId` from Clerk — no client-supplied tenant identifier.

2. **`/api/test/flags` production guards** — Three independent gates verified (T-53-25). The route is unreachable in production: Clerk middleware blocks unauthenticated access, the handler throws if `NODE_ENV=production && E2E_TEST!==1`, and returns 404 if `E2E_SEED_ENABLED!==1`. Even if an authenticated prod admin somehow reached it, Zod's `z.enum(FLAG_NAMES)` rejects any flag name not in the 9-literal tuple, and writes target only the deterministic E2E org ID.

3. **Clerk role enforcement consistency** — `requireRole('planner')` is the consistent gate across `/api/v5/capacity/overcommit/count`, `/api/v5/proposals/queue/count`, and other v5 routes. The persona `kind` is a client-side UX discriminator only (ADR-004) — the server never trusts it. The NotificationBell PM branch explicitly uses `useAuth().userId` (Clerk-signed) rather than `persona.personId` (T-53-09) to prevent client-side persona tampering from spoofing another user's wish counts.

4. **SQL injection / data loss in migrations** — All three migrations use parameterized patterns: `jsonb_set` / `jsonb_agg` over `jsonb_array_elements`, with string literals in `NOT IN (...)` / `IN (...)` clauses. No user-controlled input reaches the SQL. The `layout::text ~* 'pattern'` regex uses static literals ('discipline-chart|discipline-distribution', 'bench-report|strategic-alerts', 'resource-conflicts') — no catastrophic-backtracking risk. All three migrations are idempotent (WHERE clause short-circuits on second run) with PGlite tests asserting (a) re-run produces no change, (b) rows without matches are untouched, (c) NULL/empty-array layouts don't crash.

5. **XSS in rendered persona content** — Persona strings/counts flow through next-intl's ICU interpolation which escapes by default. Hrefs in NotificationBell (`/pm/wishes?tab=rejected`, `/line-manager/approval-queue`, `/alerts`) are static literals assigned by `if/else` branches — no user-controlled URL concatenation. `aria-label` values come from i18n keys with integer-only `{count}` interpolation. Zero `dangerouslySetInnerHTML` in `src/`.

6. **Feature flag tamper resistance** — `uiV6Polish` is read server-side via `getOrgFlags(organizationId)` (`src/features/flags/flag.service.ts:26-46`) which reads the `feature_flags` DB row for the authenticated org. The FlagContext value is seeded from this server read and passed down via React Context. Client-side `useFlags()` only reads from that context — a client cannot inject `uiV6Polish=true` via query params, localStorage, or headers; any such value would be ignored. The `/api/test/flags` write path is the only way to flip the flag, and it is prod-gated (T-53-25).

7. **Secrets / logging** — Zero `console.log` / `console.error` statements in all Phase 53 source files (verified via grep across `src/app/api/test/flags`, `src/components/persona/notification-bell.tsx`, `src/components/alerts/*`, `src/app/(app)/alerts/*`, `src/features/capacity/capacity.service.ts`, `src/features/dashboard/widgets/discipline-breakdown-widget.tsx`). No tokens, org IDs, or user IDs appear in error responses — `handleApiError` wraps exceptions without echoing tenant identifiers. Test attachments (viewport specs) write only numeric scroll/client-height data.

---

## Accepted Risks Log

None beyond the threats listed as `accept` in the register above (T-53-01, T-53-04, T-53-05, T-53-11, T-53-13, T-53-15, T-53-17, T-53-20, T-53-22, T-53-23, T-53-24, T-53-26). All acceptances are documented with rationale in their respective PLAN-*.md `<threat_model>` blocks.

---

## Summary

**Closed:** 26/26
**Open:** 0/26
**Status:** clean

Every declared threat has verifiable mitigation evidence in the shipped code, or is an accepted risk with documented rationale. The WR-01 code-review fix (shipping `/api/test/flags` with three independent production gates) materially strengthened T-53-03 / T-53-25 compared to the plan-time disposition — the test-only helper now has defense-in-depth instead of a single-layer `e2e/`-scope convention.

No new vulnerabilities discovered outside the declared threat register during the focused-area sweep (auth/tenant/XSS/SQLi/secrets/flag-tamper).

**Recommendation:** Phase 53 is secure-ready for the flag-ON rollout. The operator should apply the three one-shot SQL migrations per the Phase 51 LEAN-11 one-shot pattern before flipping `uiV6Polish=true` for any prod tenant, matching the runbook in 53-VERIFICATION.md human-verification item #3.

---

_Audited: 2026-04-24_
_Auditor: Claude (gsd-security-auditor)_
_ASVS Level: 1 (default — project has not declared a higher target)_
