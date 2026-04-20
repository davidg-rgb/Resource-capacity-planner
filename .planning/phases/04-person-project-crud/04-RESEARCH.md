# Phase 4: Person & Project CRUD - Research

**Researched:** 2026-03-26
**Domain:** CRUD services, Next.js API routes, TanStack Query, Zod validation, Drizzle ORM queries
**Confidence:** HIGH

## Summary

Phase 4 implements the Person and Project CRUD operations -- the domain entities that all downstream features (allocation grid, import, export, dashboards) depend on. The architecture is fully specified in ARCHITECTURE.md sections 6.2, 6.3, and 8, with exact function signatures, API contracts, error codes, and auth requirements.

The existing codebase provides strong foundations: `withTenant()` for tenant-scoped queries (with insert/update/delete helpers), `requireRole()` for auth gating, the `AppError` hierarchy for error responses, Zod 4.3.6 for validation, and `drizzle-zod` 0.8.3 for auto-generating schemas from Drizzle tables. The DB schema for `people` and `projects` tables is already migrated and live. Placeholder pages exist at `/team` and `/projects`.

**Primary recommendation:** Build feature modules (`src/features/people/`, `src/features/projects/`) with service + schema + types files, wire them to Next.js API route handlers, then add TanStack Query hooks and simple list/form UI components. Install `@tanstack/react-query` as the first task since it's in the architecture but not yet in package.json.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MGMT-01 | Person CRUD -- create, read, update, delete persons with name, discipline, department, target capacity | ARCHITECTURE.md 6.2 defines all 6 person service functions; 8 defines 5 API endpoints; withTenant() already has insertPerson/updatePerson/deletePerson helpers |
| MGMT-02 | Project CRUD -- create, read, update, archive projects with name, program, status | ARCHITECTURE.md 6.3 defines all 5 project service functions; 8 defines 5 API endpoints; withTenant() already has insertProject/updateProject/deleteProject helpers |
</phase_requirements>

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.1 | ORM for tenant-scoped DB queries | Already in use via withTenant() |
| zod | 4.3.6 | Request body validation | Already in dependencies |
| drizzle-zod | 0.8.3 | Auto-generate Zod schemas from Drizzle tables | Already in devDependencies |
| next | 16.2.1 | API route handlers (App Router) | Already in use |
| lucide-react | 1.7.0 | Icons (Plus, Pencil, Trash, etc.) | Already in dependencies |

### New (to install this phase)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | 5.95.2 | Server state management, caching, mutations | Architecture specifies TanStack Query 5.x for all data fetching |

### Not Needed Yet

| Library | Reason |
|---------|--------|
| AG Grid | Phase 6 (allocation grid) |
| SheetJS | Phase 8 (import/export) |

**Installation:**
```bash
pnpm add @tanstack/react-query
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  features/
    people/
      person.service.ts        # Business logic (listPeople, getById, createPerson, updatePerson, deletePerson)
      person.schema.ts         # Zod schemas: personCreateSchema, personUpdateSchema + TS types
      person.types.ts          # PersonWithStatus, PersonFilter, PersonCreate, PersonUpdate
    projects/
      project.service.ts       # Business logic (listProjects, getById, createProject, updateProject, deleteProject)
      project.schema.ts        # Zod schemas: projectCreateSchema, projectUpdateSchema + TS types
      project.types.ts         # ProjectWithProgram, ProjectWithDetails, ProjectFilter, ProjectCreate, ProjectUpdate
  app/
    api/
      people/
        route.ts               # GET (list) + POST (create)
        [id]/
          route.ts             # GET (by id) + PATCH (update) + DELETE (soft-delete)
      projects/
        route.ts               # GET (list) + POST (create)
        [id]/
          route.ts             # GET (by id) + PATCH (update) + DELETE (archive)
    (app)/
      team/
        page.tsx               # Replace placeholder with person list + CRUD UI
      projects/
        page.tsx               # Replace placeholder with project list + CRUD UI
  hooks/
    use-people.ts              # TanStack Query hook: useQuery + useMutation for people
    use-projects.ts            # TanStack Query hook: useQuery + useMutation for projects
  components/
    providers/
      query-provider.tsx       # TanStack QueryClientProvider (wraps app layout)
```

### Pattern 1: Feature Module Service Pattern

