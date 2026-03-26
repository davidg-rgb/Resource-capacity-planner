# Pitfalls Research

Research for Nordic Capacity resource planner SaaS project.
Stack: Next.js 15, PostgreSQL/Neon, Drizzle ORM, AG Grid Community, Clerk, SheetJS, Vercel.

---

## Critical Pitfalls

### P-CRIT-1: Cross-Tenant Data Leakage via Missing WHERE Clause

**Risk:** OWASP #1 (Broken Access Control). With row-level tenant isolation using `organization_id`, a single forgotten WHERE clause exposes another tenant's data.

**Why this project is vulnerable:**

- Drizzle ORM has no built-in mechanism to enforce that every query includes a `tenantId` filter. There is no middleware/interceptor that throws if a query omits the tenant filter.
- 23 modules with ~75 service functions = 75+ places to forget the filter.
- JOIN queries are especially dangerous: joining allocations to persons without filtering both tables on `organization_id` can leak rows.

**Warning signs:** Any service function that takes raw IDs without also taking/validating `organizationId`. Any query that uses `.where(eq(table.id, id))` without also filtering on org.

**Prevention:**

- Create a `withTenant(db, orgId)` wrapper that returns a scoped query builder, used by every service function.
- Add a database-level PostgreSQL RLS policy as a safety net even if the app layer also filters. Use `SET app.current_tenant` per request and enforce with RLS USING clause.
- Write a lint rule or test that greps all `.select()` / `.update()` / `.delete()` calls and asserts `organization_id` is present.
- **Phase:** Foundation (Phase 1). Must be in place before any data-touching code ships.

### P-CRIT-2: RLS Policy Gaps on New Tables

**Risk:** Every new table with `organization_id` needs its own RLS policy. Forgetting one table creates a silent data leak. PostgreSQL table owners bypass RLS by default.

**Prevention:**

- Use `FORCE ROW LEVEL SECURITY` on all tenant-scoped tables so even the table owner is subject to policies.
- Add a migration-time check: a script that lists all tables with an `organization_id` column and verifies each has an RLS policy enabled.
- Keep a checklist in the migration template.
- **Phase:** Foundation (Phase 1).

### P-CRIT-3: Connection Pool Tenant Context Contamination

**Risk:** With Neon's PgBouncer connection pooling, if you set `app.current_tenant` via `SET` on a pooled connection, that context can leak to the next request that reuses that connection. This is the #1 cause of RLS-based multi-tenant data leaks in production.

**Prevention:**

- Use `SET LOCAL` (transaction-scoped) instead of `SET` (session-scoped) so the context is automatically cleared when the transaction ends.
- Always wrap tenant-scoped queries in explicit transactions.
- Alternatively, pass tenant ID as a query parameter rather than relying on session variables.
- **Phase:** Foundation (Phase 1).

### P-CRIT-4: Shared Cache Poisoning Between Tenants

**Risk:** TanStack Query cache keys that don't include the `organizationId` will serve Tenant A's data to Tenant B when a user switches organizations.

**Warning signs:** Cache keys like `["persons"]` instead of `["persons", orgId]`. A user who belongs to two organizations sees stale data after switching.

**Prevention:**

- Establish a convention: every TanStack Query key starts with `[orgId, ...]`.
- Clear the query cache on organization switch (`queryClient.clear()` in the Clerk org switch handler).
- **Phase:** Foundation (Phase 1).

### P-CRIT-5: Platform Admin JWT Bypass

**Risk:** The platform admin uses separate JWT auth from Clerk. If admin endpoints don't properly validate the admin JWT, or if admin routes are accessible with a Clerk session, an attacker could escalate privileges.

**Prevention:**

- Admin routes on a completely separate route prefix (`/admin/...`) with its own middleware that rejects Clerk tokens.
- Never share service functions between tenant-scoped and admin-scoped code without explicit tenant parameter validation.
- **Phase:** Foundation (Phase 1).

