# Gap Analysis: Scope Doc vs Architecture

## Methodology

Performed a systematic section-by-section comparison of the scope document (`resource-planner-scope.md`, Draft v3) against the architecture document (`ARCHITECTURE.md`, Draft). Every numbered section, bullet point, entity field, interaction pattern, open question, and phase item in the scope doc was checked for presence and adequate coverage in the architecture. The architecture is permitted to ADD items not in the scope doc (e.g., Platform Admin features, additional ADRs); those additions are noted but not flagged as gaps.

---

## Full Coverage (items from scope doc that ARE properly covered)

### Section 1 — Problem Statement
- Multi-tenant SaaS product model: Covered (Arch 1, 2.1 F-001)
- Target audience (engineering orgs, PMOs, resource managers): Covered (Arch 1)
- Spreadsheet replacement positioning: Covered (Arch 1)

### Section 1.1 — SaaS Product Model
- Self-service sign-up, create org, invite team: Covered (Arch 2.1 F-002, 2.2 Journey 4)
- Bulk Excel import as core conversion mechanism: Covered (Arch 2.1 F-006, 2.2 Journey 2)
- Tenant data isolation: Covered (Arch 2.1 F-001, 2.3 Constraints, 7 data models with organization_id)
- Auth and user management, invite flows: Covered (Arch ADR-005 Clerk)
- Onboarding wizard: Covered (Arch 2.1 F-028, project structure `/onboarding/`)

### Section 1.2 — Competitive Landscape
- Not expected in architecture. Architecture does not need to restate competitive analysis.

### Section 2 — Users & Roles
- Org Owner, Admin, Planner/Line Manager, Viewer: Covered (Arch 2.2)
- All roles see all data in MVP, department scoping Phase 2: Covered (Arch 2.1 F-022 Phase 3; see Gaps)
- Person != User distinction: Covered implicitly (separate Person and User/Clerk auth entities)

### Section 3 — Data Model
- Architecture principle ("flat table is truth"): Covered (Arch 1, 6.1, 9 Flow 1)
- Organization entity with name, slug, subscription status: Covered (Arch 7 Organization)
- User (Auth) entity with email, name, org FK, role: Covered via Clerk (Arch ADR-005, 6.16)
- Person entity with name, discipline, department, target capacity: Covered (Arch 7 Person)
- Project entity with name, parent program, status: Covered (Arch 7 Project)
- Program/Platform entity with name, description: Covered (Arch 7 Program)
- Allocation flat table (person FK, project FK, month, hours): Covered (Arch 7 Allocation)
- Reference data admin-configurable: Covered (Arch 2.1 F-010, 7 Department/Discipline)

### Section 4 — Core Views
- Person Input Form (4.1): Covered extensively (Arch 2.1 F-003, 6.1, 9 Flow 1, Phase 1B)
- Person selector (prev/next, dropdown, sidebar with status dots): Covered (Arch 2.1 F-004, 5 components, 6.2, 9 Flow 5)
- Person metadata at top: Covered (Arch components/person/person-header.tsx)
- Project rows with dropdown: Covered (Arch components/grid/cell-renderers/project-cell.tsx)
- Month columns (9 visible, scroll 24-36): Covered (Arch 6.15 generateMonthRange)
- Editable cells with number input: Covered (Arch components/grid/cell-renderers/hours-cell.tsx)
- SUMMA row auto-calculated: Covered (Arch 2.1 F-005, components/grid/cell-renderers/summa-cell.tsx)
- Target row: Covered (Arch 6.14 calculateStatus references targetHours)
- Status row (green/amber/red/gray): Covered (Arch 6.14, components/grid/cell-renderers/status-cell.tsx)
- Auto-save on cell blur: Covered (Arch 2.1 F-020, hooks/use-grid-autosave.ts)
- Conflict detection: Covered (Arch 6.1 upsertAllocation ConflictError, 9 Flow 1 error branch)
- Team Overview (4.2): Covered (Arch 2.1 F-013, Phase 2A)
- Project View (4.3): Covered (Arch 2.1 F-014, Phase 2A)
- Flat Table View (4.4): Covered (Arch 2.1 F-009, 6.1 getAllocationsFlat, 6.10)
- Dashboard (4.5 Phase 2): Covered (Arch 2.1 F-015, Phase 2B)

