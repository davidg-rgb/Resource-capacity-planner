# Phase 8: Import Wizard - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 08-import-wizard
**Areas discussed:** Wizard UX flow, Column mapping UI, Validation & error display, File format handling

---

## Wizard UX Flow

### Step navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal stepper bar | Numbered steps across the top with back/next buttons. Steps lock until reached. | ✓ |
| Vertical sidebar steps | Steps listed vertically on the left, content on the right. | |
| Single-page accordion | All 4 sections on one page, collapsing/expanding. | |

**User's choice:** Horizontal stepper bar
**Notes:** None

### Import completion UX

| Option | Description | Selected |
|--------|-------------|----------|
| Progress bar + summary | Show progress indicator, then results summary. Stay on page with Done button. | ✓ |
| Immediate redirect | Import runs, redirect to grid/data view with toast. | |
| Background import | Queue import, redirect immediately, notify via toast when done. | |

**User's choice:** Progress bar + summary
**Notes:** None

### Back navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Full back navigation | Back button on every step. Returning preserves all choices. Re-advancing re-validates. | ✓ |
| Back with reset warning | Going back warns that changes after that step will be lost. | |

**User's choice:** Full back navigation
**Notes:** None

### Wizard location

| Option | Description | Selected |
|--------|-------------|----------|
| /data/import route | Dedicated page under Data section. Button on /data page. | ✓ |
| Modal/overlay | Full-screen modal over the current page. | |
| You decide | Claude picks based on existing patterns. | |

**User's choice:** /data/import route
**Notes:** None

---

## Column Mapping UI

### Mapping presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown table | Table with Source Column, Maps To dropdown, Sample Data. Auto-detected pre-filled. | ✓ |
| Drag-and-drop | Source columns left, target fields right. Drag to connect. | |
| You decide | Claude picks best approach. | |

**User's choice:** Dropdown table
**Notes:** None

### Unmapped columns

| Option | Description | Selected |
|--------|-------------|----------|
| Show as 'ignored' with option to map | Grayed out with "Ignored" label, dropdown still available. | ✓ |
| Hide unmapped columns | Only show mappable columns. | |
| Warning banner | Top banner listing unmapped columns. | |

**User's choice:** Show as 'ignored' with option to map
**Notes:** None

### Target fields

| Option | Description | Selected |
|--------|-------------|----------|
| Core allocation fields | Person name, Project name, Month, Hours (required). Optional: Department, Discipline. | ✓ |
| Extended fields | Core plus Target capacity, Project program, Person email. | |

**User's choice:** Core allocation fields
**Notes:** None

### Swedish detection feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Inline label per column | "Namn → Person name (Swedish detected)" next to each auto-mapped column. | ✓ |
| Banner at top | One-time "Swedish headers detected" notification. | |
| You decide | Claude picks best communication approach. | |

**User's choice:** Inline label per column
**Notes:** None

---

## Validation & Error Display

### Validation results display

| Option | Description | Selected |
|--------|-------------|----------|
| Summary + scrollable row table | Summary cards at top, table below with status icons, filter tabs. | ✓ |
| Grouped by issue type | Rows grouped by issue type. | |
| You decide | Claude picks. | |

**User's choice:** Summary + scrollable row table
**Notes:** None

### Fix flow

| Option | Description | Selected |
|--------|-------------|----------|
| Inline fixes for simple issues | Fuzzy name dropdown, editable hours. Structural issues require re-upload. | ✓ |
| Re-upload only | All fixes require editing source file. | |
| Full inline editing | Every cell editable inline. | |

**User's choice:** Inline fixes for simple issues
**Notes:** None

### Fuzzy name matching UX

| Option | Description | Selected |
|--------|-------------|----------|
| Inline dropdown on warning rows | Warning icon + "Did you mean: Johan Nilsson (93%)?" dropdown. | ✓ |
| Separate resolution step | Dedicated sub-step for name resolution. | |
| Auto-resolve high confidence | 95%+ matches auto-resolve, only show lower confidence. | |

**User's choice:** Inline dropdown on warning rows
**Notes:** None

### Warning blocking behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Errors block, warnings inform | Errors block import. Warnings are informational, import proceeds. | ✓ |
| Both block until resolved | Every warning and error must be resolved. | |
| Nothing blocks | Import always proceeds, errors skipped. | |

**User's choice:** Errors block, warnings inform
**Notes:** None

---

## File Format Handling

### Pivot detection UX

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-detect with confirmation | System detects format, shows before/after preview, user confirms. | ✓ |
| User selects format | User picks flat vs grid format manually. | |
| You decide | Claude picks. | |

**User's choice:** Auto-detect with confirmation
**Notes:** None

### Template download placement

| Option | Description | Selected |
|--------|-------------|----------|
| Upload step + Data page | Download on Upload step AND /data page. Two templates: flat and pivot. | ✓ |
| Upload step only | Template only in wizard. | |
| Separate templates page | Dedicated /data/templates route. | |

**User's choice:** Upload step + Data page
**Notes:** None

### File limits

| Option | Description | Selected |
|--------|-------------|----------|
| Reasonable server limits | Max 10MB, max 5,000 rows. Clear error if exceeded. | ✓ |
| No explicit limits | Rely on Vercel function timeout. | |
| You decide | Claude determines limits. | |

**User's choice:** Reasonable server limits
**Notes:** None

### Encoding handling

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-detect + fallback | SheetJS auto-detect, try Swedish codepages if garbled, manual override option. | ✓ |
| Always assume UTF-8 | Simple but may break legacy .xls files. | |
| You decide | Claude handles based on SheetJS capabilities. | |

**User's choice:** Auto-detect + fallback
**Notes:** None

---

## Claude's Discretion

- Stepper bar visual design
- Fuzzy matching algorithm and threshold
- Loading states and skeleton UIs
- Upload area styling
- Error/warning icon design
- Pivot preview rendering
- Template file content

## Deferred Ideas

None — discussion stayed within phase scope.
