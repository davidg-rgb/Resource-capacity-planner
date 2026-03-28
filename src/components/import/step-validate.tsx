'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

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
};

/** Status icon component */
function StatusIcon({ status }: { status: RowStatus }) {
  switch (status) {
    case 'ready':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-600" />;
  }
}

/**
 * Determine the effective status of a row after applying user fixes.
 * A fuzzy row becomes 'ready' once the user picks a suggestion.
 */
function getEffectiveStatus(row: ValidationRow, fixes: UserFixes): RowStatus {
  const fix = fixes[row.rowIndex];

  // If the row has person fuzzy match and user hasn't fixed it yet, remains error-like
  const personResolved = row.personMatch.status !== 'fuzzy' || fix?.personId !== undefined;
  const projectResolved = row.projectMatch.status !== 'fuzzy' || fix?.projectId !== undefined;

  // Check for unfixable errors (unknown with no suggestions)
  const hasUnfixableError =
    (row.personMatch.status === 'unknown' &&
      (!row.personMatch.suggestions || row.personMatch.suggestions.length === 0)) ||
    (row.projectMatch.status === 'unknown' &&
      (!row.projectMatch.suggestions || row.projectMatch.suggestions.length === 0));

  // Check for hours error that hasn't been fixed
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

  // Filter rows by active tab
  const filteredRows = useMemo(() => {
    if (activeTab === 'all') return effectiveRows;
    const statusMap: Record<FilterTab, RowStatus> = {
      all: 'ready',
      ready: 'ready',
      warnings: 'warning',
      errors: 'error',
    };
    return effectiveRows.filter((r) => r.effectiveStatus === statusMap[activeTab]);
  }, [effectiveRows, activeTab]);

  // Import is blocked if any errors remain
  const hasBlockingErrors = summary.errors > 0;

  /** Update a specific fix for a row */
  function updateFix(rowIndex: number, patch: Partial<UserFixes[number]>) {
    onUserFixesChange({
      ...userFixes,
      [rowIndex]: { ...userFixes[rowIndex], ...patch },
    });
  }

  /** Render fuzzy match dropdown for person or project */
  function renderFuzzyDropdown(
    row: ValidationRow,
    field: 'person' | 'project',
    suggestions: FuzzyMatch[],
  ) {
    const fixKey = field === 'person' ? 'personId' : 'projectId';
    const currentValue = userFixes[row.rowIndex]?.[fixKey] ?? '';

    return (
      <div className="mt-1">
        <label className="text-on-surface-variant text-xs">
          Did you mean:
          <select
            value={currentValue}
            onChange={(e) => updateFix(row.rowIndex, { [fixKey]: e.target.value || undefined })}
            className="border-outline-variant bg-surface text-on-surface ml-1 rounded border px-1.5 py-0.5 text-xs"
          >
            <option value="">-- Select --</option>
            {suggestions.map((s) => (
              <option key={s.matchedId} value={s.matchedId}>
                {s.matchedName} ({Math.round(s.score * 100)}% match)
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  }

  const TABS: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: summary.total },
    { key: 'ready', label: 'Ready', count: summary.ready },
    { key: 'warnings', label: 'Warnings', count: summary.warnings },
    { key: 'errors', label: 'Errors', count: summary.errors },
  ];

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-container-lowest border-primary rounded-sm border-l-4 p-6 shadow-sm">
          <p className="text-outline text-xs font-semibold tracking-wider uppercase">Ready</p>
          <p className="text-4xl font-bold text-green-700 tabular-nums">{summary.ready}</p>
        </div>
        <div className="bg-surface-container-lowest rounded-sm border-l-4 border-amber-500 p-6 shadow-sm">
          <p className="text-outline text-xs font-semibold tracking-wider uppercase">Warnings</p>
          <p className="text-4xl font-bold text-amber-700 tabular-nums">{summary.warnings}</p>
        </div>
        <div className="bg-surface-container-lowest border-error rounded-sm border-l-4 p-6 shadow-sm">
          <p className="text-outline text-xs font-semibold tracking-wider uppercase">Errors</p>
          <p className="text-4xl font-bold text-red-700 tabular-nums">{summary.errors}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="border-outline-variant flex gap-0 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-primary border-primary border-b-2'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Row table */}
      <div className="border-outline-variant max-h-[400px] overflow-auto rounded-sm border">
        <table className="w-full text-sm">
          <thead className="bg-surface-container sticky top-0">
            <tr>
              <th className="text-on-surface-variant px-3 py-2 text-left font-medium">Row</th>
              <th className="text-on-surface-variant px-3 py-2 text-left font-medium">Person</th>
              <th className="text-on-surface-variant px-3 py-2 text-left font-medium">Project</th>
              <th className="text-on-surface-variant px-3 py-2 text-left font-medium">Month</th>
              <th className="text-on-surface-variant px-3 py-2 text-right font-medium">Hours</th>
              <th className="text-on-surface-variant px-3 py-2 text-center font-medium">Status</th>
              <th className="text-on-surface-variant px-3 py-2 text-left font-medium">Issues</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => {
              const fix = userFixes[row.rowIndex];

              return (
                <tr key={row.rowIndex} className="border-outline-variant border-t">
                  <td className="text-on-surface-variant px-3 py-2 tabular-nums">{row.rowIndex}</td>

                  {/* Person cell with fuzzy dropdown */}
                  <td className="px-3 py-2">
                    <div className="text-on-surface">{row.data.personName}</div>
                    {row.personMatch.status === 'fuzzy' &&
                      row.personMatch.suggestions &&
                      row.personMatch.suggestions.length > 0 &&
                      renderFuzzyDropdown(row, 'person', row.personMatch.suggestions)}
                  </td>

                  {/* Project cell with fuzzy dropdown */}
                  <td className="px-3 py-2">
                    <div className="text-on-surface">{row.data.projectName}</div>
                    {row.projectMatch.status === 'fuzzy' &&
                      row.projectMatch.suggestions &&
                      row.projectMatch.suggestions.length > 0 &&
                      renderFuzzyDropdown(row, 'project', row.projectMatch.suggestions)}
                  </td>

                  <td className="text-on-surface px-3 py-2 tabular-nums">{row.data.month}</td>

                  {/* Hours with inline fix for invalid values */}
                  <td className="px-3 py-2 text-right">
                    {row.errors.some((e) => e.toLowerCase().includes('hours')) ? (
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={fix?.hours ?? row.data.hours}
                        onChange={(e) =>
                          updateFix(row.rowIndex, {
                            hours: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        className="border-error bg-surface text-on-surface w-20 rounded border px-2 py-0.5 text-right text-sm tabular-nums"
                      />
                    ) : (
                      <span className="text-on-surface tabular-nums">{row.data.hours}</span>
                    )}
                  </td>

                  {/* Status icon */}
                  <td className="px-3 py-2 text-center">
                    <StatusIcon status={row.effectiveStatus} />
                  </td>

                  {/* Issues */}
                  <td className="px-3 py-2">
                    {row.errors.length > 0 && (
                      <span className="text-error text-xs">{row.errors.join('; ')}</span>
                    )}
                    {row.errors.length > 0 && row.warnings.length > 0 && <br />}
                    {row.warnings.length > 0 && (
                      <span className="text-xs text-amber-600">{row.warnings.join('; ')}</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-on-surface-variant px-3 py-6 text-center text-sm">
                  No rows match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Blocking errors message + Next button */}
      <div className="flex items-center justify-between">
        <div>
          {hasBlockingErrors && (
            <p className="text-error text-sm">
              {summary.errors} error{summary.errors !== 1 ? 's' : ''} must be resolved before
              importing.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onNext}
          disabled={hasBlockingErrors}
          className="bg-primary text-on-primary hover:bg-primary/90 rounded-sm px-5 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          Next: Import
        </button>
      </div>
    </div>
  );
}
