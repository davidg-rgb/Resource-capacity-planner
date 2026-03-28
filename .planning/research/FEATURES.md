# Feature Landscape: v2.0 Visibility & Insights

**Domain:** Resource capacity planning SaaS (engineering-focused)
**Researched:** 2026-03-28
**Milestone:** v2.0 — visibility layer on top of existing allocation data

## Existing Foundation (v1.0)

All v2.0 features derive from the existing flat allocation table. The canonical data model is:

```
allocations(organization_id, person_id, project_id, month, hours)
```

Joined with people (department, discipline, target_hours), projects (program, status), and reference data. Every v2.0 feature is a read-only aggregation view or a platform administration capability — no new write models are needed for the core visibility features.

---

## Table Stakes

Features users expect from any capacity planning tool beyond spreadsheet-grade editing. Missing these means the product feels like "just an input form" rather than a planning tool.

| Feature | ID | Why Expected | Complexity | Dependencies | Notes |
|---------|----|--------------|------------|--------------|-------|
| Team Overview heat map | F-013 | Every competitor (Float, Runn, Resource Guru, Saviom) ships a color-coded team capacity view. It is THE feature that demonstrates capacity at a glance. Without it, managers must click through each person individually. | **High** | allocations, people, departments | Rows = people grouped by department. Columns = months. Cell color = utilization ratio (sum(hours)/target). This is the highest-value feature in v2.0. |
| Project View staffing grid | F-014 | Inverse of person view — "who is working on Project X and when?" Project managers need this to see if their project is staffed. Float and Runn both provide this as a core view. | **Medium** | allocations, projects, people | Rows = people assigned to project. Columns = months. Summary row shows total hours per month. Read-only initially; editing is a differentiator. |
| Management Dashboard with KPIs | F-015 | Management needs aggregate metrics without drilling into individual views. Utilization rate, headcount, capacity surplus/deficit are standard KPIs across Saviom, Runn, Scoro, and every enterprise PPM tool. | **Medium** | allocations, people, projects, departments | KPI cards + trend charts. Core metrics: overall utilization %, headcount by department, capacity gap (total target - total allocated), overloaded count, underutilized count. |
| Capacity alerts | F-016 | Color-coded status dots already exist on the person sidebar (v1.0). Surfacing overloaded/underutilized people as an explicit alert list is the natural next step. Resource Guru and Float both flag overallocation prominently. | **Low** | allocations, people (target_hours) | Threshold-based: >100% = overloaded (red), <50% = underutilized (amber), 80-100% = optimal (green). Configurable thresholds are a differentiator. Uses same `calculateStatus()` logic from v1.0. |

### Expected User Workflows — Table Stakes

**Team Overview (F-013):**
1. Manager opens Team Overview page
2. Sees all people as rows, grouped by department, with months as columns
3. Each cell is color-coded: green (80-100%), yellow (50-79%), red (>100%), grey (<50% or zero)
4. Clicks a person name to navigate to their Person Input Form
5. Filters by department, discipline, or date range
6. Scrolls horizontally across 12-18 month planning horizon

**Project View (F-014):**
1. Project manager selects a project from dropdown/list
2. Sees all people allocated to that project, with their hours per month
3. Summary row shows total hours/month across all people
4. Can see if any months are understaffed (no people allocated)
5. Clicks person name to navigate to their input form

**Dashboard (F-015):**
1. Director/manager opens dashboard
2. Sees KPI cards: overall utilization %, total headcount, overloaded count, underutilized count
3. Sees departmental breakdown (mini heat maps or bar charts)
4. Time range selector: "next 3 months", "next 6 months", "next 12 months"
5. Drill-down: click a KPI to see the underlying people/projects

**Alerts (F-016):**
1. Alerts appear as a notification badge or dedicated section
2. Lists people who are overloaded (>100%) or severely underutilized (<50%)
3. Each alert links to the person's input form for correction
4. Alerts are computed from current data — no separate alert storage needed

---

## Differentiators

Features that set the product apart from competitors or add unexpected value. Not expected by all users, but valued when present.

