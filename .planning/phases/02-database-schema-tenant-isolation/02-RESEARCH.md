# Phase 2: Database Schema & Tenant Isolation - Research

**Researched:** 2026-03-26
**Domain:** Drizzle ORM schema, Neon PostgreSQL, multi-tenant row-level isolation
**Confidence:** HIGH

## Summary

Phase 2 establishes the complete database layer for Nordic Capacity: all Drizzle ORM table definitions, migrations to Neon PostgreSQL 17, a `withTenant()` query wrapper enforcing row-level tenant isolation, development seed data, and a health check endpoint. The architecture document (Section 7) defines 13 entities with full field specifications, indexes, and relationships -- this phase implements the 7 core domain tables (organizations, people, projects, programs, departments, disciplines, allocations) plus the 4 platform admin tables (platform_admins, platform_audit_log, impersonation_sessions, feature_flags) and 2 operational tables (import_sessions, system_announcements).

The stack is locked: Drizzle ORM 0.45.x with `@neondatabase/serverless` via the `drizzle-orm/neon-http` adapter for queries. Schema definitions use `pgTable` from `drizzle-orm/pg-core` with UUID primary keys (`uuid().defaultRandom()`), `pgEnum` for status fields, and composite indexes matching ARCHITECTURE.md Section 7. The `withTenant()` wrapper is an application-level query scoping function -- not Postgres RLS -- that injects `WHERE organization_id = ?` on every query.

**Primary recommendation:** Define all 13 tables in a single `src/db/schema.ts` file using Drizzle's `pgTable` API, generate migrations with `drizzle-kit generate`, run them with `drizzle-kit migrate`, implement `withTenant()` as a factory function returning scoped query builders per table, and validate isolation with an integration test.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | Multi-tenant organization with row-level data isolation via `organization_id` | `organization_id` UUID FK on every tenant-scoped table; `withTenant()` wrapper pattern; composite indexes include org_id |
| FOUND-02 | `withTenant()` ORM query wrapper enforcing tenant isolation on every database query | Factory function pattern returning scoped select/insert/update/delete builders; see Architecture Patterns section |
| FOUND-04 | Drizzle ORM schema -- organizations, people, projects, programs, departments, disciplines, allocations | All 13 entities defined in ARCHITECTURE.md Section 7 with exact field specs; Drizzle pgTable column types mapped |
| FOUND-05 | Database migrations and development seed data on Neon PostgreSQL 17 | drizzle-kit generate + migrate workflow; seed script using tsx; Neon HTTP driver for connection |
| FOUND-07 | Health check endpoint returning 200 with DB connection status | Next.js API route at `/api/health` executing `SELECT 1` via Drizzle and returning status JSON |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

No CLAUDE.md file exists in the project root. Constraints are derived from:
- `.planning/config.json`: YOLO mode, commit_docs enabled, fine granularity
- `.planning/PROJECT.md`: Drizzle ORM, Neon PostgreSQL 17, row-level tenant isolation via ORM middleware
- `.planning/research/STACK.md`: Drizzle 0.45.x (not v1 beta), `@neondatabase/serverless`, Zod 4.x
- Phase 1 Summary: Next.js 16.2.1, TypeScript 5.9.3, Tailwind CSS 4.2.2, Zod 4.3.6, env validation via `@t3-oss/env-nextjs`

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.1 | SQL-first TypeScript ORM | Locked decision (ADR-002); lighter than Prisma, better serverless cold starts |
| drizzle-kit | 0.31.10 | Migration generation and execution CLI | Paired with drizzle-orm; handles generate/migrate/push/studio |
| @neondatabase/serverless | 1.0.2 | Neon HTTP + WebSocket driver | Native serverless driver for Neon PG; HTTP for queries, WS for transactions |
| drizzle-zod | 0.8.3 | Auto-generate Zod schemas from Drizzle tables | `createInsertSchema`/`createSelectSchema`/`createUpdateSchema` for API validation |
| dotenv | latest | Load .env in CLI scripts | Needed for seed script and migration runner outside Next.js context |
| tsx | latest | Run TypeScript scripts directly | Execute seed.ts without compilation step |

**Note on drizzle-zod vs drizzle-orm/zod:** The official docs show `import { createInsertSchema } from 'drizzle-orm/zod'` for newer versions, but this is a Drizzle v1 API. For 0.45.x stable, use the separate `drizzle-zod` package. Verify at install time which import path works.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pg (node-postgres) | N/A | NOT needed | Neon serverless driver replaces pg for serverless environments |
| ws | latest | WebSocket polyfill for Node.js | Only needed if using neon-serverless (WebSocket) driver in Node.js scripts |