### Section 5 — Bulk Import
- Import targets (People, Projects, Allocations): Covered (Arch 6.10 generateImportTemplate with 3 types)
- Flat table and pivot/grid formats: Covered (Arch 2.1 F-026, 6.6 detectFormat/unpivot)
- Import flow (upload, column mapping, validation, preview, confirm): Covered (Arch 6.5, 8.1 Import API, 9 Flow 2)
- Auto-detect + user-adjust column mapping: Covered (Arch 6.7 suggestMappings)
- Swedish header handling: Covered (Arch 6.7 HEADER_ALIASES)
- Validation with required fields, reference matching, duplicate detection: Covered (Arch 6.8)
- Downloadable templates: Covered (Arch 2.1 F-019, 6.10 generateImportTemplate)

### Section 6 — Data Export
- Flat table to Excel/CSV: Covered (Arch 6.10, 8.1 Export API)
- All columns (Person, Discipline, Department, Project, Program, Month, Hours): Covered (Arch 9 Flow 4 SQL)
- Filterable before export: Covered (Arch 6.10 generateExcel accepts filters)

### Section 7 — Interaction Patterns
- Excel-native feel, dedicated component: Covered (Arch ADR-003 AG Grid)
- One person at a time, sequential editing: Covered (Arch 2.2 Journey 1)
- Flat table is truth: Covered throughout
- Real-time SUMMA/status feedback: Covered (Arch 9 Flow 1)
- Navigation (prev/next, dropdown, sidebar with status dots): Covered (Arch 6.2 getAdjacentPerson, 9 Flow 5)

### Section 8 — Technical Architecture
- Next.js (React): Covered (Arch 4 Tech Stack, ADR-004)
- AG Grid or Handsontable: Covered (Arch ADR-003, chose AG Grid Community)
- TanStack Query for state: Covered (Arch 4 Tech Stack)
- PostgreSQL: Covered (Arch ADR-002)
- Row-level security with organization_id: Covered (Arch ADR-002)
- Drizzle ORM: Covered (Arch ADR-002)
- SheetJS for import/export: Covered (Arch 4 Tech Stack, ADR-007)
- Clerk for auth: Covered (Arch ADR-005)
- Email/password, magic link, Google OAuth: Covered (Arch ADR-005)
- Invite system: Covered (Arch ADR-005 Clerk organizations)
- Stripe billing: Covered (Arch 6.13, 4 Tech Stack)
- Vercel hosting: Covered (Arch 4 Tech Stack)
- Sentry monitoring: Covered (Arch 4 Tech Stack)
- GitHub Actions CI/CD: Covered (Arch 4 Tech Stack, 5 Project Structure)

---

## Gaps Found (items from scope doc MISSING or insufficiently covered in architecture)

### GAP-1: Department-Level Scoping Phasing Discrepancy
- **Scope doc (Section 2.2):** "Department-level scoping (line manager sees only their people) is Phase 2."
- **Architecture (Section 2.1 F-022):** Lists department-level scoping as Phase **3**, not Phase 2.
- **Severity:** Moderate
- **Recommended fix:** Align phasing. Either update the scope doc to say Phase 3 or move F-022 to Phase 2 in the architecture. Given that the architecture adds a Phase 1E for platform admin (not in scope doc), the phase numbering has shifted. The architecture should include a note acknowledging this deliberate re-phasing decision.

### GAP-2: "Saved" Indicator Specifics
- **Scope doc (Section 4.1, Save behavior):** Calls for a "Subtle 'saved' indicator."
- **Architecture:** Mentions "Toast: 'Saved' (subtle, auto-dismiss 2s)" in Flow 1, and has a `toast.tsx` component. However, the scope doc describes it as a persistent subtle indicator (not necessarily a toast). A toast that auto-dismisses in 2s might be missed.
- **Severity:** Minor
- **Recommended fix:** Clarify in the architecture whether the saved indicator is a toast or an inline status element near the grid (e.g., "All changes saved" text in the header). The scope doc implies something more persistent than a 2s toast.

