# Nordic Capacity -- Roadmap

## Milestones

- **v1.0 MVP** -- Phases 1-10 (shipped 2026-03-27) | [Archive](milestones/v1.0-ROADMAP.md)
- **v2.0 Visibility & Insights** -- Phases 11-17 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-10) -- SHIPPED 2026-03-27</summary>

- [x] Phase 1: Project Scaffolding & Dev Environment (1/1 plans)
- [x] Phase 2: Database Schema & Tenant Isolation (2/2 plans)
- [x] Phase 3: Authentication & App Shell (4/4 plans)
- [x] Phase 4: Person & Project CRUD (2/2 plans)
- [x] Phase 5: Reference Data Admin (2/2 plans)
- [x] Phase 6: AG Grid Spike & Core Grid (2/2 plans)
- [x] Phase 7: Grid Polish & Navigation (3/3 plans)
- [x] Phase 8: Import Wizard (4/4 plans)
- [x] Phase 9: Flat Table View & Export (2/2 plans)
- [x] Phase 10: Platform Admin (4/4 plans)

</details>

### v2.0 Visibility & Insights

- [ ] **Phase 11: Infrastructure & Feature Flags** - Toast system and per-tenant feature flag gating for gradual v2 rollout
- [ ] **Phase 12: Team Overview Heat Map** - Headline capacity heat map showing all people x months with utilization color-coding
- [ ] **Phase 13: Dashboard & Charts** - Management KPI dashboard with departmental utilization and discipline breakdown charts
- [ ] **Phase 14: Alerts & Project View** - Capacity alert system and project-centric staffing view
- [ ] **Phase 15: PDF Export** - Exportable Team Overview heat map as landscape PDF document
- [ ] **Phase 16: Onboarding & Announcements** - New-tenant onboarding wizard and platform-wide announcement system
- [ ] **Phase 17: Platform Operations** - System health monitoring and tenant data operations (export/purge)

## Phase Details

### Phase 11: Infrastructure & Feature Flags
**Goal**: Platform has the foundational plumbing (feature flags, toast notifications) needed to gate and communicate all v2 features
**Depends on**: Phase 10 (v1.0 complete)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04
**Success Criteria** (what must be TRUE):
  1. Feature flags load once per request and return typed values; flagged routes/nav items are invisible when disabled
  2. Platform admin can toggle feature flags for any tenant from the tenant detail page
  3. Toast notifications appear app-wide for user feedback (success, error, info)
  4. A new tenant with all flags disabled sees no v2 nav items or routes
**Plans**: 2 plans
Plans:
- [ ] 11-01-PLAN.md — Feature flag service layer (types, service, context, Flags SDK) + Sonner toast system
- [ ] 11-02-PLAN.md — Platform admin flag toggle API/UI + flag-aware nav filtering + route guards

### Phase 12: Team Overview Heat Map
**Goal**: Managers can see at a glance who is overloaded, underutilized, or healthy across the entire team and planning horizon
**Depends on**: Phase 11 (feature flags gate the route)
**Requirements**: TEAM-01, TEAM-02, TEAM-03, TEAM-04, TEAM-05
**Success Criteria** (what must be TRUE):
  1. User sees a heat map of all people x months with cells color-coded by utilization (green 80-100%, yellow 50-79%, red >100%, grey <50%)
  2. Heat map rows are grouped by department with collapsible sections
  3. User can filter the heat map by department, discipline, or date range
  4. Clicking a person name navigates to their Person Input Form
  5. Heat map scrolls horizontally across the full 12-18 month planning horizon
**Plans**: TBD
**UI hint**: yes

### Phase 13: Dashboard & Charts
**Goal**: Managers can monitor organizational capacity health through KPI cards, departmental utilization bars, and discipline breakdown charts
**Depends on**: Phase 12 (reuses analytics aggregation service built for heat map)
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, CHRT-01, CHRT-02, CHRT-03
**Success Criteria** (what must be TRUE):
  1. User sees KPI cards (overall utilization %, headcount, overloaded count, underutilized count) and can click any card to drill down to the people list
  2. User sees departmental utilization as a bar chart
  3. User can select a time range (next 3, 6, or 12 months) and all dashboard metrics and charts update accordingly
  4. User sees discipline breakdown as bar/pie chart showing hours by discipline per month
  5. All charts render with Nordic Precision design tokens (colors, fonts, spacing)
**Plans**: TBD
**UI hint**: yes

