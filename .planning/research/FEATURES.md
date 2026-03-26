# Features Research

Competitive analysis of Float, Runn, Resource Guru, Productive, and Saviom — focused on what matters for an engineering-team capacity planner replacing Excel/Access for 20-500 managed resources across 12-18 month horizons.

---

## Table Stakes

These are features every resource capacity planner must have. Without them, users will not consider the product or will churn quickly.

### 1. Visual Resource Scheduling

- Drag-and-drop allocation of people to projects/phases
- Calendar/timeline view showing who works on what and when
- Every competitor has this as the primary interface
- **Our MVP covers this** via AG Grid spreadsheet-grade editing

### 2. Capacity & Availability Visibility

- Real-time view of each person's total capacity vs. allocated hours
- Over/under-allocation indicators (color coding, heat maps)
- Account for part-time schedules, different working hours
- **Our MVP partially covers this** via team overview heat maps

### 3. Leave & Absence Management

- Track vacations, sick days, parental leave, public holidays
- Automatically reduce available capacity when leave is booked
- Regional/country-specific holiday calendars (critical for Swedish market)
- Float, Resource Guru, and Productive all treat this as core, not add-on

### 4. Multi-Project View

- See a person's allocations across ALL projects simultaneously
- Prevent double-booking / over-allocation conflicts
- Resource Guru has specific "clash management" for this
- Flat table view with filtering partially addresses this

### 5. Filtering & Grouping

- Filter by team, department, skill, role, project, date range
- Group resources by discipline (software, mechanical, electronics, test, systems, hardware)
- Essential for multi-disciplinary engineering orgs

### 6. Basic Reporting & Export

- Utilization rates per person, team, department
- Export to Excel/CSV for stakeholder reporting
- **Our MVP covers this** via flat table view with export

### 7. Role-Based Access Control

- Managers see their teams; executives see everything
- Team leads can edit their team's allocations but not others
- Read-only views for stakeholders
- **Our MVP partially covers this** via Clerk auth + multi-tenant

### 8. Data Import

- Ability to bring existing data in from spreadsheets
- **Our MVP covers this** via bulk Excel import with Swedish/English header detection — this is a differentiator in execution

---

## Differentiators

Features that create competitive advantage, especially for engineering teams (not creative agencies, which is what most competitors optimize for).

### Engineering-Specific Differentiators

#### D1. Multi-Discipline Skills Tracking

- Most competitors treat skills as flat tags (e.g., "React", "Design")
- Engineering orgs need: discipline (mechanical, electronics, software, test, systems), seniority level, certifications, tool proficiencies (specific CAD tools, test equipment)
- Saviom is the only competitor with deep skills matching; Float/Runn/Resource Guru treat it superficially
- **Opportunity**: First-class discipline-aware allocation — filter by "mechanical engineers with SolidWorks and >3 years" rather than just "engineer"

#### D2. Long-Horizon Planning (12-18 Months)

- Float is weak here (only week/month views, max ~5 weeks visible)
- Runn is better (half-year and full-year views)
- Engineering product development cycles are 12-24 months; agencies work in 2-8 week sprints
- **Opportunity**: Purpose-built for quarterly/annual planning horizons with month-level granularity, not day-level

#### D3. Scenario Planning / What-If Modeling

- "What happens if Project X slips 3 months?" or "Can we take on Project Y without hiring?"
- Runn and Saviom have this; Float and Resource Guru do not
- Critical for engineering managers presenting to leadership
- **Opportunity**: Compare 2-3 scenarios side-by-side with impact on utilization and hiring needs

#### D4. Placeholder / Unnamed Resources

- Plan with "1x Mechanical Engineer" before knowing who specifically
- Supports hiring planning and early-stage project scoping
- Float and Productive have this; Runn and Resource Guru do not
- Important for engineering: you plan the project structure before staffing it

#### D5. Spreadsheet-Familiar UX

