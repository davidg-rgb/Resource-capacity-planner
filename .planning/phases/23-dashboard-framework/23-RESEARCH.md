# Phase 23: Dashboard Framework + V7 Person Card - Research

**Researched:** 2026-04-01
**Domain:** Dashboard widget system, drag-and-drop layout, DB persistence, Person 360 overlay
**Confidence:** HIGH

## Summary

Phase 23 builds the foundational dashboard customization framework that all future visualization phases (V1-V12) depend on. The current dashboard at `/dashboard` is a hardcoded layout in `dashboard-content.tsx` that renders 6 fixed widgets (KPI cards, heat map, discipline progress, project impact, strategic alerts, department bar chart) in a static 12-column grid. This must be refactored into a widget registry + layout engine pattern where widgets are pluggable, reorderable via drag-and-drop, and layouts persist per-user in a new `dashboard_layouts` DB table.

The key technical challenge is integrating @dnd-kit with a CSS Grid that has variable-width items (4/6/12 column spans). dnd-kit's built-in sorting strategies assume uniform item sizes, so a custom approach using `strategy={() => null}` on `SortableContext` with manual reorder logic in `onDragOver` is required. This is a known pattern documented in dnd-kit issue #720.

The V7 Person 360 Card is a global overlay (React portal slide-out panel, not a dashboard widget) that must be accessible from any person name click across the entire app. It requires a new `GET /api/analytics/person-summary` endpoint and a shared `PersonCardProvider` in the app shell.

**Primary recommendation:** Build widget registry first, then layout engine with dnd-kit, then DB persistence with Drizzle migration, then Person 360 overlay, and finally wrap existing widgets.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| R23-01 | Widget registry with WidgetDefinition interface | Spec defines complete interface at SPEC 2.3. 6 existing widgets identified for wrapping. |
| R23-02 | Layout engine using 12-column CSS Grid with dnd-kit drag-and-drop | dnd-kit v6.3.1 (core) + v10.0.0 (sortable). Custom strategy needed for variable spans. |
| R23-03 | Edit mode toggle with widget drawer, resize handles, remove buttons | Spec 2.1 defines full edit mode UX. Widget drawer slides from right. |
| R23-04 | dashboard_layouts DB table with JSONB layout | Drizzle schema provided in SPEC 6. Single migration via `db:generate` + `db:push`. |
| R23-05 | Layout API: GET/PUT /api/dashboard/layout, PUT /api/dashboard/layout/default | Three endpoints. Default requires admin role. Existing API patterns in `src/app/api/`. |
| R23-06 | 4-tier layout resolution: personal > cloned > tenant default > built-in | Spec 6 layout resolution order. Hook `use-dashboard-layout.ts` handles cascade. |
| R23-07 | V7 Person 360 Card as global overlay (React portal slide-out) | Spec V7 defines full UX. 360px slide-out, portal-based. Escape/click-outside to close. |
| R23-08 | Person summary endpoint + hook for V7 data | `GET /api/analytics/person-summary` with PersonSummaryResponse interface in SPEC 7. |
| R23-09 | Wrap existing widgets in registry format | 6 existing widgets identified. Need adapter pattern for props compatibility. |
| R23-10 | Global time range selector + per-widget override | Existing time range selector in dashboard-content.tsx. Spec 2.4 adds per-widget override. |
| R23-11 | Install @dnd-kit/core + @dnd-kit/sortable | @dnd-kit/core@6.3.1, @dnd-kit/sortable@10.0.0 via pnpm. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core | 6.3.1 | Drag-and-drop primitives | Spec-mandated. ~10KB gzipped, zero deps, React 19 compatible |
| @dnd-kit/sortable | 10.0.0 | Sortable preset for reorder | Spec-mandated. Thin layer on core for sortable lists/grids |
| drizzle-orm | 0.45.1 (installed) | DB schema + migration for dashboard_layouts | Already in use, Drizzle schema for new table provided in spec |
| recharts | 3.8.1 (installed) | Charts inside widgets | Already in use for existing dashboard charts |
| @tanstack/react-query | 5.95.2 (installed) | Data fetching hooks | Already in use for all dashboard data hooks |
| next-intl | 4.8.3 (installed) | i18n for new UI strings | Phase 22 shipped i18n framework |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 1.7.0 (installed) | Widget icons in drawer/registry | WidgetDefinition.icon uses LucideIcon type |
| zod | 4.3.6 (installed) | API request validation | Validate layout PUT body, person-summary params |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit | react-beautiful-dnd | react-beautiful-dnd is deprecated; @dnd-kit is the modern replacement |
| CSS transform slide-out | @floating-ui | Overkill for a fixed-position side panel; CSS transform + portal is simpler |
| JSONB layout storage | Separate widget_positions table | JSONB is simpler, fewer queries; spec explicitly specifies JSONB |