| Feature | ID | Value Proposition | Complexity | Dependencies | Notes |
|---------|----|-------------------|------------|--------------|-------|
| Discipline breakdown charts | F-017 | Engineering orgs care deeply about discipline mix ("Do we have enough SW vs HW vs Test?"). Float/Runn serve agencies and don't think in disciplines. This is where the engineering focus shines. | **Medium** | allocations, people (discipline), disciplines | Bar/pie charts showing hours by discipline per month or across time range. Unique to engineering resource planning — agencies track roles, not disciplines. |
| PDF export from Team Overview | F-027 | Managers share capacity views in steering committees and budget meetings. PDF export bridges the gap between the tool and the boardroom. Competitors offer CSV/Excel but rarely print-ready PDFs. | **Medium** | F-013 (Team Overview must exist first) | Server-side PDF generation of the heat map view. Must handle landscape orientation, 12+ month columns, department grouping. Print CSS alone will not work — need a PDF library. |
| Configurable alert thresholds | (F-016 ext) | Allow tenants to define what "overloaded" and "underutilized" mean for their org. Default 100%/50%, but some orgs run at 90% target by policy. | **Low** | F-016, tenant settings | Store thresholds in org settings or a dedicated config. Small effort, high perceived customization value. |
| Editable Project View | (F-014 ext) | Allow editing hours directly in the Project View grid, not just the Person Input Form. Runn allows this — Float does not. Useful for project managers who think project-first. | **High** | F-014, allocation batch upsert | Same AG Grid editing mechanics as Person Input Form but pivoted differently. Complex because the same allocation row can be edited from two views — needs cache invalidation coordination. |
| Trend lines on dashboard | (F-015 ext) | Show utilization trend over time (past 6 months vs next 6 months). Reveals whether the team is becoming more/less loaded. | **Medium** | F-015 | Line chart overlaid on dashboard. Requires historical data (which already exists in allocations table). |

---

## Operational Features

Platform and infrastructure features that support the product but are not user-facing capacity planning features.

| Feature | ID | Purpose | Complexity | Dependencies | Notes |
|---------|----|---------|------------|--------------|-------|
| Onboarding wizard | F-028 | Replace the bare Clerk `CreateOrganization` component with a guided setup: create org, add first department/discipline, create first person, optionally import data. Reduces time-to-value. | **Medium** | Clerk auth, departments, disciplines, people CRUD, import | Current onboarding is just `<CreateOrganization>` then redirect to `/input`. No guidance, no demo data. Must create departments + disciplines before people can be created. |
| System health monitoring | F-033 | Track uptime, error rates, slow queries, import failures per tenant. Platform admin visibility. | **Medium** | Platform admin auth, Sentry (already integrated) | Leverage existing Sentry integration. Add a `/platform/health` dashboard pulling from Sentry API + DB query performance. Could also use Vercel Analytics. |
| Feature flags per tenant | F-034 | Toggle features per organization. Gate v2.0 features behind flags during rollout. Enable beta testing with select tenants. | **Low** | Platform admin, featureFlags table (already in schema) | Schema already exists (`feature_flags` table with `organization_id`, `flag_name`, `enabled`). Just need: service layer, platform admin UI for toggling, middleware/hook for checking flags in app code. |
| Tenant data operations | F-035 | Bulk export, purge, or migrate tenant data. Platform admin needs this for support cases, GDPR deletion, and tenant offboarding. | **Medium** | Platform admin, all data tables | Export all org data as JSON/ZIP. Purge: cascade delete all rows for an org. Migrate: re-associate data between orgs (rare). |
| Announcements | F-038 | Display system-wide or per-tenant banners for maintenance, feature launches, policy changes. | **Low** | Platform admin, systemAnnouncements table (already in schema) | Schema already exists. Need: platform admin CRUD UI, client-side banner component that fetches active announcements, dismissal state (localStorage or DB). |

### Expected User Workflows — Operational

