'use client';

import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

import type { ScenarioImpact } from '@/features/scenarios/scenario.types';

interface ImpactBarProps {
  impact: ScenarioImpact | undefined;
  isLoading: boolean;
}

function DeltaDisplay({
  actual,
  scenario,
  label,
  suffix = '',
  inverse = false,
}: {
  actual: number;
  scenario: number;
  label: string;
  suffix?: string;
  inverse?: boolean;
}) {
  const delta = scenario - actual;
  const isPositive = inverse ? delta < 0 : delta > 0;
  const isNeutral = delta === 0;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-amber-700">{label}:</span>
      <span className="text-xs font-medium text-amber-900">
        {actual}
        {suffix}
      </span>
      <span className="text-amber-600">&#8594;</span>
      <span className="text-xs font-semibold text-amber-900">
        {scenario}
        {suffix}
      </span>
      {!isNeutral && (
        <span
          className={`inline-flex items-center gap-0.5 text-xs font-medium ${
            isPositive ? 'text-emerald-600' : 'text-red-600'
          }`}
        >
          {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {delta > 0 ? '+' : ''}
          {delta}
          {suffix}
        </span>
      )}
      {isNeutral && (
        <span className="inline-flex items-center gap-0.5 text-xs text-slate-400">
          <Minus className="h-3 w-3" />
        </span>
      )}
    </div>
  );
}

/**
 * Impact preview bar — curated 4 metrics comparing actual vs scenario.
 * Always visible at top of scenario editor.
 */
export function ImpactBar({ impact, isLoading }: ImpactBarProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-32 animate-pulse rounded bg-amber-200" />
          <div className="h-4 w-48 animate-pulse rounded bg-amber-200" />
        </div>
      </div>
    );
  }

  if (!impact) return null;

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50/50 px-4 py-3">
      <p className="mb-2 text-xs font-semibold tracking-wider text-amber-700 uppercase">
        Påverkan vs verklighet
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <DeltaDisplay
          actual={impact.actualUtilization}
          scenario={impact.scenarioUtilization}
          label="Beläggning"
          suffix="%"
        />
        <span className="hidden text-amber-300 sm:inline">|</span>
        <DeltaDisplay
          actual={impact.actualOverloaded}
          scenario={impact.scenarioOverloaded}
          label="Överbelagda"
          inverse
        />
        {impact.newConflicts > 0 && (
          <>
            <span className="hidden text-amber-300 sm:inline">|</span>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs font-medium text-amber-800">
                +{impact.newConflicts} nya konflikter
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