### GAP-3: 5 Default Project Rows (Expandable)
- **Scope doc (Section 4.1):** "5 rows by default (expandable). Selecting a project populates from existing flat-table data."
- **Architecture (Section 2.5, A5):** Resolves this as "Dynamic with minimum 1 empty row. Add new rows via 'Add project...' row at bottom."
- **Severity:** Minor — This is documented as a resolved ambiguity (A5), but the resolution diverges from the scope doc's explicit "5 rows by default." The resolution is reasonable but should be explicitly noted as a scope change.
- **Recommended fix:** Add a note in A5 that the original scope doc specified 5 default rows but the architecture changes this to dynamic rows. This makes the intentional divergence transparent.

### GAP-4: "Discard Changes" / Manual Save Button Not Fully Specified
- **Scope doc (Section 4.1):** Only mentions auto-save on cell blur and a saved indicator.
- **Architecture (Section 2.5, A6):** Adds a "Save Worksheet" button and "Discard Changes" button (from screen prototypes). This is technically an addition, not a gap, but the architecture doesn't fully specify the behavior of "Discard Changes" — what does it discard if auto-save already committed changes?
- **Severity:** Minor
- **Recommended fix:** Add a behavioral specification for "Discard Changes" — does it revert to last-saved state (if auto-save is active, this would be the current state), or does it undo since the page was opened? This is a UX logic gap that should be resolved.

### GAP-5: Capacity Warnings in Import Validation
- **Scope doc (Section 5.3, step 3):** Lists "capacity warnings" as part of import validation.
- **Architecture (Section 6.8):** The validate function mentions "capacity overflows" as warnings, but the actual logic for detecting capacity warnings during import is not specified — what threshold triggers a capacity warning? Is it when imported hours would cause a person to exceed their target_hours_per_month for a given month?
- **Severity:** Minor
- **Recommended fix:** Add explicit logic for capacity warnings in the import validator spec: e.g., "Warning if total allocated hours for person+month (existing + imported) exceeds person's target_hours_per_month."

### GAP-6: Onboarding Wizard Phase Discrepancy
- **Scope doc (Section 10, Phase 2):** Lists "onboarding wizard" as Phase 2.
- **Architecture (Section 5):** Has `/onboarding/page.tsx` in the project structure (implying Phase 1), but F-028 lists it as Phase 2.
- **Severity:** Minor — The page route exists but the feature is labeled Phase 2 in F-028, which is consistent with the scope doc. The route can serve as a minimal placeholder in Phase 1.
- **Recommended fix:** Add a comment in the project structure noting that `/onboarding/` is a minimal version in Phase 1 (org creation) with the full wizard being Phase 2.

### GAP-7: Filtered Exports in Phase 2
- **Scope doc (Section 10, Phase 2):** Lists "Filtered exports" as Phase 2.
- **Architecture (Section 14, Phase 1C):** Includes "Excel/CSV export with filters applied" in Phase 1C.
- **Severity:** Minor — This is actually the architecture being more aggressive than the scope doc (delivering filtered exports earlier). Not a true gap, but a phasing discrepancy that should be acknowledged.
- **Recommended fix:** Note in the roadmap that filtered export was pulled forward from Phase 2 (scope doc) to Phase 1C (architecture) as it's a natural extension of the flat table view.

### GAP-8: SSO "Later Phases" vs Phase 3
- **Scope doc (Section 1.1):** Mentions "SSO in later phases" for key SaaS requirements.
- **Architecture (Section 2.1 F-023):** SSO/SAML listed as Phase 3 "Could."
- **Severity:** No gap — properly aligned, just noting the mapping.

