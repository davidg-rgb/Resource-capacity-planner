# Phase 8 -- UI Review (Post-Fix Verification)

**Audited:** 2026-03-29
**Baseline:** creative-direction/03-bulk-import-validation.html, creative-direction/05-bulk-import-mapping.html
**Screenshots:** Not captured (no dev server running)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | All labels match spec; dynamic row counts, contextual CTA text |
| 2. Visuals | 3/4 | Missing "Save as Draft" button on mapping step; no toast overlay |
| 3. Color | 4/4 | All design token colors used correctly, warning amber matches spec |
| 4. Typography | 4/4 | font-headline/Manrope for headings, Inter for body, sizes match spec |
| 5. Spacing | 4/4 | Grid columns, padding, margins all match spec values |
| 6. Experience Design | 3/4 | readyCount ignores user fixes; missing Export Log and pagination hint |

**Overall: 22/24**

---

## Top 3 Priority Fixes

1. **readyCount in import-wizard.tsx uses original row status, not effective status after user fixes** -- Users who apply fuzzy-match suggestions will see a lower count on the Import step than expected. Fix: compute readyCount using the same `getEffectiveStatus()` logic from step-validate.tsx, applied to `validationResult.rows` with `userFixes`.

2. **Missing "Save as Draft" button on mapping step** -- Spec shows three action buttons (Back / Save as Draft / Continue). Code only has Back and Continue. Impact: users cannot save partial mappings and return later. Fix: add a secondary button between Back and Continue with `bg-surface-variant text-on-surface-variant hover:bg-surface-dim rounded-sm px-6 py-2.5 text-sm font-semibold` styling and wire it to a save handler.

3. **Missing "Export Log" button on validation step** -- Spec shows "Export Log" alongside the filter buttons in the Validation Log header. Code only has filter tabs. Impact: users cannot export validation issues for offline review. Fix: add an "Export Log" button after the filter tabs with `bg-surface-container-highest text-on-surface-variant hover:bg-surface-dim rounded-sm px-3 py-1 text-xs font-medium` styling.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

All copy matches the spec precisely:

- Mapping step: "Your Column (Source)", "Maps To (System)", "Data Preview" headers match spec
- Mapping footer: "We've automatically matched columns with similar names..." matches spec verbatim
- Validation cards: "Ready to Process", "Rows validated successfully", "Warnings", "Potential logical conflicts", "Critical Errors", "Blockers requiring action" all match
- Dynamic CTA: "Import {N} rows, skip errors" matches spec pattern "Import 820 rows, skip errors"
- Suggestion box: "Did you mean {name}?" with "Apply Fix" button matches spec
- Warning actions: "Ignore" / "Edit Row" match spec
- Back button labels: "Back to Upload" (mapping) and "Back to mapping" (validation) match spec
- "Cancel Import" label matches spec

Empty state handled: "No issues found -- all rows are ready to import." (step-validate.tsx line 307)

### Pillar 2: Visuals (3/4)

Matches:
- Summary bento grid with 3 cards, border-left-4 accent colors: PASS
- Card icons with opacity-50: PASS
- Mapping table with grid-cols-12 layout: PASS
- "Matched" badges with filled check_circle icon: PASS
- Validation log with divide-y entries: PASS
- Suggestion box with border-l-2 border-primary: PASS
- Stepper with circles, connecting lines, completed checkmarks: PASS

Gaps:
- **Missing "Save as Draft" button** on mapping step (spec line 549-553, not in code)
- **Missing contextual toast overlay** at bottom-right (spec lines 469-488, not implemented)
- Breadcrumbs component generates from URL path segments rather than spec's human-readable labels ("Data Management" vs "data management")

### Pillar 3: Color (4/4)