**Installation:**
```bash
pnpm add @dnd-kit/core @dnd-kit/sortable
```

## Architecture Patterns

### Recommended Project Structure
```
src/features/dashboard/
  widget-registry.ts           # Central registry + register() function
  widget-registry.types.ts     # WidgetDefinition, WidgetPlacement, WidgetProps, etc.
  dashboard-layout-engine.tsx   # Grid renderer, DndContext, SortableContext
  dashboard-edit-mode.tsx       # Edit mode overlay + widget drawer
  dashboard-time-range.tsx      # Global + per-widget time range context
  use-dashboard-layout.ts       # Hook: load/save layout, 4-tier resolution
  default-layouts.ts            # Built-in persona defaults (manager, project-leader)
  person-card/
    person-card-provider.tsx    # React context + portal mount
    person-card-overlay.tsx     # The slide-out panel component
    use-person-card.ts          # Hook: open/close card, fetch person summary
src/app/api/dashboard/
  layout/
    route.ts                    # GET + PUT personal layout
    default/
      route.ts                  # PUT tenant default (admin only)
src/app/api/analytics/
  person-summary/
    route.ts                    # GET person summary for V7
```

### Pattern 1: Widget Registry (Singleton Map)
**What:** A Map-based registry where each widget self-registers with a WidgetDefinition object.
**When to use:** Central place for all widget metadata; drawer, layout engine, and PDF export all read from it.
**Example:**
```typescript
// Source: DASHBOARD-VISUALIZATIONS-SPEC.md 2.3 + 9.x
const widgetRegistry = new Map<string, WidgetDefinition>();

export function registerWidget(def: WidgetDefinition) {
  widgetRegistry.set(def.id, def);
}

export function getWidget(id: string): WidgetDefinition | undefined {
  return widgetRegistry.get(id);
}

export function getAllWidgets(): WidgetDefinition[] {
  return Array.from(widgetRegistry.values());
}

export function getWidgetsByDashboard(dashboardId: string): WidgetDefinition[] {
  return getAllWidgets().filter(w => w.supportedDashboards.includes(dashboardId));
}
```

### Pattern 2: dnd-kit with Variable CSS Grid Spans
**What:** Use SortableContext with `strategy={() => null}` to bypass default uniform-size sorting. Handle reorder logic manually in `onDragOver`.
**When to use:** When grid items have different column spans (4, 6, 12).
**Example:**
```typescript
// Source: dnd-kit issue #720 recommendation
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';

function DashboardGrid({ widgets, isEditMode }: DashboardGridProps) {
  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <SortableContext items={widgetIds} strategy={() => null}>
        <div className="grid grid-cols-12 gap-6">
          {widgets.map(widget => (
            <SortableWidget
              key={widget.widgetId}
              widget={widget}
              isEditMode={isEditMode}
              style={{ gridColumn: `span ${widget.colSpan}` }}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>{/* render dragged widget preview */}</DragOverlay>
    </DndContext>
  );
}
```

### Pattern 3: Layout Resolution Hook (4-tier cascade)
**What:** Hook that resolves layout by querying personal > cloned > tenant default > built-in.
**When to use:** On every dashboard page load.
**Example:**
```typescript
// Source: DASHBOARD-VISUALIZATIONS-SPEC.md 6 Layout Resolution
export function useDashboardLayout(dashboardId: string) {
  const deviceClass = useDeviceClass(); // 'desktop' | 'mobile'

  return useQuery({
    queryKey: ['dashboard-layout', dashboardId, deviceClass],
    queryFn: () => fetch(`/api/dashboard/layout?dashboardId=${dashboardId}&deviceClass=${deviceClass}`)
      .then(r => r.json()),
    staleTime: 5 * 60_000, // layouts change rarely
  });
}
```

### Pattern 4: Person Card Provider (Global Context + Portal)
**What:** A React context provider placed in the app shell that exposes `openPersonCard(personId)`. The actual overlay renders via React portal.
**When to use:** Any clickable person name in the app calls `openPersonCard`.
**Example:**
```typescript
// Source: DASHBOARD-VISUALIZATIONS-SPEC.md V7
// In app-shell.tsx or root layout:
<PersonCardProvider>
  {children}
</PersonCardProvider>

// In any component:
const { openPersonCard } = usePersonCard();
<button onClick={() => openPersonCard(person.id)}>
  {person.firstName} {person.lastName}
</button>
```