**Installation:**
```bash
pnpm add drizzle-orm @neondatabase/serverless
pnpm add -D drizzle-kit drizzle-zod tsx dotenv
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  db/
    index.ts              # Drizzle client initialization (neon-http)
    schema.ts             # All table definitions (single file)
    migrate.ts            # Programmatic migration runner (optional)
  lib/
    tenant.ts             # withTenant() query wrapper
    env.ts                # Already exists from Phase 1
  app/
    api/
      health/
        route.ts          # Health check endpoint
drizzle/
  migrations/             # Auto-generated SQL migration files
  seed.ts                 # Development seed data script
drizzle.config.ts         # Drizzle Kit configuration
```

### Pattern 1: Drizzle Client Initialization (Neon HTTP)

**What:** Single Drizzle client instance using Neon HTTP driver for serverless queries.
**When to use:** All database queries in Server Components, Server Actions, and API routes.

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export const db = drizzle(process.env.DATABASE_URL!, { schema });
```

The `neon-http` driver is preferred for this project because:
- Faster for single, non-interactive queries (no WebSocket overhead)
- Works natively in Vercel serverless functions
- Neon handles connection pooling server-side

For interactive transactions (e.g., bulk import in Phase 8), switch to the WebSocket driver:
```typescript
// src/db/transaction.ts (Phase 8, not needed yet)
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const txDb = drizzle({ client: pool });
```

### Pattern 2: Table Definition with Tenant Scoping

**What:** Every tenant-scoped table includes `organization_id` as a non-nullable FK with composite indexes.
**When to use:** All domain tables except `organizations` itself and `platform_*` tables.

```typescript
// src/db/schema.ts
import {
  pgTable, pgEnum, uuid, text, varchar, integer, boolean,
  timestamp, date, jsonb, index, unique, foreignKey
} from 'drizzle-orm/pg-core';

// Enums
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trial', 'active', 'past_due', 'cancelled', 'suspended'
]);

export const projectStatusEnum = pgEnum('project_status', [
  'active', 'planned', 'archived'
]);

export const importStatusEnum = pgEnum('import_status', [
  'parsing', 'mapped', 'validated', 'importing', 'completed', 'failed'
]);

export const announcementSeverityEnum = pgEnum('announcement_severity', [
  'info', 'warning', 'critical'
]);