All design token colors used correctly throughout:
- Primary (#496173): buttons, active stepper, accent text
- Error (#9f403d): error badges, error card border
- Warning (#d1a03e): warning icons, warning card border (via inline style, matching spec)
- Surface tokens: bg-surface-container-lowest for cards, bg-surface-container-low for headers
- Secondary-container for "Matched" badges
- No hardcoded colors found outside of the spec-mandated #d1a03e warning amber and #fff3cd/#8a6a2a warning badge

### Pillar 4: Typography (4/4)

- `font-headline` (Manrope): page title, card headings, section headings -- matches spec
- Body text (Inter): all labels, descriptions, form elements -- matches spec
- Sizes match spec: text-4xl for card numbers, text-sm for body, text-xs for labels/badges
- `tabular-nums` used on numeric displays (row counts, card numbers) -- matches spec
- `tracking-wider uppercase` on category labels -- matches spec
- `text-[10px] font-bold tracking-widest uppercase` on stepper labels -- matches spec

### Pillar 5: Spacing (4/4)

- Mapping card: `px-6 py-4` rows, `px-6 py-3` header -- matches spec
- Summary cards: `p-6` padding -- matches spec
- Validation log entries: `p-6` with `gap-4` -- matches spec
- Action footer: `mt-12 py-6 border-t` -- matches spec
- Button padding: `px-6 py-2.5` (secondary), `px-8 py-2.5` (primary) -- matches spec
- Footer info bar: `p-4 gap-4` -- matches spec
- Overall page: `max-w-5xl` container -- matches spec's `max-w-5xl`

### Pillar 6: Experience Design (3/4)

State coverage:
- Loading state for validation: Loader2 spinner with "Validating rows..." text -- PASS
- Loading state for import: Loader2 spinner with "Importing allocations..." -- PASS
- Error state for import: XCircle icon, error message, rollback notice, "Back" + "Try Again" buttons -- PASS
- Success state for import: CheckCircle2, imported count, warnings list, "Done" button -- PASS
- Empty state for validation: "No issues found" message -- PASS
- File size error: AlertTriangle with size message -- PASS
- Upload error: AlertTriangle with error.message -- PASS

Functional gaps:
- **readyCount bug** (import-wizard.tsx line 203-206): Uses `r.status` (original) instead of computing effective status with user fixes. When a user applies a fuzzy-match fix in the validate step, the row's original `status` remains 'error', but the effective status becomes 'ready'. The Import step will show the wrong count.
- **Missing Export Log** functionality in validation step
- **Missing pagination/truncation indicator** for long validation logs (spec line 435-437 shows "+ 28 additional notifications")
- Back navigation properly preserves state per D-02 requirement (handleBack in import-wizard.tsx lines 171-196) -- PASS
- Disabled state on "Continue to Validation" when required mappings missing (step-map.tsx line 223) -- PASS

---

## Prop Contract Verification

| Component | Prop | Type | Passed By Wizard | Status |
|-----------|------|------|------------------|--------|
| StepUpload | onFileUploaded | (parsedFile, mappings) => void | handleFileUploaded | PASS |
| StepMap | headers | string[] | parsedFile.headers | PASS |
| StepMap | sampleRows | unknown[][] | parsedFile.sampleRows | PASS |
| StepMap | mappings | ColumnMapping[] | state.columnMappings | PASS |
| StepMap | onMappingsChange | (mappings) => void | handleMappingsChange | PASS |
| StepMap | onNext | () => void | handleMappingsConfirmed | PASS |
| StepMap | onBack | (() => void)? | handleBack | PASS |
| StepMap | fileName | string? | parsedFile.sheetName | PASS |
| StepMap | rowCount | number? | parsedFile.allRows.length | PASS |
| StepValidate | validationResult | ValidationResult | state.validationResult | PASS |
| StepValidate | userFixes | UserFixes | state.userFixes | PASS |
| StepValidate | onUserFixesChange | (fixes) => void | handleUserFixesChange | PASS |
| StepValidate | onNext | () => void | handleValidationConfirmed | PASS |
| StepValidate | onBack | (() => void)? | handleBack | PASS |
| StepValidate | onCancel | (() => void)? | handleCancel | PASS |
| StepImport | importStatus | string | state.importStatus | PASS |
| StepImport | importResult | ImportResult? | state.importResult | PASS |
| StepImport | readyCount | number | readyCount (SEE BUG) | PASS (type) |
| StepImport | onExecute | () => void | handleExecuteImport | PASS |
| StepImport | onBack | () => void | handleBack | PASS |

All prop types match between component definitions and wizard usage. No TypeScript errors detected in prop passing.

---

## Files Audited

- `src/components/import/import-wizard.tsx` -- orchestrator, state management, prop passing
- `src/components/import/step-upload.tsx` -- file upload with drag/drop, pivot detection
- `src/components/import/step-map.tsx` -- column mapping with auto-detection
- `src/components/import/step-validate.tsx` -- validation log with fuzzy-match fixes
- `src/components/import/step-import.tsx` -- import execution with status states
- `src/components/import/wizard-stepper.tsx` -- step progress indicator
- `src/components/layout/breadcrumbs.tsx` -- breadcrumb navigation
- `src/features/import/import.types.ts` -- type definitions (contract verification)
- `src/hooks/use-import.ts` -- mutation hooks (API integration)
- `creative-direction/03-bulk-import-validation.html` -- validation step spec
- `creative-direction/05-bulk-import-mapping.html` -- mapping step spec