### Anti-Patterns to Avoid
- **Prop drilling time range:** Use React context for global time range, not prop drilling through layout engine to each widget.
- **Widget-specific layout logic in the registry:** Registry stores metadata only. Layout engine handles rendering, positioning, and drag-drop. Widgets receive `WidgetProps` and render themselves.
- **Direct DB queries in API routes:** Use the existing `withTenant(orgId)` pattern and service layer. Add `dashboardLayouts` to the tenant helper.
- **Hardcoding widget imports:** Use the registry's `component` field to dynamically render. This enables lazy loading and keeps the layout engine decoupled.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop | Custom mouse/touch event handlers | @dnd-kit/core + @dnd-kit/sortable | Accessibility (keyboard, screen readers), touch support, animation, collision detection |
| Portal-based overlay | Manual DOM manipulation | React.createPortal + CSS transform | React manages lifecycle; CSS transform for slide animation with `transition` |
| JSONB validation | Manual object checking | Zod schema for WidgetPlacement[] | Catches malformed layouts from API, type-safe |
| Device class detection | window.innerWidth polling | CSS media query + `matchMedia` hook | SSR-safe with fallback to 'desktop', avoids layout shift |

**Key insight:** The dnd-kit integration with variable-sized CSS Grid items is the one area where custom logic is genuinely needed (custom `strategy`, manual reorder in `onDragOver`). Everything else should use existing libraries and patterns.

## Common Pitfalls

### Pitfall 1: dnd-kit Default Strategy with Variable Grid Items
**What goes wrong:** Widgets overlap or jump to wrong positions during drag because dnd-kit's built-in rectSortingStrategy assumes uniform sizes.
**Why it happens:** CSS Grid items with `span 4`, `span 6`, `span 12` create non-uniform cells. dnd-kit calculates drop positions based on bounding rects which don't account for grid reflow.
**How to avoid:** Use `strategy={() => null}` on SortableContext. Implement custom reorder logic in `onDragOver` that recalculates positions based on the grid's actual layout.
**Warning signs:** Widgets visually overlapping during drag, items snapping to wrong positions, grid "breaking" during reorder.

### Pitfall 2: SSR Mismatch with Device Class Detection
**What goes wrong:** Server renders 'desktop' layout, client detects 'mobile', causing hydration mismatch and layout flash.
**Why it happens:** `window.matchMedia` is not available during SSR in Next.js App Router.
**How to avoid:** Default to 'desktop' on server. Use `useEffect` to detect actual device class client-side. Use CSS `@media` for initial responsive layout before JS hydrates. Store device class preference in the layout API response, not computed client-side.
**Warning signs:** Layout flash on mobile, hydration warnings in console.

### Pitfall 3: Stale Layout After Widget Registry Changes
**What goes wrong:** User has a saved layout with widget IDs that no longer exist in the registry (removed in future version).
**Why it happens:** JSONB stores widget IDs as strings. No foreign key constraint to widget registry.
**How to avoid:** Layout engine must silently skip unknown widget IDs (spec explicitly requires this). Add a `filterValidWidgets()` step when loading layouts that removes entries not in current registry.
**Warning signs:** Blank spaces in dashboard, console errors about missing components.

### Pitfall 4: Person Card Z-index Conflicts
**What goes wrong:** Person 360 slide-out panel appears behind modals, dropdown menus, or the edit mode widget drawer.
**Why it happens:** Multiple overlay layers compete for z-index without a central stacking context.
**How to avoid:** Establish a z-index hierarchy: side-nav (40) < widget drawer (50) < person card (60) < modals (70). Use React portal mounted at a consistent DOM node. The person card should use `fixed` positioning, not `absolute`.
**Warning signs:** Panel partially hidden, click-outside handler closing wrong overlay.

### Pitfall 5: Unique Constraint with NULL clerk_user_id
**What goes wrong:** PostgreSQL treats `NULL != NULL` in unique constraints, so multiple tenant defaults could be created for the same dashboard+device.
**Why it happens:** The `dashboard_layouts` table uses `clerk_user_id = NULL` for tenant defaults. `UNIQUE (organization_id, clerk_user_id, dashboard_id, device_class)` does not prevent duplicate NULL rows in standard SQL.
**How to avoid:** Use `COALESCE(clerk_user_id, '__tenant_default__')` in a unique index, OR use a partial unique index: one for user rows (WHERE clerk_user_id IS NOT NULL) and one for defaults (WHERE clerk_user_id IS NULL). Drizzle supports both approaches. Alternatively, use an empty string `''` instead of NULL.
**Warning signs:** Duplicate tenant default rows, inconsistent layout resolution.

