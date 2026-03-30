# Requirements: Nordic Capacity v2.0

**Defined:** 2026-03-28
**Core Value:** Real-time visibility into team capacity, project staffing, and resource utilization -- transforming the product from a data-entry tool into a capacity planning tool.

## v2.0 Requirements

### Infrastructure

- [x] **INFRA-01**: Feature flag service loads all org flags once per request and exposes typed `FeatureFlags` interface
- [x] **INFRA-02**: Platform admin can toggle feature flags per tenant from tenant detail page
- [x] **INFRA-03**: Feature-flagged routes/nav items are hidden when flag is disabled for the org
- [x] **INFRA-04**: Toast notification system (Sonner) available app-wide for alerts and feedback

### Team Overview

- [x] **TEAM-01**: User can view a heat map of all people x months with cells color-coded by utilization (green 80-100%, yellow 50-79%, red >100%, grey <50%)
- [x] **TEAM-02**: Heat map rows are grouped by department with collapsible sections
- [x] **TEAM-03**: User can filter the heat map by department, discipline, or date range
- [x] **TEAM-04**: User can click a person name in the heat map to navigate to their Person Input Form
- [x] **TEAM-05**: Heat map scrolls horizontally across the 12-18 month planning horizon

### Project View

- [x] **PROJ-01**: User can select a project and see all people allocated to it with hours per month
- [x] **PROJ-02**: Project View shows a summary row with total hours per month across all people
- [x] **PROJ-03**: User can click a person name in Project View to navigate to their Person Input Form
- [x] **PROJ-04**: Project View shows months with no allocations as visually distinct (understaffed indicator)

### Dashboard

- [x] **DASH-01**: User can view KPI cards: overall utilization %, total headcount, overloaded count, underutilized count
- [x] **DASH-02**: User can view departmental utilization as a bar chart
- [x] **DASH-03**: User can select a time range for dashboard metrics (next 3, 6, or 12 months)
- [x] **DASH-04**: User can click a KPI card to drill down to the underlying people list

### Alerts

- [x] **ALRT-01**: User can view a list of overloaded (>100%) and underutilized (<50%) people for the current period
- [x] **ALRT-02**: Alert badge in top nav shows count of active capacity alerts
- [x] **ALRT-03**: Each alert links to the affected person's input form
- [x] **ALRT-04**: Alerts are computed on demand from current allocation data (no separate storage)

### Charts

- [x] **CHRT-01**: User can view discipline breakdown as bar/pie chart showing hours by discipline per month
- [x] **CHRT-02**: Discipline chart respects the same time range as dashboard
- [x] **CHRT-03**: Charts use Recharts with Nordic Precision design tokens (colors, fonts)

### PDF Export

- [x] **PDF-01**: User can export the Team Overview heat map as a PDF document
- [x] **PDF-02**: PDF renders in landscape orientation with department grouping and color legend
- [x] **PDF-03**: PDF includes org name, date range, and generation timestamp as header/footer

### Onboarding

- [x] **ONBR-01**: New tenant sees a multi-step onboarding wizard after org creation
- [x] **ONBR-02**: Wizard guides through: add departments, add disciplines, create first person or import
- [x] **ONBR-03**: Wizard offers pre-filled suggestions for engineering departments and disciplines
- [x] **ONBR-04**: Existing tenants are marked as onboarded and skip the wizard
- [x] **ONBR-05**: User can skip the wizard and access the app directly

### Platform Operations

- [x] **PLOP-01**: Platform admin can view system health metrics (DB latency, error rates, active connections)
- [x] **PLOP-02**: Platform admin can create announcements with title, body, severity, and date range
- [x] **PLOP-03**: Tenant users see active announcements as a dismissible banner in the app
- [x] **PLOP-04**: Critical announcements persist until expiry; info-level can be dismissed
- [x] **PLOP-05**: Platform admin can bulk export all data for a tenant as JSON
- [x] **PLOP-06**: Platform admin can purge all data for a tenant (GDPR deletion)

## v3.0 Requirements

Moved to [v3.0-REQUIREMENTS.md](v3.0-REQUIREMENTS.md) — 15 UX requirements focused on "Switch from Excel" milestone.

### Deferred Feature Requirements (v4.0+)

- **VIS-01**: Editable Project View (edit hours directly from project perspective)
- **VIS-02**: Dashboard trend lines (utilization over past vs future months)
- **VIS-03**: Configurable alert thresholds per tenant
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
| INFRA-02 | Phase 11 | Complete |
| INFRA-03 | Phase 11 | Complete |
| INFRA-04 | Phase 11 | Complete |
| TEAM-01 | Phase 12 | Complete |
| TEAM-02 | Phase 12 | Complete |
| TEAM-03 | Phase 12 | Complete |
| TEAM-04 | Phase 12 | Complete |
| TEAM-05 | Phase 12 | Complete |
| PROJ-01 | Phase 14 | Complete |
| PROJ-02 | Phase 14 | Complete |
| PROJ-03 | Phase 14 | Complete |
| PROJ-04 | Phase 14 | Complete |
| DASH-01 | Phase 13 | Complete |
| DASH-02 | Phase 13 | Complete |
| DASH-03 | Phase 13 | Complete |
| DASH-04 | Phase 13 | Complete |
| ALRT-01 | Phase 14 | Complete |
| ALRT-02 | Phase 14 | Complete |
| ALRT-03 | Phase 14 | Complete |
| ALRT-04 | Phase 14 | Complete |
| CHRT-01 | Phase 13 | Complete |
| CHRT-02 | Phase 13 | Complete |
| CHRT-03 | Phase 13 | Complete |
| PDF-01 | Phase 15 | Complete |
| PDF-02 | Phase 15 | Complete |
| PDF-03 | Phase 15 | Complete |
| ONBR-01 | Phase 16 | Complete |
| ONBR-02 | Phase 16 | Complete |
| ONBR-03 | Phase 16 | Complete |
| ONBR-04 | Phase 16 | Complete |
| ONBR-05 | Phase 16 | Complete |
| PLOP-01 | Phase 17 | Complete |
| PLOP-02 | Phase 16 | Complete |
| PLOP-03 | Phase 16 | Complete |
| PLOP-04 | Phase 16 | Complete |
| PLOP-05 | Phase 17 | Complete |
| PLOP-06 | Phase 17 | Complete |

**Coverage:**
- v2.0 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 after roadmap creation*
