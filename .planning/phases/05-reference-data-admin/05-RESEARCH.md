# Phase 5: Reference Data Admin - Research

**Researched:** 2026-03-26
**Domain:** Admin CRUD UI for tenant-scoped lookup tables (disciplines, departments, programs)
**Confidence:** HIGH

## Summary

Phase 5 builds admin-only CRUD pages for the three reference data entities -- disciplines, departments, and programs -- that Person and Project forms depend on. The DB schema, tenant isolation (`withTenant()`), API error handling, Zod validation, TanStack Query hooks, and role-based auth (`requireRole()`) are all established in prior phases. This phase follows the exact same patterns used in Phase 4 for Person/Project CRUD.

The primary complexity is **referential integrity protection**: departments and disciplines are foreign-keyed by the `people` table, and programs are foreign-keyed by the `projects` table. Deleting a department that has people assigned must be blocked or warned. The success criteria explicitly require showing "a warning with the count of affected people" before deletion. The other key requirement is role-gating: only Admin+ roles can access these pages, and Viewer cannot.

**Primary recommendation:** Follow the established service/schema/API/hook/page pattern from Phase 4 exactly. The only new pattern is a "usage count" query before delete to enforce referential integrity with a user-friendly warning.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MGMT-03 | Admin UI for reference data: disciplines CRUD | Service + API + page following person/project pattern; Zod schema for name + abbreviation; withTenant update/delete helpers needed |
| MGMT-04 | Admin UI for reference data: departments CRUD | Same pattern as disciplines; usage count query for delete protection; unique constraint on org+name |
| MGMT-05 | Admin UI for reference data: programs CRUD | Same pattern; programs already have updateProgram in withTenant; usage count via projects table |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.1 | App Router, API routes | Project foundation |
| Drizzle ORM | 0.45.1 | Type-safe SQL queries, tenant scoping | Established in Phase 2 |
| Zod | 4.3.6 | Request validation schemas | Established in Phase 3-4 |
| TanStack React Query | 5.95.2 | Client-side data fetching + cache invalidation | Established in Phase 4 |
| Clerk | 7.0.7 | Auth + role checking via `requireRole('admin')` | Established in Phase 3 |
| Tailwind CSS | 4.x | Styling, M3-inspired design tokens | Established in Phase 1 |
| lucide-react | 1.7.0 | Icons | Established in Phase 3 |

### No new dependencies needed
This phase requires zero new packages. All patterns and libraries are established.

## Architecture Patterns

### Recommended Project Structure (new files only)
```
src/
├── features/
│   ├── disciplines/
│   │   ├── discipline.schema.ts     # Zod create/update schemas
│   │   ├── discipline.service.ts    # list, getById, create, update, delete, getUsageCount
│   │   └── discipline.types.ts      # DisciplineRow, DisciplineCreate, DisciplineUpdate
│   ├── departments/
│   │   ├── department.schema.ts
│   │   ├── department.service.ts
│   │   └── department.types.ts
│   └── programs/
│       ├── program.schema.ts
│       ├── program.service.ts
│       └── program.types.ts
├── hooks/
│   └── use-reference-data.ts        # CRUD hooks for all 3 entities (extend existing read-only hooks)
├── app/
│   ├── api/
│   │   ├── disciplines/
│   │   │   ├── route.ts             # Extend existing GET, add POST
│   │   │   └── [id]/
│   │   │       └── route.ts         # GET, PATCH, DELETE (new)
│   │   ├── departments/
│   │   │   ├── route.ts             # Extend existing GET, add POST
│   │   │   └── [id]/
│   │   │       └── route.ts         # GET, PATCH, DELETE (new)
│   │   └── programs/
│   │       ├── route.ts             # Extend existing GET, add POST
│   │       └── [id]/
│   │           └── route.ts         # GET, PATCH, DELETE (new)
│   └── (app)/
│       └── admin/
│           ├── page.tsx             # Admin overview / redirect
│           ├── disciplines/
│           │   └── page.tsx         # Disciplines CRUD table
│           ├── departments/
│           │   └── page.tsx         # Departments CRUD table
│           └── programs/
│               └── page.tsx         # Programs CRUD table
└── lib/
    └── tenant.ts                    # Add missing update/delete helpers for departments + disciplines
```