### Pitfall 6: Edit Mode State Leaking to Non-Edit Widgets
**What goes wrong:** Widgets re-render unnecessarily when entering/exiting edit mode, causing data refetch or visual jank.
**Why it happens:** `isEditMode` prop changes cause all widgets to re-render. Widgets that fetch data on mount will re-fetch.
**How to avoid:** Memoize widget components with `React.memo`. The `isEditMode` prop should only affect the widget's chrome (drag handle, resize handle, remove button), not its data layer. Use a separate edit overlay div on top of the widget rather than passing isEditMode into the widget's render logic.

## Code Examples

### Drizzle Schema for dashboard_layouts
```typescript
// Source: DASHBOARD-VISUALIZATIONS-SPEC.md Section 6
// Add to src/db/schema.ts
export const dashboardLayouts = pgTable(
  'dashboard_layouts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    clerkUserId: text('clerk_user_id'),         // null = tenant default
    dashboardId: text('dashboard_id').notNull(), // 'manager' | 'project-leader'
    deviceClass: text('device_class').notNull().default('desktop'),
    layout: jsonb('layout').notNull(),           // WidgetPlacement[]
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('uq_dashboard_layout').on(
      table.organizationId,
      table.clerkUserId,
      table.dashboardId,
      table.deviceClass,
    ),
  ],
);
```

### WidgetDefinition Type System
```typescript
// Source: DASHBOARD-VISUALIZATIONS-SPEC.md Section 2.3
import type { LucideIcon } from 'lucide-react';
import type { FlagName } from '@/features/flags/flag.types';

export type WidgetCategory =
  | 'health-capacity'
  | 'timelines-planning'
  | 'breakdowns'
  | 'alerts-actions';

export interface WidgetProps {
  timeRange: { from: string; to: string };
  config?: Record<string, unknown>;
  isEditMode: boolean;
}

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  category: WidgetCategory;
  icon: LucideIcon;
  component: React.ComponentType<WidgetProps>;
  defaultColSpan: 4 | 6 | 12;
  minColSpan: 4 | 6;
  supportedDashboards: string[];
  requiredFeatureFlag?: FlagName;
  dataHook: string;
}

export interface WidgetPlacement {
  widgetId: string;
  position: number;
  colSpan: 4 | 6 | 12;
  config?: Record<string, unknown>;
  timeRangeOverride?: { from: string; to: string } | null;
}
```

### API Route Pattern (Layout GET)
```typescript
// Source: Existing pattern from src/app/api/analytics/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTenantId } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getTenantId();
    const { userId } = await auth();
    const params = request.nextUrl.searchParams;
    const dashboardId = params.get('dashboardId') ?? 'manager';
    const deviceClass = params.get('deviceClass') ?? 'desktop';

    // 4-tier resolution: personal > cloned > tenant default > built-in
    const layout = await resolveLayout(orgId, userId!, dashboardId, deviceClass);
    return NextResponse.json(layout);
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Existing Widgets Inventory (to wrap in registry)
```typescript
// Current widgets that need WidgetDefinition wrappers:
// 1. KPICard (kpi-card.tsx) - 4x cards, treated as single "kpi-cards" widget
//    - Currently receives individual props, needs adapter to WidgetProps
//    - defaultColSpan: 12, minColSpan: 6

// 2. UtilizationHeatMap (utilization-heat-map.tsx) - uses DEMO_DATA
//    - Self-contained, no external data props
//    - defaultColSpan: 12, minColSpan: 6

// 3. DisciplineProgress (discipline-progress.tsx) - uses DEMO_DATA
//    - Self-contained, no external data props
//    - defaultColSpan: 4, minColSpan: 4

// 4. ProjectImpact (project-impact.tsx) - uses DEMO_DATA
//    - Self-contained, no external data props
//    - defaultColSpan: 4, minColSpan: 4

// 5. StrategicAlerts (strategic-alerts.tsx) - hardcoded demo
//    - Self-contained, no external data props
//    - defaultColSpan: 12, minColSpan: 6

