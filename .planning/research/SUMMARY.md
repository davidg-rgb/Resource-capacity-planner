# Research Summary

Synthesis of stack, features, architecture, and pitfalls research for Nordic Capacity resource planner SaaS.

---

## Stack Verdict

**Confirmed choices (no changes needed):**
- TypeScript 5.7+, Tailwind CSS 4.x, TanStack Query 5.x, Clerk (@clerk/nextjs v6), Sentry, Vercel Pro, GitHub Actions

**Version upgrades required:**

| Component | Was | Now | Reason |
|-----------|-----|-----|--------|
| Next.js | 15 | **16.2** | Security CVEs, Turbopack stable, React 19.2. Two majors behind. |
| AG Grid | 32.x | **35.x** | Three majors behind. Codemods available. |
| Drizzle ORM | 0.35+ | **0.45.x** | Significant perf + DX improvements. Skip v1 beta (unstable). |
| Zod | 3.x | **4.x** | Better perf, smaller bundle. Released July 2025. |
| PostgreSQL | 16 | **17** | Better JSON, query planner. Neon supports it. |

**Swaps and additions:**
- SheetJS: Install from CDN (`cdn.sheetjs.com`), not npm (stale at 0.18.5)
- Add ESLint 9 + Prettier (not Biome -- missing eslint-plugin-next rules)
- Add Vitest + Playwright for testing
- Add pnpm as package manager

**Explicitly rejected:** Prisma, NextAuth, Redux/Zustand, Jest, Cypress, AG Grid Enterprise, Drizzle v1 beta, tRPC, Supabase

---

## Feature Priorities

### Table Stakes -- Covered by MVP
- Grid-based allocation editing (AG Grid)
- Basic capacity/availability visibility (heat maps)
- Multi-project view (flat table with filtering)
- Filtering and grouping
- Basic reporting and export (CSV/Excel via SheetJS)
- Role-based access control (Clerk multi-tenant)
- Data import (Excel with Swedish/English header detection)

### Table Stakes -- Missing from MVP (build immediately post-MVP)
1. **Leave/absence management** -- without it, capacity numbers are wrong. Highest user expectation gap.
2. **Multi-project conflict detection** -- over-allocation is the #1 pain point driving Excel abandonment.

### Key Differentiators (engineering-team focus)
1. Spreadsheet-familiar UX (AG Grid) -- competitors all use timeline/Gantt
2. Swedish/Nordic market fit -- no competitor has this
3. Long-horizon planning (12-18 months) -- Float is weak here
4. Multi-discipline skills tracking -- competitors treat as flat tags
5. Scenario planning / what-if modeling -- high value, high complexity
6. Performance at 200-500 resources -- AG Grid virtualization advantage

### Anti-Features (deliberately excluded)
- Built-in time tracking (agency feature, scope creep)
- Full project management / Kanban (Jira owns this)
- Invoicing / billing (engineering teams are cost centers)
- Granular daily scheduling (wrong abstraction for 12-18 month horizons)
- AI auto-scheduling (premature; managers want control)
- Native mobile app (desktop activity, responsive web sufficient)
- Gantt chart as primary UI (competitors all do this; our grid IS the product)

---

## Architecture Validation

### Confirmed patterns
- **Tenant isolation via ORM middleware** -- sound decision over Postgres RLS for this stack. Drizzle has no first-class RLS support, and Neon connection pooling makes session-variable RLS risky (P-CRIT-3).
- **Flat allocation table as single source of truth** -- all views derive from one table. Avoids dual-write consistency problems.
- **Optimistic updates with last-write-wins** -- correct for low-contention monthly allocation data. Full OT/CRDT is overkill.
- **AG Grid as uncontrolled component** -- load data in, capture changes out. Do not try to make React own grid state.
- **TanStack Query as the state management layer** -- no Redux/Zustand needed. Server state in TQ, grid state in AG Grid.
- **Platform admin with separate JWT auth** -- correct isolation from Clerk. Matches Vercel/Railway pattern.
- **Module boundaries** -- allocations, people, projects, programs, import, export, billing, platform-admin, organizations are the right cuts.

### Adjustments needed
1. **Add `withTenant(orgId)` wrapper** -- every Drizzle query must go through this. Not optional. The import module must call `allocationService.batchUpsert()` rather than writing directly.
2. **Add RLS as safety net** -- even with ORM middleware, add database-level RLS as defense-in-depth. Use `SET LOCAL` (transaction-scoped) to avoid connection pool contamination.
3. **Cache keys must include orgId** -- convention: every TanStack Query key starts with `[orgId, ...]`. Clear cache on org switch.
4. **Middleware file rename** -- Next.js 16 renames `middleware.ts` to `proxy.ts`.
5. **Custom paste handler needed** -- AG Grid Community clipboard paste is Enterprise-only. Must intercept browser paste event and call `applyTransaction`. ~50 lines of code.

### Critical patterns to enforce
- All async request APIs must be awaited (Next.js 16 requirement)
- `getRowId` callback on AG Grid for efficient diffing
- Memoize `rowData` and `columnDefs` with `useMemo`
- Single JOIN query for allocation grid loading (avoid N+1)
- Batch inserts for import (chunks of 500-1000 rows)
- Debounce auto-save on cell-blur, not per-keystroke

