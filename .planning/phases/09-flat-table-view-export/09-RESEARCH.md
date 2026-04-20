# Phase 9: Flat Table View & Export - Research

**Researched:** 2026-03-27
**Domain:** Data table with server-side pagination, filtering, and Excel/CSV export
**Confidence:** HIGH

## Summary

Phase 9 builds a flat allocation table on the `/data` page and an export-to-file feature. All core libraries are already installed: AG Grid Community 35.x (from Phase 6/7), SheetJS 0.20.3 (from Phase 8), TanStack Query 5.x, and Drizzle ORM 0.45.x. No new dependencies are required.

The main implementation work is: (1) a new Drizzle query that joins allocations with people, projects, departments, and programs with multi-column filtering and cursor/offset pagination, (2) two new API routes (`GET /api/allocations/flat` for paginated data, `GET /api/allocations/export` for file download), (3) a new AG Grid flat table component with simpler column definitions than the existing input grid (read-only, no editing), and (4) restructuring the `/data` page to show the table as primary content with import/export actions in a compact bar.

**Primary recommendation:** Reuse existing patterns exactly -- Drizzle conditional `and()` filtering from `person.service.ts`, AG Grid setup from `allocation-grid.tsx` (but read-only), SheetJS buffer generation from `import.templates.ts`, and TanStack Query hooks from `use-people.ts`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Reuse AG Grid Community (already installed from Phase 6/7) for the flat table
- D-02: Columns: Person Name, Department, Project Name, Program, Month, Hours. All sortable. Month formatted as "YYYY-MM", Hours as numeric with tabular-nums.
- D-03: Server-side pagination -- fetch page of data via API, not load-all-client-side. Default page size 50, options for 25/50/100.
- D-04: Table lives on the `/data` page as the primary content. Import button and template links move to a secondary action bar.
- D-05: Filter bar above the table with inline dropdowns: Person (searchable), Project (searchable), Department (select), Date range (month pickers for start/end).
- D-06: Filters are additive (AND logic). Clearing all filters shows all allocations.
- D-07: Filters update the table via API query params -- URL-encoded for shareability/bookmarking.
- D-08: Filter state persisted in URL search params so page refresh preserves filters.
- D-09: Server-side export using SheetJS (already installed from Phase 8, ADR-007). Export endpoint receives the same filter params as the table query.
- D-10: Two export formats: .xlsx (default) and .csv. Export button with dropdown for format selection.
- D-11: Export includes ALL matching rows (not just current page) -- server streams the full filtered result set.
- D-12: Exported file named: `allocations-{date}.xlsx` or `allocations-{date}.csv`.
- D-13: Column headers in export match display names (Person Name, Department, Project Name, Program, Month, Hours).
- D-14: `/data` page restructured: flat table as primary view, import/template actions in a compact action bar at the top.
- D-15: Export button in the action bar next to Import button.

### Claude's Discretion
- AG Grid column configuration details (widths, flex, pinning)
- Loading skeleton for initial table load
- Empty state when no allocations exist
- Exact filter dropdown styling and search behavior
- Pagination component design
- Export progress indication for large datasets

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IMPEX-11 | Flat table view with sorting, filtering, pagination for all allocation data | AG Grid Community 35.x with server-side row model, Drizzle multi-join query with conditional filters, URL search param state sync |
| IMPEX-12 | Excel/CSV export with current filters applied | SheetJS 0.20.3 server-side generation (pattern from import.templates.ts), new API route returning binary response with Content-Disposition header |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ag-grid-community | 35.2.0 | Flat table with sorting, filtering, pagination | Already installed, used in Phase 6/7 |
| ag-grid-react | 35.2.0 | React wrapper for AG Grid | Already installed |
| xlsx (SheetJS) | 0.20.3 (CDN) | Server-side Excel/CSV generation | Already installed from Phase 8, ADR-007 |
| drizzle-orm | 0.45.1 | Database queries with joins and filters | Already installed, all service files use it |
| @tanstack/react-query | 5.95.2 | Client-side data fetching with caching | Already installed, all hooks use it |
| next | 16.2.1 | API routes and page routing | Already installed |
| lucide-react | (installed) | Icons for export/import buttons | Already used in data page |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nuqs | (not installed) | URL search param state management | Alternative for D-08, but native URLSearchParams + useSearchParams is sufficient |
| zod | 4.3.6 (installed) | Query param validation on API routes | Validate filter params server-side |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| AG Grid for flat table | TanStack Table | AG Grid already installed and familiar; TanStack Table would add a dependency for no benefit |
| Native useSearchParams | nuqs library | nuqs adds type-safe URL state but is another dependency; native Next.js useSearchParams is sufficient for 4 filter params |
| SheetJS server-side | Client-side export | D-09 locks server-side; client-side would also struggle with large datasets |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  features/
    allocations/
      allocation.service.ts    # ADD: listAllocationsFlat(), countAllocationsFlat(), exportAllocationsFlat()
      allocation.types.ts      # ADD: FlatTableRow, FlatTableFilters, FlatTablePagination
  app/
    api/
      allocations/
        flat/
          route.ts             # NEW: GET handler for paginated flat table data
        export/
          route.ts             # NEW: GET handler for file download
    (app)/
      data/
        page.tsx               # MODIFY: restructure to show flat table + action bar
  components/
    flat-table/
      flat-table.tsx           # NEW: AG Grid flat table component (read-only)
      flat-table-filters.tsx   # NEW: filter bar component
      flat-table-pagination.tsx # NEW: pagination controls
      flat-table-columns.ts    # NEW: column definitions
  hooks/
    use-flat-allocations.ts    # NEW: TanStack Query hook for flat table data