### Pattern 1: Service Layer (follow established convention)
**What:** Each entity gets list, getById, create, update, delete functions in a service file.
**When to use:** Every CRUD operation.
**Example:**
```typescript
// Source: established pattern from src/features/people/person.service.ts
export async function listDisciplines(orgId: string) {
  return db
    .select()
    .from(schema.disciplines)
    .where(eq(schema.disciplines.organizationId, orgId))
    .orderBy(schema.disciplines.name);
}

export async function createDiscipline(orgId: string, data: DisciplineCreate) {
  const rows = await withTenant(orgId)
    .insertDiscipline({ name: data.name, abbreviation: data.abbreviation })
    .returning();
  return rows[0];
}
```

### Pattern 2: Usage Count Query (new pattern for this phase)
**What:** Before deleting a reference data item, count how many records depend on it.
**When to use:** Delete operations on departments (people depend), disciplines (people depend), programs (projects depend).
**Example:**
```typescript
// Count people in a department before allowing delete
export async function getDepartmentUsageCount(orgId: string, departmentId: string) {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.people)
    .where(
      and(
        eq(schema.people.organizationId, orgId),
        eq(schema.people.departmentId, departmentId),
        isNull(schema.people.archivedAt)
      )
    );
  return Number(result[0].count);
}
```

### Pattern 3: Admin Role Gating
**What:** All write operations require `requireRole('admin')`. Read operations use `getTenantId()` (any authenticated user can read reference data for dropdowns). Admin pages check role client-side for UI hiding and server-side for enforcement.
**When to use:** Every POST/PATCH/DELETE API route in this phase.
**Example:**
```typescript
// Source: established pattern from src/app/api/people/route.ts
export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requireRole('admin');
    const body = await request.json();
    const data = disciplineCreateSchema.parse(body);
    const discipline = await createDiscipline(orgId, data);
    return NextResponse.json({ discipline }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Pattern 4: Navigation Integration
**What:** Add admin section to side nav and optionally to top nav. Admin pages live under `/(app)/admin/`.
**When to use:** The side nav `SECTION_NAV` map needs an `/admin` key with entries for disciplines, departments, programs.
**Example:**
```typescript
// Add to SECTION_NAV in side-nav.tsx
'/admin': [
  {
    heading: 'Reference Data',
    items: [
      { label: 'Disciplines', href: '/admin/disciplines' },
      { label: 'Departments', href: '/admin/departments' },
      { label: 'Programs', href: '/admin/programs' },
    ],
  },
],
```

### Anti-Patterns to Avoid
- **Hard delete without usage check:** Never delete a department/discipline/program without first checking if records reference it. Postgres FK constraints will throw a 23503 error, but the UX should warn proactively rather than show a cryptic error.
- **Client-only role gating:** Hiding the admin nav link is necessary for UX but insufficient for security. Every API route MUST call `requireRole('admin')`.
- **Separate hooks files per entity:** Keep all reference data hooks in one `use-reference-data.ts` file since these are small, related entities. The existing `useDepartments()` and `useDisciplines()` in `use-people.ts` should be moved here.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Manual field checks | Zod schemas (already established) | Consistent error messages, type inference |
| Optimistic UI updates | Manual cache manipulation | TanStack Query `invalidateQueries` | Already established pattern, simpler |
| Tenant scoping | Manual WHERE clauses | `withTenant(orgId)` helpers | Prevents tenant data leaks |
| Unique constraint errors | Try/catch with string matching | `handleApiError` catches Postgres 23505 | Already handles this in api-utils.ts |

## Common Pitfalls

### Pitfall 1: Missing withTenant Helpers
**What goes wrong:** `withTenant()` currently has no `updateDepartment`, `updateDiscipline`, `deleteDepartment`, or `deleteDiscipline` methods. Attempting to use them will cause TypeScript errors.
**Why it happens:** Phase 2 only added helpers for the entities that were immediately needed.
**How to avoid:** Add the missing update/delete helpers to `withTenant()` in tenant.ts as the first task. Follow the exact pattern of existing `updatePerson`/`deletePerson`.
**Warning signs:** TypeScript compile errors on `withTenant(orgId).updateDepartment(...)`.

### Pitfall 2: Foreign Key Violation on Delete (Postgres 23503)
**What goes wrong:** Deleting a department that has people assigned throws an unhandled Postgres error (code 23503, foreign_key_violation), returning a confusing 500 to the client.
**Why it happens:** `handleApiError` only handles 23505 (unique_violation), not 23503 (foreign_key_violation).
**How to avoid:** Two approaches (both needed): (1) Proactively query usage count and return it to the UI before the user confirms delete. (2) Add 23503 handling to `handleApiError` as a fallback, returning a 409 with a clear message.
**Warning signs:** 500 errors when deleting reference data with dependents.

### Pitfall 3: Stale Dropdowns After Reference Data Change
**What goes wrong:** Admin adds a new discipline, but the Person form dropdown doesn't show it because TanStack Query has the old list cached.
**Why it happens:** The `['disciplines']` and `['departments']` query keys in `use-people.ts` aren't invalidated when the admin creates/updates/deletes.
**How to avoid:** Mutation hooks for reference data MUST invalidate the corresponding query keys (`['disciplines']`, `['departments']`, `['programs']`). This ensures all components using those keys refetch.
**Warning signs:** Success criteria #1 explicitly tests this: "appears in the Person form dropdown immediately."

### Pitfall 4: Programs Have No Delete Helper in withTenant
**What goes wrong:** `withTenant()` has `updateProgram` but no `deleteProgram`. Need to add it.
**Why it happens:** Same as Pitfall 1 -- only helpers for immediately-needed operations were added.
**How to avoid:** Add `deleteProgram` to `withTenant()`.

### Pitfall 5: Viewer Access to Admin Pages
**What goes wrong:** Viewer navigates to `/admin/disciplines` directly via URL and sees the page, even if the nav link is hidden.
**Why it happens:** Only nav hiding was implemented, not route-level protection.
**How to avoid:** Admin pages should check role and redirect or show "Access Denied". API routes already enforce this via `requireRole('admin')`, but the page itself should also handle it gracefully.

## Code Examples

### Zod Schema for Discipline
```typescript
// src/features/disciplines/discipline.schema.ts
import { z } from 'zod/v4';

