# Nordic Capacity v1.0 — Functional Test Specification

> **Version:** 1.0
> **Date:** 2026-03-27
> **Scope:** All shipped v1.0 functionality (Phases 1-10)
> **Audience:** Manual QA / human tester in browser
> **Architecture ref:** ARCHITECTURE.md (features F-001 through F-037, Sections 1-15)

---

## How to Use This Document

Each test case follows the format:

| Field | Description |
|-------|-------------|
| **ID** | Unique test case identifier (area prefix + number) |
| **What to Test** | User action to perform |
| **Expected Result** | Observable outcome |
| **Arch Ref** | ARCHITECTURE.md feature ID, section, or ADR |
| **Req ID** | Requirement identifier from v1.0-REQUIREMENTS.md |

**Precondition notation:** Each section lists preconditions at the top. Preconditions apply to ALL tests in that section unless a test specifies its own.

**Verdict columns** are provided for the tester to mark PASS / FAIL / BLOCKED.

---

## Table of Contents

1. [Auth and Sign-up](#1-auth--sign-up)
2. [App Shell and Navigation](#2-app-shell--navigation)
3. [Team Page — Person CRUD](#3-team-page--person-crud)
4. [Projects Page — Project CRUD](#4-projects-page--project-crud)
5. [Admin — Reference Data](#5-admin--reference-data)
6. [Person Input Form — Core Grid](#6-person-input-form--core-grid)
7. [Person Input Form — Grid Polish and Navigation](#7-person-input-form--grid-polish--navigation)
8. [Data Page — Import Wizard](#8-data-page--import-wizard)
9. [Data Page — Flat Table View and Export](#9-data-page--flat-table-view--export)
10. [Platform Admin](#10-platform-admin)

---

## 1. Auth & Sign-up

**Preconditions:**
- Application deployed and accessible at production/staging URL
- No existing account for test email address
- Clerk integration active with webhook endpoint configured

| ID | What to Test | Expected Result | Arch Ref | Req ID | Verdict |
|----|-------------|-----------------|----------|--------|---------|
| AUTH-T01 | Navigate to any `/app/*` route while logged out | Browser redirects to the Clerk sign-in page. No flash of authenticated content. | F-002, Section 6 | AUTH-05 | |
| AUTH-T02 | Click "Sign up" and register with a new email and password | Clerk sign-up form renders. After filling email + password and verifying email, account is created. | F-002 | AUTH-01 | |
| AUTH-T03 | During sign-up, create a new organization (name + slug) | Organization creation step appears. After entering org name, user lands on the app shell. | F-002 | AUTH-03 | |
| AUTH-T04 | After org creation, check database for internal org record | An `organizations` row exists with the Clerk org ID. Default disciplines and departments are seeded (e.g., Software, Mechanical, Electronics, Test, Systems, Hardware). | F-002 | AUTH-04 | |
| AUTH-T05 | Log out, then log in with the same email/password | Clerk sign-in form renders. After entering credentials, user lands in the app shell with the correct organization context. | F-002 | AUTH-02 | |
| AUTH-T06 | Close browser tab, reopen the app URL | User remains logged in (session persists across browser restarts via Clerk session cookie). | F-002 | AUTH-02 | |
| AUTH-T07 | As Org Owner/Admin, navigate to invite users flow and send an invitation email | Invitation email is sent via Clerk. The invited email address appears in a pending invitations list. | F-002 | AUTH-07 | |
| AUTH-T08 | Open the invitation link from the email in a new incognito window | Invited user can accept the invite, create a password, and join the existing organization. They land on the app shell seeing the same org data. | F-002 | AUTH-07 | |
| AUTH-T09 | Verify four roles exist: Org Owner, Admin, Planner/Line Manager, Viewer | In Clerk dashboard or org settings, all four roles are available for assignment to members. | Section 2.2 | AUTH-08 | |
| AUTH-T10 | As a Viewer, attempt to call an Admin-only API endpoint (e.g., POST /api/disciplines) | API returns 403 Forbidden. No data is modified. | Section 6 | AUTH-06, AUTH-08 | |
| AUTH-T11 | As a Viewer, attempt to access an admin page (e.g., /app/admin/disciplines) | Page shows access denied message or redirects. No admin UI is rendered. | Section 2.2 | AUTH-08 | |
| AUTH-T12 | Call any `/api/*` tenant route without an auth header/cookie | API returns 401 Unauthorized. | Section 6 | AUTH-06 | |
| AUTH-T13 | Verify `getTenantId()` returns correct org ID on every API call | Make an API request while logged in. Response data belongs to the authenticated org only. No cross-tenant data leakage. | Section 6 | AUTH-06, FOUND-01 | |

---

## 2. App Shell & Navigation

**Preconditions:**
- Logged in as any role (Planner or above)
- Organization has seed data (people, projects, allocations)

| ID | What to Test | Expected Result | Arch Ref | Req ID | Verdict |
|----|-------------|-----------------|----------|--------|---------|
| SHELL-T01 | Observe the app shell layout after login | Top navigation bar visible with links: Input, Team, Projects, Data (at minimum). Main content area renders below. Side navigation is contextual per view. | A7 | FOUND-08 | |
| SHELL-T02 | Click each top nav item (Input, Team, Projects, Data) | Each click navigates to the corresponding page. The active nav item is visually highlighted. URL changes to the correct route. | A7 | FOUND-08 | |
| SHELL-T03 | Verify the side nav changes context per page | On the Input page, the side nav shows person list. On other pages, the side nav shows relevant contextual navigation or is hidden. | A7, A11 | FOUND-08 | |
| SHELL-T04 | Resize browser window to 1024px width | Layout remains usable. No horizontal overflow. Navigation is accessible. Content reflows appropriately. | Section 2.3 | FOUND-08 | |
| SHELL-T05 | Verify typography: Manrope for headlines, Inter for body text | Inspect heading elements — font-family is Manrope (600-700 weight). Body text uses Inter (400-500 weight). Numbers in data cells use `tabular-nums`. | ADR-006 | FOUND-08 | |
| SHELL-T06 | Navigate to `/api/health` | Returns HTTP 200 with JSON body containing `{ db: "connected" }` (or similar health status). | - | FOUND-07 | |
| SHELL-T07 | Verify route protection: visit `/app/input` while logged out in a new browser | Redirects to Clerk sign-in. After login, redirects back to `/app/input`. | F-002 | AUTH-05 | |

---

## 3. Team Page — Person CRUD

**Preconditions:**
- Logged in as Admin or Org Owner
- At least one discipline and one department exist in reference data
- Seed data includes at least 3 people

| ID | What to Test | Expected Result | Arch Ref | Req ID | Verdict |
|----|-------------|-----------------|----------|--------|---------|
| PERSON-T01 | Navigate to the Team page | A list/table of all people in the organization is displayed, showing name, discipline, department, and target capacity. | F-011 | MGMT-01 | |
| PERSON-T02 | Click "Add Person" (or equivalent create button) | A form/dialog appears with fields: name, discipline (dropdown), department (dropdown), target capacity (defaults to 160h). | F-011, A1 | MGMT-01 | |
| PERSON-T03 | Fill in all fields and submit the create form | New person appears in the list. A success notification is shown. | F-011 | MGMT-01 | |
| PERSON-T04 | Create a person with a custom target capacity (e.g., 80h for part-time) | Person is created with 80h target. The value persists on page reload. | A1 | MGMT-01 | |
| PERSON-T05 | Click on an existing person to edit | Edit form/dialog opens pre-filled with current values (name, discipline, department, target). | F-011 | MGMT-01 | |
| PERSON-T06 | Change the person's name and department, then save | Changes persist. The list shows updated values. Page reload confirms persistence. | F-011 | MGMT-01 | |
| PERSON-T07 | Click delete on a person | A confirmation dialog appears warning about the action. | F-011 | MGMT-01 | |
| PERSON-T08 | Confirm the deletion | Person is removed from the list (soft-deleted). They no longer appear in the person sidebar on the Input page. | F-011 | MGMT-01 | |
| PERSON-T09 | Attempt to create a person with an empty name | Validation error is shown. The person is not created. | Section 11.1 | MGMT-01, FOUND-06 | |
| PERSON-T10 | As a Viewer, attempt to create/edit/delete a person | Create/edit/delete controls are hidden or disabled. API calls return 403 if attempted directly. | Section 2.2 | AUTH-08 | |

---

## 4. Projects Page — Project CRUD

**Preconditions:**
- Logged in as Admin or Org Owner
- At least one program exists in reference data
- Seed data includes at least 3 projects

| ID | What to Test | Expected Result | Arch Ref | Req ID | Verdict |
|----|-------------|-----------------|----------|--------|---------|
| PROJ-T01 | Navigate to the Projects page | A list/table of all projects is displayed, showing name, program, and status. | F-012 | MGMT-02 | |
| PROJ-T02 | Click "Add Project" (or equivalent create button) | A form/dialog appears with fields: project name, program (dropdown, optional per A12), status. | F-012, A12 | MGMT-02 | |
| PROJ-T03 | Fill in all fields and submit the create form | New project appears in the list. A success notification is shown. | F-012 | MGMT-02 | |
| PROJ-T04 | Create a project without selecting a program | Project is created successfully. Program field shows empty or "None". | A12 | MGMT-02 | |
| PROJ-T05 | Click on an existing project to edit | Edit form/dialog opens pre-filled with current values. | F-012 | MGMT-02 | |
| PROJ-T06 | Change the project name and status, then save | Changes persist. The list shows updated values. | F-012 | MGMT-02 | |
| PROJ-T07 | Archive a project | Project is marked as archived. It no longer appears in the active project list (or appears with archived indicator). It is no longer available in the "Add project" dropdown on the Person Input Form. | F-012 | MGMT-02 | |
| PROJ-T08 | Attempt to create a project with an empty name | Validation error is shown. The project is not created. | Section 11.1 | MGMT-02, FOUND-06 | |
| PROJ-T09 | As a Viewer, attempt to create/edit/archive a project | Controls are hidden or disabled. API calls return 403. | Section 2.2 | AUTH-08 | |

---

## 5. Admin — Reference Data

**Preconditions:**
- Logged in as Admin or Org Owner
- Default reference data was seeded during org creation (AUTH-T04)

### 5.1 Disciplines

| ID | What to Test | Expected Result | Arch Ref | Req ID | Verdict |
|----|-------------|-----------------|----------|--------|---------|
| DISC-T01 | Navigate to Admin > Disciplines page | A list of all disciplines is displayed (e.g., Software, Mechanical, Electronics, Test, Systems, Hardware from seed). | F-010 | MGMT-03 | |
| DISC-T02 | Add a new discipline (e.g., "Firmware") | New discipline appears in the list immediately. | F-010 | MGMT-03 | |
| DISC-T03 | Navigate to the Person create form and check the discipline dropdown | The newly added "Firmware" discipline appears in the dropdown. | F-010 | MGMT-03 | |
| DISC-T04 | Edit an existing discipline's name | Name updates in the list. Existing people assigned to that discipline show the updated name. | F-010 | MGMT-03 | |
| DISC-T05 | Delete a discipline that has NO people assigned | Discipline is removed from the list. | F-010 | MGMT-03 | |
| DISC-T06 | Attempt to delete a discipline that HAS people assigned | A warning is shown with the count of affected people (e.g., "3 people are assigned to this discipline"). Deletion is blocked or requires confirmation. | F-010 | MGMT-03 | |
| DISC-T07 | As a Viewer, navigate to /app/admin/disciplines | Access is denied. Page is not rendered or redirects away. | Section 2.2 | AUTH-08 | |

### 5.2 Departments

| ID | What to Test | Expected Result | Arch Ref | Req ID | Verdict |
|----|-------------|-----------------|----------|--------|---------|
| DEPT-T01 | Navigate to Admin > Departments page | A list of all departments is displayed. | F-010 | MGMT-04 | |
| DEPT-T02 | Add a new department | New department appears in the list. | F-010 | MGMT-04 | |
| DEPT-T03 | Verify new department appears in Person form dropdown | The dropdown includes the newly created department. | F-010 | MGMT-04 | |
| DEPT-T04 | Edit an existing department's name | Name updates. People assigned show the updated name. | F-010 | MGMT-04 | |
| DEPT-T05 | Delete a department with NO assigned people | Department is removed. | F-010 | MGMT-04 | |
| DEPT-T06 | Attempt to delete a department with assigned people | Warning with affected people count is shown. | F-010 | MGMT-04 | |

### 5.3 Programs

| ID | What to Test | Expected Result | Arch Ref | Req ID | Verdict |
|----|-------------|-----------------|----------|--------|---------|
| PROG-T01 | Navigate to Admin > Programs page | A list of all programs is displayed. | F-010 | MGMT-05 | |
| PROG-T02 | Add a new program | New program appears in the list. | F-010 | MGMT-05 | |
| PROG-T03 | Verify new program appears in Project form dropdown | The dropdown includes the newly created program. | F-010 | MGMT-05 | |
| PROG-T04 | Edit an existing program's name | Name updates. Projects assigned to it show the updated name. | F-010 | MGMT-05 | |
| PROG-T05 | Delete a program with no assigned projects | Program is removed. | F-010 | MGMT-05 | |
| PROG-T06 | Attempt to delete a program with assigned projects | Warning with affected project count is shown. | F-010 | MGMT-05 | |

---

## 6. Person Input Form — Core Grid

**Preconditions:**
- Logged in as Planner/Line Manager or above
- At least 2 people exist with allocations across multiple projects
- At least 3 projects exist (2 active, 1 archived)
- Current date is known (tests reference "current month" and "past months")

| ID | What to Test | Expected Result | Arch Ref | Req ID | Verdict |
|----|-------------|-----------------|----------|--------|---------|
| GRID-T01 | Navigate to Input page and select a person | An AG Grid renders with: month columns (at least 12 months visible), project rows (one per assigned project), and hour values in cells. The project name column is pinned/sticky on the left. | F-003 | INPUT-01 | |
| GRID-T02 | Verify month columns span current + future months | Columns include the current month and at least 11-17 future months. Column headers show month/year labels. | F-003 | INPUT-01 | |
| GRID-T03 | Click on an editable cell (current or future month) and type a number (e.g., 120) | Cell enters edit mode. The typed value appears in the cell. | F-003 | INPUT-02 | |
| GRID-T04 | Type a value and click away (blur the cell) | The value saves automatically. No explicit save button needed. | F-020 | INPUT-02, INPUT-13 | |
| GRID-T05 | After saving a cell value, refresh the page | The saved value persists and is displayed in the same cell. | F-020 | INPUT-13 | |
| GRID-T06 | Type a value > 999 (e.g., 1000) | Input is rejected or clamped to 999. Only values 0-999 are accepted. | F-003 | INPUT-02 | |
| GRID-T07 | Type a non-numeric value (e.g., "abc") | Input is rejected. Cell reverts to previous value or shows validation error. | F-003 | INPUT-02 | |
| GRID-T08 | Observe the SUMMA row at the bottom/top of the grid | A row labeled "SUMMA" (or equivalent) shows the sum of all project hours for each month column. | F-005 | INPUT-03 | |
| GRID-T09 | Change a cell value from 80 to 120 | SUMMA row updates in real time (without page reload) to reflect the new sum for that month. | F-005 | INPUT-03 | |
| GRID-T10 | Observe the Target row | A row labeled "Target" shows the person's monthly capacity target (default 160h, or custom value if set). The value is consistent across all month columns. | F-005, A1 | INPUT-04 | |
| GRID-T11 | Change the person's target capacity to 80h (via person edit) and return to grid | Target row shows 80h for all months. | A1 | INPUT-04 | |
| GRID-T12 | Observe the Status row when SUMMA < 90% of Target | Status indicator for that month is GREEN. | F-005 | INPUT-05 | |
| GRID-T13 | Set allocations so SUMMA is between 90%-100% of Target | Status indicator for that month is AMBER. | F-005 | INPUT-05 | |
| GRID-T14 | Set allocations so SUMMA > 100% of Target | Status indicator for that month is RED. | F-005 | INPUT-05 | |
| GRID-T15 | Verify a month with zero allocations | Status indicator for that month is GRAY. | F-005 | INPUT-05 | |
| GRID-T16 | Look for the "Add project..." row at the bottom of the grid | An empty row or button labeled "Add project..." is visible below the last project row. | A5 | INPUT-08 | |
| GRID-T17 | Click "Add project..." and select a project from the dropdown | A new project row is added to the grid. The row is editable. The selected project appears in the project name column. | A5 | INPUT-08 | |
| GRID-T18 | Verify that archived projects do NOT appear in the "Add project" dropdown | Only active projects are listed. The archived project from PROJ-T07 is absent. | A5 | INPUT-08 | |
| GRID-T19 | Click on a cell in a past month (before current month) | Cell does NOT enter edit mode. It is visually distinct (dimmed/grayed). | A4 | INPUT-12 | |
| GRID-T20 | Click on a cell in the current month | Cell enters edit mode normally. Current month is editable. | A4 | INPUT-12 | |
| GRID-T21 | Edit a cell, then quickly edit another cell before the first save completes | Both values save correctly. The auto-save uses debounced batch upsert — multiple changes are batched. | F-020 | INPUT-13 | |
| GRID-T22 | Verify save latency: edit a cell and time the save | Value should save within 500ms of blur. Check network tab for the batch upsert request. | F-020 | INPUT-02 | |

---

## 7. Person Input Form — Grid Polish & Navigation

**Preconditions:**
- Logged in as Planner/Line Manager or above
- At least 5 people exist across 2+ departments with varying allocation levels
- Person Input Form is open for a person with at least 2 project rows

### 7.1 Person Sidebar

| ID | What to Test | Expected Result | Arch Ref | Req ID | Verdict |
|----|-------------|-----------------|----------|--------|---------|
| NAV-T01 | Observe the person sidebar on the Input page | A sidebar lists all people, grouped by department. Each person entry shows their name and a colored status dot. | F-004 | INPUT-06 | |
| NAV-T02 | Verify status dot colors in the sidebar | Dots match the person's overall allocation status: green (healthy), amber (warning), red (overloaded), gray (no allocations). | F-004 | INPUT-06 | |
| NAV-T03 | Click on a different person in the sidebar | The grid reloads with the selected person's allocation data. The URL updates to include the new person ID. | F-004 | INPUT-06 | |
| NAV-T04 | Verify department grouping in the sidebar | People are grouped under department headers (e.g., "Electronics", "Software"). People within each group are listed alphabetically or by a consistent order. | F-004 | INPUT-06 | |

### 7.2 Prev/Next Navigation

| ID | What to Test | Expected Result | Arch Ref | Req ID | Verdict |
|----|-------------|-----------------|----------|--------|---------|
| NAV-T05 | Click the "Next" arrow/button while viewing a person | Grid loads the next person in the list. Person name/header updates. | F-004 | INPUT-07 | |
| NAV-T06 | Click the "Previous" arrow/button | Grid loads the previous person in the list. | F-004 | INPUT-07 | |
| NAV-T07 | On the first person in the list, click "Previous" | Button is disabled, or wraps to the last person. No error occurs. | F-004 | INPUT-07 | |
| NAV-T08 | On the last person in the list, click "Next" | Button is disabled, or wraps to the first person. No error occurs. | F-004 | INPUT-07 | |

### 7.3 Keyboard Navigation

| ID | What to Test | Expected Result | Arch Ref | Req ID | Verdict |
|----|-------------|-----------------|----------|--------|---------|
| KB-T01 | Click a cell, then press Tab | Focus moves to the next cell to the right (next month). If at the end of the row, focus moves to the first editable cell of the next row. | F-021 | INPUT-10 | |
| KB-T02 | Press Enter while a cell is focused | Cell enters edit mode (or commits current value and moves down, depending on AG Grid config). | F-021 | INPUT-10 | |
| KB-T03 | Press Arrow Up/Down while a cell is focused | Focus moves to the cell above/below in the same column. | F-021 | INPUT-10 | |
| KB-T04 | Press Arrow Left/Right while a cell is focused (not in edit mode) | Focus moves to the adjacent cell in that direction. | F-021 | INPUT-10 | |
| KB-T05 | Press Escape while editing a cell | Edit mode is cancelled. Cell reverts to its previous value. | F-021 | INPUT-10 | |
| KB-T06 | Navigate through multiple cells using only Tab/Enter/Arrow keys (no mouse) | The entire grid is navigable without touching the mouse. No cell is skipped. Read-only cells (past months) are either skipped or clearly non-editable. | F-021 | INPUT-10 | |

### 7.4 Clipboard Paste

| ID | What to Test | Expected Result | Arch Ref | Req ID | Verdict |
|----|-------------|-----------------|----------|--------|---------|
| CLIP-T01 | Copy a single number from Excel, click a grid cell, press Ctrl+V | The value from Excel is pasted into the cell. | F-021 | INPUT-11 | |
| CLIP-T02 | Copy a block of numbers (e.g., 3x4 range) from Excel, select a cell in the grid, press Ctrl+V | All values are pasted into the corresponding cells starting from the selected cell. Values fill rightward (months) and downward (projects). | F-021 | INPUT-11 | |
| CLIP-T03 | Paste a block that would extend beyond the grid boundaries | Paste fills only valid cells. Values that would overflow are ignored. No errors. | F-021 | INPUT-11 | |
| CLIP-T04 | Paste non-numeric values from Excel | Non-numeric values are rejected or ignored. Numeric values in the same paste are applied correctly. | F-021 | INPUT-11 | |
| CLIP-T05 | Paste into cells that include past-month (read-only) columns | Read-only cells are not modified. Only editable cells receive pasted values. | F-021, A4 | INPUT-11, INPUT-12 | |

### 7.5 Drag-to-Fill

| ID | What to Test | Expected Result | Arch Ref | Req ID | Verdict |
|----|-------------|-----------------|----------|--------|---------|
| DRAG-T01 | Click a cell with a value (e.g., 120). Locate the fill handle (small square at the cell corner). | A fill handle is visible at the bottom-right corner of the selected cell. | F-021 | INPUT-09 | |
| DRAG-T02 | Mousedown on the fill handle and drag right across 3 months | The value (120) is replicated into the 3 cells to the right. A visual highlight shows the fill range during the drag. | F-021 | INPUT-09 | |
| DRAG-T03 | Drag-to-fill across a range that includes a past-month column | Past-month (read-only) cells are skipped. Only editable cells receive the fill value. | F-021, A4 | INPUT-09, INPUT-12 | |
| DRAG-T04 | After drag-to-fill, verify that all filled cells auto-save | Refresh the page. All filled values persist. | F-021, F-020 | INPUT-09, INPUT-13 | |

### 7.6 Conflict Detection

| ID | What to Test | Expected Result | Arch Ref | Req ID | Verdict |
|----|-------------|-----------------|----------|--------|---------|
| CONF-T01 | Open the same person's grid in two browser tabs (same user or different users). In Tab A, change a cell from 80 to 100. In Tab B, change the same cell from 80 to 120. | Tab B receives a conflict warning before or after save, indicating that the cell was modified by another session. | F-020 | INPUT-14 | |
| CONF-T02 | When the conflict dialog appears, choose "Overwrite" | Tab B's value (120) is saved. The conflict is resolved. | F-020 | INPUT-14 | |
| CONF-T03 | When the conflict dialog appears, choose "Refresh" (or equivalent) | Tab B reloads the server value (100 from Tab A). The user's pending change is discarded. | F-020 | INPUT-14 | |
| CONF-T04 | Edit cells that have NOT been modified by another session | No conflict warning appears. Save proceeds normally. | F-020 | INPUT-14 | |

---

## 8. Data Page — Import Wizard

**Preconditions:**
- Logged in as Admin or Org Owner
- At least 5 people and 5 projects exist in the system
- Test files prepared:
  - `swedish-flat.xlsx` — flat format with Swedish headers (Namn, Projekt, Timmar, Manad, Avdelning)
  - `english-flat.csv` — flat format with English headers (Name, Project, Hours, Month, Department)
  - `pivot-format.xlsx` — pivot/grid format with person names as rows, months as columns
  - `bad-data.xlsx` — contains typos in person names, missing required fields, invalid values
  - `merged-cells.xls` — contains merged cells, hidden rows, formula cells
  - `swedish-encoding.xls` — .xls file with Swedish characters (aa, ae, oe)
  - `large-file.xlsx` — 1000+ rows

### 8.1 Upload Step

| ID | What to Test | Expected Result | Arch Ref | Req ID | Verdict |
|----|-------------|-----------------|----------|--------|---------|
| IMP-T01 | Navigate to Data > Import (or equivalent path to the import wizard) | The 4-step wizard is displayed. Step 1 (Upload) is active. Steps are labeled: Upload, Map, Validate, Import. | F-006 | IMPEX-01 | |
| IMP-T02 | Upload `swedish-flat.xlsx` via drag-and-drop or file picker | File is accepted. A loading indicator appears while the file is processed. Wizard advances to Step 2 (Map) or shows parsed preview. | F-006 | IMPEX-02, IMPEX-08 | |
| IMP-T03 | Upload `english-flat.csv` | CSV file is accepted and parsed correctly. | F-006 | IMPEX-02 | |
| IMP-T04 | Upload a `.xls` file | Legacy Excel format is accepted and parsed. | F-006 | IMPEX-02 | |
| IMP-T05 | Attempt to upload an unsupported file type (e.g., .pdf, .docx) | Upload is rejected with a clear error message listing accepted formats (.xlsx, .xls, .csv). | F-006 | IMPEX-02 | |
| IMP-T06 | Download the import template (link or button on the upload step) | A template file downloads (.xlsx or .csv) containing correct headers and example data rows. | F-019 | IMPEX-13 | |
| IMP-T07 | Fill in the downloaded template in Excel, then upload it | Template imports without mapping errors. All columns auto-map correctly. | F-019 | IMPEX-13 | |

### 8.2 Column Mapping Step

| ID | What to Test | Expected Result | Arch Ref | Req ID | Verdict |
|----|-------------|-----------------|----------|--------|---------|
| IMP-T08 | After uploading `swedish-flat.xlsx`, observe the mapping step | Swedish headers (Namn, Projekt, Timmar, Manad, Avdelning) are automatically mapped to the correct system fields (Name, Project, Hours, Month, Department). | F-007 | IMPEX-03 | |
| IMP-T09 | After uploading `english-flat.csv`, observe the mapping step | English headers are automatically mapped. | F-007 | IMPEX-03 | |
| IMP-T10 | Upload a file with non-standard headers (e.g., "Medarbetare" instead of "Namn") | The system attempts a best-guess mapping. Unmapped columns are highlighted for manual assignment. User can adjust mappings via dropdowns. | F-007 | IMPEX-03 | |
| IMP-T11 | Upload `pivot-format.xlsx` (months as columns, people as rows) | The system detects pivot/grid format and offers to unpivot automatically. After unpivoting, the data is converted to flat format (one row per person/project/month). | F-026 | IMPEX-06 | |
| IMP-T12 | Manually change a column mapping and proceed | The changed mapping is respected in the validation step. | F-007 | IMPEX-03 | |

### 8.3 Validation Step

| ID | What to Test | Expected Result | Arch Ref | Req ID | Verdict |
|----|-------------|-----------------|----------|--------|---------|
| IMP-T13 | Proceed to Validate with `swedish-flat.xlsx` (all data correct) | Validation results show a count: e.g., "820 rows ready, 0 warnings, 0 errors". | F-008 | IMPEX-04 | |
| IMP-T14 | Upload `bad-data.xlsx` with a typo in a person name (e.g., "Johan Nilson" instead of "Johan Nilsson") | Validation shows a warning with a fuzzy match suggestion: 'Did you mean "Johan Nilsson"?' User can accept the suggestion. | F-008 | IMPEX-05 | |
| IMP-T15 | Accept a fuzzy match suggestion | The row is corrected to use the suggested name. Warning count decreases. | F-008 | IMPEX-05 | |
| IMP-T16 | Upload a file with missing required fields (e.g., no hours value) | Validation shows errors with actionable messages (e.g., "Row 15: Missing hours value"). Error rows are clearly marked. | F-008 | IMPEX-04 | |
| IMP-T17 | Upload a file with invalid values (e.g., hours = "abc") | Validation shows errors for the invalid rows. Suggestions explain the expected format. | F-008 | IMPEX-04 | |
| IMP-T18 | Verify ready/warning/error counts are accurate | Manually count the issues in the test file. The displayed counts match. | F-008 | IMPEX-04 | |

### 8.4 Import Execution Step

| ID | What to Test | Expected Result | Arch Ref | Req ID | Verdict |
|----|-------------|-----------------|----------|--------|---------|
| IMP-T19 | Click "Import" with all rows ready (no errors) | Import executes. A success message shows the count of imported rows. Data appears in the flat table view and on the Person Input Form. | F-006 | IMPEX-01, IMPEX-07 | |
| IMP-T20 | Simulate a failure mid-import (e.g., disconnect network during import of a large file, or use a file that triggers a server error) | Import rolls back completely. No partial data appears in the system. An error message is shown. | F-006 | IMPEX-07 | |
| IMP-T21 | Import a file then navigate to the Person Input Form for a person mentioned in the file | The imported allocation hours appear in the correct cells for the correct months. | F-006 | IMPEX-01 | |

### 8.5 Edge Cases — Encoding and Format

| ID | What to Test | Expected Result | Arch Ref | Req ID | Verdict |
|----|-------------|-----------------|----------|--------|---------|
| IMP-T22 | Upload `swedish-encoding.xls` containing aa, ae, oe characters | Characters are preserved correctly. Person names like "Goeren Aakesson" display with proper Swedish characters. No mojibake. | - | IMPEX-09 | |
| IMP-T23 | Upload `merged-cells.xls` containing merged cells | Merged cells are handled gracefully: either unmerged with values distributed, or flagged with a warning. No crash. | - | IMPEX-10 | |
| IMP-T24 | Upload a file with hidden rows | Hidden rows are either included in the import (with a note) or skipped (with a warning). No silent data loss. | - | IMPEX-10 | |
| IMP-T25 | Upload a file with formula cells (e.g., =A1+B1) | Formula results (computed values) are imported. The formula itself is not stored. | - | IMPEX-10 | |
| IMP-T26 | Verify that file processing happens server-side | Open browser DevTools network tab during upload. The file is uploaded to the server endpoint. No SheetJS processing visible in the browser console. | ADR-007 | IMPEX-08 | |

---

## 9. Data Page — Flat Table View & Export

**Preconditions:**
- Logged in as any role
- Organization has imported or manually entered allocation data for multiple people, projects, and months

| ID | What to Test | Expected Result | Arch Ref | Req ID | Verdict |
|----|-------------|-----------------|----------|--------|---------|
| FLAT-T01 | Navigate to the Data page (flat table view) | A table displays all allocation data in flat format: one row per person/project/month with columns for person name, project name, department, month, hours, etc. | F-009 | IMPEX-11 | |
| FLAT-T02 | Verify pagination | If data exceeds one page, pagination controls appear (page numbers or next/prev). Clicking through pages shows different data. | F-009 | IMPEX-11 | |
| FLAT-T03 | Click a column header to sort | Data sorts ascending by that column. Click again to sort descending. A sort indicator arrow appears on the column header. | F-009 | IMPEX-11 | |
| FLAT-T04 | Sort by person name ascending | Rows are alphabetically ordered by person name (A-Z). | F-009 | IMPEX-11 | |
| FLAT-T05 | Filter by person name (type a name in a filter input) | Only rows matching the filter are displayed. Pagination updates to reflect the filtered count. | F-009 | IMPEX-11 | |
| FLAT-T06 | Filter by project | Only allocations for the selected project are shown. | F-009 | IMPEX-11 | |
| FLAT-T07 | Filter by department | Only people in the selected department are shown. | F-009 | IMPEX-11 | |
| FLAT-T08 | Filter by date range (e.g., March 2026 to June 2026) | Only allocations within the date range are shown. | F-009 | IMPEX-11 | |
| FLAT-T09 | Apply multiple filters simultaneously (e.g., department + date range) | Filters combine. Only rows matching ALL active filters are shown. | F-009 | IMPEX-11 | |
| FLAT-T10 | Click "Export" (Excel) with no filters applied | An .xlsx file downloads containing ALL allocation data. Column headers are present. Data matches what is displayed in the table. | F-009 | IMPEX-12 | |
| FLAT-T11 | Apply a filter (e.g., department = "Electronics"), then click "Export" (Excel) | The exported file contains ONLY the filtered data. Verify row count matches the displayed filtered count. | F-009 | IMPEX-12 | |
| FLAT-T12 | Click "Export" (CSV) | A .csv file downloads with the same data. File opens correctly in Excel with proper encoding. | F-009 | IMPEX-12 | |
| FLAT-T13 | As a Viewer, access the flat table and export data | Viewer can see all data and export. Read-only access works fully. | Section 2.2 | IMPEX-11, IMPEX-12, AUTH-08 | |

---

## 10. Platform Admin

**Preconditions:**
- Platform admin account exists (created by seed script: PLAT-11)
- At least 2 tenant organizations exist with users and data
- Platform admin URL: `/platform` (separate from tenant app)
- Clerk tenant authentication is active for regular users

### 10.1 Platform Auth

| ID | What to Test | Expected Result | Arch Ref | Req ID | Verdict |
|----|-------------|-----------------|----------|--------|---------|
| PLAT-T01 | Navigate to `/platform` (or `/platform/login`) | A login form appears that is NOT the Clerk sign-in page. It is a custom email/password form. | F-029 | PLAT-01 | |
| PLAT-T02 | Log in with the seeded platform admin credentials | Login succeeds. A JWT is issued (check cookies or local storage). User lands on the platform admin dashboard. | F-029 | PLAT-01, PLAT-11 | |
| PLAT-T03 | Attempt to access `/platform` routes with a Clerk tenant session (no platform JWT) | Access is denied. Platform routes are not accessible to regular Clerk-authenticated users. | F-029 | PLAT-10 | |
| PLAT-T04 | Attempt to access `/api/*` tenant routes with a platform admin JWT (no Clerk session) | Access is denied. Tenant API routes reject platform tokens. | F-029 | PLAT-10 | |
| PLAT-T05 | Verify the platform admin JWT is separate from Clerk tokens | Inspect the token: it is issued by the platform system (from `platform_admins` table), not by Clerk. Different secret key. | F-029 | PLAT-01, PLAT-10 | |

### 10.2 Dashboard

| ID | What to Test | Expected Result | Arch Ref | Req ID | Verdict |
|----|-------------|-----------------|----------|--------|---------|
| PLAT-T06 | View the platform admin dashboard | Dashboard shows a list/summary of ALL organizations with health metrics: user count, data size, subscription status, last activity. | F-029 | PLAT-02 | |
| PLAT-T07 | Verify org count matches the actual number of tenants in the database | Count on dashboard equals the number of organizations in the `organizations` table. | F-029 | PLAT-02 | |

### 10.3 Tenant Management

| ID | What to Test | Expected Result | Arch Ref | Req ID | Verdict |
|----|-------------|-----------------|----------|--------|---------|
| PLAT-T08 | Create a new organization from the platform admin panel | A create form accepts org name. After creation, the new org appears in the dashboard list. | F-031 | PLAT-06 | |
| PLAT-T09 | Suspend an active organization | Organization status changes to "suspended". Users of that org can no longer access the app (or see a suspension notice). | F-031 | PLAT-06 | |
| PLAT-T10 | Reactivate a suspended organization | Organization status returns to "active". Users can access the app again. | F-031 | PLAT-06 | |
| PLAT-T11 | Delete an organization | Organization is removed (or marked deleted). Its data is no longer accessible. Confirmation dialog warns about data loss. | F-031 | PLAT-06 | |
| PLAT-T12 | Verify each management action is logged | Check the audit log after each action (create, suspend, reactivate, delete). An entry exists with the platform admin's identity, action type, timestamp, and target org. | F-036 | PLAT-06, PLAT-08 | |

### 10.4 Subscription Management

| ID | What to Test | Expected Result | Arch Ref | Req ID | Verdict |
|----|-------------|-----------------|----------|--------|---------|
| PLAT-T13 | View subscription status for an organization | Subscription details are visible: plan type, status (active/trial/expired), trial end date. | F-032 | PLAT-07 | |
| PLAT-T14 | Extend a trial for an organization | Trial end date is pushed forward. The org continues to have full access. | F-032 | PLAT-07 | |
| PLAT-T15 | Override subscription status (e.g., set to "active" bypassing payment) | Status changes immediately. The org has full access regardless of payment state. | F-032 | PLAT-07 | |
| PLAT-T16 | Verify subscription changes are logged in audit log | Audit log entry exists with old status, new status, admin identity, and timestamp. | F-036 | PLAT-07, PLAT-08 | |

### 10.5 Impersonation

| ID | What to Test | Expected Result | Arch Ref | Req ID | Verdict |
|----|-------------|-----------------|----------|--------|---------|
| PLAT-T17 | Select an organization, then click "Impersonate" on a user within that org | A new session starts. The platform admin sees the tenant app as that user would. A visible banner appears: "Impersonating [user name] in [org name]". | F-030 | PLAT-03 | |
| PLAT-T18 | While impersonating, navigate through the tenant app (Input, Team, Data) | All pages load with the impersonated user's permissions and org data. Data is real tenant data. | F-030 | PLAT-03 | |
| PLAT-T19 | End the impersonation session | The banner disappears. The platform admin returns to the platform admin panel. | F-030 | PLAT-03 | |
| PLAT-T20 | Verify the impersonation start event is logged | Audit log contains an entry: who (platform admin), what (impersonation start), which user/org, when (timestamp), and IP address. | F-030, F-036 | PLAT-04, PLAT-08 | |
| PLAT-T21 | Verify the impersonation end event is logged | Audit log contains an entry for impersonation end with the same details. | F-030, F-036 | PLAT-04, PLAT-08 | |
| PLAT-T22 | Verify actions during impersonation are logged | Any data changes made while impersonating are attributed to the platform admin (not the impersonated user) in the audit log. | F-030, F-036 | PLAT-04, PLAT-08 | |
| PLAT-T23 | Start an impersonation session and wait for 1 hour (or fast-forward the clock) | The impersonation session expires automatically. The banner shows an expiry notice, and the admin is returned to the platform panel. | F-030 | PLAT-05 | |
| PLAT-T24 | Attempt to impersonate while the previous session is still active | Either the previous session is ended first, or a clear error is shown. No overlapping impersonation sessions. | F-030 | PLAT-03 | |

### 10.6 Audit Log

| ID | What to Test | Expected Result | Arch Ref | Req ID | Verdict |
|----|-------------|-----------------|----------|--------|---------|
| PLAT-T25 | Navigate to the Audit Log page in the platform admin | A chronological log of all platform admin actions is displayed. Each entry shows: who (admin name/email), what (action description), when (timestamp), and IP address. | F-036 | PLAT-08 | |
| PLAT-T26 | Perform several actions (create org, suspend org, impersonate, manage subscription) and check the log | All actions appear in the audit log in chronological order. No action is missing. | F-036 | PLAT-08 | |
| PLAT-T27 | Verify audit log entries cannot be edited or deleted by the platform admin | No edit/delete controls exist on audit log entries. The log is append-only. | F-036 | PLAT-08 | |
| PLAT-T28 | Filter or search the audit log (by action type, date range, admin) | Filtering works. Results match the filter criteria. | F-036 | PLAT-08 | |

### 10.7 Cross-Tenant User Management

| ID | What to Test | Expected Result | Arch Ref | Req ID | Verdict |
|----|-------------|-----------------|----------|--------|---------|
| PLAT-T29 | Navigate to Users page in platform admin | A list of users across all tenants is displayed (or searchable). Each user shows: name, email, organization, role, status. | F-037 | PLAT-09 | |
| PLAT-T30 | Trigger a password reset for a user | Password reset is initiated via Clerk SDK. The user receives a reset email. | F-037 | PLAT-09 | |
| PLAT-T31 | Force logout a user | The user's active sessions are terminated via Clerk SDK. If the user refreshes, they are redirected to the sign-in page. | F-037 | PLAT-09 | |
| PLAT-T32 | Verify user management actions are logged | Audit log entries exist for password reset and force logout actions with admin identity and target user. | F-036, F-037 | PLAT-09, PLAT-08 | |

---

## Cross-Cutting: Tenant Isolation

**Preconditions:**
- Two separate organizations exist (Org A and Org B) with different people, projects, and allocations
- Test user has accounts in both orgs (or use two separate user accounts)

| ID | What to Test | Expected Result | Arch Ref | Req ID | Verdict |
|----|-------------|-----------------|----------|--------|---------|
| ISO-T01 | Log in as a user in Org A. View people list. | Only Org A's people are visible. | F-001 | FOUND-01, FOUND-02 | |
| ISO-T02 | Log in as a user in Org B. View people list. | Only Org B's people are visible. None of Org A's data appears. | F-001 | FOUND-01, FOUND-02 | |
| ISO-T03 | As Org A user, attempt to access Org B's data via direct API call (e.g., `GET /api/people?orgId=<orgB-id>`) | Request returns only Org A's data (or 403). The `organization_id` parameter is ignored — the server uses the authenticated user's org. | F-001 | FOUND-01, FOUND-02 | |
| ISO-T04 | Verify no Org B allocation data leaks into Org A's Person Input Form | Navigate through several people in Org A. No projects or allocations from Org B appear. | F-001 | FOUND-01, FOUND-02 | |
| ISO-T05 | Import data in Org A. Verify it does not appear in Org B. | After import in Org A, log into Org B and check flat table view. Imported data is absent. | F-001 | FOUND-01, FOUND-02 | |

---

## Cross-Cutting: Error Handling

| ID | What to Test | Expected Result | Arch Ref | Req ID | Verdict |
|----|-------------|-----------------|----------|--------|---------|
| ERR-T01 | Trigger a 404 by navigating to a non-existent route (e.g., `/app/nonexistent`) | A user-friendly 404 page is shown. No raw error stack. | Section 11.1 | FOUND-06 | |
| ERR-T02 | Trigger a validation error (e.g., submit empty required field via API) | API returns a structured error response with field-level messages. HTTP status 400. | Section 11.1 | FOUND-06 | |
| ERR-T03 | Trigger a forbidden error (Viewer calling admin endpoint) | API returns 403 with a descriptive error message. | Section 11.1 | FOUND-06 | |
| ERR-T04 | Trigger a conflict error (e.g., editing a deleted resource) | API returns 409 with conflict details. | Section 11.1 | FOUND-06 | |

---

## Test Summary Matrix

| Area | Test Count | Requirement IDs Covered |
|------|-----------|------------------------|
| Auth & Sign-up | 13 | AUTH-01 through AUTH-08, FOUND-01, FOUND-06 |
| App Shell | 7 | FOUND-07, FOUND-08, AUTH-05 |
| Person CRUD | 10 | MGMT-01, AUTH-08, FOUND-06 |
| Project CRUD | 9 | MGMT-02, AUTH-08, FOUND-06 |
| Reference Data (Disc/Dept/Prog) | 19 | MGMT-03, MGMT-04, MGMT-05, AUTH-08 |
| Person Input Form — Core Grid | 22 | INPUT-01 through INPUT-05, INPUT-08, INPUT-12, INPUT-13 |
| Grid Polish — Sidebar & Nav | 8 | INPUT-06, INPUT-07 |
| Grid Polish — Keyboard | 6 | INPUT-10 |
| Grid Polish — Clipboard | 5 | INPUT-11, INPUT-12 |
| Grid Polish — Drag-to-fill | 4 | INPUT-09, INPUT-12, INPUT-13 |
| Grid Polish — Conflict Detection | 4 | INPUT-14 |
| Import Wizard | 26 | IMPEX-01 through IMPEX-10, IMPEX-13 |
| Flat Table & Export | 13 | IMPEX-11, IMPEX-12, AUTH-08 |
| Platform Admin | 32 | PLAT-01 through PLAT-11 |
| Tenant Isolation | 5 | FOUND-01, FOUND-02 |
| Error Handling | 4 | FOUND-06 |
| **Total** | **187** | **All 60 v1 requirements** |

---

## Requirements Traceability

Every v1 requirement is covered by at least one test case:

| Req ID | Test Case(s) |
|--------|-------------|
| FOUND-01 | ISO-T01 through ISO-T05, AUTH-T13 |
| FOUND-02 | ISO-T01 through ISO-T05, AUTH-T13 |
| FOUND-03 | (Infrastructure — not directly testable in browser, verified by app running) |
| FOUND-04 | (Infrastructure — verified indirectly by all CRUD tests) |
| FOUND-05 | (Infrastructure — verified by seed data presence in AUTH-T04) |
| FOUND-06 | ERR-T01 through ERR-T04, PERSON-T09, PROJ-T08 |
| FOUND-07 | SHELL-T06 |
| FOUND-08 | SHELL-T01 through SHELL-T05 |
| FOUND-09 | (Infrastructure — verified by app startup, not browser-testable) |
| AUTH-01 | AUTH-T02 |
| AUTH-02 | AUTH-T05, AUTH-T06 |
| AUTH-03 | AUTH-T03 |
| AUTH-04 | AUTH-T04 |
| AUTH-05 | AUTH-T01, SHELL-T07 |
| AUTH-06 | AUTH-T10, AUTH-T12, AUTH-T13 |
| AUTH-07 | AUTH-T07, AUTH-T08 |
| AUTH-08 | AUTH-T09, AUTH-T10, AUTH-T11, PERSON-T10, PROJ-T09, DISC-T07, FLAT-T13 |
| INPUT-01 | GRID-T01, GRID-T02 |
| INPUT-02 | GRID-T03, GRID-T04, GRID-T06, GRID-T07, GRID-T22 |
| INPUT-03 | GRID-T08, GRID-T09 |
| INPUT-04 | GRID-T10, GRID-T11 |
| INPUT-05 | GRID-T12, GRID-T13, GRID-T14, GRID-T15 |
| INPUT-06 | NAV-T01, NAV-T02, NAV-T03, NAV-T04 |
| INPUT-07 | NAV-T05, NAV-T06, NAV-T07, NAV-T08 |
| INPUT-08 | GRID-T16, GRID-T17, GRID-T18 |
| INPUT-09 | DRAG-T01, DRAG-T02, DRAG-T03, DRAG-T04 |
| INPUT-10 | KB-T01 through KB-T06 |
| INPUT-11 | CLIP-T01 through CLIP-T05 |
| INPUT-12 | GRID-T19, GRID-T20, CLIP-T05, DRAG-T03 |
| INPUT-13 | GRID-T04, GRID-T05, GRID-T21, GRID-T22, DRAG-T04 |
| INPUT-14 | CONF-T01 through CONF-T04 |
| MGMT-01 | PERSON-T01 through PERSON-T10 |
| MGMT-02 | PROJ-T01 through PROJ-T09 |
| MGMT-03 | DISC-T01 through DISC-T07 |
| MGMT-04 | DEPT-T01 through DEPT-T06 |
| MGMT-05 | PROG-T01 through PROG-T06 |
| IMPEX-01 | IMP-T01, IMP-T19, IMP-T21 |
| IMPEX-02 | IMP-T02, IMP-T03, IMP-T04, IMP-T05 |
| IMPEX-03 | IMP-T08, IMP-T09, IMP-T10, IMP-T12 |
| IMPEX-04 | IMP-T13, IMP-T16, IMP-T17, IMP-T18 |
| IMPEX-05 | IMP-T14, IMP-T15 |
| IMPEX-06 | IMP-T11 |
| IMPEX-07 | IMP-T19, IMP-T20 |
| IMPEX-08 | IMP-T26 |
| IMPEX-09 | IMP-T22 |
| IMPEX-10 | IMP-T23, IMP-T24, IMP-T25 |
| IMPEX-11 | FLAT-T01 through FLAT-T09 |
| IMPEX-12 | FLAT-T10, FLAT-T11, FLAT-T12 |
| IMPEX-13 | IMP-T06, IMP-T07 |
| PLAT-01 | PLAT-T01, PLAT-T02, PLAT-T05 |
| PLAT-02 | PLAT-T06, PLAT-T07 |
| PLAT-03 | PLAT-T17, PLAT-T18, PLAT-T19, PLAT-T24 |
| PLAT-04 | PLAT-T20, PLAT-T21, PLAT-T22 |
| PLAT-05 | PLAT-T23 |
| PLAT-06 | PLAT-T08, PLAT-T09, PLAT-T10, PLAT-T11, PLAT-T12 |
| PLAT-07 | PLAT-T13, PLAT-T14, PLAT-T15, PLAT-T16 |
| PLAT-08 | PLAT-T12, PLAT-T16, PLAT-T20, PLAT-T21, PLAT-T22, PLAT-T25 through PLAT-T28, PLAT-T32 |
| PLAT-09 | PLAT-T29, PLAT-T30, PLAT-T31, PLAT-T32 |
| PLAT-10 | PLAT-T03, PLAT-T04, PLAT-T05 |
| PLAT-11 | PLAT-T02 (seed account used to log in) |

---

_187 test cases covering all 60 v1.0 requirements across 10 functional areas. No v2.0 features included._