**Onboarding (F-028):**
1. User signs up via Clerk, creates organization
2. Wizard starts: "Let's set up your workspace"
3. Step 1: Add departments (pre-filled suggestions for engineering: "Software", "Hardware", "Test", "Systems")
4. Step 2: Add disciplines (suggestions: "SW", "HW", "ME", "EE", "Test", "Sys")
5. Step 3: Add first person or import from Excel
6. Step 4: Success screen with links to Person Input Form and Team Overview
7. Optional: load demo data to show what a populated workspace looks like

**Feature flags (F-034):**
1. Platform admin goes to tenant detail page
2. Sees list of available feature flags with toggle switches
3. Toggles "team_overview" on for beta tenant
4. Tenant users immediately see the Team Overview nav item
5. Other tenants don't see it until their flag is enabled

**Announcements (F-038):**
1. Platform admin creates announcement: title, body, severity (info/warning/critical), start/end dates
2. Optionally targets specific org IDs (otherwise all tenants)
3. Tenant users see a banner at the top of the app
4. Users can dismiss info-level announcements; critical ones persist until expiry

---

## Anti-Features

Features to explicitly NOT build in v2.0.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Real-time collaboration / WebSocket sync | The data is inherently low-contention (one line manager edits one person at a time). WebSocket infrastructure adds operational complexity with no user value at this scale. | Keep optimistic updates + last-write-wins conflict detection from v1.0. Revisit only if multi-user concurrent editing becomes a real request. |
| AI-powered resource recommendations | "Smart assign" is a buzzword feature from Float. It requires ML models, training data, and constant tuning. The target users (20-500 people orgs) know their team — they don't need AI to tell them who to assign. | Focus on visibility (heat maps, alerts) so managers can make informed decisions themselves. |
| Gantt chart / timeline view | The system uses monthly granularity. Gantt charts imply day/week precision and task-level scheduling. This pushes toward project management (Jira, Asana territory) rather than capacity planning. | The heat map IS the timeline view for monthly capacity planning. Keep the monthly abstraction. |
| Billable vs non-billable tracking | The target market is engineering product organizations, not agencies/consultancies. Engineers don't track billable hours — they track capacity against projects. | Keep the simple "hours per month per project" model. Add if agency-market expansion is planned. |
| Role-based capacity planning | Planning by role ("we need 3 SW engineers") rather than by named person. This is a fundamentally different planning model that changes the data model. | The current person-centric model is correct for the target market. Role-based planning is a Phase 3+ consideration if the product moves upmarket. |
| Custom reporting / report builder | Building a general-purpose report builder is a multi-month effort. The fixed dashboard with configurable time ranges covers 90% of needs. | Ship fixed dashboard views. Export to Excel for custom analysis. Consider a report builder only if 10+ customers request it. |
| Email notifications | Requires email service (SendGrid/Resend), templates, preference management, delivery tracking. Heavy infrastructure for v2.0. | In-app alerts + announcements banner. Email can come in v3.0. |
| Dark mode | Nice-to-have but does not add planning value. Defer. | Ship with light theme only. CSS variables already in place for future addition. |

---

## Feature Dependencies

```
Feature Flags (F-034) ──────────────────┐
                                         │ gates rollout of all v2.0 features
                                         v
Team Overview heat map (F-013) ─────> PDF export (F-027)
         │                                  (requires F-013 to exist)
         │
         ├──> Capacity alerts (F-016)
         │       (same utilization calculation)
         │
         └──> Management Dashboard (F-015)
                 │
                 ├──> Discipline breakdown charts (F-017)
                 │       (dashboard sub-component)
                 │
                 └──> KPI cards with drill-down to F-013

Project View (F-014) ──────────────────> (independent of F-013)
         │
         └──> shares query patterns with Team Overview

Onboarding wizard (F-028) ─────────────> (independent, but benefits from F-013
                                          existing so new users see value quickly)

Announcements (F-038) ─────────────────> (independent, platform admin only)

System health (F-033) ──────────────────> (independent, platform admin only)

Tenant data ops (F-035) ───────────────> (independent, platform admin only)
```

### Shared Building Blocks