**What:** Each feature module has a service file with pure business logic functions that accept `orgId` as the first parameter and use `withTenant()` internally.

**When to use:** Every CRUD service in this project.

**Example:**
```typescript
// src/features/people/person.service.ts
import { eq, and, ilike, or, isNull } from 'drizzle-orm';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { withTenant } from '@/lib/tenant';
import { NotFoundError, ValidationError, ConflictError } from '@/lib/errors';
import type { PersonCreate, PersonUpdate, PersonFilter } from './person.types';

export async function listPeople(orgId: string, filters: PersonFilter = {}) {
  const tenant = withTenant(orgId);
  let query = tenant.people();

  // Chain additional filters onto the base tenant-scoped query
  // withTenant().people() returns a Drizzle select builder - can chain .where()
  if (filters.departmentId) {
    query = query.where(eq(schema.people.departmentId, filters.departmentId));
  }
  // ... etc
  return query;
}

export async function createPerson(orgId: string, data: PersonCreate) {
  const tenant = withTenant(orgId);
  const [person] = await tenant.insertPerson({
    firstName: data.firstName,
    lastName: data.lastName,
    disciplineId: data.disciplineId,
    departmentId: data.departmentId,
    targetHoursPerMonth: data.targetHoursPerMonth ?? 160,
  }).returning();
  return person;
}

export async function deletePerson(orgId: string, personId: string) {
  // Soft-delete: set archivedAt timestamp
  const tenant = withTenant(orgId);
  const result = await tenant.updatePerson(personId, {
    archivedAt: new Date(),
  });
  if (result.rowCount === 0) {
    throw new NotFoundError('Person', personId);
  }
}
```

### Pattern 2: API Route Handler Pattern

**What:** Each route handler authenticates with `requireRole()`, validates body with Zod, calls the service, returns JSON with the correct status code, and catches `AppError` for structured error responses.

**When to use:** Every API route.

**Example:**
```typescript
// src/app/api/people/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getTenantId } from '@/lib/auth';
import { AppError } from '@/lib/errors';
import { listPeople, createPerson } from '@/features/people/person.service';
import { personCreateSchema } from '@/features/people/person.schema';

export async function GET(req: NextRequest) {
  try {
    const orgId = await getTenantId();
    const { searchParams } = req.nextUrl;
    const filters = {
      departmentId: searchParams.get('departmentId') ?? undefined,
      disciplineId: searchParams.get('disciplineId') ?? undefined,
      search: searchParams.get('search') ?? undefined,
    };
    const people = await listPeople(orgId, filters);
    return NextResponse.json({ people });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    return NextResponse.json({ error: 'ERR_INTERNAL' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireRole('admin');
    const body = await req.json();
    const data = personCreateSchema.parse(body);
    const person = await createPerson(orgId, data);
    return NextResponse.json({ person }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    return NextResponse.json({ error: 'ERR_INTERNAL' }, { status: 500 });
  }
}
```

### Pattern 3: TanStack Query Hook Pattern

**What:** Custom hooks wrapping `useQuery` and `useMutation` with proper query keys, invalidation on mutation success, and typed return values.

**When to use:** Every client component that fetches or mutates data.

**Example:**
```typescript
// src/hooks/use-people.ts
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function usePeople(filters?: Record<string, string>) {
  return useQuery({
    queryKey: ['people', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters);
      const res = await fetch(`/api/people?${params}`);
      if (!res.ok) throw new Error('Failed to fetch people');
      return res.json();
    },
  });
}

export function useCreatePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: PersonCreate) => {
      const res = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create person');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });
}
```

### Pattern 4: Zod Schema from Drizzle Table

**What:** Use `createInsertSchema` from `drizzle-zod` to auto-generate base schemas, then refine with `.omit()` and `.extend()` for API-specific shapes.

**Example:**
```typescript
// src/features/people/person.schema.ts
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { people } from '@/db/schema';

const basePersonSchema = createInsertSchema(people);

export const personCreateSchema = basePersonSchema
  .omit({ id: true, organizationId: true, createdAt: true, updatedAt: true, archivedAt: true, sortOrder: true })
  .extend({
    targetHoursPerMonth: z.number().int().min(1).max(744).default(160),
  });

export const personUpdateSchema = personCreateSchema.partial();

export type PersonCreate = z.infer<typeof personCreateSchema>;
export type PersonUpdate = z.infer<typeof personUpdateSchema>;
```

