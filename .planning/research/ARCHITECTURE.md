# Architecture Research

Research into patterns for multi-tenant SaaS systems with spreadsheet-grade editing, applied to the Nordic Capacity resource planner.

---

## Component Architecture

### Typical Boundaries for Modular Monoliths

Production multi-tenant SaaS systems with interactive grids consistently land on three architectural tiers, even within a monolith:

**1. Tenant Shell (cross-cutting)**

- Auth middleware (tenant resolution, role checks)
- Tenant context propagation (every request carries `organizationId`)
- Subscription/entitlement gating
- Error handling and observability

**2. Domain Modules (business logic)**

- Each module owns its data, queries, validation schemas, and service layer
- Modules communicate through well-defined service interfaces, never through direct DB queries across module boundaries
- In Next.js App Router, this maps to `src/features/*` folders with co-located service/query/schema/type files

**3. Presentation Layer (pages + components)**

- Server Components for data fetching and initial render
- Client Components for interactive elements (grids, forms, wizards)
- Shared UI primitives in `src/components/ui/`

### Recommended Module Boundaries for Nordic Capacity

The architecture document already identifies the right modules. Key boundary rules to enforce:

| Module           | Owns                                                    | May depend on                                                 |
| ---------------- | ------------------------------------------------------- | ------------------------------------------------------------- |
| `allocations`    | allocation table CRUD, batch upsert, grid data queries  | `people`, `projects` (read-only lookups)                      |
| `people`         | person CRUD, person list queries                        | `organizations` (tenant scoping)                              |
| `projects`       | project CRUD, program association                       | `programs`                                                    |
| `programs`       | program CRUD                                            | none                                                          |
| `import`         | file parsing, column mapping, validation, execution     | `allocations`, `people`, `projects` (write via service calls) |
| `export`         | Excel/CSV generation                                    | `allocations` (read via service calls)                        |
| `billing`        | Stripe integration, subscription lifecycle              | `organizations`                                               |
| `platform-admin` | cross-tenant operations, impersonation                  | all modules (privileged access)                               |
| `organizations`  | org settings, reference data (departments, disciplines) | none                                                          |

**Key principle:** The `import` module should call `allocationService.batchUpsert()` rather than writing to the allocation table directly. This ensures validation rules and tenant scoping are always applied.

---

## Data Flow

### Primary Read Flow (Person Input Form)

```
Browser Request
  -> Next.js Middleware (Clerk auth + tenant resolution)
  -> Server Component (src/app/(app)/input/[personId]/page.tsx)
    -> allocationService.getByPerson(personId, orgId, monthRange)
    -> Returns: allocations + person metadata + project list
  -> Client Component (AllocationGrid)
    -> AG Grid renders with data
    -> TanStack Query caches for client-side navigation
```

### Primary Write Flow (Cell Edit -> Auto-save)

```
User edits cell in AG Grid
  -> onCellValueChanged fires
  -> Debounced auto-save (use-grid-autosave.ts)
  -> TanStack Query mutation (optimistic update)
    -> Immediate UI update (new value shown)
    -> POST /api/allocations/batch (sends changed cells)
      -> Middleware: auth + tenant resolution
      -> allocationService.batchUpsert(orgId, changes)
        -> Drizzle: INSERT ... ON CONFLICT UPDATE
      -> Returns: { success: true, updatedRows }
    -> On success: invalidate dependent queries (SUMMA row, status)
    -> On error: rollback optimistic update, show toast
```

### Import Flow (Multi-step)

```
Step 1: Upload
  -> POST /api/import/upload (multipart file)
  -> Server: SheetJS parses headers + sample rows
  -> Returns: { headers, sampleData, suggestedMapping }

Step 2: Map
  -> Client displays mapping UI
  -> User confirms/adjusts column mappings

Step 3: Validate
  -> POST /api/import/validate (file reference + mapping)
  -> Server: parse all rows, validate against DB
  -> Returns: { valid[], warnings[], errors[], suggestions[] }

Step 4: Execute
  -> POST /api/import/execute (validated data + user choices)
  -> Server: allocationService.batchUpsert() in transaction
  -> Returns: { imported: 820, skipped: 5, errors: 0 }
```

