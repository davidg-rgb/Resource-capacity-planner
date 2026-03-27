'use client';

import { useCallback, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import type { ColumnMapping, ParsedFile, WizardState, WizardStep } from '@/features/import/import.types';
import { WizardStepper } from '@/components/import/wizard-stepper';
import { StepUpload } from '@/components/import/step-upload';

const STEP_ORDER: WizardStep[] = ['upload', 'map', 'validate', 'import'];

/** Get all steps that come before the given step */
function getCompletedSteps(currentStep: WizardStep): WizardStep[] {
  const idx = STEP_ORDER.indexOf(currentStep);
  return STEP_ORDER.slice(0, idx);
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

  const currentStepIndex = STEP_ORDER.indexOf(state.step);
  const completedSteps = getCompletedSteps(state.step);

  const handleFileUploaded = useCallback(
    (parsedFile: ParsedFile, mappings: ColumnMapping[]) => {
      setState((prev) => ({
        ...prev,
        parsedFile,
        columnMappings: mappings,
        step: 'map',
      }));
    },
    [],
  );

  const handleBack = useCallback(() => {
    setState((prev) => {
      const idx = STEP_ORDER.indexOf(prev.step);
      if (idx <= 0) return prev;
      return { ...prev, step: STEP_ORDER[idx - 1] };
    });
  }, []);

  const handleNext = useCallback(() => {
    setState((prev) => {
      const idx = STEP_ORDER.indexOf(prev.step);
      if (idx >= STEP_ORDER.length - 1) return prev;
      return { ...prev, step: STEP_ORDER[idx + 1] };
    });
  }, []);

  /** Whether the current step has enough data to advance */
  const canAdvance = (() => {
    switch (state.step) {
      case 'upload':
        return state.parsedFile !== null;
      case 'map':
        return state.columnMappings.length > 0;
      case 'validate':
        return state.validationResult !== null && state.validationResult.summary.errors === 0;
      case 'import':
        return false; // Last step, no next
    }
  })();

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 font-headline text-2xl font-semibold tracking-tight text-on-surface">
        Import Data
      </h1>

      <WizardStepper currentStep={state.step} completedSteps={completedSteps} />

      {/* Step content */}
      <div className="min-h-[300px]">
        {state.step === 'upload' && (
          <StepUpload onFileUploaded={handleFileUploaded} />
        )}
        {state.step === 'map' && (
          <div className="rounded-md border border-outline-variant p-8 text-center text-on-surface-variant">
            Map step (Plan 04)
          </div>
        )}
        {state.step === 'validate' && (
          <div className="rounded-md border border-outline-variant p-8 text-center text-on-surface-variant">
            Validate step (Plan 04)
          </div>
        )}
        {state.step === 'import' && (
          <div className="rounded-md border border-outline-variant p-8 text-center text-on-surface-variant">
            Import step (Plan 04)
          </div>
        )}
      </div>

      {/* Back / Next navigation */}
      <div className="mt-6 flex items-center justify-between border-t border-outline-variant pt-4">
        <div>
          {currentStepIndex > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 rounded-md border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}
        </div>
        <div>
          {/* Next button visible on steps 2-3 (map, validate). Step 1 advances via upload. */}
          {currentStepIndex > 0 && currentStepIndex < STEP_ORDER.length - 1 && (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canAdvance}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
