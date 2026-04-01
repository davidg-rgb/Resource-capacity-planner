'use client';

import type { WizardStep } from '@/features/import/import.types';

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'map', label: 'Mapping' },
  { key: 'validate', label: 'Validate' },
  { key: 'import', label: 'Import' },
];

type WizardStepperProps = {
  currentStep: WizardStep;
  completedSteps: WizardStep[];
};

export function WizardStepper({ currentStep, completedSteps }: WizardStepperProps) {
  return (
    <nav aria-label="Import wizard steps" className="mb-8">
      <ol className="flex items-center">
        {STEPS.map((step, i) => {
          const isCompleted = completedSteps.includes(step.key);
          const isCurrent = step.key === currentStep;
          const isFuture = !isCompleted && !isCurrent;

          return (
            <li key={step.key} className="flex items-center">
              {/* Step circle + label */}
              <div className={`flex flex-col items-center${isFuture ? 'opacity-40' : ''}`}>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    isCompleted
                      ? 'bg-on-secondary-container text-on-primary'
                      : isCurrent
                        ? 'bg-primary text-on-primary border-primary border-2'
                        : 'bg-surface-container-highest text-outline'
                  }`}
                >
                  {isCompleted ? (
                    <span className="material-symbols-outlined text-base">check</span>
                  ) : (
                    <span className="font-bold">{i + 1}</span>
                  )}
                </div>
                <span
                  className={`mt-1.5 text-[10px] font-bold tracking-widest uppercase ${
                    isCompleted
                      ? 'text-on-secondary-container'
                      : isCurrent
                        ? 'text-primary'
                        : 'text-outline'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connecting line (not after last step) */}
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-2 mb-6 h-0.5 w-12 sm:w-20 ${
                    isCompleted ? 'bg-primary' : 'bg-surface-container-highest'
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