```

### Pattern 1: Drizzle Multi-Join Query with Dynamic Filters
**What:** Build SQL query with conditional WHERE clauses using Drizzle's `and()` + array of conditions pattern (already used in `person.service.ts`).
**When to use:** Server-side flat table data fetching with optional filters.
**Example:**
```typescript
// Source: existing pattern from src/features/people/person.service.ts
import { and, eq, gte, lte, sql, ilike, or } from 'drizzle-orm';

export async function listAllocationsFlat(
  orgId: string,
  filters: FlatTableFilters,
  pagination: { page: number; pageSize: number },
) {
  const conditions = [eq(schema.allocations.organizationId, orgId)];

  if (filters.personId) {
    conditions.push(eq(schema.allocations.personId, filters.personId));
  }
  if (filters.projectId) {
    conditions.push(eq(schema.allocations.projectId, filters.projectId));
  }
  if (filters.departmentId) {
    conditions.push(eq(schema.people.departmentId, filters.departmentId));
  }
  if (filters.monthFrom) {
    conditions.push(gte(schema.allocations.month, `${filters.monthFrom}-01`));
  }
  if (filters.monthTo) {
    conditions.push(lte(schema.allocations.month, `${filters.monthTo}-01`));
  }

  const offset = (pagination.page - 1) * pagination.pageSize;

  const rows = await db
    .select({
      personName: sql<string>`${schema.people.firstName} || ' ' || ${schema.people.lastName}`,
      departmentName: schema.departments.name,
      projectName: schema.projects.name,
      programName: schema.programs.name,
      month: schema.allocations.month,
      hours: schema.allocations.hours,
    })
    .from(schema.allocations)
    .innerJoin(schema.people, eq(schema.allocations.personId, schema.people.id))
    .innerJoin(schema.departments, eq(schema.people.departmentId, schema.departments.id))
    .innerJoin(schema.projects, eq(schema.allocations.projectId, schema.projects.id))
    .leftJoin(schema.programs, eq(schema.projects.programId, schema.programs.id))
    .where(and(...conditions))
    .orderBy(schema.people.lastName, schema.people.firstName, schema.allocations.month)
    .limit(pagination.pageSize)
    .offset(offset);

  return rows;
}
```

### Pattern 2: Separate Count Query for Pagination
**What:** Run a parallel COUNT(*) query with the same filters to get total row count for pagination.
**When to use:** Server-side pagination needs total count to show "page X of Y".
**Example:**
```typescript
export async function countAllocationsFlat(
  orgId: string,
  filters: FlatTableFilters,
): Promise<number> {
  const conditions = [/* same as listAllocationsFlat */];

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.allocations)
    .innerJoin(schema.people, eq(schema.allocations.personId, schema.people.id))
    .innerJoin(schema.departments, eq(schema.people.departmentId, schema.departments.id))
    .innerJoin(schema.projects, eq(schema.allocations.projectId, schema.projects.id))
    .leftJoin(schema.programs, eq(schema.projects.programId, schema.programs.id))
    .where(and(...conditions));

  return Number(result[0].count);
}
```

### Pattern 3: SheetJS Export with Binary Response
**What:** Generate .xlsx or .csv buffer server-side and return as binary response with Content-Disposition header.
**When to use:** Export endpoint that triggers file download.
**Example:**
```typescript
// Source: pattern from src/features/import/import.templates.ts
import * as XLSX from 'xlsx';

