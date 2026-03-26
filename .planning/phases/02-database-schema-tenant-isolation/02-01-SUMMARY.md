---
phase: 02-database-schema-tenant-isolation
plan: 01
subsystem: database
tags: [drizzle, postgresql, neon, schema, orm, multi-tenant]

requires:
  - phase: 01-project-scaffolding-dev-environment
    provides: TypeScript project, env validation via @t3-oss/env-nextjs, CI pipeline
provides:
  - 13 Drizzle pgTable definitions matching ARCHITECTURE.md Section 7
  - 4 pgEnums (subscription_status, project_status, import_status, announcement_severity)
  - Drizzle relations for relational query builder
  - DB client with neon-http driver (src/db/index.ts)
  - Drizzle Kit config for migration generation
  - DATABASE_URL required in env validation
affects: [02-02 withTenant, 02-03 migrations, 03 auth, 04 CRUD, 05 admin, 06 grid, 08 import, 10 platform-admin]

tech-stack:
  added: [drizzle-orm@0.45.1, "@neondatabase/serverless@1.0.2", drizzle-kit@0.31.10, drizzle-zod@0.8.3, tsx@4.21.0, dotenv@17.3.1]
  patterns: [single-file schema, neon-http driver, process.env for db client, $onUpdate for timestamps, date mode string for months]

key-files:
  created: [src/db/schema.ts, src/db/index.ts, drizzle.config.ts]
  modified: [package.json, src/lib/env.ts, .env.example]

key-decisions:
  - "Used process.env.DATABASE_URL directly in db/index.ts (not env.ts import) for CLI/seed script compatibility"
  - "Single schema.ts file for all 13 tables (no splitting) per research recommendation"
  - "date('month', { mode: 'string' }) for allocations to avoid JS timezone issues"

patterns-established:
  - "UUID primary keys with defaultRandom() on all tables"
  - "$onUpdate(() => new Date()) on all updatedAt columns"
  - "organization_id FK on all tenant-scoped tables"
  - "Named unique constraints: {table}_org_{field}_uniq"
  - "Named indexes: {table}_{columns}_idx"

requirements-completed: [FOUND-04, FOUND-01, FOUND-05]

duration: 4min
completed: 2026-03-26
---

# Phase 2 Plan 1: Database Schema & Dependencies Summary

**Complete Drizzle ORM schema with 13 pgTable definitions, 4 enums, neon-http driver, and Drizzle Kit migration tooling**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-26T09:40:03Z
- **Completed:** 2026-03-26T09:44:03Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- All 13 ARCHITECTURE.md entities defined as Drizzle pgTable with correct column types, FK references, indexes, and unique constraints
- Drizzle relations declared for all 13 tables enabling relational query builder from day one
- Database client initialized with neon-http driver for serverless queries
- DATABASE_URL promoted from optional to required in env validation
- Drizzle Kit configured with db:generate/migrate/push/studio/seed scripts

## Task Commits

Each task was committed atomically:

1. **Task 1: Install database dependencies and configure Drizzle Kit** - `53ae84e` (chore)
2. **Task 2: Define complete Drizzle schema with all 13 entities** - `95a0027` (feat)

## Files Created/Modified

- `src/db/schema.ts` - All 13 table definitions with 4 enums, indexes, unique constraints, and relations (~450 lines)
- `src/db/index.ts` - Drizzle client initialization with neon-http driver
- `drizzle.config.ts` - Drizzle Kit configuration for PostgreSQL migrations
- `package.json` - Added drizzle-orm, @neondatabase/serverless, drizzle-kit, drizzle-zod, tsx, dotenv + db scripts
- `src/lib/env.ts` - DATABASE_URL changed from optional to required
- `.env.example` - Updated DATABASE_URL documentation as REQUIRED

## Decisions Made

- Used `process.env.DATABASE_URL!` directly in db/index.ts instead of importing from env.ts, because the db client is used in CLI contexts (drizzle-kit, seed scripts) where Next.js env validation has not run
- Kept all 13 tables in a single schema.ts file per research recommendation (no splitting needed at this scale)
- Used `date('month', { mode: 'string' })` for allocations.month to avoid JavaScript timezone date shifting (Research Pitfall 6)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration.** Before running migrations (Plan 02-02), the user must:
- Create a Neon project (free tier) with PostgreSQL 17 at https://console.neon.tech
- Copy the pooled connection string to `.env.local` as `DATABASE_URL`
- Verify with: `pnpm db:push` (should connect without errors)

## Next Phase Readiness

- Schema ready for migration generation (Plan 02-02)
- withTenant() query wrapper can be built against these table definitions (Plan 02-02)
- Health check endpoint can use the db client (Plan 02-02)
- All subsequent CRUD plans (Phase 4+) can import from `@/db/schema` and `@/db`

---
*Phase: 02-database-schema-tenant-isolation*
*Completed: 2026-03-26*