### Anti-Patterns to Avoid

- **Skipping tenant scoping:** Never use `db.select().from(people)` directly -- always go through `withTenant(orgId)`.
- **Hard-deleting records:** Both people and projects use soft-delete (archivedAt / status='archived'). Never use SQL DELETE.
- **Validating in route handlers:** Keep validation in Zod schemas, keep business rules in service files, keep route handlers thin.
- **Mixing server and client concerns:** Service files are server-only. Hooks are client-only. Never import service files in client components.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Request validation | Manual field checks | `drizzle-zod` createInsertSchema + Zod parse | Auto-syncs with DB schema, catches edge cases |
| Server state caching | useState + useEffect fetch | TanStack Query useQuery/useMutation | Handles cache invalidation, refetching, loading states, error states |
| Error response format | Ad-hoc JSON error objects | `AppError.toJSON()` from lib/errors.ts | Consistent error format across all endpoints |
| Tenant query scoping | Manual WHERE clauses | `withTenant(orgId)` helpers | Already built with insert/update/delete methods |
| Auth + role checking | Manual JWT parsing | `getTenantId()` / `requireRole()` from lib/auth.ts | Already built, tested in Phase 3 |

## Common Pitfalls

### Pitfall 1: Drizzle returning() Not Chained on withTenant Helpers

**What goes wrong:** The `withTenant().insertPerson()` helper returns a Drizzle insert builder. You must chain `.returning()` to get the created record back.
**Why it happens:** Forgetting that Drizzle insert/update are builders, not executors.
**How to avoid:** Always chain `.returning()` on insert and update operations when you need the result.
**Warning signs:** Getting `undefined` back from insert/update calls.

### Pitfall 2: Zod 4 Import Path

**What goes wrong:** Zod 4.x changed some import paths. `z.object()`, `z.string()`, etc. work the same, but `createInsertSchema` from `drizzle-zod` must be verified to work with Zod 4.
**Why it happens:** drizzle-zod 0.8.3 was built for Zod 3.x originally.
**How to avoid:** Test schema generation early. If `drizzle-zod` fails with Zod 4, fall back to manual Zod schemas (still straightforward for these simple entities).
**Warning signs:** Runtime errors on import or `.parse()` calls.

### Pitfall 3: Soft-Delete Leaking Archived Records into Lists

**What goes wrong:** `listPeople()` and `listProjects()` return archived records in the active list.
**Why it happens:** Forgetting to filter `WHERE archived_at IS NULL` (people) or `WHERE status != 'archived'` (projects) by default.
**How to avoid:** Default filters exclude archived records. Only include them when `includeArchived: true` is explicitly passed.
**Warning signs:** Deleted entities still appearing in the UI.

### Pitfall 4: Missing Unique Constraint Error Handling

**What goes wrong:** Creating a project with a duplicate name within the same org throws a raw Postgres error instead of a user-friendly ConflictError.
**Why it happens:** The `projects_org_name_uniq` unique constraint is in the schema. Insert will throw a Postgres unique violation.
**How to avoid:** Catch the Drizzle/Postgres error code `23505` (unique_violation) and wrap it in a `ConflictError`.
**Warning signs:** 500 errors on duplicate name creation.

### Pitfall 5: withTenant Update Returning rowCount for Not-Found Detection

**What goes wrong:** `withTenant().updatePerson(id, data)` silently succeeds even if the person doesn't exist (returns 0 rows affected).
**Why it happens:** SQL UPDATE with a WHERE clause that matches nothing is valid SQL -- it just affects 0 rows.
**How to avoid:** Check `result.rowCount === 0` after update/delete calls and throw `NotFoundError`.
**Warning signs:** PATCH/DELETE returning 200 for non-existent IDs.

### Pitfall 6: QueryClientProvider Missing from App Layout

**What goes wrong:** TanStack Query hooks throw "No QueryClient set" error.
**Why it happens:** Forgetting to wrap the app in `QueryClientProvider` when installing TanStack Query for the first time.
**How to avoid:** Create a client component `query-provider.tsx` and wrap it around children in the `(app)/layout.tsx`.
**Warning signs:** Runtime error on any page that uses `useQuery`.

## Code Examples

### Error Handler Utility (DRY route handlers)