export async function exportAllocationsFlat(
  orgId: string,
  filters: FlatTableFilters,
  format: 'xlsx' | 'csv',
): Promise<Buffer> {
  // Fetch ALL matching rows (no pagination limit)
  const rows = await listAllocationsFlat(orgId, filters, { page: 1, pageSize: 100000 });

  const wb = XLSX.utils.book_new();
  const data = [
    ['Person Name', 'Department', 'Project Name', 'Program', 'Month', 'Hours'],
    ...rows.map(r => [r.personName, r.departmentName, r.projectName, r.programName ?? '', normalizeMonth(r.month), r.hours]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 10 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Allocations');

  const bookType = format === 'csv' ? 'csv' : 'xlsx';
  const buf = XLSX.write(wb, { type: 'buffer', bookType });
  return Buffer.from(buf);
}
```

### Pattern 4: URL Search Params for Filter State (Next.js App Router)
**What:** Use `useSearchParams()` from `next/navigation` to read/write filter state to the URL.
**When to use:** D-07/D-08 require filters in URL for shareability and refresh persistence.
**Example:**
```typescript
'use client';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

function useFilterState() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = {
    personId: searchParams.get('personId') ?? undefined,
    projectId: searchParams.get('projectId') ?? undefined,
    departmentId: searchParams.get('departmentId') ?? undefined,
    monthFrom: searchParams.get('monthFrom') ?? undefined,
    monthTo: searchParams.get('monthTo') ?? undefined,
    page: Number(searchParams.get('page') ?? '1'),
    pageSize: Number(searchParams.get('pageSize') ?? '50'),
  };

  const setFilters = (updates: Partial<typeof filters>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      } else {
        params.delete(key);
      }
    }
    // Reset to page 1 when filters change
    if (!('page' in updates)) params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  return { filters, setFilters };
}
```

### Pattern 5: AG Grid Read-Only Flat Table
**What:** Simpler AG Grid config than the input grid -- no editing, sorting enabled, no pinned rows.
**When to use:** Display-only flat table with server-side data.
**Example:**
```typescript
import { AllCommunityModule } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';

const columnDefs = [
  { field: 'personName', headerName: 'Person Name', sortable: true, flex: 2 },
  { field: 'departmentName', headerName: 'Department', sortable: true, flex: 1 },
  { field: 'projectName', headerName: 'Project Name', sortable: true, flex: 2 },
  { field: 'programName', headerName: 'Program', sortable: true, flex: 1 },
  { field: 'month', headerName: 'Month', sortable: true, width: 100 },
  { field: 'hours', headerName: 'Hours', sortable: true, width: 80, cellClass: 'tabular-nums text-right' },
];

<AgGridReact
  modules={[AllCommunityModule]}
  rowData={data}
  columnDefs={columnDefs}
  defaultColDef={{ sortable: true, filter: false, resizable: true }}
  domLayout="autoHeight"
  suppressCellFocus={true}