export const disciplineCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  abbreviation: z.string().min(1, 'Abbreviation is required').max(10),
});

export const disciplineUpdateSchema = disciplineCreateSchema.partial();
```

### Zod Schema for Department
```typescript
// src/features/departments/department.schema.ts
import { z } from 'zod/v4';

export const departmentCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
});

export const departmentUpdateSchema = departmentCreateSchema.partial();
```

### Zod Schema for Program
```typescript
// src/features/programs/program.schema.ts
import { z } from 'zod/v4';

export const programCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(500).optional(),
});

export const programUpdateSchema = programCreateSchema.partial();
```

### withTenant Additions Needed
```typescript
// Add to src/lib/tenant.ts — following existing patterns exactly

// Update helpers
updateDepartment: (id: string, data: Partial<Omit<typeof schema.departments.$inferInsert, 'id' | 'organizationId'>>) =>
  db.update(schema.departments).set(data)
    .where(and(eq(schema.departments.id, id), eq(schema.departments.organizationId, orgId))),

updateDiscipline: (id: string, data: Partial<Omit<typeof schema.disciplines.$inferInsert, 'id' | 'organizationId'>>) =>
  db.update(schema.disciplines).set(data)
    .where(and(eq(schema.disciplines.id, id), eq(schema.disciplines.organizationId, orgId))),

// Delete helpers
deleteDepartment: (id: string) =>
  db.delete(schema.departments)
    .where(and(eq(schema.departments.id, id), eq(schema.departments.organizationId, orgId))),

deleteDiscipline: (id: string) =>
  db.delete(schema.disciplines)
    .where(and(eq(schema.disciplines.id, id), eq(schema.disciplines.organizationId, orgId))),

deleteProgram: (id: string) =>
  db.delete(schema.programs)
    .where(and(eq(schema.programs.id, id), eq(schema.programs.organizationId, orgId))),