### GAP-9: Billing Model TBD Not Resolved
- **Scope doc (Section 1.1):** "Billing model: TBD — likely per-resource-managed or tiered."
- **Architecture:** States "Stripe. Per-resource or tiered." (Section 2.4) and Risk R10 recommends flat-tier pricing to start. But there is no definitive resolution — the architecture still hedges.
- **Severity:** Minor — acceptable for Draft status, but this should be resolved before Phase 1D implementation.
- **Recommended fix:** Add a resolved ambiguity entry (like A1-A12) explicitly stating the Phase 1 billing decision: flat tiers by resource count bracket, with per-resource metering deferred.

### GAP-10: Free Trial with Data Import
- **Scope doc (Section 1.1):** "Free trial with data import to drive activation."
- **Architecture:** Mentions free trial (Organization default status is "trial"), and Stripe integration, but does not explicitly describe the trial-to-activation flow: how long is the trial? What happens when it expires? Can you still import data during trial? Is there a trial-ended page?
- **Severity:** Moderate
- **Recommended fix:** Add a trial lifecycle specification — trial duration (14 days? 30 days?), what happens at expiry (read-only? locked?), trial-to-paid conversion flow, and what features are available during trial.

### GAP-11: Copy-Paste Excel Clipboard Interop Details
- **Scope doc (Section 4.1):** "Copy-paste: Ctrl+C/V compatible with Excel clipboard."
- **Architecture:** F-021 lists "clipboard" as a spreadsheet interaction, and ADR-003 notes AG Grid Community supports "clipboard paste from Excel (text-based)." Risk R2 addresses clipboard issues. However, there is no specification of the clipboard behavior in the module/function definitions — no paste handler function, no data transformation logic for pasted data.
- **Severity:** Moderate
- **Recommended fix:** Add a specification for clipboard handling in the AllocationGrid component or a dedicated `clipboard-handler.ts` utility. Specify: what format is expected from paste (tab-delimited), how pasted values are validated (must be numeric), how multi-cell paste maps to the grid (row/column alignment), and error handling for invalid paste data.

### GAP-12: Multi-Select "Click-Drag Range, Type to Fill All"
- **Scope doc (Section 4.1):** "Multi-select: click-drag range, type to fill all."
- **Architecture:** F-021 lists "range select." ADR-003 notes "Range fill can be deferred." There is no component or function spec for multi-select range filling.
- **Severity:** Moderate
- **Recommended fix:** Either (a) add a specification for range selection and range fill behavior, or (b) explicitly defer multi-select range fill to a later phase with a note in the roadmap. Currently it's ambiguous — listed as F-021 "Must" Phase 1, but ADR-003 says "deferred."

### GAP-13: S3-Compatible File Uploads
- **Scope doc (Section 8.5):** Lists "S3-compatible (file uploads)" as part of hosting.
- **Architecture:** Import files are processed server-side and stored in ImportSession JSONB (Section 7 ImportSession entity). There is no mention of S3 or file storage service.
- **Severity:** Minor — The architecture's approach (storing parsed data in JSONB) may eliminate the need for S3 file storage. However, the original file is not preserved.
- **Recommended fix:** Add a note in ADR-007 or the ImportSession entity about whether original uploaded files are preserved (and if so, where), or explicitly state they are discarded after parsing.

---

## Scope Doc Open Questions (Section 9) -- Resolution Check

### Product & Market

**Q1: Target customer profile -- engineering only, or broader?**
- **Resolved?** Partially. Architecture Section 1 says "engineering organizations" and references "multi-disciplinary engineering teams." No explicit broadening or narrowing decision is documented.
- **How:** Implicitly resolved by the architecture's focus on engineering taxonomy (disciplines like SW, Mek, Elnik). No formal resolution entry.
- **Recommendation:** Add to resolved ambiguities list.

**Q2: Pricing model -- per-resource, per-seat, or tiers?**
- **Resolved?** Partially. Risk R10 recommends "flat-tier pricing" to start, but no formal decision is recorded.
- **How:** Hedged in multiple places but not formally resolved.
- **Recommendation:** Add a formal resolution entry (see GAP-9).