### Data Derivation Principle

All views derive from the flat allocation table:

| View              | Derivation                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------- |
| Person Input Form | `SELECT * FROM allocations WHERE person_id = ? AND org_id = ? AND month BETWEEN ? AND ?` pivoted into grid    |
| Team Overview     | `SELECT person_id, month, SUM(hours) FROM allocations WHERE org_id = ? GROUP BY person_id, month` -> heat map |
| Project View      | `SELECT person_id, month, hours FROM allocations WHERE project_id = ? AND org_id = ?` -> staffing grid        |
| Flat Table        | `SELECT * FROM allocations WHERE org_id = ?` with filters -> tabular display                                  |
| Dashboard KPIs    | Aggregation queries over allocations joined with people/projects                                              |

This "flat table is truth" pattern is well-established in planning tools. It avoids dual-write consistency problems and makes the system easy to reason about.

---

## Tenant Isolation Patterns

### Industry Approaches

There are three common patterns for multi-tenant data isolation:

**1. Separate databases per tenant**

- Strongest isolation. Each tenant has their own PostgreSQL database.
- Operationally expensive: migrations run N times, connection pooling per tenant, backup complexity.
- Used by: enterprise SaaS where contractual isolation is required (healthcare, finance).
- Not appropriate here: operational overhead is disproportionate for 1-3 person team.

**2. Shared database, separate schemas**

- Each tenant gets a PostgreSQL schema. Queries use `SET search_path`.
- Moderate isolation. Migrations still run N times but within one database.
- Used by: mid-market SaaS with moderate tenant counts (100s, not 10,000s).
- Possible but unnecessarily complex for this scale.

**3. Shared database, shared schema, row-level filtering**

- All tenants share tables. Every table has `organization_id`. Queries filter by it.
- Two sub-patterns:
  - **Postgres RLS (Row-Level Security):** Policies enforce filtering at the database level. `SET app.current_org = ?` per connection.
  - **ORM middleware/application-level:** Every query gets `WHERE organization_id = ?` injected by the ORM layer.
- Used by: most SaaS at scale (Slack, Notion, Linear, etc. all use shared-schema approaches).

### Validation of the ORM Middleware Approach

The project has chosen option 3 with ORM middleware (not Postgres RLS). This is a sound decision for the following reasons:

**Advantages over Postgres RLS:**