---

## Performance Pitfalls

### P-PERF-1: AG Grid Re-renders on Large Grids

**Risk:** 500 persons x 36 month columns = 18,000 cells per person grid view. While AG Grid handles this natively via row/column virtualization, React-specific anti-patterns destroy performance.

**Common mistakes:**

- Passing a new `rowData` array reference on every render (triggers full grid refresh).
- Using heavy React components as cell renderers (each mounted in its own React root).
- Using `autoHeight` on rows (creates complex DOM per cell).
- Not enabling `immutableData` / `getRowId` (AG Grid can't diff efficiently).

**Prevention:**

- Use `getRowId` callback so AG Grid tracks rows by identity, not index.
- Memoize `rowData` and `columnDefs` with `useMemo`.
- Prefer plain JS cell renderers over React component renderers where possible.
- Set `suppressColumnVirtualisation={false}` (default) to keep column virtualization active.
- Test in React production mode; dev mode adds massive overhead to grid rendering.
- **Phase:** Person Input Form (Phase 1, but optimize in Phase 2).

### P-PERF-2: Neon Cold Start on First Request

**Risk:** Neon compute scales to zero by default. First request after idle wakes the compute in 300-500ms. For a capacity planner where users check dashboards in the morning, every day starts with a cold start.

**Prevention:**

- Disable scale-to-zero on the production branch (Neon setting). Keeps compute warm. Cost: ~$19/month for always-on smallest compute.
- Use Neon's serverless driver (`@neondatabase/serverless`) with WebSocket connections for edge functions, and pooled connection string for server-side rendering.
- Set connection timeout to 10s (not default 5s) during development to survive cold starts without errors.
- **Phase:** Infrastructure setup (Phase 1).

### P-PERF-3: N+1 Queries in Allocation Grid Loading

**Risk:** Loading the Person Input Form requires: person data + all allocations for that person + all project names + target hours. Naive implementation makes one query per project row.

**Prevention:**

- Single query with JOIN: load all allocations for a person in one query, grouped by project.
- Preload project names in a separate query (they change rarely, cache aggressively).
- **Phase:** Person Input Form (Phase 1).

### P-PERF-4: Bulk Import Performance Cliff

**Risk:** Importing 500 persons with 12-month allocations = potentially 500 x N_projects x 12 allocation rows. A naive row-by-row insert becomes thousands of individual INSERTs.

**Prevention:**

- Use Drizzle's batch insert (`db.insert(allocations).values([...])`) with chunks of 500-1000 rows.
- Wrap entire import in a single transaction for atomicity and performance.
- Show progress to user (WebSocket or polling) for imports > 100 rows.
- **Phase:** Import wizard (Phase 1).

### P-PERF-5: TanStack Query Over-Fetching on Navigation

**Risk:** Navigating between persons (prev/next) triggers a full data refetch each time if `staleTime` is too low.

**Prevention:**

- Set `staleTime: 30_000` (30s) for allocation data. The user who just loaded it likely hasn't changed it.
- Prefetch adjacent persons (`queryClient.prefetchQuery`) on navigation for instant prev/next.
- **Phase:** Person Input Form (Phase 1).

---

## Integration Pitfalls

### P-INT-1: AG Grid Community Missing Features That Bite Later

**Enterprise-only features you will eventually want but cannot use:**

- **Server-Side Row Model**: Not needed at 500 rows, but if a tenant hits 2,000+ persons, client-side model struggles. Community only has Client-Side and Infinite row models.
- **Clipboard (paste)**: Community supports copy but paste from clipboard is Enterprise-only. For a spreadsheet-replacement app, users will expect Ctrl+V to work. This is probably the single most painful limitation.
- **Row Grouping / Pivoting**: Cannot group by department or discipline in the grid. Must build custom UI.
- **Excel Export**: Enterprise-only. Community can only export CSV. For a tool replacing Excel, users will want `.xlsx` export from the grid.
- **Integrated Charts**: No inline charting from grid data.
- **Context Menu (custom)**: The right-click context menu is Enterprise-only.
- **Status Bar / Aggregation Footer**: Cannot show sum/average in a footer row natively.

**Workarounds:**

- Paste: Intercept `paste` browser event, parse clipboard text (tab-separated), and call `applyTransaction` to update cells. ~50 lines of custom code.
- Excel export: Use SheetJS to build `.xlsx` from grid data (already in the stack).
- Row grouping: Implement as a filtered view with custom UI, not grid-native grouping.
- Status bar: Add SUMMA/Target rows as pinned bottom rows (supported in Community).
- Context menu: Use browser-native right-click or a custom overlay.

**Phase:** Plan workarounds during Phase 1 design. Implement as needed.

### P-INT-2: SheetJS Swedish/International Character Encoding

**Risk:** Swedish headers (Avdelning, Befattning, Efternamn) with characters like A-O-A will corrupt if the Excel file is saved in older `.xls` (BIFF5/BIFF8) format or CSV without BOM.

**Specific failure modes:**

- `.xls` files (not `.xlsx`) use codepage-based encoding. SheetJS defaults to UTF-8 but older Excel saves as Windows-1252. "vagskran" becomes "vA$?gskran".
- CSV files without UTF-8 BOM: Swedish characters silently corrupt.
- Header matching fails: if "Avdelning" is encoded differently, the column mapper won't recognize it, and the import silently drops that column.

**Prevention:**

- Always specify `codepage: 65001` (UTF-8) when reading with SheetJS.
- Normalize headers: trim whitespace, lowercase, and use a fuzzy/alias map (`{"avdelning": "department", "department": "department", "dept": "department"}`).
- After reading, validate that expected columns were found. If < 50% of expected columns match, warn the user about possible encoding issues.
- Support both `.xlsx` (modern, UTF-8) and `.xls` (legacy) but log a warning for `.xls` files.
- **Phase:** Import wizard (Phase 1).

### P-INT-3: SheetJS Edge Cases in Real-World Excel Files

**Risk:** Users' Excel files are messy. Production incidents from:

- **Merged cells**: SheetJS unmerges them but only puts the value in the top-left cell. Other cells become `undefined`.
- **Hidden rows/columns**: SheetJS reads them by default. Hidden "template" rows get imported as real data.
- **Multiple sheets**: User puts data on Sheet2 but app reads Sheet1.
- **Formulas vs. values**: Cells with formulas may return the formula string instead of the calculated value if the file was saved without recalculating.
- **Date formats**: Excel stores dates as serial numbers. Swedish date format (YYYY-MM-DD) vs. US (MM/DD/YYYY) parsing differences.
- **Empty rows**: Trailing empty rows at the bottom of a range get imported as empty person records.
- **Numbers as strings**: "100" stored as text vs. 100 as number.

**Prevention:**

- Read with `{cellDates: true, cellNF: true}` to get proper date objects.
- Filter out rows where all relevant columns are empty.
- Show preview step in import wizard: let user confirm data before committing.
- Auto-detect which sheet contains the data by checking for header patterns on each sheet.
- Strip formulas: use `{type: 'array', raw: false}` to get calculated values.
- **Phase:** Import wizard (Phase 1).

### P-INT-4: Clerk Active Organization is Null on First Load

**Risk:** When a user logs in, `auth().orgId` can be `null` if no organization is active. The user might have multiple orgs or none. Every API route that does `auth().orgId` will throw or return wrong data if this isn't handled.

**Specific scenarios:**

- New user signs up but hasn't created/joined an org yet -> `orgId` is null.
- User switches org via `<OrganizationSwitcher>` -> brief window where `orgId` reflects old org during the handshake.
- Clerk middleware detects org slug mismatch in URL and attempts activation, which can fail silently if user isn't a member of that org.

**Prevention:**

- Wrap all API routes: if `!orgId`, return 403 with a clear error message ("No organization selected").
- In middleware, redirect users without an active org to an org selection page.
- Use `organizationSyncOptions` in `clerkMiddleware()` to sync org from URL slug.
- After org switch, invalidate all TanStack Query caches.
- **Phase:** Foundation (Phase 1).

### P-INT-5: Drizzle ORM Migration Footguns

**Risk:** Drizzle's `drizzle-kit push` (dev mode) and `drizzle-kit generate` (migration mode) can produce destructive migrations:

- Renaming a column generates DROP + ADD (data loss) instead of ALTER RENAME.
- Changing a column type can silently drop data.
- No built-in "are you sure?" for destructive changes.

**Prevention:**

- Always review generated SQL before applying migrations.
- Never use `push` in production; only use `generate` + `migrate`.
- Back up the database before running migrations (Neon has point-in-time recovery).
- Use Neon branching: run migration on a branch first, verify, then apply to main.
- **Phase:** All phases.

### P-INT-6: Vercel Serverless Function Timeout and Size

**Risk:** Vercel Pro has a 60-second function timeout. A 500-person Excel import with validation against DB (check for duplicates, validate projects exist) can exceed this.

**Prevention:**

- Process imports in chunks with progress tracking.
- Consider Vercel's streaming responses or background functions for long imports.
- Keep the serverless function bundle small: SheetJS is ~1MB, ensure it's not duplicated across routes.
- **Phase:** Import wizard (Phase 1).

---

## Solo Developer Pitfalls

### P-SOLO-1: Scope Creep via Architecture Astronautics

**Risk:** The architecture doc is 4,544 lines with 38 features. Building all of it before getting user feedback means months of work that might miss the mark. Solo developers with detailed plans tend to over-build infrastructure and under-build the thing users actually touch.

**Warning signs:** Spending more than 2 weeks on auth/infrastructure before the Person Input Form works. Building features beyond MVP before first user test.

**Prevention:**

- Phase 1 must be: auth + one person grid + import. Nothing else.
- Set a calendar deadline for first user test (not feature-complete, just usable).
- The 270-item build checklist is a reference, not a sequential task list.

### P-SOLO-2: No Code Review Safety Net

**Risk:** Without code review, security bugs (missing tenant filter), performance bugs (N+1 queries), and logic bugs ship directly to production.

**Prevention:**

- Use AI agent as code reviewer: before merging, have the agent review for tenant isolation, error handling, and performance patterns.
- Write integration tests for critical paths: tenant isolation, import, and allocation CRUD.
- Use TypeScript strict mode and ESLint with security rules.

### P-SOLO-3: Bus Factor = 1

**Risk:** If you get sick, lose motivation, or context-switch for 2 weeks, there's no one to maintain the service. Customers on a SaaS expect uptime.

**Prevention:**

- Comprehensive error monitoring (Sentry) from day 1.
- Automated health checks and uptime monitoring.
- Keep the architecture simple enough that you (or an AI agent) can resume after a gap.
- Document decisions in ADRs, not just code comments.

### P-SOLO-4: Testing Only the Happy Path

**Risk:** Solo developers test what they built, not what users will do. Edge cases in Excel import, concurrent editing, org switching, and browser compatibility go untested.

**Prevention:**

- Collect 5-10 real Excel files from potential users before building the import wizard.
- Test with: Chrome, Firefox, Safari. AG Grid has known Safari quirks.
- Write error-path tests: what happens when the DB is down? When Clerk is slow? When the Excel file is 50MB?

### P-SOLO-5: Premature Optimization vs. Missing Basics

**Risk:** Spending time on caching strategies, CDN configuration, or database tuning before having 10 users. Meanwhile, basic things like error messages, loading states, and empty states are missing.

**Prevention:**

- Rule: no performance optimization until a real user reports slowness or monitoring shows a problem.
- Invest time in UX polish (loading skeletons, error boundaries, empty states) before infrastructure optimization.

### P-SOLO-6: Ignoring Operational Concerns

**Risk:** No logging strategy, no error tracking, no backup verification, no monitoring. First production incident becomes a crisis.

**Prevention:**

- Sentry from day 1 (already in stack).
- Structured logging with tenant context in every log line.
- Verify Neon's point-in-time recovery actually works by doing a test restore.
- Set up a simple uptime check (e.g., Vercel's built-in or UptimeRobot free tier).

---

## Prevention Strategies

### Foundation Phase (Phase 1 - Before Any Features)

| Pitfall                                 | Prevention                                        | Effort  |
| --------------------------------------- | ------------------------------------------------- | ------- |
| P-CRIT-1: Missing tenant filter         | `withTenant()` wrapper + RLS safety net           | 1 day   |
| P-CRIT-2: RLS gaps on new tables        | Migration template with RLS checklist             | 2 hours |
| P-CRIT-3: Connection pool contamination | `SET LOCAL` in transactions                       | 2 hours |
| P-CRIT-4: Cache poisoning               | `orgId` in all query keys + cache clear on switch | 2 hours |
| P-CRIT-5: Admin JWT bypass              | Separate middleware, separate route prefix        | 4 hours |
| P-INT-4: Clerk orgId null               | Middleware redirect + API guard                   | 2 hours |
| P-SOLO-6: No monitoring                 | Sentry + health check endpoint                    | 2 hours |

### Person Input Form Phase

| Pitfall                         | Prevention                                  | Effort  |
| ------------------------------- | ------------------------------------------- | ------- |
| P-PERF-1: Grid re-renders       | `getRowId`, memoization, plain JS renderers | Ongoing |
| P-INT-1: AG Grid paste missing  | Custom paste handler via browser event      | 4 hours |
| P-INT-1: AG Grid export missing | SheetJS-based `.xlsx` export                | 2 hours |
| P-PERF-3: N+1 queries           | Single JOIN query for allocations           | 1 hour  |
| P-PERF-5: Over-fetching on nav  | staleTime + prefetch adjacent               | 1 hour  |

### Import Wizard Phase

| Pitfall                    | Prevention                                      | Effort  |
| -------------------------- | ----------------------------------------------- | ------- |
| P-INT-2: Swedish encoding  | codepage setting + fuzzy header matching        | 4 hours |
| P-INT-3: Excel edge cases  | Preview step + validation + empty row filtering | 1 day   |
| P-PERF-4: Bulk insert perf | Batch inserts in transaction                    | 2 hours |
| P-INT-6: Vercel timeout    | Chunked processing with progress                | 4 hours |

### Ongoing / Every Phase

| Pitfall                     | Prevention                                 | Effort           |
| --------------------------- | ------------------------------------------ | ---------------- |
| P-INT-5: Drizzle migrations | Review generated SQL, test on Neon branch  | 15 min/migration |
| P-SOLO-1: Scope creep       | Calendar deadline for first user test      | Discipline       |
| P-SOLO-2: No code review    | AI agent review before merge               | 10 min/PR        |
| P-SOLO-4: Happy path only   | Collect real Excel files, test error paths | Ongoing          |

---

## Key Takeaways

1. **Tenant isolation is the #1 risk.** Three independent layers of defense: ORM wrapper, RLS policies, and cache key conventions. All must be in place before any data-touching feature.

2. **AG Grid Community's paste limitation is the most impactful missing feature** for a spreadsheet-replacement product. Plan the custom paste handler early.

3. **Excel import is where production incidents live.** Swedish encoding, merged cells, hidden rows, formula cells, and empty rows will all happen with real user files. The preview step in the import wizard is not optional.

4. **Neon cold starts are solvable** by disabling scale-to-zero on the production branch. Worth the ~$19/month.

5. **Ship the Person Input Form to a real user before building anything else.** The 4,544-line architecture doc is a map, not a mandate.