**Q3: Naming and branding?**
- **Resolved?** Yes. The architecture names the product "Nordic Capacity" (Section 1, throughout).
- **How:** Used consistently throughout the architecture document.

### Functional

**Q4: Capacity target -- 150h standard or varies? Part-time handling?**
- **Resolved?** Yes. Architecture Section 2.5 A1: "Per-person, defaulting to 160h/month for new resources."
- **How:** Explicit resolution with rationale. Part-time handled via configurable target_hours_per_month (Person entity, min 1, max 744).

**Q5: Project hierarchy -- one level (Project -> Program) enough?**
- **Resolved?** Yes. Architecture Section 2.5 A2: "One level: Project -> Program."
- **How:** Explicit resolution with rationale.

**Q6: Granularity -- monthly only, or ever weekly?**
- **Resolved?** Yes. Architecture Section 2.5 A3: "Monthly only for Phase 1-2."
- **How:** Explicit resolution. Weekly deferred to Phase 3.

**Q7: Historical data -- view past allocations?**
- **Resolved?** Yes. Architecture Section 2.5 A4: "Yes, read-only for past months."
- **How:** Explicit resolution. Current month and forward editable, past months locked.

**Q8: Project rows -- 5 default expandable, or dynamic?**
- **Resolved?** Yes. Architecture Section 2.5 A5: "Dynamic with minimum 1 empty row."
- **How:** Explicit resolution. Diverges from scope doc's "5 default" (see GAP-3).

### Technical

**Q9: Data volume per tenant -- expected people/projects/months?**
- **Resolved?** Yes. Architecture Section 1 (scale targets): "500 managed resources, ~100 active projects, 36-month planning window." Section 2.3: "500 resources, 100 projects, 36-month window per tenant."
- **How:** Explicit numbers with allocation row estimate (~90K to ~1.8M rows).

**Q10: GDPR -- employee name storage requirements? Data residency?**
- **Resolved?** Yes. Architecture Section 2.3 (Constraints): "GDPR -- employee names stored, requires data processing agreement. Tenant data isolation. Data residency: EU (primary)." Risk R7 adds tenant-level data export/deletion endpoints. Neon EU region specified.
- **How:** Addressed in constraints, risk register, and platform admin exportTenantData function.

---

## Data Model Alignment

### Scope Doc Section 3.2 Entities vs Architecture Section 7 Entities

| Scope Doc Entity | Architecture Entity | Match? | Notes |
|---|---|---|---|
| Organization (Tenant) — name, slug, subscription status | Organization — id, clerk_org_id, name, slug, subscription_status, stripe fields, platform admin fields | YES | Architecture adds clerk_org_id, stripe IDs, platform admin fields (suspended_at, trial_ends_at, etc.). All scope fields present. |
| User (Auth) — email, name, org FK, role | Managed by Clerk (external) | YES | Architecture delegates to Clerk, which covers all scope requirements. Internal organization table links via clerk_org_id. |
| Person — name (first, last), discipline, department, target capacity, org FK | Person — id, organization_id, first_name, last_name, discipline_id (FK), department_id (FK), target_hours_per_month, sort_order, archived_at | YES | Architecture adds sort_order (for nav) and archived_at (soft delete). Discipline and department are FKs to reference tables rather than inline strings, which is a normalization improvement. |
| Project — name, parent program/platform, status | Project — id, organization_id, name, program_id (FK), status, archived_at | YES | Full match. Status enum includes "active", "planned", "archived." |
| Program/Platform — name, description | Program — id, organization_id, name, description | YES | Full match. |
| Allocation — person FK, project FK, month (year-month, first-of-month date), planned hours (integer) | Allocation — id, organization_id, person_id (FK), project_id (FK), month (Date, first day), hours (Integer) | YES | Architecture adds organization_id for tenant isolation, and updated_at for optimistic locking. Month storage as first-of-month date matches scope. |