- **Testability:** Middleware can be unit-tested. RLS policies are tested by running queries against a real database.
- **Debuggability:** When a tenant isolation bug occurs, application-level filtering surfaces in logs and stack traces. RLS failures are silent (rows simply don't appear).
- **Portability:** Not coupled to PostgreSQL. If the database changes, the isolation logic moves with the application.
- **Drizzle compatibility:** Drizzle does not have first-class RLS support. Applying RLS requires raw SQL policy definitions outside the ORM's migration system.
- **Performance transparency:** Application-level WHERE clauses are visible in query plans. RLS can introduce unexpected performance characteristics, especially with complex policies.

**Risks to mitigate:**

- **Missed filter:** The primary risk is a code path that forgets to apply `organization_id` filtering. Mitigations:
  1. All Drizzle queries should go through a `withTenant(orgId)` wrapper or base query builder that automatically injects the filter.
  2. Integration tests should verify that queries for tenant A never return tenant B data.
  3. A CI check or linting rule that flags raw Drizzle queries not using the tenant wrapper.
- **Direct SQL/migration scripts:** Any raw SQL must include `organization_id` filtering. Document this as a team convention.

**Recommended implementation pattern (Drizzle):**

```typescript
// src/lib/tenant.ts
export function withTenant<T extends PgTable>(table: T, orgId: string) {
  return db.select().from(table).where(eq(table.organizationId, orgId));
}

// Or as a query builder extension:
export function tenantScope(orgId: string) {
  return {
    allocations: db.select().from(allocations).where(eq(allocations.organizationId, orgId)),
    people: db.select().from(people).where(eq(people.organizationId, orgId)),
    // ... other tables
  };
}
```

This is superior to Postgres RLS for this project's constraints (small team, Drizzle ORM, Neon serverless where connection-level SET commands add complexity with connection pooling).

---

## Grid State Management

### The Core Challenge

Spreadsheet editing in a web app requires reconciling two realities:

1. The user expects instant feedback (type a number, see it immediately)
2. The server is the source of truth (persisted data, derived calculations)

### Pattern 1: Optimistic Updates with Rollback (Recommended)

This is the standard pattern used by Google Sheets, Notion tables, Linear, and most modern collaborative editors:

```
User types "120" in cell (person=Alice, project=Alpha, month=2026-04)
  1. AG Grid updates the cell value immediately (local state)
  2. SUMMA row recalculates client-side (sum of column values)
  3. Status row updates client-side (compare SUMMA vs target)
  4. Mutation fires: PATCH /api/allocations/batch
  5. On success: TanStack Query cache updated, no visible change to user
  6. On failure: cell reverts to previous value, toast shows error
```

**Key implementation details:**

- **Debounce strategy:** Do not send a request per keystroke. Use cell-blur or a 500ms debounce after last edit. AG Grid's `onCellEditingStopped` is the right hook.
- **Batch mutations:** Collect all changes since last save into a single batch request. The user may edit 5 cells before any save fires.
- **Client-side derived values:** SUMMA (column total) and Status (over/under/ok) should be computed client-side for instant feedback, then validated against server response.

### Pattern 2: Conflict Detection

For a single-person-at-a-time editing model (which this system uses), conflicts are rare but possible:

- **Same person, two browser tabs:** User A and User B both editing Alice's allocations.
- **Import overwrites grid data:** Bulk import runs while someone is editing.

**Last-write-wins with notification** is the appropriate strategy at this scale:

```typescript
// Each allocation row has an `updatedAt` timestamp
// On batch save, include the `updatedAt` of each changed row
// Server checks: if server.updatedAt > client.updatedAt, conflict detected
// Response: { conflicts: [{ cellId, yourValue, serverValue, serverUpdatedAt }] }
// Client shows: "This cell was modified by another user. Keep yours or use theirs?"
```

Full operational transform (Google Docs style) is overkill for monthly allocation grids. The data is naturally low-contention: each person's allocation is typically edited by one line manager.

### Pattern 3: TanStack Query Cache as Client State

TanStack Query is the right tool for this because it handles:

- **Cache invalidation:** After a save, invalidate queries that depend on the changed data (SUMMA calculations, team overview aggregates).
- **Optimistic updates:** `useMutation` with `onMutate` for immediate UI update and `onError` for rollback.
- **Stale-while-revalidate:** When navigating between people, cached data shows instantly while a background refetch runs.
- **Window focus refetch:** When the user returns to the tab, data is silently refreshed.

**Recommended cache key structure:**

```typescript
// Per-person allocation data (the grid)
['allocations', orgId, personId, { from: '2026-01', to: '2027-06' }][
  // Person list (sidebar)
  ('people', orgId, { filters })
][
  // Project list (for dropdowns)
  ('projects', orgId)
][
  // Team overview aggregates
  ('team-overview', orgId, { from, to })
];
```

### AG Grid Integration Specifics

- AG Grid manages its own internal state. The pattern is: load data into AG Grid via `rowData` prop, let AG Grid handle editing, capture changes via `onCellValueChanged`, sync back to server.
- Do not try to make AG Grid a controlled component (re-rendering on every state change). It is designed as an uncontrolled component with imperative API access.
- For SUMMA/Status rows: use AG Grid's `pinnedBottomRowData` for summary rows that update when cell values change.

---

## Platform Admin Patterns

### How SaaS Platforms Typically Separate Admin

There are three common approaches:

**1. Same app, different role (Not recommended)**

- Platform admins are just users with a "super-admin" role in the same auth system.
- Risk: privilege escalation bugs expose platform-level operations to tenant users.
- Risk: Clerk organization model doesn't naturally support a "god mode" user.

**2. Same app, separate auth system (Chosen approach)**

- Platform admin routes (`/platform/*`) use their own JWT/session mechanism.
- Tenant routes use Clerk. Platform routes use a `platform_admins` table with bcrypt passwords and custom JWT.
- Middleware checks: if route starts with `/platform`, validate platform JWT. Otherwise, validate Clerk session.
- This is how Vercel, Railway, and many infrastructure SaaS handle it.

**3. Completely separate application**

- Platform admin is a different deployed app (e.g., `admin.example.com`).
- Maximum isolation but doubles deployment and maintenance effort.
- Appropriate for large teams. Overkill for 1-3 developers.

### Validation of the Chosen Approach (Option 2)

The decision to use a separate auth system for platform admin is well-aligned with the constraints:

**Why this works:**

- **No Clerk dependency for platform operations:** If Clerk has an outage, platform admin still works. Critical for incident response.
- **Clear security boundary:** Platform admin routes are a separate middleware branch. No risk of tenant middleware accidentally granting platform access.
- **Simple implementation:** A `platform_admins` table with email/password_hash/role/created_at. JWT with short expiry (1 hour). No OAuth, no social login, no invitation flow needed.
- **Impersonation is clean:** Platform admin authenticates with their own JWT, then "enters" a tenant context. Audit log records both identities.

**Implementation recommendations:**

```
Platform Admin Auth Flow:
1. POST /api/platform/auth { email, password }
2. Server: verify against platform_admins table (bcrypt)
3. Server: issue JWT { sub: platformAdminId, role: 'platform_admin', exp: 1h }
4. Client: store in httpOnly cookie (not localStorage)
5. All /platform/* routes: middleware verifies this JWT

Impersonation Flow:
1. POST /api/platform/organizations/:orgId/impersonate
2. Server: creates impersonation session { platformAdminId, targetOrgId, targetUserId, startedAt }
3. Server: issues a secondary token/cookie for the impersonated context
4. Client: navigates to /(app)/* routes with impersonation banner visible
5. Every action during impersonation: audit log includes platformAdminId
6. POST /api/platform/impersonation/end -> clears impersonation session
```

**Security considerations:**

- Rate-limit `/api/platform/auth` aggressively (5 attempts per 15 minutes).
- Require strong passwords (16+ chars) for platform admins — there will be very few of them.
- Consider TOTP 2FA for platform admin login in Phase 2.
- All platform admin actions should write to `platform_audit_log` table.
- The `PLATFORM_ADMIN_SECRET` used for initial admin seeding should be rotated after first use.

---

## Build Order Implications

### Dependency Graph

The system has clear dependency chains that dictate build order:

```
Level 0 (Foundation - no dependencies):
  Database schema + Drizzle setup
  Clerk auth integration
  Tailwind + design tokens
  Project scaffolding (Next.js, tsconfig, linting)

Level 1 (Core domain - depends on Level 0):
  Tenant middleware (organization_id extraction from Clerk)
  Reference data CRUD (departments, disciplines, programs)
  Person CRUD
  Project CRUD

Level 2 (Primary feature - depends on Level 1):
  Allocation table CRUD + batch upsert
  Person Input Form (AG Grid integration)
  Auto-save + optimistic updates

Level 3 (Data operations - depends on Level 1 + 2):
  Flat Table View (read from allocations, filter, sort)
  Excel import wizard (depends on people, projects, allocations services)
  Excel/CSV export

Level 4 (Secondary views - depends on Level 2):
  Team Overview heat map
  Project View
  Management Dashboard

Level 5 (Platform - can be built in parallel from Level 0):
  Platform admin auth
  Platform admin dashboard
  Tenant management
  Impersonation

Level 6 (Monetization - depends on Level 0 + 1):
  Stripe billing integration
  Subscription gating middleware
```

### Recommended Build Sequence

**Sprint 1: Foundation (1-2 weeks)**

1. Next.js project scaffolding with App Router
2. Tailwind config with design tokens from prototypes
3. Drizzle schema definition (all tables, indexes, relations)
4. Database migration pipeline (Neon)
5. Clerk integration (sign-up, sign-in, organization creation)
6. Tenant middleware (`organizationId` on every request)
7. App shell layout (top nav + side nav, no functionality)

**Sprint 2: Core Domain (1-2 weeks)**

1. Person CRUD (service + API routes + basic UI)
2. Project CRUD (service + API routes + basic UI)
3. Reference data CRUD (departments, disciplines, programs)
4. Person sidebar navigation (list with search)

**Sprint 3: The Grid (2-3 weeks) -- This is the critical path**

1. AG Grid integration (allocation-grid component)
2. Allocation service (CRUD + batch upsert)
3. Grid data loading (server component -> client grid)
4. Cell editing + auto-save (use-grid-autosave hook)
5. SUMMA row + Status row (client-side calculations)
6. Keyboard navigation (Tab, Enter, arrows)
7. Drag-to-fill (custom implementation)
8. Person prev/next navigation with grid data caching

**Sprint 4: Data Operations (1-2 weeks)**

1. Flat Table View (TanStack Table, not AG Grid — different interaction model)
2. Excel/CSV export
3. Import wizard (upload -> map -> validate -> execute)
4. Swedish header auto-detection

**Sprint 5: Polish + Billing (1-2 weeks)**

1. Stripe integration (subscription creation, webhook handling)
2. Subscription gating (trial -> paid -> expired states)
3. Error handling polish (Sentry integration, error boundaries)
4. Onboarding flow refinement

**Platform Admin (can run in parallel with Sprints 3-5):**

1. Platform admin auth (separate JWT system)
2. Organization list + detail views
3. Tenant management actions (suspend, reactivate)
4. Impersonation flow
5. Platform audit log

### What Can Be Parallelized

If two developers are available:

| Developer A               | Developer B                                  |
| ------------------------- | -------------------------------------------- |
| Sprint 1: Foundation      | Sprint 1: Foundation (collaborate)           |
| Sprint 2: Core Domain     | Sprint 2: Core Domain (split person/project) |
| Sprint 3: The Grid        | Platform Admin (auth + dashboard)            |
| Sprint 4: Data Operations | Platform Admin (impersonation + audit)       |
| Sprint 5: Billing         | Sprint 5: Polish + testing                   |

### Critical Path Items

The **AG Grid integration** (Sprint 3) is the highest-risk, highest-effort item. It is the core product experience and has the most unknowns:

- AG Grid Community Edition's limitations may surface during implementation (range selection, copy/paste edge cases)
- Auto-save timing and debounce tuning requires real user testing
- SUMMA/Status row reactivity needs careful state management
- Performance with 100 projects x 36 months (3,600 cells) needs profiling

**Recommendation:** Build a minimal grid prototype early (even before Sprint 3 formally starts) to validate AG Grid Community Edition's capabilities against the requirements. A half-day spike can prevent weeks of rework.

### What to Defer

Items that should explicitly NOT be built in Phase 1:

- Department-level scoping (Phase 3 — requires rethinking every query)
- Real-time collaboration / WebSocket sync (not needed — low-contention data)
- Weekly granularity (monthly is the canonical unit)
- Notification system (placeholder icon only)
- Dark mode (CSS variable toggle, add later)
- Public API (Phase 3)

---

## Summary of Key Recommendations

1. **Tenant isolation via ORM middleware is the right call.** Implement a `withTenant()` query wrapper and enforce its use through code review and integration tests.

2. **Optimistic updates with last-write-wins conflict detection** is the right pattern for grid editing at this contention level.

3. **AG Grid should be treated as an uncontrolled component.** Load data in, capture changes out, sync to server. Do not try to make React own the grid state.

4. **Platform admin as a separate auth system within the same app** is the right balance of isolation and development efficiency.

5. **The grid (Sprint 3) is the critical path.** Spike it early, budget extra time, and do not let import/export or billing block it.

6. **TanStack Query is the state management layer.** No Redux, no Zustand, no separate client store. Server state belongs in TanStack Query; grid state belongs in AG Grid. They meet at the mutation boundary.