- Target users currently use Excel — the interface should feel like a spreadsheet, not a creative Kanban board
- Most competitors use timeline/Gantt UX optimized for creative agencies
- **Our MVP's AG Grid approach is a genuine differentiator** for the Excel-refugee persona
- Copy/paste, keyboard navigation, bulk editing, cell-level allocation entry

#### D6. Swedish/Nordic Market Fit

- Swedish public holidays built-in
- Swedish-language UI or at minimum Swedish header detection in import
- VAT/currency handling in SEK
- None of the competitors have explicit Nordic engineering focus
- **Our MVP's Swedish/English header detection in Excel import is unique**

#### D7. Bulk Operations

- Allocate 5 people to a project phase in one action
- Shift an entire project timeline by N weeks
- Copy allocations from one period to another
- Engineering teams plan in bulk (quarterly resource allocation meetings), not individual daily task assignment

#### D8. Hiring Pipeline Integration

- When capacity gaps are identified, flag "need to hire 2 test engineers by Q3"
- Runn has hiring forecasting reports; most competitors do not
- Engineering orgs have long hiring cycles (3-6 months) so early visibility is critical

### Product-Level Differentiators

#### D9. Performance at Scale (200-500 Resources)

- Resource Guru and Float reportedly lag with large datasets
- Runn claims scalability to 500+ resources
- AG Grid is built for this — can handle thousands of rows with virtualization
- **Opportunity**: The grid can be a genuine performance differentiator

#### D10. Platform Admin Capabilities

- Tenant management, user impersonation for support
- Most competitors are single-tenant SaaS without platform admin tooling
- **Our MVP covers this** — useful for managed service / white-label scenarios

---

## Anti-Features

Things to deliberately NOT build, and why.

### AF1. Built-in Time Tracking

- **Why not**: Float added it; Resource Guru added it. It pulls the product toward agency billing workflows.
- Engineering teams already use Jira, Azure DevOps, or other tools for time tracking.
- Adding time tracking creates scope creep, data integrity issues (two sources of truth), and moves the product away from its core planning focus.
- **Instead**: Provide an integration point / API where actuals can be imported, but do not build a stopwatch/timer UI.

### AF2. Full Project Management (Tasks, Subtasks, Kanban)

- **Why not**: Productive.io went this direction and became a "do everything" tool.
- Jira, Azure DevOps, Monday.com own this space. Competing with them is a losing proposition.
- Engineering teams will not abandon Jira for a resource planner's task board.
- **Instead**: Stay focused on capacity and allocation. Integrate with PM tools for project structure data.

### AF3. Built-in Chat / Collaboration Features

- **Why not**: Teams/Slack dominate. No one wants another messaging tool.
- Notification hooks (Slack/Teams webhooks) are sufficient.

### AF4. Invoicing / Billing

- **Why not**: Engineering teams doing internal R&D are cost centers, not billing clients.
- This is an agency/consultancy feature. Productive and Float are adding it — let them serve that market.
- **Instead**: Track cost (salary cost per allocation) but not revenue/invoicing.

### AF5. Granular Daily Task Scheduling

- **Why not**: Engineering capacity planning happens at week or month granularity, not hour-by-hour.
- Day-level scheduling is what Float excels at, but it is the wrong abstraction for 12-18 month planning.
- **Instead**: Support week-level and month-level allocation granularity. Day-level is optional and not the default.

### AF6. Meeting Room / Equipment Booking

- **Why not**: Resource Guru includes meeting room and equipment booking. This is a different product category.
- It dilutes the UX and creates confusion about what the product is for.
- Engineering teams use Outlook/Google Calendar for room booking.

### AF7. AI-Powered Auto-Scheduling

- **Why not**: Premature complexity. Saviom markets "intelligent matchmaking" but reviews suggest it is more marketing than substance.
- Engineering managers want control over who works on what — they do not want an algorithm deciding.
- **Instead**: Provide suggestions/warnings (over-allocation, skill mismatches) but let humans make the decisions.