### Reference Data
- **Scope doc (3.3):** "Disciplines, departments, and program/platform lists are admin-configurable (not hardcoded). Managed through admin UI."
- **Architecture:** Department and Discipline are separate entities with own tables and admin CRUD pages. Programs have CRUD. All admin-configurable via `/admin/*` pages.
- **Match:** YES

### Additional Architecture Entities (not in scope doc)
- ImportSession, PlatformAdmin, PlatformAuditLog, ImpersonationSession, FeatureFlag, SystemAnnouncement — all are architecture additions. Not gaps.

### Data Model Mismatches
- **Discipline storage:** Scope doc lists disciplines as inline examples ("SW, Mechanical, Electronics, Test, Systems, HW, PT"). Architecture normalizes to a Discipline table with `name` and `abbreviation` fields. This is an improvement, not a gap.
- **Allocation hours type:** Scope says "Planned hours (integer)." Architecture confirms "hours: Integer, required, min 0, max 744." Consistent.

---

## Interaction Pattern Coverage

### Scope Doc Section 7 + Section 4.1 Patterns vs Architecture

| Interaction Pattern | Scope Doc Reference | Architecture Coverage | Status |
|---|---|---|---|
| Direct cell editing: click, type, Tab/Enter to navigate | Section 4.1 | ADR-003 (AG Grid direct editing, keyboard nav), Phase 1B roadmap, 9 Flow 1 | COVERED |
| Copy-paste: Ctrl+C/V compatible with Excel clipboard | Section 4.1 | F-021 "clipboard", ADR-003 "clipboard paste from Excel (text-based)", Risk R2 | PARTIALLY COVERED (see GAP-11) |
| Drag-to-fill: corner handle, drag to replicate values | Section 4.1 | ADR-003 (custom implementation), components/grid/drag-to-fill.tsx, Phase 1B roadmap | COVERED |
| Multi-select: click-drag range, type to fill all | Section 4.1 | F-021 "range select", ADR-003 "Range fill can be deferred" | PARTIALLY COVERED (see GAP-12) |
| Keyboard: arrow keys, Enter (commit + down), Tab (commit + right), Escape (cancel) | Section 4.1 | ADR-003 (keyboard navigation), hooks/use-keyboard-nav.ts, Phase 1B "Keyboard navigation (Tab, Enter, Arrow keys, Escape)" | COVERED |
| Auto-save on cell blur | Section 4.1 | F-020, hooks/use-grid-autosave.ts, 8.2 Internal Contracts (debounce 300ms), 9 Flow 1 | COVERED |
| Conflict detection for concurrent edits | Section 4.1 | F-020, 6.1 upsertAllocation ConflictError, 9 Flow 1 error branch | COVERED |
| Excel-native feel with dedicated component | Section 7.1 | ADR-003 AG Grid | COVERED |
| One person at a time, sequential editing | Section 7.1 | 2.2 Journey 1, all input form specs | COVERED |
| Flat table is truth | Section 7.1 | Throughout architecture | COVERED |
| Real-time SUMMA + status feedback | Section 7.1 | 9 Flow 1, capacity.ts, F-005 | COVERED |
| Density for reading, focus for editing | Section 7.1 | Team overview (dense, read-only) vs input form (single person focus) | COVERED |
| Prev/Next arrows to cycle through people | Section 7.2 | 6.2 getAdjacentPerson, 9 Flow 5 | COVERED |
| Person dropdown to jump by name | Section 7.2 | Person sidebar with search (components/person/person-sidebar.tsx) | COVERED |
| Sidebar list with capacity status dots | Section 7.2 | PersonSidebar with search, status dots (ui/status-dot.tsx) | COVERED |

---

## Phasing Alignment

### Scope Doc Section 10 vs Architecture Section 14

