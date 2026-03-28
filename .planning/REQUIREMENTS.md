# Requirements: Nordic Capacity v2.0

**Defined:** 2026-03-28
**Core Value:** Real-time visibility into team capacity, project staffing, and resource utilization -- transforming the product from a data-entry tool into a capacity planning tool.

## v2.0 Requirements

### Infrastructure

- [x] **INFRA-01**: Feature flag service loads all org flags once per request and exposes typed `FeatureFlags` interface
- [ ] **INFRA-02**: Platform admin can toggle feature flags per tenant from tenant detail page
- [ ] **INFRA-03**: Feature-flagged routes/nav items are hidden when flag is disabled for the org
- [x] **INFRA-04**: Toast notification system (Sonner) available app-wide for alerts and feedback

### Team Overview

- [ ] **TEAM-01**: User can view a heat map of all people x months with cells color-coded by utilization (green 80-100%, yellow 50-79%, red >100%, grey <50%)
- [ ] **TEAM-02**: Heat map rows are grouped by department with collapsible sections
- [ ] **TEAM-03**: User can filter the heat map by department, discipline, or date range
- [ ] **TEAM-04**: User can click a person name in the heat map to navigate to their Person Input Form
- [ ] **TEAM-05**: Heat map scrolls horizontally across the 12-18 month planning horizon

### Project View

- [ ] **PROJ-01**: User can select a project and see all people allocated to it with hours per month
- [ ] **PROJ-02**: Project View shows a summary row with total hours per month across all people
- [ ] **PROJ-03**: User can click a person name in Project View to navigate to their Person Input Form
- [ ] **PROJ-04**: Project View shows months with no allocations as visually distinct (understaffed indicator)

### Dashboard

- [ ] **DASH-01**: User can view KPI cards: overall utilization %, total headcount, overloaded count, underutilized count
- [ ] **DASH-02**: User can view departmental utilization as a bar chart
- [ ] **DASH-03**: User can select a time range for dashboard metrics (next 3, 6, or 12 months)
- [ ] **DASH-04**: User can click a KPI card to drill down to the underlying people list

### Alerts

- [ ] **ALRT-01**: User can view a list of overloaded (>100%) and underutilized (<50%) people for the current period
- [ ] **ALRT-02**: Alert badge in top nav shows count of active capacity alerts
- [ ] **ALRT-03**: Each alert links to the affected person's input form
- [ ] **ALRT-04**: Alerts are computed on demand from current allocation data (no separate storage)

### Charts

- [ ] **CHRT-01**: User can view discipline breakdown as bar/pie chart showing hours by discipline per month
- [ ] **CHRT-02**: Discipline chart respects the same time range as dashboard
- [ ] **CHRT-03**: Charts use Recharts with Nordic Precision design tokens (colors, fonts)

### PDF Export

- [ ] **PDF-01**: User can export the Team Overview heat map as a PDF document
- [ ] **PDF-02**: PDF renders in landscape orientation with department grouping and color legend
- [ ] **PDF-03**: PDF includes org name, date range, and generation timestamp as header/footer

### Onboarding

- [ ] **ONBR-01**: New tenant sees a multi-step onboarding wizard after org creation
- [ ] **ONBR-02**: Wizard guides through: add departments, add disciplines, create first person or import
- [ ] **ONBR-03**: Wizard offers pre-filled suggestions for engineering departments and disciplines
- [ ] **ONBR-04**: Existing tenants are marked as onboarded and skip the wizard
- [ ] **ONBR-05**: User can skip the wizard and access the app directly

### Platform Operations

- [ ] **PLOP-01**: Platform admin can view system health metrics (DB latency, error rates, active connections)
- [ ] **PLOP-02**: Platform admin can create announcements with title, body, severity, and date range
- [ ] **PLOP-03**: Tenant users see active announcements as a dismissible banner in the app
- [ ] **PLOP-04**: Critical announcements persist until expiry; info-level can be dismissed
- [ ] **PLOP-05**: Platform admin can bulk export all data for a tenant as JSON
- [ ] **PLOP-06**: Platform admin can purge all data for a tenant (GDPR deletion)

## v3.0 Requirements (Deferred)

### Visibility Enhancements

- **VIS-01**: Editable Project View (edit hours directly from project perspective)
- **VIS-02**: Dashboard trend lines (utilization over past vs future months)
- **VIS-03**: Configurable alert thresholds per tenant

### Platform

- **PLAT-V3-01**: Email notifications for capacity alerts
- **PLAT-V3-02**: Custom report builder
- **PLAT-V3-03**: Tenant data migration between orgs

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time WebSocket sync | Low-contention data, optimistic updates sufficient |
| AI resource recommendations | Target users know their team, visibility > automation |
| Gantt chart / timeline view | Monthly granularity, heat map IS the timeline |
| Billable tracking | Engineering orgs, not agencies |
| Role-based capacity planning | Person-centric model is correct for target market |
| Dark mode | No planning value, CSS vars ready for later |
| SSO / SAML | Enterprise feature, deferred to v3.0+ |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 11 | Complete |
| INFRA-02 | Phase 11 | Pending |
| INFRA-03 | Phase 11 | Pending |
| INFRA-04 | Phase 11 | Complete |
| TEAM-01 | Phase 12 | Pending |
| TEAM-02 | Phase 12 | Pending |
| TEAM-03 | Phase 12 | Pending |
| TEAM-04 | Phase 12 | Pending |
| TEAM-05 | Phase 12 | Pending |
| PROJ-01 | Phase 14 | Pending |
| PROJ-02 | Phase 14 | Pending |
| PROJ-03 | Phase 14 | Pending |
| PROJ-04 | Phase 14 | Pending |
| DASH-01 | Phase 13 | Pending |
| DASH-02 | Phase 13 | Pending |
| DASH-03 | Phase 13 | Pending |
| DASH-04 | Phase 13 | Pending |
| ALRT-01 | Phase 14 | Pending |
| ALRT-02 | Phase 14 | Pending |
| ALRT-03 | Phase 14 | Pending |
| ALRT-04 | Phase 14 | Pending |
| CHRT-01 | Phase 13 | Pending |
| CHRT-02 | Phase 13 | Pending |
| CHRT-03 | Phase 13 | Pending |
| PDF-01 | Phase 15 | Pending |
| PDF-02 | Phase 15 | Pending |
| PDF-03 | Phase 15 | Pending |
| ONBR-01 | Phase 16 | Pending |
| ONBR-02 | Phase 16 | Pending |
| ONBR-03 | Phase 16 | Pending |
| ONBR-04 | Phase 16 | Pending |
| ONBR-05 | Phase 16 | Pending |
| PLOP-01 | Phase 17 | Pending |
| PLOP-02 | Phase 16 | Pending |
| PLOP-03 | Phase 16 | Pending |
| PLOP-04 | Phase 16 | Pending |
| PLOP-05 | Phase 17 | Pending |
| PLOP-06 | Phase 17 | Pending |

**Coverage:**
- v2.0 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 after roadmap creation*
