'use client';

import { useMemo, useState } from 'react';

import type {
  RowStatus,
  ValidationResult,
  ValidationRow,
  UserFixes,
  FuzzyMatch,
} from '@/features/import/import.types';

type FilterTab = 'all' | 'ready' | 'warnings' | 'errors';

type StepValidateProps = {
  validationResult: ValidationResult;
  userFixes: UserFixes;
  onUserFixesChange: (fixes: UserFixes) => void;
  onNext: () => void;
  onBack?: () => void;
  onCancel?: () => void;
};

/**
 * Determine the effective status of a row after applying user fixes.
 * A fuzzy row becomes 'ready' once the user picks a suggestion.
 */
function getEffectiveStatus(row: ValidationRow, fixes: UserFixes): RowStatus {
  const fix = fixes[row.rowIndex];

  const personResolved = row.personMatch.status !== 'fuzzy' || fix?.personId !== undefined;
  const projectResolved = row.projectMatch.status !== 'fuzzy' || fix?.projectId !== undefined;

  const hasUnfixableError =
    (row.personMatch.status === 'unknown' &&
      (!row.personMatch.suggestions || row.personMatch.suggestions.length === 0)) ||
    (row.projectMatch.status === 'unknown' &&
      (!row.projectMatch.suggestions || row.projectMatch.suggestions.length === 0));

  const hasHoursError = row.errors.some((e) => e.toLowerCase().includes('hours'));
  const hoursFixed = fix?.hours !== undefined;

  if (hasUnfixableError) return 'error';
  if (!personResolved || !projectResolved) return 'error';
  if (hasHoursError && !hoursFixed) return 'error';
  if (row.warnings.length > 0) return 'warning';
  return 'ready';
}