### AF8. Mobile App (Native)

- **Why not for MVP**: Capacity planning is a desktop activity done in planning meetings with large screens.
- A responsive web view is sufficient. Native mobile adds maintenance burden without clear value for the target persona.
- **Revisit post-MVP** only if user research shows demand.

### AF9. Gantt Chart / Timeline View as Primary UI

- **Why not**: Every competitor uses Gantt/timeline as the default view. It optimizes for visual project scheduling (agency mindset).
- Our target users think in spreadsheets: rows = people, columns = time periods, cells = allocation percentages or hours.
- The grid view IS the product. Timeline is a secondary visualization, not the primary interaction model.

---

## Feature Complexity Matrix

| Feature                              | Complexity  | MVP? | Notes                                                                |
| ------------------------------------ | ----------- | ---- | -------------------------------------------------------------------- |
| **Grid-based allocation editing**    | High        | Yes  | Core product. AG Grid integration with custom cell editors.          |
| **Excel import (Swedish/English)**   | Medium      | Yes  | Header detection, mapping, validation, error reporting.              |
| **Team heat maps**                   | Medium      | Yes  | Aggregate utilization visualization per team/period.                 |
| **Flat table view + export**         | Low         | Yes  | Standard data grid with CSV/Excel export.                            |
| **Multi-tenant + Clerk auth**        | Medium      | Yes  | Tenant isolation, role-based access.                                 |
| **Platform admin (impersonation)**   | Medium      | Yes  | Admin UI, impersonation middleware.                                  |
| **Leave/absence management**         | Medium      | No   | Calendar UI, holiday libraries, capacity reduction calc.             |
| **Skills/discipline tracking**       | Low-Medium  | No   | Data model + filter UI. Low if just tags, medium if hierarchical.    |
| **Multi-project conflict detection** | Medium      | No   | Cross-project aggregation, over-allocation warnings.                 |
| **Placeholder resources**            | Low         | No   | "Unnamed" resource type with role/skill attributes.                  |
| **Scenario planning**                | High        | No   | Forked allocation datasets, comparison views, merge logic.           |
| **Long-horizon views (year)**        | Medium      | No   | Virtualized rendering for 12-18 month columns. AG Grid handles this. |
| **Bulk operations**                  | Medium      | No   | Multi-select, batch update, timeline shifting.                       |
| **Utilization reporting**            | Medium      | No   | Aggregation queries, chart rendering, drill-down.                    |
| **Hiring gap analysis**              | Medium      | No   | Demand vs. supply delta, role-level forecasting.                     |
| **API / integrations**               | Medium-High | No   | REST API, webhooks, Jira/Azure DevOps connectors.                    |
| **Notification system**              | Low-Medium  | No   | Email + Slack/Teams webhooks for allocation changes.                 |
| **Audit log**                        | Low         | No   | Change tracking for compliance. Important for engineering orgs.      |
| **SSO (SAML/OIDC)**                  | Low         | No   | Clerk supports this, mainly configuration.                           |
| **Custom fields**                    | Medium      | No   | User-defined attributes on resources/projects. Flexible schema.      |
| **Cost tracking**                    | Medium      | No   | Salary rates, allocation cost rollup, budget vs. actual.             |

---

## Dependencies Between Features

