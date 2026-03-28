'use client';

import { Check } from 'lucide-react';

import type { WizardStep } from '@/features/import/import.types';

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'map', label: 'Map' },
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
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    isCompleted
                      ? 'bg-primary text-on-primary'
                      : isCurrent
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : <span>{i + 1}</span>}
                </div>
                <span
                  className={`mt-1.5 text-[10px] font-bold tracking-widest uppercase ${
                    isFuture ? 'text-on-surface-variant' : 'text-on-surface'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connecting line (not after last step) */}
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-0.5 w-12 sm:w-20 ${
                    isCompleted ? 'bg-primary' : 'bg-outline-variant'
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