export function StepValidate({
  validationResult,
  userFixes,
  onUserFixesChange,
  onNext,
  onBack,
  onCancel,
}: StepValidateProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // Compute effective statuses after user fixes
  const effectiveRows = useMemo(() => {
    return validationResult.rows.map((row) => ({
      ...row,
      effectiveStatus: getEffectiveStatus(row, userFixes),
    }));
  }, [validationResult.rows, userFixes]);

  // Summary counts based on effective statuses
  const summary = useMemo(() => {
    const counts = { total: effectiveRows.length, ready: 0, warnings: 0, errors: 0 };
    for (const row of effectiveRows) {
      switch (row.effectiveStatus) {
        case 'ready':
          counts.ready++;
          break;
        case 'warning':
          counts.warnings++;
          break;
        case 'error':
          counts.errors++;
          break;
      }
    }
    return counts;
  }, [effectiveRows]);

  // Filter rows by active tab — only show issues (warnings + errors)
  const issueRows = useMemo(() => {
    const rows = effectiveRows.filter(
      (r) => r.effectiveStatus === 'warning' || r.effectiveStatus === 'error',
    );
    if (activeTab === 'all') return rows;
    if (activeTab === 'errors') return rows.filter((r) => r.effectiveStatus === 'error');
    if (activeTab === 'warnings') return rows.filter((r) => r.effectiveStatus === 'warning');
    return rows;
  }, [effectiveRows, activeTab]);

  /** Update a specific fix for a row */
  function updateFix(rowIndex: number, patch: Partial<UserFixes[number]>) {
    onUserFixesChange({
      ...userFixes,
      [rowIndex]: { ...userFixes[rowIndex], ...patch },
    });
  }

  /** Render fuzzy match suggestion box */
  function renderSuggestionBox(
    row: ValidationRow,
    field: 'person' | 'project',
    suggestions: FuzzyMatch[],
  ) {
    const fixKey = field === 'person' ? 'personId' : 'projectId';
    const topSuggestion = suggestions[0];
    if (!topSuggestion) return null;

    const currentValue = userFixes[row.rowIndex]?.[fixKey];

    return (
      <div className="bg-surface-container-low border-primary mt-4 flex items-center justify-between rounded-sm border-l-2 p-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-sm">lightbulb</span>
          <p className="text-on-surface-variant text-sm">
            Suggestion: Did you mean{' '}
            <span className="text-on-surface font-semibold">
              &quot;{topSuggestion.matchedName}&quot;
            </span>
            ?
          </p>
        </div>
        {currentValue === topSuggestion.matchedId ? (
          <span className="text-primary text-xs font-bold">Applied</span>
        ) : (
          <button
            type="button"
            onClick={() => updateFix(row.rowIndex, { [fixKey]: topSuggestion.matchedId })}
            className="text-primary px-4 py-1 text-xs font-bold hover:underline"
          >
            Apply Fix
          </button>
        )}
      </div>
    );
  }

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All Issues' },
    { key: 'errors', label: 'Errors Only' },
    { key: 'warnings', label: 'Warnings Only' },
  ];

  return (
    <div>
      {/* Summary Bento Grid */}
      <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Ready Card */}
        <div className="bg-surface-container-lowest border-primary rounded-lg border-l-4 p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-outline text-xs font-semibold tracking-wider uppercase">
                Ready to Process
              </p>
              <h3 className="font-headline text-primary mt-2 text-4xl font-bold tabular-nums">
                {summary.ready}
              </h3>
              <p className="text-on-surface-variant mt-1 text-sm">Rows validated successfully</p>
            </div>
            <span className="material-symbols-outlined text-primary text-3xl opacity-50">
              check_circle
            </span>
          </div>
        </div>
        {/* Warnings Card */}
        <div
          className="bg-surface-container-lowest border-outline rounded-lg border-l-4 p-6 shadow-sm transition-shadow hover:shadow-md"
          style={{ borderLeftColor: '#d1a03e' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-outline text-xs font-semibold tracking-wider uppercase">
                Warnings
              </p>
              <h3 className="font-headline mt-2 text-4xl font-bold text-[#d1a03e] tabular-nums">
                {summary.warnings}
              </h3>
              <p className="text-on-surface-variant mt-1 text-sm">Potential logical conflicts</p>
            </div>
            <span className="material-symbols-outlined text-3xl text-[#d1a03e] opacity-50">
              warning
            </span>
          </div>
        </div>
        {/* Errors Card */}
        <div className="bg-surface-container-lowest border-error rounded-lg border-l-4 p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-outline text-xs font-semibold tracking-wider uppercase">
                Critical Errors
              </p>
              <h3 className="font-headline text-error mt-2 text-4xl font-bold tabular-nums">
                {summary.errors}
              </h3>
              <p className="text-on-surface-variant mt-1 text-sm">Blockers requiring action</p>
            </div>
            <span className="material-symbols-outlined text-error text-3xl opacity-50">error</span>
          </div>
        </div>
      </div>

      {/* Issue List Section */}
      <div className="bg-surface-container-lowest border-outline-variant/10 overflow-hidden rounded-lg border shadow-sm">
        {/* Section header */}
        <div className="bg-surface-container-low border-outline-variant/10 flex items-center justify-between border-b px-6 py-4">
          <h4 className="font-headline text-on-surface font-semibold">Validation Log</h4>
          <div className="flex items-center gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-sm px-3 py-1 text-xs font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-dim'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <button
              type="button"
              className="text-outline hover:text-primary ml-2 flex items-center gap-1.5 rounded-sm px-3 py-1 text-xs font-medium transition-colors"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Export Log
            </button>
          </div>
        </div>

        {/* Issue entries */}
        <div className="divide-outline-variant/10 divide-y">
          {issueRows.map((row) => {
            const isError = row.effectiveStatus === 'error';

            return (
              <div
                key={row.rowIndex}
                className="hover:bg-surface-container-low/30 flex gap-4 p-6 transition-colors"
              >
                {/* Icon */}
                <div className="mt-1">
                  {isError ? (
                    <span className="material-symbols-outlined text-error">error</span>
                  ) : (
                    <span className="material-symbols-outlined text-[#d1a03e]">warning</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    {isError ? (
                      <span className="font-label text-error bg-error-container/20 rounded px-2 py-0.5 text-xs font-bold uppercase">
                        Error
                      </span>
                    ) : (
                      <span className="font-label rounded bg-[#fff3cd] px-2 py-0.5 text-xs font-bold text-[#8a6a2a] uppercase">
                        Warning
                      </span>
                    )}
                    <span className="text-outline text-xs font-medium tabular-nums">
                      Row {row.rowIndex}
                    </span>
                  </div>

                  {/* Error messages */}
                  {row.errors.length > 0 && (
                    <p className="text-on-surface mt-2 font-medium">{row.errors.join('; ')}</p>
                  )}

                  {/* Warning messages */}
                  {row.warnings.length > 0 && (
                    <p className="text-on-surface mt-2 font-medium">{row.warnings.join('; ')}</p>
                  )}

                  {/* Person fuzzy suggestion */}
                  {row.personMatch.status === 'fuzzy' &&
                    row.personMatch.suggestions &&
                    row.personMatch.suggestions.length > 0 &&
                    renderSuggestionBox(row, 'person', row.personMatch.suggestions)}

                  {/* Project fuzzy suggestion */}
                  {row.projectMatch.status === 'fuzzy' &&
                    row.projectMatch.suggestions &&
                    row.projectMatch.suggestions.length > 0 &&
                    renderSuggestionBox(row, 'project', row.projectMatch.suggestions)}
                </div>

                {/* Side actions for warnings */}
                {!isError && (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      className="text-outline hover:text-on-surface text-xs font-semibold transition-colors"
                    >
                      Ignore
                    </button>
                    <button
                      type="button"
                      className="text-primary text-xs font-semibold transition-colors hover:underline"
                    >
                      Edit Row
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {issueRows.length === 0 && (
            <div className="text-outline bg-surface/50 p-6 text-center text-xs italic">
              No issues found — all rows are ready to import.
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="border-outline-variant/15 mt-12 flex items-center justify-between border-t py-6">
        <button
          type="button"
          onClick={onBack}
          className="text-primary hover:bg-surface-container-low flex items-center gap-2 rounded-sm px-6 py-2.5 font-semibold transition-all"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to mapping
        </button>
        <div className="flex items-center gap-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="border-outline-variant text-on-surface-variant hover:bg-surface-container-low rounded-sm border px-6 py-2.5 font-semibold transition-all"
            >
              Cancel Import
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            className="bg-primary text-on-primary shadow-primary/20 flex items-center gap-2 rounded-sm px-8 py-2.5 font-bold shadow-lg transition-all hover:opacity-95"
          >
            Import {summary.ready} rows, skip errors
            <span className="material-symbols-outlined text-lg">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
}