/>
```

### Anti-Patterns to Avoid
- **Loading all allocations client-side:** D-03 explicitly requires server-side pagination. Never fetch all rows and paginate in the browser.
- **Client-side export:** D-09 locks server-side export. Client-side SheetJS would require sending all data to the browser first.
- **AG Grid built-in filtering:** D-05/D-07 require custom filter bar with searchable dropdowns in the URL. Do not use AG Grid's built-in column filters.
- **Separate filter state management (e.g., useState):** D-08 requires URL params. Use `useSearchParams` as the single source of truth.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Excel generation | Custom binary writer | SheetJS `XLSX.write()` | Already installed, handles encoding, cell types, column widths |
| CSV generation | String concatenation | SheetJS `XLSX.write({ bookType: 'csv' })` | Handles escaping, quotes, special characters correctly |
| Data grid | Custom HTML table with sorting | AG Grid Community | Already installed, sorting, column resize, row virtualization built-in |
| URL state sync | Custom pushState wrapper | Next.js `useSearchParams` + `router.push` | Native App Router API, SSR compatible |

**Key insight:** Every tool needed is already installed in the project. Zero new dependencies means zero integration risk. The work is purely composition of existing patterns.

## Common Pitfalls

### Pitfall 1: Month Date Format Mismatch
**What goes wrong:** The database stores months as `YYYY-MM-01` (date column) but the UI displays `YYYY-MM`. Filters and comparisons can break if formats are mixed.
**Why it happens:** `date('month', { mode: 'string' })` returns `YYYY-MM-DD` from Postgres. Existing code uses `normalizeMonth()` to strip the day.
**How to avoid:** Always use `normalizeMonth()` on query results. For filter comparisons, append `-01` to the YYYY-MM filter value before querying (e.g., `gte(allocations.month, '2025-01-01')`).
**Warning signs:** Filters returning no results when data exists, off-by-one month errors.

### Pitfall 2: N+1 Queries from Missing Joins
**What goes wrong:** Querying allocations and then separately fetching person names and project names results in N+1 queries.
**Why it happens:** The existing `listAllocationsForPerson` only joins with projects (single person context). The flat table needs person + department + project + program joins.
**How to avoid:** Build a single query with all four JOINs. Use `innerJoin` for allocations-people, allocations-projects, people-departments. Use `leftJoin` for projects-programs (programId is nullable).
**Warning signs:** Slow page loads, many SQL queries in logs.

### Pitfall 3: Export Without Pagination Limit
**What goes wrong:** Export endpoint fetches ALL matching rows. For large orgs (thousands of allocations), this can timeout or exhaust memory.
**Why it happens:** D-11 requires all matching rows, not just current page.
**How to avoid:** Use a streaming approach or set a reasonable upper limit (e.g., 100,000 rows). For SheetJS, `aoa_to_sheet` is memory-efficient since it processes arrays. Monitor query execution time.
**Warning signs:** Export timing out for large tenants, server memory spikes.

### Pitfall 4: Race Condition with URL Params and TanStack Query
**What goes wrong:** Changing multiple filter dropdowns rapidly causes many API calls, some with stale params.
**Why it happens:** Each `router.push` triggers a new render, which triggers a new TanStack Query fetch.
**How to avoid:** Use TanStack Query's `keepPreviousData: true` (or `placeholderData: keepPreviousData` in v5) to show stale data while loading. The query key should include all filter params so only the latest combination fetches.
**Warning signs:** Flickering table, stale data displayed briefly.

### Pitfall 5: Program Name is Nullable
**What goes wrong:** Projects without a program return `null` for programName. The table cell shows "null" as text.
**Why it happens:** `programId` on projects table is nullable. The LEFT JOIN returns null when no program exists.
**How to avoid:** Use `leftJoin` (not `innerJoin`) for programs. In the grid column definition, handle null with a value formatter or default to empty string.
**Warning signs:** "null" appearing in Program column cells.

### Pitfall 6: Count Query Must Match Data Query Joins
**What goes wrong:** The count query returns a different total than the actual data query, causing pagination to show wrong page counts.
**Why it happens:** If the count query omits a JOIN that the data query uses (e.g., departments for departmentId filter), the WHERE clause conditions fail silently.
**How to avoid:** Extract the shared filter-building logic into a helper function used by both `listAllocationsFlat` and `countAllocationsFlat`. Both must have identical JOINs and WHERE clauses.
**Warning signs:** "Page 5 of 10" but page 5 is empty.

## Code Examples

### API Route: GET /api/allocations/flat
```typescript
// Source: follows pattern from src/app/api/allocations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTenantId } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { listAllocationsFlat, countAllocationsFlat } from '@/features/allocations/allocation.service';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getTenantId();
    const params = request.nextUrl.searchParams;

    const filters = {
      personId: params.get('personId') ?? undefined,
      projectId: params.get('projectId') ?? undefined,
      departmentId: params.get('departmentId') ?? undefined,
      monthFrom: params.get('monthFrom') ?? undefined,
      monthTo: params.get('monthTo') ?? undefined,
    };

    const page = Math.max(1, Number(params.get('page') ?? '1'));
    const pageSize = [25, 50, 100].includes(Number(params.get('pageSize') ?? '50'))
      ? Number(params.get('pageSize'))
      : 50;

    const [rows, total] = await Promise.all([
      listAllocationsFlat(orgId, filters, { page, pageSize }),
      countAllocationsFlat(orgId, filters),
    ]);

    return NextResponse.json({
      rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### API Route: GET /api/allocations/export
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getTenantId } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { exportAllocationsFlat } from '@/features/allocations/allocation.service';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getTenantId();
    const params = request.nextUrl.searchParams;

    const filters = { /* same extraction as flat route */ };
    const format = params.get('format') === 'csv' ? 'csv' : 'xlsx';

    const buffer = await exportAllocationsFlat(orgId, filters, format);

    const date = new Date().toISOString().slice(0, 10);
    const filename = `allocations-${date}.${format}`;
    const contentType = format === 'csv'
      ? 'text/csv; charset=utf-8'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### TanStack Query Hook: useFlatAllocations
```typescript
// Source: follows pattern from src/hooks/use-allocations.ts
'use client';
import { useQuery, keepPreviousData } from '@tanstack/react-query';

type FlatTableRow = {
  personName: string;
  departmentName: string;
  projectName: string;
  programName: string | null;
  month: string;
  hours: number;
};

type FlatTableResponse = {
  rows: FlatTableRow[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export function useFlatAllocations(filters: Record<string, string | undefined>) {
  const cleanFilters = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''),
  ) as Record<string, string>;

  return useQuery<FlatTableResponse>({
    queryKey: ['allocations-flat', cleanFilters],
    queryFn: async () => {
      const params = new URLSearchParams(cleanFilters);
      const res = await fetch(`/api/allocations/flat?${params}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to fetch allocations');
      }
      return res.json();
    },
    placeholderData: keepPreviousData, // Show previous data while loading new page
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AG Grid client-side row model with all data | Server-side pagination via API | Best practice for datasets > 500 rows | D-03 mandates this |
| Custom HTML table + manual sort | AG Grid Community | Already adopted in Phase 6 | Consistent UX |
| Client-side file generation | Server-side SheetJS | ADR-007 (Phase 8) | Handles large exports, no client memory issues |

