'use client';

import { useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';

import type { ColumnMapping, TargetField } from '@/features/import/import.types';
import { REQUIRED_TARGET_FIELDS, OPTIONAL_TARGET_FIELDS } from '@/features/import/import.types';

/** Human-readable labels for target fields */
const TARGET_FIELD_LABELS: Record<TargetField, string> = {
  personName: 'Person name',
  projectName: 'Project name',
  month: 'Month',
  hours: 'Hours',
  department: 'Department',
  discipline: 'Discipline',
};

const ALL_TARGET_FIELDS: TargetField[] = [...REQUIRED_TARGET_FIELDS, ...OPTIONAL_TARGET_FIELDS];

type StepMapProps = {
  headers: string[];
  sampleRows: unknown[][];
  mappings: ColumnMapping[];
  onMappingsChange: (mappings: ColumnMapping[]) => void;
  onNext: () => void;
};

export function StepMap({
  headers: _headers,
  sampleRows,
  mappings,
  onMappingsChange,
  onNext,
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
    <div className="space-y-4">
      <p className="text-on-surface-variant text-sm">
        Map each source column to a target field. Required fields must be mapped before proceeding.
      </p>

      {/* Mapping table */}
      <div className="border-outline-variant overflow-x-auto rounded-sm border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-container">
              <th className="text-on-surface-variant px-4 py-2.5 text-left font-medium">
                Source Column
              </th>
              <th className="text-on-surface-variant px-4 py-2.5 text-left font-medium">Maps To</th>
              <th className="text-on-surface-variant px-4 py-2.5 text-left font-medium">
                Sample Data
              </th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((mapping) => {
              const isIgnored = mapping.targetField === null;

              return (
                <tr
                  key={mapping.sourceIndex}
                  className={`border-outline-variant border-t ${
                    isIgnored ? 'text-on-surface-variant opacity-60' : ''
                  }`}
                >
                  {/* Source Column */}
                  <td className="px-4 py-2.5">
                    <span className="text-on-surface font-medium">{mapping.sourceHeader}</span>
                    {mapping.swedish && mapping.autoDetected && (
                      <span className="text-on-surface-variant ml-2 text-xs">
                        (Swedish detected)
                      </span>
                    )}
                  </td>

                  {/* Maps To dropdown */}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <select
                        value={mapping.targetField ?? ''}
                        onChange={(e) => handleTargetChange(mapping.sourceIndex, e.target.value)}
                        className="border-outline-variant focus:border-primary text-on-surface rounded-none border-t-0 border-r-0 border-b border-l-0 bg-transparent px-1 py-1.5 text-xs focus:ring-0"
                      >
                        <option value="">-- Ignored --</option>
                        {ALL_TARGET_FIELDS.map((field) => (
                          <option key={field} value={field}>
                            {TARGET_FIELD_LABELS[field]}
                          </option>
                        ))}
                      </select>
                      {mapping.autoDetected && mapping.targetField && (
                        <span className="bg-secondary-container text-on-secondary-container inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-tighter uppercase">
                          <CheckCircle2 className="h-3 w-3" /> Matched
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Sample Data */}
                  <td className="text-on-surface-variant px-4 py-2.5 text-xs">
                    {getSampleData(mapping.sourceIndex)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Missing required fields warning */}
      {missingRequired.length > 0 && (
        <p className="text-on-surface-variant text-sm">
          Required:{' '}
          <span className="text-error font-medium">
            {missingRequired.map((f) => TARGET_FIELD_LABELS[f]).join(', ')}
          </span>
        </p>
      )}

      {/* Next button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className="bg-primary text-on-primary hover:bg-primary/90 rounded-sm px-5 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          Next: Validate
        </button>
      </div>
    </div>
  );
}