```typescript
// src/lib/api-utils.ts
import { NextResponse } from 'next/server';
import { AppError } from './errors';
import { ZodError } from 'zod';
import { ValidationError } from './errors';

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(error.toJSON(), { status: error.statusCode });
  }
  if (error instanceof ZodError) {
    const validationError = new ValidationError('Validation failed', {
      fields: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
    });
    return NextResponse.json(validationError.toJSON(), { status: 400 });
  }
  console.error('Unhandled API error:', error);
  return NextResponse.json({ error: 'ERR_INTERNAL', message: 'Internal server error' }, { status: 500 });
}
```

### Dynamic Route Handler ([id] param extraction)

```typescript
// src/app/api/people/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getTenantId } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { getById, updatePerson, deletePerson } from '@/features/people/person.service';
import { personUpdateSchema } from '@/features/people/person.schema';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = await getTenantId();
    const { id } = await params;
    const person = await getById(orgId, id);
    return NextResponse.json({ person });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await requireRole('admin');
    const { id } = await params;
    const body = await req.json();
    const data = personUpdateSchema.parse(body);
    const person = await updatePerson(orgId, id, data);
    return NextResponse.json({ person });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await requireRole('admin');
    const { id } = await params;
    await deletePerson(orgId, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### QueryClientProvider Setup

```typescript
// src/components/providers/query-provider.tsx
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: 1,
      },
    },
  }));
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

### Confirmation Dialog (delete person)

```typescript
// Simple confirm before delete - no library needed, use native confirm() for MVP
// Later phases can upgrade to a modal component
export function useDeletePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (personId: string) => {
      const res = await fetch(`/api/people/${personId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete person');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Next.js 15 route params as object | Next.js 16 route params as `Promise<{ id: string }>` | Next.js 15.1+ | Must `await params` in route handlers |
| Zod 3 `z.infer<>` | Zod 4 `z.infer<>` (same API) | Zod 4.0 | Minimal migration -- API is largely compatible |
| TanStack Query v4 | TanStack Query v5 | 2024 | No more `onSuccess` on `useQuery`, different import structure |

## Open Questions

1. **drizzle-zod + Zod 4 compatibility**
   - What we know: drizzle-zod 0.8.3 is installed, Zod 4.3.6 is installed. Prior research says it should work.
   - What's unclear: Whether `createInsertSchema` produces valid Zod 4 schemas at runtime.
   - Recommendation: Try it first. If it fails, write manual Zod schemas (5 minutes of work for these simple entities).

2. **Person name duplicate handling**
   - What we know: ARCHITECTURE.md says ConflictError for same name in same department is a "warning, not blocker."
   - What's unclear: Should the UI show a warning dialog and allow proceeding, or block the creation?
   - Recommendation: For MVP, return a ConflictError (409) and let the UI show the error. The user can change the name or proceed differently. This matches the simplest implementation.

3. **Listing people with status**
   - What we know: ARCHITECTURE.md specifies `listPeople` returns `PersonWithStatus` including `currentMonthStatus` and `currentMonthTotal`.
   - What's unclear: This requires joining with allocations for the current month, which is Phase 6+ territory.
   - Recommendation: Implement a basic `listPeople` that returns people without status aggregation. Add a TODO comment for status enrichment when allocations are available. The type should be ready but the field can be null/empty until Phase 6.

## Sources

### Primary (HIGH confidence)
- ARCHITECTURE.md sections 5, 6.2, 6.3, 8, 11.3 -- full service signatures, API contracts, naming conventions
- src/db/schema.ts -- verified people and projects table definitions with all columns and constraints
- src/lib/tenant.ts -- verified withTenant() API with insert/update/delete helpers
- src/lib/errors.ts -- verified AppError hierarchy with all error types
- src/lib/auth.ts -- verified getTenantId() and requireRole() signatures
- package.json -- verified installed dependencies and versions

### Secondary (MEDIUM confidence)
- npm registry -- @tanstack/react-query@5.95.2 is current latest

### Tertiary (LOW confidence)
- drizzle-zod + Zod 4 runtime compatibility (needs validation at implementation time)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries verified in package.json or npm registry
- Architecture: HIGH -- ARCHITECTURE.md has complete function signatures and API contracts
- Pitfalls: HIGH -- derived from actual codebase patterns (withTenant builder pattern, soft-delete schema)

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable domain, no fast-moving dependencies)
