'use client';

import { useCallback, useState } from 'react';
import { Loader2 } from 'lucide-react';

import type {
  ColumnMapping,
  ImportRow,
  ParsedFile,
  UserFixes,
  WizardState,
  WizardStep,
} from '@/features/import/import.types';
import { unpivotData } from '@/features/import/import.utils';
import { useValidateRows, useExecuteImport } from '@/hooks/use-import';
import { WizardStepper } from '@/components/import/wizard-stepper';
import { StepUpload } from '@/components/import/step-upload';
import { StepMap } from '@/components/import/step-map';
import { StepValidate } from '@/components/import/step-validate';
import { StepImport } from '@/components/import/step-import';

const STEP_ORDER: WizardStep[] = ['upload', 'map', 'validate', 'import'];

/** Get all steps that come before the given step */
function getCompletedSteps(currentStep: WizardStep): WizardStep[] {
  const idx = STEP_ORDER.indexOf(currentStep);
  return STEP_ORDER.slice(0, idx);
}

/**
 * Convert allRows to ImportRow[] using column mappings (flat format).
 */
function mapRowsToImportRows(allRows: unknown[][], mappings: ColumnMapping[]): ImportRow[] {
  const personIdx = mappings.find((m) => m.targetField === 'personName')?.sourceIndex;
  const projectIdx = mappings.find((m) => m.targetField === 'projectName')?.sourceIndex;
  const monthIdx = mappings.find((m) => m.targetField === 'month')?.sourceIndex;
  const hoursIdx = mappings.find((m) => m.targetField === 'hours')?.sourceIndex;
  const deptIdx = mappings.find((m) => m.targetField === 'department')?.sourceIndex;
  const discIdx = mappings.find((m) => m.targetField === 'discipline')?.sourceIndex;

  if (
    personIdx === undefined ||
    projectIdx === undefined ||
    monthIdx === undefined ||
    hoursIdx === undefined
  ) {
    return [];
  }

  return allRows.map(
    (row, i): ImportRow => ({
      rowIndex: i + 2, // +2: 1-indexed + header row
      personName: String(row[personIdx] ?? '').trim(),
      projectName: String(row[projectIdx] ?? '').trim(),
      month: String(row[monthIdx] ?? '').trim(),
      hours: Number(row[hoursIdx]) || 0,
      department:
        deptIdx !== undefined ? String(row[deptIdx] ?? '').trim() || undefined : undefined,
      discipline:
        discIdx !== undefined ? String(row[discIdx] ?? '').trim() || undefined : undefined,
    }),
  );
}

const INITIAL_STATE: WizardState = {
  step: 'upload',
  file: null,
  parsedFile: null,
  columnMappings: [],
  validationResult: null,
  userFixes: {},
  importStatus: 'idle',
  importResult: null,
};

