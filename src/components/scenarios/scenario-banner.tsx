'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FlaskConical, Save, X, GitCompare } from 'lucide-react';

import type { Scenario } from '@/features/scenarios/scenario.types';

interface ScenarioBannerProps {
  scenario: Scenario;
  hasUnsavedChanges?: boolean;
  onSave?: () => void;
  onShowExitDialog?: () => void;
}

/**
 * Non-dismissible amber banner shown on all /scenarios/* pages.
 * Cannot be dismissed, collapsed, or hidden while on any scenario route.
 * Includes scenario name, reassurance copy, and action buttons.
 */
export function ScenarioBanner({
  scenario,
  hasUnsavedChanges,
  onSave,
  onShowExitDialog,
}: ScenarioBannerProps) {
  const router = useRouter();

  const handleExit = () => {
    if (hasUnsavedChanges && onShowExitDialog) {
      onShowExitDialog();
    } else {
      router.push('/scenarios');
    }
  };

  return (
    <div
      className="border-b-2 border-amber-400 bg-amber-50 px-4 py-2.5"
      role="banner"
      aria-live="polite"
      style={{ borderLeft: '4px solid #F59E0B' }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        {/* Left: Icon + scenario name + reassurance */}
        <div className="flex items-center gap-3">
          <FlaskConical className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              SCENARIO: &ldquo;{scenario.name}&rdquo;
            </p>
            <p className="text-xs text-amber-700">Ändringar här påverkar INTE verklig data.</p>
          </div>
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-2">
          <Link
            href={`/scenarios/${scenario.id}/compare`}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-200/60 px-3 py-1.5 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-200"
          >
            <GitCompare className="h-3.5 w-3.5" />
            Jämför med verklighet
          </Link>
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-200/60 px-3 py-1.5 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-200"
            >
              <Save className="h-3.5 w-3.5" />
              Spara
            </button>
          )}
          <button
            type="button"
            onClick={handleExit}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-200/60 px-3 py-1.5 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-200"
          >
            <X className="h-3.5 w-3.5" />
            Avsluta scenario
          </button>
        </div>
      </div>
    </div>
  );
}