---

## Top Risks & Mitigations

| # | Risk | Impact | Likelihood | Mitigation |
|---|------|--------|------------|------------|
| 1 | **Cross-tenant data leakage** (P-CRIT-1) | Critical | Medium | `withTenant()` ORM wrapper + RLS safety net + integration tests verifying tenant isolation + CI lint rule flagging unscoped queries |
| 2 | **AG Grid Community paste limitation** (P-INT-1) | High | Certain | Custom browser paste event handler parsing tab-separated clipboard data into `applyTransaction`. Build during grid sprint. |
| 3 | **Excel import production incidents** (P-INT-2, P-INT-3) | High | High | Codepage 65001 for Swedish chars, fuzzy header matching, preview step in wizard, filter empty rows, handle merged cells/formulas/hidden rows. Collect 5-10 real Excel files before building. |
| 4 | **Scope creep / over-building** (P-SOLO-1) | High | High | Phase 1 = auth + one person grid + import. Set calendar deadline for first user test. The 4,544-line architecture doc is a map, not a mandate. |
| 5 | **Vercel 60s timeout on large imports** (P-INT-6) | Medium | Medium | Chunk processing with progress tracking. Consider Vercel background functions for imports > 100 rows. |

---

## Recommendations for Roadmap

### Build first (Phase 1 -- 6-8 weeks)
1. **Foundation (1-2 weeks):** Next.js 16.2 scaffolding, Drizzle schema, Neon PG17, Clerk auth, tenant middleware with `withTenant()`, app shell layout
2. **Core domain (1-2 weeks):** Person CRUD, Project CRUD, reference data, person sidebar navigation
3. **The Grid (2-3 weeks):** AG Grid integration, allocation batch upsert, auto-save with optimistic updates, SUMMA/Status rows, custom paste handler, keyboard nav -- THIS IS THE CRITICAL PATH
4. **Data operations (1-2 weeks):** Flat table view, Excel/CSV export, import wizard with Swedish header detection

### Can be parallelized
- **Platform admin** (separate JWT auth, org management, impersonation) can run in parallel with grid and data operations -- no dependencies on core domain
- **Sentry + monitoring setup** can happen alongside foundation work

### Defer explicitly
- Leave/absence management (first post-MVP feature)
- Skills/discipline tracking
- Scenario planning
- Billing/Stripe integration (defer until first paying customer)
- Department-level scoping (requires rethinking every query)
- Real-time collaboration / WebSocket sync
- Weekly granularity (monthly is canonical)
- Dark mode, notifications, public API

### Post-MVP build order
1. Leave/absence management
2. Skills/discipline tracking
3. Multi-project conflict detection
4. Placeholder resources
5. Utilization reporting
6. Long-horizon views (12-18 months)
7. Bulk operations
8. Scenario planning
9. Cost tracking
10. API / integrations (Jira connector highest demand)

---

## Key Insights

1. **AG Grid paste is Enterprise-only.** This is the single most painful Community limitation for a spreadsheet-replacement product. Users will expect Ctrl+V on day one. The workaround (~50 lines intercepting browser paste event) must be planned and built during the grid sprint, not discovered in user testing.

2. **Excel import is where production incidents live.** Swedish encoding (Windows-1252 vs UTF-8), merged cells, hidden rows, formula cells, empty trailing rows, and multi-sheet files will all appear in real user data. The import preview step is not optional -- it is the primary defense against data corruption.

3. **Neon's economics changed dramatically.** Post-Databricks acquisition (May 2025), storage pricing dropped from $1.75 to $0.35/GB-month. Disable scale-to-zero on production (~$19/month) to eliminate cold start latency. This is a non-obvious cost win.

4. **The npm `xlsx` package is stale.** The `xlsx` package on npm is frozen at 0.18.5 (4 years old). Modern SheetJS must be installed from `cdn.sheetjs.com`. This will trip up any developer who runs `npm install xlsx`.

5. **Clerk `orgId` is null on first load.** New users, org-switching users, and URL-slug mismatches all produce null orgId. Every API route needs a guard, and middleware should redirect to org selection. Without this, tenant-scoped queries break silently.

6. **No competitor targets Nordic engineering teams with spreadsheet UX.** Float, Runn, Resource Guru, and Productive all optimize for creative agencies with timeline/Gantt views. The AG Grid spreadsheet approach combined with Swedish language support and 12-18 month planning horizons is genuinely uncontested territory.

7. **The architecture doc's 270-item checklist is a risk, not an asset, for a solo developer.** The biggest threat to the project is building infrastructure for 6 months before a real user touches the grid. Phase 1 must end with a usable Person Input Form in someone's hands.

8. **Connection pool tenant context contamination is the #1 cause of RLS data leaks in production.** If using RLS as a safety net (recommended), always use `SET LOCAL` (transaction-scoped), never `SET` (session-scoped). Neon's PgBouncer reuses connections across requests.

---

*Synthesized 2026-03-25 from STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md*