### Phase 14: Alerts & Project View
**Goal**: Planners receive proactive capacity warnings and can view staffing from the project perspective
**Depends on**: Phase 12 (reuses analytics aggregation service)
**Requirements**: ALRT-01, ALRT-02, ALRT-03, ALRT-04, PROJ-01, PROJ-02, PROJ-03, PROJ-04
**Success Criteria** (what must be TRUE):
  1. User sees a list of overloaded (>100%) and underutilized (<50%) people for the current period, each linking to the affected person's input form
  2. Alert badge in top nav shows the count of active capacity alerts
  3. Alerts are computed on demand from current allocation data with no separate storage
  4. User can select a project and see all people allocated to it with hours per month, plus a summary row of total hours
  5. Project View visually distinguishes months with no allocations (understaffed indicator)
**Plans**: TBD
**UI hint**: yes

### Phase 15: PDF Export
**Goal**: Users can generate a printable PDF of the Team Overview heat map for offline review and stakeholder sharing
**Depends on**: Phase 12 (heat map must exist to export it)
**Requirements**: PDF-01, PDF-02, PDF-03
**Success Criteria** (what must be TRUE):
  1. User can click an export button on the Team Overview page and receive a PDF download
  2. PDF renders in landscape orientation with department grouping and a color legend
  3. PDF header/footer includes org name, date range, and generation timestamp
**Plans**: TBD

### Phase 16: Onboarding & Announcements
**Goal**: New tenants get guided setup, and platform admins can communicate with all tenants through announcements
**Depends on**: Phase 12 (onboarding tours reference Team Overview and other completed pages)
**Requirements**: ONBR-01, ONBR-02, ONBR-03, ONBR-04, ONBR-05, PLOP-02, PLOP-03, PLOP-04
**Success Criteria** (what must be TRUE):
  1. New tenant sees a multi-step onboarding wizard after org creation that guides through departments, disciplines, and first person/import
  2. Wizard offers pre-filled engineering department and discipline suggestions
  3. Existing tenants are marked as onboarded and skip the wizard; users can also skip manually
  4. Platform admin can create announcements with title, body, severity, and date range
  5. Tenant users see active announcements as a dismissible banner; critical announcements persist until expiry
**Plans**: TBD
**UI hint**: yes

### Phase 17: Platform Operations
**Goal**: Platform admin has visibility into system health and can perform tenant data operations for support and GDPR compliance
**Depends on**: Phase 11 (platform admin infrastructure)
**Requirements**: PLOP-01, PLOP-05, PLOP-06
**Success Criteria** (what must be TRUE):
  1. Platform admin can view system health metrics (DB latency, error rates, active connections) on the platform dashboard
  2. Platform admin can bulk export all data for a tenant as JSON
  3. Platform admin can purge all data for a tenant (GDPR deletion) with confirmation safeguard
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 11 -> 11.x -> 12 -> 12.x -> ... -> 17

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. Scaffolding | v1.0 | 1/1 | Complete | 2026-03-25 |
| 2. DB Schema | v1.0 | 2/2 | Complete | 2026-03-25 |
| 3. Auth & Shell | v1.0 | 4/4 | Complete | 2026-03-26 |
| 4. Person/Project CRUD | v1.0 | 2/2 | Complete | 2026-03-26 |
| 5. Reference Data | v1.0 | 2/2 | Complete | 2026-03-26 |
| 6. AG Grid Core | v1.0 | 2/2 | Complete | 2026-03-26 |
| 7. Grid Polish | v1.0 | 3/3 | Complete | 2026-03-26 |
| 8. Import Wizard | v1.0 | 4/4 | Complete | 2026-03-27 |
| 9. Flat Table & Export | v1.0 | 2/2 | Complete | 2026-03-27 |
| 10. Platform Admin | v1.0 | 4/4 | Complete | 2026-03-27 |
| 11. Infrastructure & Feature Flags | v2.0 | 0/2 | Not started | - |
| 12. Team Overview Heat Map | v2.0 | 0/? | Not started | - |
| 13. Dashboard & Charts | v2.0 | 0/? | Not started | - |
| 14. Alerts & Project View | v2.0 | 0/? | Not started | - |
| 15. PDF Export | v2.0 | 0/? | Not started | - |
| 16. Onboarding & Announcements | v2.0 | 0/? | Not started | - |
| 17. Platform Operations | v2.0 | 0/? | Not started | - |

---

_60 v1 requirements shipped across 10 phases, 26 plans. Full archive: milestones/v1.0-ROADMAP.md_
_38 v2 requirements across 7 phases. Coverage: 38/38 mapped._