export function ImportWizard() {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);

  const validateMutation = useValidateRows();
  const executeMutation = useExecuteImport();

  const completedSteps = getCompletedSteps(state.step);

  // ----- Step handlers -----

  const handleFileUploaded = useCallback((parsedFile: ParsedFile, mappings: ColumnMapping[]) => {
    setState((prev) => ({
      ...prev,
      parsedFile,
      columnMappings: mappings,
      step: 'map',
    }));
  }, []);

  const handleMappingsChange = useCallback((mappings: ColumnMapping[]) => {
    setState((prev) => ({ ...prev, columnMappings: mappings }));
  }, []);

  const handleMappingsConfirmed = useCallback(async () => {
    if (!state.parsedFile) return;

    // Advance to validate step immediately (show loading state)
    setState((prev) => ({ ...prev, step: 'validate', validationResult: null }));

    // Build ImportRow[] from raw data + mappings
    let importRows: ImportRow[];
    if (state.parsedFile.formatInfo.isPivot) {
      importRows = unpivotData(
        state.parsedFile.allRows,
        state.parsedFile.headers,
        state.parsedFile.formatInfo,
        state.columnMappings,
      );
    } else {
      importRows = mapRowsToImportRows(state.parsedFile.allRows, state.columnMappings);
    }

    try {
      const result = await validateMutation.mutateAsync({ rows: importRows });
      setState((prev) => ({ ...prev, validationResult: result, userFixes: {} }));
    } catch {
      // Error handled by mutation state; go back to map step
      setState((prev) => ({ ...prev, step: 'map' }));
    }
  }, [state.parsedFile, state.columnMappings, validateMutation]);

  const handleUserFixesChange = useCallback((fixes: UserFixes) => {
    setState((prev) => ({ ...prev, userFixes: fixes }));
  }, []);

  const handleValidationConfirmed = useCallback(() => {
    setState((prev) => ({ ...prev, step: 'import', importStatus: 'idle', importResult: null }));
  }, []);

  const handleExecuteImport = useCallback(async () => {
    if (!state.validationResult) return;

    setState((prev) => ({ ...prev, importStatus: 'importing' }));

    // Build execute payload from validation rows + user fixes
    const rows = state.validationResult.rows
      .filter((r) => r.status === 'ready' || r.status === 'warning')
      .map((r) => {
        const fix = state.userFixes[r.rowIndex];
        return {
          rowIndex: r.rowIndex,
          personId: fix?.personId ?? r.personMatch.matchId ?? '',
          projectId: fix?.projectId ?? r.projectMatch.matchId ?? '',
          month: r.data.month,
          hours: fix?.hours ?? r.data.hours,
        };
      });

    try {
      const result = await executeMutation.mutateAsync({ rows });
      setState((prev) => ({ ...prev, importStatus: 'success', importResult: result }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        importStatus: 'error',
        importResult: {
          imported: 0,
          skipped: 0,
          warnings: [],
          error: err instanceof Error ? err.message : 'Import failed',
        },
      }));
    }
  }, [state.validationResult, state.userFixes, executeMutation]);

  const handleBack = useCallback(() => {
    setState((prev) => {
      const idx = STEP_ORDER.indexOf(prev.step);
      if (idx <= 0) return prev;

      const prevStep = STEP_ORDER[idx - 1];

      // Per D-02: back navigation preserves state at every step
      switch (prev.step) {
        case 'map':
          // Back to upload: keep parsedFile
          return { ...prev, step: prevStep };
        case 'validate':
          // Back to map: keep columnMappings, clear validationResult
          return { ...prev, step: prevStep, validationResult: null };
        case 'import':
          // Back to validate: only if idle or error. Keep validationResult.
          if (prev.importStatus === 'idle' || prev.importStatus === 'error') {
            return { ...prev, step: prevStep, importStatus: 'idle', importResult: null };
          }
          return prev; // Block back during importing/success
        default:
          return prev;
      }
    });
  }, []);

  const handleCancel = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  // Count ready rows for import step (accounts for user fixes turning fuzzy rows into ready)
  const readyCount = state.validationResult
    ? state.validationResult.rows.filter((r) => {
        const fix = state.userFixes[r.rowIndex];
        const personResolved = r.personMatch.status !== 'fuzzy' || fix?.personId !== undefined;
        const projectResolved = r.projectMatch.status !== 'fuzzy' || fix?.projectId !== undefined;
        const hasUnfixableError =
          (r.personMatch.status === 'unknown' &&
            (!r.personMatch.suggestions || r.personMatch.suggestions.length === 0)) ||
          (r.projectMatch.status === 'unknown' &&
            (!r.projectMatch.suggestions || r.projectMatch.suggestions.length === 0));
        if (hasUnfixableError || !personResolved || !projectResolved) return false;
        return true;
      }).length
    : 0;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-headline text-on-surface mb-6 text-2xl font-semibold tracking-tight">
        Import Data
      </h1>

      <WizardStepper currentStep={state.step} completedSteps={completedSteps} />

      {/* Step content */}
      <div className="min-h-[300px]">
        {state.step === 'upload' && <StepUpload onFileUploaded={handleFileUploaded} />}

        {state.step === 'map' && state.parsedFile && (
          <StepMap
            headers={state.parsedFile.headers}
            sampleRows={state.parsedFile.sampleRows}
            mappings={state.columnMappings}
            onMappingsChange={handleMappingsChange}
            onNext={handleMappingsConfirmed}
            onBack={handleBack}
            fileName={state.parsedFile.sheetName}
            rowCount={state.parsedFile.allRows.length}
          />
        )}

        {state.step === 'validate' && (
          <>
            {validateMutation.isPending || !state.validationResult ? (
              <div className="flex flex-col items-center py-10">
                <Loader2 className="text-primary h-8 w-8 animate-spin" />
                <p className="text-on-surface-variant mt-3 text-sm">Validating rows...</p>
              </div>
            ) : (
              <StepValidate
                validationResult={state.validationResult}
                userFixes={state.userFixes}
                onUserFixesChange={handleUserFixesChange}
                onNext={handleValidationConfirmed}
                onBack={handleBack}
                onCancel={handleCancel}
              />
            )}
          </>
        )}

        {state.step === 'import' && (
          <StepImport
            importStatus={state.importStatus}
            importResult={state.importResult}
            readyCount={readyCount}
            onExecute={handleExecuteImport}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
}