Several features share the same underlying aggregation query:

```sql
-- "Utilization by person by month" — the foundation query
SELECT
  p.id AS person_id,
  p.first_name, p.last_name,
  p.department_id, p.discipline_id,
  p.target_hours_per_month,
  a.month,
  COALESCE(SUM(a.hours), 0) AS total_hours,
  ROUND(COALESCE(SUM(a.hours), 0)::numeric / p.target_hours_per_month * 100, 1) AS utilization_pct
FROM people p
LEFT JOIN allocations a ON a.person_id = p.id AND a.organization_id = p.organization_id
WHERE p.organization_id = ? AND p.archived_at IS NULL
  AND a.month BETWEEN ? AND ?
GROUP BY p.id, a.month
```

This query (or variations of it) drives:
- **F-013** Team Overview heat map (all people x months, colored by utilization_pct)
- **F-015** Dashboard KPIs (AVG(utilization_pct), COUNT WHERE utilization_pct > 100, etc.)
- **F-016** Capacity alerts (WHERE utilization_pct > threshold OR utilization_pct < threshold)
- **F-017** Discipline breakdown (GROUP BY discipline_id instead of person_id)

Build the aggregation service once, reuse across all four features.

---

## MVP Recommendation

### Build first (highest value, enables other features):

1. **Feature flags (F-034)** — Gate all new features. Schema already exists. Low effort, critical for safe rollout. Build the service layer + platform UI + client-side `useFeatureFlag()` hook.

2. **Team Overview heat map (F-013)** — The single most impactful feature in v2.0. This is what turns the product from "a data entry tool" into "a capacity planning tool." Build the aggregation service layer here — it will be reused by F-015, F-016, F-017.

3. **Capacity alerts (F-016)** — Low effort once F-013's aggregation exists. Add an alert badge to the nav and an alert panel/page listing overloaded/underutilized people.

4. **Project View (F-014)** — Second core view. Independent query path (group by project instead of person). Read-only initially.

5. **Management Dashboard (F-015) + Discipline charts (F-017)** — Dashboard page with KPI cards + discipline breakdown. Both consume the aggregation service from F-013.

### Build second (important but not blocking):

6. **Onboarding wizard (F-028)** — Improves new tenant experience. Not blocking existing users.

7. **PDF export (F-027)** — Requires F-013 to exist. Medium complexity due to PDF generation.

8. **Announcements (F-038)** — Schema exists. Low effort. Nice-to-have for platform ops.

### Build third (platform ops, lower urgency):

9. **System health monitoring (F-033)** — Leverage Sentry. Platform admin only.

10. **Tenant data operations (F-035)** — Needed for GDPR/support but not user-facing.

### Defer from v2.0:

- Editable Project View — high complexity, save for v2.1
- Custom alert thresholds — save for v2.1 (hardcode sensible defaults)
- Trend lines on dashboard — save for v2.1

---

## Complexity Assessment Summary

| Feature | ID | Complexity | New DB Tables | New API Endpoints | New Pages/Components |
|---------|----|------------|---------------|-------------------|---------------------|
| Feature flags | F-034 | **Low** | None (exists) | 2 (list, toggle) | 1 platform UI + 1 hook |
| Team Overview | F-013 | **High** | None | 1-2 (aggregation) | 1 page + heat map grid component |
| Capacity alerts | F-016 | **Low** | None | 1 (alert list) | 1 panel/badge component |
| Project View | F-014 | **Medium** | None | 1-2 (project allocations) | 1 page + staffing grid |
| Dashboard + KPIs | F-015 | **Medium** | None | 1-2 (dashboard data) | 1 page + KPI cards + charts |
| Discipline charts | F-017 | **Medium** | None | 0 (part of dashboard API) | Chart components |
| Onboarding wizard | F-028 | **Medium** | None | 0 (uses existing CRUD APIs) | 1 multi-step wizard page |
| PDF export | F-027 | **Medium** | None | 1 (PDF generation) | 0 (button on F-013 page) |
| Announcements | F-038 | **Low** | None (exists) | 2-3 (CRUD + active list) | 1 platform UI + 1 banner |
| System health | F-033 | **Medium** | Optional (metrics cache) | 1-2 (health data) | 1 platform dashboard page |
| Tenant data ops | F-035 | **Medium** | None | 2-3 (export, purge) | 1 platform UI section |