// 6. DepartmentBarChart (department-bar-chart.tsx) - receives data prop
//    - Needs adapter: WidgetProps -> useDepartmentUtilization hook internally
//    - defaultColSpan: 6, minColSpan: 4

// 7. DisciplineChart (discipline-chart.tsx) - receives data prop
//    - Needs adapter: WidgetProps -> useDisciplineBreakdown hook internally
//    - defaultColSpan: 6, minColSpan: 4

// NOTE: Some existing components use DEMO_DATA (hardcoded). The wrapper
// should keep them as-is for now; they'll get real data hooks in later phases.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @dnd-kit | 2023+ | rbd deprecated by Atlassian; dnd-kit is React 18/19 compatible, actively maintained |
| Separate position columns in DB | JSONB layout blob | Common pattern | Single read/write for entire layout; no N+1 queries for widget positions |
| react-grid-layout | CSS Grid + dnd-kit | 2024+ | react-grid-layout adds 40KB+ and fights with Tailwind; native CSS Grid is lighter |

## Open Questions

1. **NULL in unique constraint for tenant defaults**
   - What we know: PostgreSQL unique constraints don't prevent duplicate NULLs by default
   - What's unclear: Whether Drizzle's `uniqueIndex` handles NULL equality or needs a workaround
   - Recommendation: Use a partial unique index or sentinel value `'__default__'` instead of NULL for clerk_user_id on tenant defaults. Test during implementation.

2. **DragOverlay rendering for variable-span widgets**
   - What we know: DragOverlay renders a clone of the dragged element at cursor position
   - What's unclear: Whether the overlay clone correctly preserves the CSS Grid span styling outside the grid context
   - Recommendation: Render DragOverlay content at a fixed width matching the widget's current rendered width, using inline style. Test with all three span sizes.

3. **Existing widgets with DEMO_DATA**
   - What we know: UtilizationHeatMap, DisciplineProgress, ProjectImpact, StrategicAlerts all use hardcoded demo data
   - What's unclear: Should Phase 23 connect them to real data hooks, or just wrap them as-is?
   - Recommendation: Wrap as-is in Phase 23. Real data connection happens when their respective hooks/endpoints are built in later phases.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build + runtime | Yes | (project uses Next.js 16) | -- |
| PostgreSQL (Neon) | dashboard_layouts table | Yes | Neon serverless | -- |
| pnpm | Package install | Yes | 10.33.0 | -- |
| @dnd-kit/core | R23-02, R23-11 | Not yet installed | 6.3.1 (latest) | -- |
| @dnd-kit/sortable | R23-02, R23-11 | Not yet installed | 10.0.0 (latest) | -- |

**Missing dependencies with no fallback:** None (dnd-kit install is part of R23-11)

## Sources

### Primary (HIGH confidence)
- `DASHBOARD-VISUALIZATIONS-SPEC.md` - Sections 2.1-2.4 (edit mode, persistence, registry, time range), Section 6 (DB schema), Section 7 (API contracts), Section 9 (extensibility), Appendix B (breakpoints), Appendix E (dependencies)
- `src/db/schema.ts` - Current schema patterns (pgTable, relations, indexes)
- `src/app/(app)/dashboard/dashboard-content.tsx` - Current dashboard implementation
- `src/components/charts/` - All existing widget components
- `src/hooks/use-dashboard.ts` - Current TanStack Query hook patterns
- `src/lib/auth.ts` + `src/lib/tenant.ts` - Auth/tenant scoping patterns
- `src/lib/api-utils.ts` - API error handling pattern

### Secondary (MEDIUM confidence)
- [dnd-kit issue #720](https://github.com/clauderic/dnd-kit/issues/720) - Variable-sized grid items workaround with `strategy={() => null}`
- [dnd-kit documentation](https://docs.dndkit.com/) - Core concepts, sortable preset
- npm registry - @dnd-kit/core@6.3.1, @dnd-kit/sortable@10.0.0 verified current

### Tertiary (LOW confidence)
- dnd-kit DragOverlay behavior with CSS Grid spans - needs implementation testing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries either already installed or spec-mandated with verified versions
- Architecture: HIGH - Spec provides complete file structure, interfaces, and patterns; existing codebase confirms conventions
- Pitfalls: MEDIUM - dnd-kit + CSS Grid variable spans is a known challenge area; NULL unique constraint is a well-known PostgreSQL behavior; both have documented solutions but need implementation validation
- Person 360 overlay: HIGH - Spec is detailed; React portal + CSS transform is a well-established pattern

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable domain, all deps pinned)