**Deprecated/outdated:**
- AG Grid v32 `ModuleRegistry.registerModules()` -- v35 uses `modules` prop on `AgGridReact`. Project already uses v35 pattern.

## Open Questions

1. **Sorting server-side vs. client-side**
   - What we know: D-02 says "all sortable". AG Grid Community supports client-side sorting out of the box on loaded data.
   - What's unclear: With server-side pagination (page of 50 rows), client-side sort only sorts the current page -- not the full dataset. True server-side sort requires passing sort params to the API.
   - Recommendation: Start with client-side sorting within the loaded page (simpler). If users need full-dataset sorting, add `sortField` and `sortDir` query params to the API in a follow-up. Document this tradeoff in the plan. For MVP, sorting the visible page is acceptable since users can filter to narrow results.

2. **Export size limits**
   - What we know: D-11 requires all matching rows. SheetJS can handle tens of thousands of rows.
   - What's unclear: At what scale does single-query export become a problem? Neon serverless has a 5-minute statement timeout.
   - Recommendation: Set a practical ceiling of 100,000 rows. Return a 413 error if exceeded with a message to apply more filters. This handles realistic MVP scale.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None installed |
| Config file | none -- see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IMPEX-11 | Flat table shows paginated allocation data with filters | integration (API) | Manual verification -- no test framework | No |
| IMPEX-11 | Filter by person, project, department, date range | integration (API) | Manual verification | No |
| IMPEX-11 | Sorting works on all columns | manual | Manual verification | No |
| IMPEX-12 | Export .xlsx with filtered data | integration (API) | Manual verification | No |
| IMPEX-12 | Export .csv with filtered data | integration (API) | Manual verification | No |
| IMPEX-12 | Export includes ALL matching rows, not just current page | integration (API) | Manual verification | No |

### Sampling Rate
- **Per task commit:** `pnpm build` (type check + build)
- **Per wave merge:** `pnpm build && pnpm lint`
- **Phase gate:** Manual verification of all 3 success criteria from phase description

### Wave 0 Gaps
- No test framework installed. Testing is manual via build + browser verification.
- `pnpm build` serves as the primary automated validation (TypeScript type checking catches most issues).

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/features/allocations/allocation.service.ts` -- query pattern with Drizzle joins
- Existing codebase: `src/features/import/import.templates.ts` -- SheetJS buffer generation pattern
- Existing codebase: `src/components/grid/allocation-grid.tsx` -- AG Grid Community 35.x setup pattern
- Existing codebase: `src/features/people/person.service.ts` -- dynamic filter conditions with `and()`
- Existing codebase: `src/hooks/use-people.ts` -- TanStack Query hook pattern
- Existing codebase: `src/app/api/allocations/route.ts` -- API route with `getTenantId()` and `handleApiError()`
- Existing codebase: `src/db/schema.ts` -- allocations table with indexes on org+month, org+person+month, org+project+month

### Secondary (MEDIUM confidence)
- AG Grid Community docs: read-only grid with sorting requires `sortable: true` on column defs (verified by existing allocation-grid.tsx using same API)
- SheetJS docs: `XLSX.write({ type: 'buffer', bookType: 'csv' })` for CSV export (same API as xlsx, verified from import.templates.ts pattern)

### Tertiary (LOW confidence)
- None -- all patterns verified against existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and used in project
- Architecture: HIGH -- follows exact patterns from existing codebase (services, hooks, API routes)
- Pitfalls: HIGH -- month format mismatch and nullable programId verified from schema.ts

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable -- no dependency changes needed)