**Total new database tables needed: 0** — All schemas already exist from v1.0. This milestone is purely aggregation views, platform UI, and client components.

---

## Edge Cases and Gotchas

### Team Overview (F-013)
- **Zero allocations:** New people with no allocations should still appear (show grey/empty cells, not be hidden)
- **Archived people:** Should be excluded by default, with an option to show them
- **Target hours = 0:** Division by zero in utilization calculation. Guard with `NULLIF(target, 0)` or treat as "no target set"
- **Large orgs (500 people x 18 months = 9,000 cells):** Must be performant. Consider server-side aggregation with client-side rendering, not fetching raw allocations
- **Department grouping:** Collapsible sections. When collapsed, show department-level aggregate

### Project View (F-014)
- **Unallocated projects:** Projects with zero allocations should still appear in the project list
- **Archived projects:** Exclude by default
- **Person allocated 0 hours for all months:** May have been removed from project — should they show?

### Dashboard (F-015)
- **Empty state:** New tenant with no data should show helpful empty state, not broken charts
- **Time range:** Default to "current month + next 5 months" (6 month view). Allow changing.
- **Division by zero:** Tenant with no people = 0/0 utilization. Handle gracefully.

### Alerts (F-016)
- **Alert fatigue:** If everyone is at 105%, showing 50 alerts is useless. Group by severity and show counts.
- **Stale alerts:** Alerts are computed live from data, not stored. No "mark as resolved" — fix the allocation and the alert disappears.

### PDF Export (F-027)
- **Paper size:** A3 landscape for 12+ months. A4 is too narrow for meaningful heat maps.
- **Color printing:** Colors must be distinguishable in grayscale for B&W printers. Use patterns or value labels as fallback.
- **Large datasets:** PDF generation for 500 people could be slow. Consider async generation with download link.

### Onboarding (F-028)
- **Skip option:** Users must be able to skip any step. Do not force completion.
- **Re-entry:** If user abandons halfway, they should be able to resume or access the workspace with partial setup.
- **Demo data:** Offer optional demo data that can be cleared. Label it clearly as demo.

### Feature Flags (F-034)
- **Cache invalidation:** When a flag changes, the tenant's next page load should reflect it. Use TanStack Query with appropriate stale time, or include flags in the initial page props via Server Component.
- **Default state:** New features should default to OFF. Existing features default to ON (do not gate v1.0 features behind flags).

---

## Sources

- [Resource Guru — Resource Capacity Planning Guide](https://resourceguruapp.com/blog/resource-management/resource-capacity-planning-guide)
- [Float — Capacity Planning Software](https://www.float.com/resources/capacity-planning-software)
- [Runn — Resource Management KPIs](https://www.runn.io/blog/resource-management-kpis)
- [Saviom — Resource Management Metrics](https://www.saviom.com/blog/resource-management-metrics/)
- [Ganttic — Resource Planning Metrics](https://www.ganttic.com/blog/resource-planning-metrics)
- [Planview — Resource Heat Map](https://www.planview.com/products-solutions/products/adaptivework/resource-heat-map/)
- [Float — Overallocation Prevention](https://www.float.com/resources/overallocation-of-resources)
- [Resource Guru — Prevent Overallocation](https://resourceguruapp.com/blog/resource-management/prevent-overallocation)
- [react-pdf.org — React PDF Renderer](https://react-pdf.org/)
- [SaaS Onboarding Best Practices 2025](https://www.insaim.design/blog/saas-onboarding-best-practices-for-2025-examples)
- [Querio — Charting Libraries for React 2026](https://querio.ai/blogs/charting-library-for-react)
- [Speakeasy — Nivo vs Recharts](https://www.speakeasy.com/blog/nivo-vs-recharts)