// Organizations table (the root -- no organization_id on itself)
export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkOrgId: text('clerk_org_id').notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  subscriptionStatus: subscriptionStatusEnum('subscription_status').default('trial').notNull(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id'),
  suspendedAt: timestamp('suspended_at', { withTimezone: true }),
  suspendedReason: varchar('suspended_reason', { length: 500 }),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  creditBalanceCents: integer('credit_balance_cents').default(0).notNull(),
  platformNotes: varchar('platform_notes', { length: 2000 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Example tenant-scoped table: people
export const people = pgTable('people', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  disciplineId: uuid('discipline_id').notNull().references(() => disciplines.id),
  departmentId: uuid('department_id').notNull().references(() => departments.id),
  targetHoursPerMonth: integer('target_hours_per_month').default(160).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('people_org_archived_idx').on(table.organizationId, table.archivedAt),
  index('people_org_dept_idx').on(table.organizationId, table.departmentId),
  index('people_org_disc_idx').on(table.organizationId, table.disciplineId),
  index('people_org_sort_idx').on(table.organizationId, table.sortOrder),
]);
```

### Pattern 3: withTenant() Query Wrapper

**What:** Factory function that returns query builders pre-scoped to a specific organization.
**When to use:** Every data access operation on tenant-scoped tables.

```typescript
// src/lib/tenant.ts
import { eq, and, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import * as schema from '@/db/schema';

export function withTenant(orgId: string) {
  return {
    // Select builders -- always scoped
    people: () => db.select().from(schema.people).where(eq(schema.people.organizationId, orgId)),
    projects: () => db.select().from(schema.projects).where(eq(schema.projects.organizationId, orgId)),
    programs: () => db.select().from(schema.programs).where(eq(schema.programs.organizationId, orgId)),
    departments: () => db.select().from(schema.departments).where(eq(schema.departments.organizationId, orgId)),
    disciplines: () => db.select().from(schema.disciplines).where(eq(schema.disciplines.organizationId, orgId)),
    allocations: () => db.select().from(schema.allocations).where(eq(schema.allocations.organizationId, orgId)),

    // Insert helpers -- inject organization_id automatically
    insertPerson: (data: Omit<typeof schema.people.$inferInsert, 'organizationId'>) =>
      db.insert(schema.people).values({ ...data, organizationId: orgId }),
    insertProject: (data: Omit<typeof schema.projects.$inferInsert, 'organizationId'>) =>
      db.insert(schema.projects).values({ ...data, organizationId: orgId }),
    // ... similar for other tables

    // Scoped update/delete -- MUST verify org ownership
    updatePerson: (personId: string, data: Partial<typeof schema.people.$inferInsert>) =>
      db.update(schema.people).set(data).where(
        and(eq(schema.people.id, personId), eq(schema.people.organizationId, orgId))
      ),
    deletePerson: (personId: string) =>
      db.delete(schema.people).where(
        and(eq(schema.people.id, personId), eq(schema.people.organizationId, orgId))
      ),
  };
}
```

**Usage in service layer:**
```typescript
// src/features/people/person.service.ts
import { withTenant } from '@/lib/tenant';

export async function listPeople(orgId: string) {
  const tenant = withTenant(orgId);
  return tenant.people();
}
```

### Pattern 4: Drizzle Kit Configuration

```typescript
// drizzle.config.ts
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle/migrations',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Pattern 5: Health Check Endpoint

```typescript
// src/app/api/health/route.ts
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ status: 'ok', db: 'connected' }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', db: 'disconnected', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 503 }
    );
  }
}
```

### Pattern 6: Seed Script

```typescript
// drizzle/seed.ts
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/db/schema';

const db = drizzle(process.env.DATABASE_URL!);

async function seed() {
  console.log('Seeding database...');

  // 1. Create demo organization
  const [org] = await db.insert(schema.organizations).values({
    clerkOrgId: 'org_demo_seed',
    name: 'Demo Engineering AB',
    slug: 'demo-engineering',
    subscriptionStatus: 'trial',
  }).returning();

  // 2. Create departments
  const [mechDept] = await db.insert(schema.departments).values({
    organizationId: org.id, name: 'Mechanical Engineering',
  }).returning();
  // ... more departments

  // 3. Create disciplines
  const [swDisc] = await db.insert(schema.disciplines).values({
    organizationId: org.id, name: 'Software', abbreviation: 'SW',
  }).returning();
  // ... more disciplines

  // 4. Create people
  const [person1] = await db.insert(schema.people).values({
    organizationId: org.id,
    firstName: 'Anna',
    lastName: 'Johansson',
    disciplineId: swDisc.id,
    departmentId: mechDept.id,
    targetHoursPerMonth: 160,
  }).returning();
  // ... more people

  // 5. Create projects
  const [project1] = await db.insert(schema.projects).values({
    organizationId: org.id,
    name: 'Project Atlas',
    status: 'active',
  }).returning();
  // ... more projects

  // 6. Create allocations
  await db.insert(schema.allocations).values([
    { organizationId: org.id, personId: person1.id, projectId: project1.id, month: '2026-04-01', hours: 80 },
    { organizationId: org.id, personId: person1.id, projectId: project1.id, month: '2026-05-01', hours: 120 },
    // ... more allocations
  ]);

  console.log('Seed complete.');
}

seed().catch(console.error).finally(() => process.exit(0));
```

**Run with:** `pnpm tsx drizzle/seed.ts`

### Anti-Patterns to Avoid

- **Raw db.select() without tenant scoping:** Every query on tenant data MUST go through `withTenant()`. Direct `db.select().from(people)` bypasses isolation.
- **Using `drizzle-kit push` in production:** Only use `push` for rapid local dev iteration. Production must use `generate` + `migrate` for auditable, reviewable migrations.
- **Serial columns for primary keys:** Use `uuid().defaultRandom()` per PostgreSQL best practice (Drizzle 0.45+ preference). Serial/identity columns create predictable IDs.
- **Missing `$onUpdate` for updatedAt:** Drizzle does not automatically update `updated_at` timestamps. Either use `.$onUpdate(() => new Date())` on the column or handle in service layer.
- **Importing from drizzle-orm/zod instead of drizzle-zod:** On 0.45.x, the `drizzle-orm/zod` import may resolve to the v1 beta API. Use the `drizzle-zod` package explicitly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation | Custom UUID function | `uuid().defaultRandom()` in Drizzle schema | PostgreSQL `gen_random_uuid()` is crypto-secure and index-friendly |
| Migration management | Custom SQL scripts | `drizzle-kit generate` + `drizzle-kit migrate` | Tracks migration state, handles rollback, auto-generates from schema diff |
| Zod validation schemas | Manual Zod schemas per table | `createInsertSchema(table)` from drizzle-zod | Auto-generates from schema; stays in sync with DB columns |
| Connection pooling | PgBouncer setup | Neon built-in connection pooling | Neon handles pooling server-side with the serverless driver |
| Timestamp management | Manual `new Date()` in queries | `defaultNow()` + `.$onUpdate()` on schema columns | DB-level defaults are consistent and timezone-aware |

## Common Pitfalls

### Pitfall 1: Drizzle Migration Generates DROP Instead of ALTER RENAME
**What goes wrong:** Renaming a column in the schema causes `drizzle-kit generate` to produce `ALTER TABLE DROP COLUMN` + `ALTER TABLE ADD COLUMN`, destroying data.
**Why it happens:** Drizzle Kit cannot infer intent from a rename; it sees a removed column and a new column.
**How to avoid:** Always review generated SQL in `drizzle/migrations/` before running `migrate`. For renames, manually edit the generated SQL to use `ALTER TABLE RENAME COLUMN`.
**Warning signs:** A migration file that contains both `DROP COLUMN` and `ADD COLUMN` for what should be a rename.

### Pitfall 2: Neon Cold Start on First Query
**What goes wrong:** The first database query after idle returns after 300-500ms instead of the expected ~50ms.
**Why it happens:** Neon scales compute to zero by default when idle.
**How to avoid:** For production, disable scale-to-zero on the Neon project settings. For development, set connection timeout to 10s. The health check endpoint will naturally keep the compute warm if monitored.
**Warning signs:** Intermittent slow first requests in the morning.

### Pitfall 3: Missing organization_id in JOIN Queries
**What goes wrong:** A JOIN between allocations and people without filtering BOTH tables on `organization_id` can return cross-tenant rows.
**Why it happens:** JOINs match on `person_id` FK, which is unique per tenant but the developer forgets the org filter on the joined table.
**How to avoid:** The `withTenant()` wrapper should be the ONLY way to access tenant data. Service functions should never construct raw JOINs without org scoping.
**Warning signs:** Any query with `JOIN` that does not have `organization_id` in the WHERE clause.

### Pitfall 4: env.ts DATABASE_URL is Optional
**What goes wrong:** Phase 1 defined `DATABASE_URL` as `.optional()` in `src/lib/env.ts`. If not updated, the app starts without a database connection and fails at runtime.
**Why it happens:** Phase 1 deferred database setup; the env var was marked optional to allow `pnpm build` without a real DB.
**How to avoid:** Phase 2 must change `DATABASE_URL` from `.optional()` to `.min(1)` (or remove `.optional()`) in `src/lib/env.ts` so the app fails fast at startup without a DB connection.
**Warning signs:** App starts fine but every DB query fails with "connection string is undefined".

### Pitfall 5: Drizzle $onUpdate Not Applied by Default
**What goes wrong:** `updated_at` columns never update after initial insert, breaking conflict detection (which relies on `updated_at` for optimistic locking in Phase 7).
**Why it happens:** Drizzle's `defaultNow()` only sets the value on INSERT. Updates require explicit handling.
**How to avoid:** Use `.$onUpdate(() => new Date())` on all `updatedAt` columns, or use a PostgreSQL trigger (more reliable but requires raw SQL in migration).
**Warning signs:** `updated_at` equals `created_at` on rows that have been modified.

### Pitfall 6: Allocation month Column as Date vs String
**What goes wrong:** If `month` is defined as `date()` in Drizzle, JavaScript Date objects introduce timezone issues. A `2026-04-01` date stored as UTC might display as `2026-03-31` in local time.
**Why it happens:** PostgreSQL `date` type is timezone-naive, but JavaScript Date is timezone-aware.
**How to avoid:** Use `date('month', { mode: 'string' })` to keep months as strings (`'2026-04-01'`). All month comparisons use string comparison which is safe for first-of-month dates.
**Warning signs:** Off-by-one-day errors in allocation month display.

## Code Examples

### Complete Allocation Table Definition
```typescript
// Source: ARCHITECTURE.md Section 7 + Drizzle column types docs
export const allocations = pgTable('allocations', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  personId: uuid('person_id').notNull().references(() => people.id),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  month: date('month', { mode: 'string' }).notNull(),
  hours: integer('hours').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  unique('allocations_org_person_project_month_uniq').on(
    table.organizationId, table.personId, table.projectId, table.month
  ),
  index('allocations_org_person_month_idx').on(table.organizationId, table.personId, table.month),
  index('allocations_org_project_month_idx').on(table.organizationId, table.projectId, table.month),
  index('allocations_org_month_idx').on(table.organizationId, table.month),
  index('allocations_person_month_idx').on(table.personId, table.month),
]);
```

### Tenant Isolation Integration Test Pattern
```typescript
// tests/tenant-isolation.test.ts
import { describe, it, expect } from 'vitest';
import { db } from '@/db';
import { withTenant } from '@/lib/tenant';
import * as schema from '@/db/schema';

describe('Tenant Isolation', () => {
  it('queries scoped to Org A return zero rows from Org B', async () => {
    // Setup: create two orgs with test data
    const [orgA] = await db.insert(schema.organizations).values({
      clerkOrgId: 'test_org_a', name: 'Org A', slug: 'org-a',
    }).returning();

    const [orgB] = await db.insert(schema.organizations).values({
      clerkOrgId: 'test_org_b', name: 'Org B', slug: 'org-b',
    }).returning();

    // Insert a department in each org
    await db.insert(schema.departments).values([
      { organizationId: orgA.id, name: 'Dept A' },
      { organizationId: orgB.id, name: 'Dept B' },
    ]);

    // Query with withTenant scoped to Org A
    const tenantA = withTenant(orgA.id);
    const depts = await tenantA.departments();

    expect(depts).toHaveLength(1);
    expect(depts[0].name).toBe('Dept A');
    // Org B's data is not visible
    expect(depts.every(d => d.organizationId === orgA.id)).toBe(true);
  });
});
```

### drizzle.config.ts
```typescript
// Source: Drizzle Kit docs
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle/migrations',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### package.json Scripts to Add
```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio",
  "db:seed": "tsx drizzle/seed.ts"
}
```

## Complete Entity List from ARCHITECTURE.md Section 7

All 13 entities that must be defined in `src/db/schema.ts`:

| Entity | Tenant-Scoped | organization_id | Phase 2 Priority |
|--------|--------------|-----------------|-----------------|
| organizations | Root table | N/A (is the org) | MUST |
| people | Yes | FK | MUST |
| projects | Yes | FK | MUST |
| programs | Yes | FK | MUST |
| departments | Yes | FK | MUST |
| disciplines | Yes | FK | MUST |
| allocations | Yes | FK | MUST |
| import_sessions | Yes | FK | MUST (table only, no service) |
| platform_admins | No (platform) | None | MUST |
| platform_audit_log | Cross-tenant | target_org_id (nullable FK) | MUST |
| impersonation_sessions | Cross-tenant | target_org_id (FK) | MUST |
| feature_flags | Yes | FK | MUST |
| system_announcements | Cross-tenant | target_org_ids (array) | MUST |

**Rationale for including all 13 in Phase 2:** Defining all tables upfront avoids migration churn later. The tables exist empty until their respective phases activate them. This is the standard approach for database-first projects.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `serial()` for PKs | `uuid().defaultRandom()` | Drizzle 0.40+ | PostgreSQL best practice; no sequential ID leakage |
| Separate `drizzle-zod` package | `import from 'drizzle-orm/zod'` | Drizzle v1 beta | On 0.45.x stable, still use `drizzle-zod` package |
| `drizzle-kit push` for production | `drizzle-kit generate` + `migrate` | Always | `push` is dev-only; migrations provide audit trail |
| `pg` (node-postgres) for Neon | `@neondatabase/serverless` | 2024 | Native HTTP driver; no TCP connection overhead |
| Manual Zod schemas | `createInsertSchema(table)` | drizzle-zod 0.5+ | Auto-sync between DB schema and validation |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Neon PostgreSQL 17 | Database layer | External service | PG 17 | Must create Neon project |
| Node.js | Scripts, Next.js | Assumed from Phase 1 | 20.x+ | -- |
| pnpm | Package management | Yes (Phase 1) | 10.33.0 | -- |
| tsx | Seed script runner | Install in Phase 2 | latest | `npx tsx` |

**Missing dependencies with no fallback:**
- Neon project with DATABASE_URL -- the user must create a Neon project and provide the connection string in `.env`

**Missing dependencies with fallback:**
- None

## Open Questions

1. **updatedAt trigger vs $onUpdate**
   - What we know: Drizzle's `.$onUpdate()` runs in the application layer (Node.js), not in the database. If a raw SQL migration or seed script updates a row, `updated_at` will not change.
   - What's unclear: Whether ARCHITECTURE.md's conflict detection (based on `updatedAt`) requires database-level triggers for correctness.
   - Recommendation: Use `.$onUpdate()` for now (simpler). If conflict detection in Phase 7 reveals gaps, add a PostgreSQL trigger via custom migration.

2. **Allocation month type: date vs varchar**
   - What we know: ARCHITECTURE.md specifies `Date` type. Drizzle's `date({ mode: 'string' })` stores as PostgreSQL `date` but returns as string in JS.
   - What's unclear: Whether downstream queries (aggregations, range filters) benefit from PostgreSQL `date` type vs plain `varchar`.
   - Recommendation: Use `date({ mode: 'string' })` -- gets PostgreSQL date comparison operators AND avoids JS timezone issues.

3. **Drizzle relations API**
   - What we know: Drizzle has a `relations()` API for declaring relationships used by the relational query builder (`db.query.people.findMany({ with: { department: true } })`).
   - What's unclear: Whether Phase 2 should define relations or defer until Phase 4 when CRUD operations need them.
   - Recommendation: Define relations in Phase 2 alongside tables. They are zero-cost (no SQL generated) and enable the relational query API from day one.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (to be installed in Phase 2 or deferred to separate task) |
| Config file | None yet -- Wave 0 gap |
| Quick run command | `pnpm vitest run --reporter=verbose` |
| Full suite command | `pnpm vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | organization_id on all tenant tables | unit | Schema inspection test | Wave 0 |
| FOUND-02 | withTenant() scopes queries | integration | `vitest run tests/tenant-isolation.test.ts` | Wave 0 |
| FOUND-04 | All 13 tables exist after migration | integration | `drizzle-kit migrate` + schema check | Wave 0 |
| FOUND-05 | Seed script populates demo data | integration | `tsx drizzle/seed.ts` + count query | Wave 0 |
| FOUND-07 | Health check returns 200 | integration | `curl localhost:3000/api/health` | Wave 0 |

### Wave 0 Gaps
- [ ] Vitest not yet installed (add as dev dependency)
- [ ] `vitest.config.ts` -- configure with path aliases matching tsconfig
- [ ] Test database setup -- need a separate Neon branch or test database URL
- [ ] `tests/tenant-isolation.test.ts` -- tenant isolation integration test

## Sources

### Primary (HIGH confidence)
- [Drizzle + Neon Setup](https://orm.drizzle.team/docs/connect-neon) -- neon-http and neon-serverless driver initialization
- [Drizzle Get Started with Neon](https://orm.drizzle.team/docs/get-started/neon-new) -- full setup workflow including drizzle.config.ts
- [Drizzle PostgreSQL Column Types](https://orm.drizzle.team/docs/column-types/pg) -- uuid, timestamp, date, jsonb, pgEnum syntax
- [Drizzle Indexes & Constraints](https://orm.drizzle.team/docs/indexes-constraints) -- index, unique, foreignKey API
- [Drizzle Zod Integration](https://orm.drizzle.team/docs/zod) -- createInsertSchema, createSelectSchema, createUpdateSchema
- [Drizzle Custom Migrations](https://orm.drizzle.team/docs/kit-custom-migrations) -- seed via custom SQL migrations
- ARCHITECTURE.md Section 7 (local) -- all 13 entity definitions with fields, types, indexes
- ARCHITECTURE.md Section 5 (local) -- project structure with src/db/ layout
- ARCHITECTURE.md Section 11 (local) -- naming conventions, env vars, error taxonomy

### Secondary (MEDIUM confidence)
- [GitHub Discussion #1539](https://github.com/drizzle-team/drizzle-orm/discussions/1539) -- withTenant enforcement patterns in Drizzle
- [Neon Docs: Connect from Drizzle](https://neon.com/docs/guides/drizzle) -- Neon-specific driver configuration
- `.planning/research/ARCHITECTURE.md` (local) -- tenant isolation pattern validation
- `.planning/research/PITFALLS.md` (local) -- P-CRIT-1 through P-CRIT-3 tenant isolation risks

### Tertiary (LOW confidence)
- None -- all findings verified against official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages verified via npm registry, versions confirmed current
- Architecture: HIGH -- schema derived from ARCHITECTURE.md Section 7 (project source of truth), Drizzle patterns verified against official docs
- Pitfalls: HIGH -- tenant isolation pitfalls well-documented in project research and community discussions

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable -- Drizzle 0.45.x will not change)
