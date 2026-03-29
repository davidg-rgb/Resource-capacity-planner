'use client';

import { useMemo } from 'react';

import type { ColumnMapping, TargetField } from '@/features/import/import.types';
import { REQUIRED_TARGET_FIELDS, OPTIONAL_TARGET_FIELDS } from '@/features/import/import.types';

/** Human-readable labels for target fields */
const TARGET_FIELD_LABELS: Record<TargetField, string> = {
  personName: 'Person Name',
  projectName: 'Project',
  month: 'Month',
  hours: 'Planned Hours',
  department: 'Department',
  discipline: 'Discipline',
};

/** Icons for each source column */
const SOURCE_ICONS: Record<string, string> = {
  namn: 'format_list_bulleted',
  projekt: 'category',
  timmar: 'schedule',
  månad: 'calendar_month',
  avdelning: 'corporate_fare',
};

function getSourceIcon(header: string): string {
  const lower = header.toLowerCase();
  return SOURCE_ICONS[lower] ?? 'format_list_bulleted';
}

const ALL_TARGET_FIELDS: TargetField[] = [...REQUIRED_TARGET_FIELDS, ...OPTIONAL_TARGET_FIELDS];

type StepMapProps = {
  headers: string[];
  sampleRows: unknown[][];
  mappings: ColumnMapping[];
  onMappingsChange: (mappings: ColumnMapping[]) => void;
  onNext: () => void;
  onBack?: () => void;
  fileName?: string;
  rowCount?: number;
};

export function StepMap({
  headers: _headers,
  sampleRows,
  mappings,
  onMappingsChange,
  onNext,
  onBack,
  fileName,
  rowCount,
}: StepMapProps) {
  // Determine which required fields are still missing
  const missingRequired = useMemo(() => {
    const mapped = new Set(mappings.filter((m) => m.targetField).map((m) => m.targetField));
    return REQUIRED_TARGET_FIELDS.filter((f) => !mapped.has(f));
  }, [mappings]);

  const canProceed = missingRequired.length === 0;

  /** Handle dropdown change for a column mapping */
  function handleTargetChange(sourceIndex: number, newTarget: string) {
    const targetField = (newTarget || null) as TargetField | null;

    onMappingsChange(
      mappings.map((m) => {
        // Clear any other column that had this same target (prevent duplicates)
        if (targetField && m.sourceIndex !== sourceIndex && m.targetField === targetField) {
          return { ...m, targetField: null, autoDetected: false };
        }
        // Update the changed column
        if (m.sourceIndex === sourceIndex) {
          return { ...m, targetField, autoDetected: false };
        }
        return m;
      }),
    );
  }

  /** Get sample data for a column index */
  function getSampleData(colIndex: number): string {
    return sampleRows
      .slice(0, 3)
      .map((row) => String((row as unknown[])[colIndex] ?? ''))
      .filter(Boolean)
      .join(', ');
  }

  return (
    <div>
      {/* File info header */}
      {fileName && (
        <p className="text-on-surface-variant mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">description</span>
          <span className="text-sm font-medium">{fileName}</span>
          {rowCount !== undefined && (
            <span className="bg-surface-container-high text-outline rounded px-1.5 py-0.5 text-xs tabular-nums">
              {rowCount.toLocaleString()} rows
            </span>
          )}
        </p>
      )}

      {/* Missing required fields warning */}
      {missingRequired.length > 0 && (
        <p className="text-on-surface-variant mb-4 text-sm">
          Required:{' '}
          <span className="text-error font-medium">
            {missingRequired.map((f) => TARGET_FIELD_LABELS[f]).join(', ')}
          </span>
        </p>
      )}

      {/* Mapping card */}
      <div className="bg-surface-container-lowest ring-outline-variant/15 overflow-hidden rounded-sm ring-1">
        {/* Table header */}
        <div className="bg-surface-container-low border-outline-variant/10 grid grid-cols-12 border-b px-6 py-3">
          <div className="text-outline col-span-4 text-xs font-semibold tracking-wider uppercase">
            Your Column (Source)
          </div>
          <div className="text-outline col-span-4 text-xs font-semibold tracking-wider uppercase">
            Maps To (System)
          </div>
          <div className="text-outline col-span-4 text-xs font-semibold tracking-wider uppercase">
            Data Preview
          </div>
        </div>

        {/* Rows */}
        <div className="divide-outline-variant/5 divide-y">
          {mappings.map((mapping) => {
            const preview = getSampleData(mapping.sourceIndex);

            return (
              <div
                key={mapping.sourceIndex}
                className="hover:bg-surface-container-low/50 grid grid-cols-12 items-center px-6 py-4 transition-colors"
              >
                {/* Source Column */}
                <div className="col-span-4 flex items-center gap-3">
                  <span className="material-symbols-outlined text-outline text-lg">
                    {getSourceIcon(mapping.sourceHeader)}
                  </span>
                  <span className="text-on-surface text-sm font-medium">
                    {mapping.sourceHeader}
                  </span>
                </div>

                {/* Maps To dropdown */}
                <div className="col-span-4 px-2">
                  <div className="relative">
                    <select
                      value={mapping.targetField ?? ''}
                      onChange={(e) => handleTargetChange(mapping.sourceIndex, e.target.value)}
                      className="bg-surface-container-lowest border-outline-variant focus:border-primary w-full appearance-none border-b py-1.5 pr-8 text-sm focus:ring-0"
                    >
                      <option value="">-- Ignored --</option>
                      {ALL_TARGET_FIELDS.map((field) => (
                        <option key={field} value={field}>
                          {TARGET_FIELD_LABELS[field]}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined text-outline pointer-events-none absolute top-1.5 right-0 text-lg">
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Data Preview */}
                <div className="col-span-4 flex items-center justify-between">
                  <span className="text-on-surface-variant text-xs italic">
                    {preview ? `${preview}...` : '—'}
                  </span>
                  {mapping.autoDetected && mapping.targetField && (
                    <span className="text-on-secondary-container bg-secondary-container flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-tighter uppercase">
                      <span
                        className="material-symbols-outlined text-xs"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        check_circle
                      </span>
                      Matched
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info bar */}
        <div className="bg-surface border-outline-variant/10 flex items-center gap-4 border-t p-4">
          <span
            className="material-symbols-outlined text-primary text-xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            info
          </span>
          <p className="text-on-surface-variant max-w-2xl text-xs leading-relaxed">
            We&apos;ve automatically matched columns with similar names. Any column left unmatched
            or incorrectly mapped will result in validation errors in the next step.
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-12 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-primary hover:bg-surface-container-high flex items-center gap-2 rounded-sm px-6 py-2.5 text-sm font-semibold transition-all"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to Upload
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="bg-surface-variant text-on-surface-variant rounded-sm px-6 py-2.5 text-sm font-semibold transition-all hover:opacity-80"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canProceed}
            className="bg-primary text-on-primary shadow-primary/20 flex items-center gap-2 rounded-sm px-8 py-2.5 text-sm font-semibold shadow-lg transition-all hover:opacity-90 disabled:opacity-50"
          >
            Continue to Validation
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