```
Grid-based allocation editing (MVP)
├── Multi-project conflict detection
│   └── Over-allocation warnings/heat map indicators
├── Bulk operations (requires grid selection model)
├── Scenario planning (requires ability to fork/clone allocation data)
│   └── Hiring gap analysis (builds on scenario demand data)
└── Long-horizon views (extends grid column range)

Excel import (MVP)
├── Skills/discipline tracking (import can populate skill data)
└── Custom fields (import needs to handle arbitrary columns)

Multi-tenant + Clerk auth (MVP)
├── Role-based access control (extends auth with permission model)
│   └── SSO (Clerk configuration, enterprise feature gate)
└── Platform admin (requires tenant context switching)

Leave/absence management
├── Regional holiday calendars (dependency for capacity calculation)
└── Capacity visibility (leave reduces available capacity)

Skills/discipline tracking
├── Placeholder resources (placeholders defined by skill requirements)
└── Hiring gap analysis (gap = demand for skill - supply of skill)

Utilization reporting
├── Cost tracking (utilization * cost rate = cost)
├── Leave/absence management (affects utilization denominator)
└── API / integrations (reporting data feeds external dashboards)

Notification system
└── API / integrations (webhooks are a form of integration)
```

### Recommended Build Order (Post-MVP)

1. **Leave/absence management** — Highest user expectation. Without it, capacity numbers are wrong.
2. **Skills/discipline tracking** — Core engineering differentiator. Low complexity, high impact.
3. **Multi-project conflict detection** — Over-allocation is the #1 pain point that drives Excel abandonment.
4. **Placeholder resources** — Enables forward planning before staffing decisions are made.
5. **Utilization reporting** — Managers need to report upward. Dashboards and exportable charts.
6. **Long-horizon views** — Unlock the 12-18 month planning USP. AG Grid virtualization makes this feasible.
7. **Bulk operations** — Quality-of-life for quarterly planning sessions with 50+ resources.
8. **Scenario planning** — High-value differentiator but complex. Build after core allocation model is solid.
9. **Cost tracking** — Layer on salary rates once utilization reporting exists.
10. **API / integrations** — Enterprise requirement. Jira connector is highest demand.
11. **Hiring gap analysis** — Builds on scenario planning + skills tracking.
12. **Custom fields** — Flexibility for diverse engineering orgs. Can defer until customer requests accumulate.
13. **Audit log** — Low effort, high value for regulated engineering environments.
14. **Notification system** — Nice-to-have. Slack/Teams webhooks.
15. **SSO** — Enterprise gate. Clerk makes this mostly configuration.

---

## Competitor Summary Matrix

| Capability           | Float         | Runn                  | Resource Guru | Productive    | Saviom            | Our Product               |
| -------------------- | ------------- | --------------------- | ------------- | ------------- | ----------------- | ------------------------- |
| Primary audience     | Agencies      | Professional services | Small teams   | Agencies/PS   | Enterprise        | Engineering teams         |
| Pricing model        | Per person/mo | Per person/mo         | Per person/mo | Per person/mo | Custom/enterprise | Per person/mo             |
| Planning horizon     | Weeks         | Months-Year           | Weeks-Months  | Months        | Years             | Months-Year (target)      |
| Grid/spreadsheet UX  | No (timeline) | No (timeline)         | No (calendar) | No (timeline) | No (table+Gantt)  | Yes (AG Grid)             |
| Skills tracking      | Basic tags    | Basic tags            | Basic tags    | Basic         | Advanced          | Discipline-aware (target) |
| Scenario planning    | No            | Yes                   | No            | Limited       | Yes               | Planned                   |
| Time tracking        | Yes           | Yes                   | Yes           | Yes           | Yes               | No (deliberate)           |
| Billing/invoicing    | Yes           | No                    | No            | Yes           | No                | No (deliberate)           |
| Excel import         | Limited       | Limited               | No            | Limited       | Yes               | Advanced (Swedish/EN)     |
| Long-range views     | Weak          | Good                  | Medium        | Good          | Good              | Target strength           |
| Scale (resources)    | ~200          | 500+                  | ~100          | ~300          | 1000+             | 500 (target)              |
| Nordic/Swedish focus | No            | No                    | No            | No            | No                | Yes                       |

---

_Research compiled 2026-03-25. Sources: Float, Runn, Resource Guru, Productive, Saviom product pages; Capterra, G2, GetApp reviews; The Digital Project Manager comparisons; Retain International engineering resource planning guide._