```

### Usage Count API Response Pattern
```typescript
// GET /api/departments/[id] includes usage count for delete warning
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const orgId = await getTenantId();
    const { id } = await params;
    const department = await getDepartmentById(orgId, id);
    const usageCount = await getDepartmentUsageCount(orgId, id);
    return NextResponse.json({ department, usageCount });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Delete Confirmation Hook Pattern
```typescript
// In the UI: fetch usage count, show warning if > 0
export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to delete department');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      // Also invalidate people since their department reference may be affected
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });
}
```

### handleApiError FK Violation Extension
```typescript
// Add to src/lib/api-utils.ts — handle Postgres foreign_key_violation
if (
  error instanceof Error &&
  'code' in error &&
  (error as Record<string, unknown>).code === '23503'
) {
  const conflict = new ConflictError('Cannot delete: this record is referenced by other data');
  return NextResponse.json(conflict.toJSON(), { status: 409 });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate admin app | Admin pages within same Next.js app under /admin route group | Current | Simpler deployment, shared auth |
| Modal-based CRUD | Inline table editing or simple forms | Current | Better UX for simple lookup data |

## Open Questions

1. **Should reference data deletion be soft-delete (archive) or hard-delete?**
   - What we know: People use soft-delete (archivedAt). Projects use archival. The DB schema for departments/disciplines/programs has NO archivedAt column.
   - What's unclear: Whether to add an archivedAt column or just prevent deletion when in use.
   - Recommendation: Use hard delete with a pre-check usage count. If the entity is in use, block deletion entirely (return 409). If not in use, hard delete is safe. This matches the simpler schema and the success criteria wording ("attempting to delete... shows a warning with the count").

2. **Admin page access: should it be a top-nav item or nested under Settings?**
   - What we know: ARCHITECTURE.md shows `/admin/` as a route under `(app)`. The top nav has Input/Team/Projects/Data/Dashboard. No "Admin" top nav item exists yet.
   - What's unclear: Where the entry point is.
   - Recommendation: Add "Admin" to the side-nav under the Data section, or add a Settings/Admin link accessible from the gear icon in the top nav. The architecture shows a dedicated `/admin` path, so add it to the side nav SECTION_NAV map with its own section key.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None installed |
| Config file | None -- see Wave 0 |
| Quick run command | `pnpm typecheck && pnpm lint` |
| Full suite command | `pnpm typecheck && pnpm lint && pnpm build` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MGMT-03 | Disciplines CRUD operations | manual + typecheck | `pnpm typecheck` | N/A |
| MGMT-04 | Departments CRUD with usage count warning | manual + typecheck | `pnpm typecheck` | N/A |
| MGMT-05 | Programs CRUD operations | manual + typecheck | `pnpm typecheck` | N/A |

### Sampling Rate
- **Per task commit:** `pnpm typecheck && pnpm lint`
- **Per wave merge:** `pnpm build`
- **Phase gate:** Full build green + manual verification of success criteria

### Wave 0 Gaps
None critical -- no test framework has been established in the project. TypeScript compilation and ESLint serve as the automated verification layer. Manual UAT covers the success criteria.

## Sources

### Primary (HIGH confidence)
- Project codebase: `src/db/schema.ts` -- all table definitions and constraints verified
- Project codebase: `src/lib/tenant.ts` -- verified missing helpers for departments/disciplines
- Project codebase: `src/features/people/person.service.ts` -- established CRUD service pattern
- Project codebase: `src/app/api/people/route.ts` and `[id]/route.ts` -- established API route pattern
- Project codebase: `src/hooks/use-people.ts` -- established TanStack Query hook pattern
- Project codebase: `src/lib/auth.ts` -- role hierarchy and requireRole pattern
- Project codebase: `src/lib/api-utils.ts` -- error handling pattern (verified 23505 handling, confirmed no 23503 handling)
- ARCHITECTURE.md Section 5 -- confirms `/admin/` route structure for reference data pages

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all patterns established
- Architecture: HIGH -- follows exact patterns from Phase 4, file structure matches ARCHITECTURE.md
- Pitfalls: HIGH -- identified from direct codebase analysis (missing withTenant helpers, missing FK error handling)

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable -- no external dependency changes)