| Scope Doc Phase | Scope Doc Items | Architecture Phase | Status |
|---|---|---|---|
| **Phase 1 -- MVP** | Multi-tenant data model + PostgreSQL | Phase 1A Foundation | ALIGNED |
| | Auth: sign-up, login, org creation, invite users | Phase 1A Foundation | ALIGNED |
| | Person Input Form with spreadsheet grid | Phase 1B Person Input Form | ALIGNED |
| | Person navigation (prev/next, dropdown, sidebar with status dots) | Phase 1B Person Input Form | ALIGNED |
| | SUMMA + target + status rows with real-time calculation | Phase 1B Person Input Form | ALIGNED |
| | Bulk import with column mapping + validation | Phase 1C Import & Export | ALIGNED |
| | Flat table view with Excel/CSV export | Phase 1C Import & Export | ALIGNED |
| | Admin UI for reference data | Phase 1D Admin & Billing | ALIGNED |
| | Stripe (single plan or free beta) | Phase 1D Admin & Billing | ALIGNED |
| **Phase 2 -- PMF** | Team Overview heat map | Phase 2A Team & Project Views | ALIGNED |
| | Project View | Phase 2A Team & Project Views | ALIGNED |
| | Dashboard with KPIs, alerts, breakdowns | Phase 2B Dashboard | ALIGNED |
| | Filtered exports | Phase 1C (MOVED EARLIER) | DIVERGENCE -- pulled forward |
| | Onboarding wizard | Phase 2 (F-028) | ALIGNED |
| | Tiered pricing | Not explicitly phased | MINOR GAP -- should be noted in Phase 2 |
| **Phase 3 -- Scale** | Role-based scoping | Phase 3 | ALIGNED |
| | SSO / SAML | Phase 3 | ALIGNED |
| | Multi-user conflict resolution | Phase 3 | ALIGNED |
| | Integrations (Jira, HR, time tracking) | Phase 3 | ALIGNED |
| | Audit trail | Phase 3 | ALIGNED |
| | Public API | Phase 3 | ALIGNED |

### Architecture Additions (not in scope doc phases)
- **Phase 1E: Platform Administration** (Weeks 11-14) — Entirely new phase added by architecture covering platform admin dashboard, tenant impersonation, org management, feature flags, system announcements. This is a significant and well-justified addition for SaaS operations.

### Phasing Discrepancies
1. **Department-level scoping:** Scope doc says Phase 2, architecture says Phase 3 (GAP-1)
2. **Filtered exports:** Scope doc says Phase 2, architecture delivers in Phase 1C (improvement)
3. **Tiered pricing:** Scope doc Phase 2, architecture does not explicitly place it in the roadmap

---

## Summary

### Total Gaps Found: 13

| Severity | Count | Items |
|---|---|---|
| **Critical** | 0 | -- |
| **Moderate** | 4 | GAP-1 (dept scoping phase), GAP-10 (trial lifecycle), GAP-11 (clipboard spec), GAP-12 (multi-select range fill) |
| **Minor** | 9 | GAP-2 (saved indicator), GAP-3 (5 default rows), GAP-4 (discard changes), GAP-5 (capacity warnings in import), GAP-6 (onboarding wizard phase), GAP-7 (filtered exports phase), GAP-9 (billing model TBD), GAP-13 (S3 file storage) |

### Overall Assessment

The architecture document provides **excellent coverage** of the scope document. Every core entity, view, interaction pattern, and technical preference from the scope doc is represented in the architecture, typically with significantly more detail (function signatures, data flows, error handling, API contracts).

The architecture makes several well-justified additions beyond the scope doc:
- Platform Admin module (Phase 1E) with impersonation, tenant management, audit trail, and feature flags
- Resolved 12 ambiguities (A1-A12) from screen prototypes and the scope doc's open questions
- Detailed design system integration from prototypes (Tailwind tokens, font families, icon set)
- Comprehensive error taxonomy and build verification checklist

The four moderate gaps are all addressable with targeted additions:
1. Acknowledge the department-level scoping phase change explicitly
2. Specify trial-to-paid lifecycle flow
3. Add clipboard paste handler specification
4. Resolve the multi-select range fill contradiction (F-021 says "Must Phase 1" but ADR-003 says "deferred")

No critical gaps were found. The architecture is ready for implementation with the moderate gaps resolved.
