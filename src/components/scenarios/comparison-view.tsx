'use client';

import { TrendingUp, TrendingDown, Minus, Star, AlertTriangle } from 'lucide-react';

import type {
  ScenarioComparisonResponse,
  ScenarioComparisonRow,
} from '@/features/scenarios/scenario.types';

interface ComparisonViewProps {
  comparison: ScenarioComparisonResponse | undefined;
  isLoading: boolean;
}

function DeltaIcon({
  delta,
  isNew,
  isRemoved,
}: {
  delta: number;
  isNew: boolean;
  isRemoved: boolean;
}) {
  if (isNew) return <Star className="h-3 w-3 text-amber-500" />;
  if (isRemoved) return <Minus className="h-3 w-3 text-slate-400" />;
  if (delta > 0) return <TrendingUp className="h-3 w-3 text-emerald-600" />;
  if (delta < 0) return <TrendingDown className="h-3 w-3 text-red-600" />;
  return <Minus className="h-3 w-3 text-slate-400" />;
}

function ComparisonRow({ row }: { row: ScenarioComparisonRow }) {
  const isModified = row.deltaHours !== 0 || row.isNew || row.isRemoved;

  return (
    <tr className={isModified ? 'bg-amber-50/30' : ''}>
      <td className="px-3 py-2 text-sm text-slate-700">
        {row.isNew && (
          <span className="mr-1.5 inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
            <Star className="h-2.5 w-2.5" /> NY
          </span>
        )}
        {row.personName}
      </td>
      <td className="px-3 py-2 text-xs text-slate-500">{row.departmentName}</td>
      {/* Actual side */}
      <td className="px-3 py-2 text-right text-sm text-slate-600">
        {row.isNew ? '-' : `${row.actualHours}h`}
      </td>
      <td className="px-3 py-2 text-right text-sm text-slate-600">
        {row.isNew ? '-' : `${row.actualUtilization}%`}
      </td>
      {/* Scenario side */}
      <td
        className={`px-3 py-2 text-right text-sm font-medium ${
          row.isRemoved
            ? 'text-slate-400 line-through'
            : row.isOverloaded
              ? 'text-red-600'
              : 'text-amber-900'
        }`}
      >
        {row.scenarioHours}h
      </td>
      <td
        className={`px-3 py-2 text-right text-sm font-medium ${
          row.isOverloaded ? 'text-red-600' : 'text-amber-900'
        }`}
      >
        {row.scenarioUtilization}%
        {row.isOverloaded && <AlertTriangle className="ml-1 inline h-3 w-3 text-red-500" />}
      </td>
      {/* Delta */}
      <td className="px-3 py-2 text-right">
        <span className="inline-flex items-center gap-1 text-sm">
          <DeltaIcon delta={row.deltaHours} isNew={row.isNew} isRemoved={row.isRemoved} />
          {row.isNew ? (
            <span className="font-medium text-amber-600">+{row.scenarioHours}h</span>
          ) : row.isRemoved ? (
            <span className="text-slate-400">borttagen</span>
          ) : row.deltaHours !== 0 ? (
            <span className={row.deltaHours > 0 ? 'text-emerald-600' : 'text-red-600'}>
              {row.deltaHours > 0 ? '+' : ''}
              {row.deltaHours}h
            </span>
          ) : (
            <span className="text-slate-400">-</span>
          )}
        </span>
      </td>
    </tr>
  );
}

/**
 * Side-by-side comparison view: actual (read-only, left) vs scenario (right).
 */
export function ComparisonView({ comparison, isLoading }: ComparisonViewProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />
        ))}
      </div>
    );
  }

  if (!comparison || comparison.rows.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">Inga andringar att visa.</p>;
  }

  const { summary } = comparison;

  return (
    <div>
      {/* Comparison table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Person</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                Avdelning
              </th>
              <th
                className="border-l border-slate-200 px-3 py-2 text-right text-xs font-semibold text-slate-600"
                colSpan={2}
              >
                VERKLIG DATA (skrivskyddad)
              </th>
              <th
                className="border-l border-amber-200 bg-amber-50/50 px-3 py-2 text-right text-xs font-semibold text-amber-800"
                colSpan={2}
              >
                SCENARIO
              </th>
              <th className="border-l border-slate-200 px-3 py-2 text-right text-xs font-semibold text-slate-600">
                Delta
              </th>
            </tr>
            <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] text-slate-400">
              <th className="px-3 py-1" />
              <th className="px-3 py-1" />
              <th className="border-l border-slate-200 px-3 py-1 text-right">Timmar</th>
              <th className="px-3 py-1 text-right">Belaggn.</th>
              <th className="border-l border-amber-200 bg-amber-50/30 px-3 py-1 text-right">
                Timmar
              </th>
              <th className="bg-amber-50/30 px-3 py-1 text-right">Belaggn.</th>
              <th className="border-l border-slate-200 px-3 py-1 text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {comparison.rows.map((row, idx) => (
              <ComparisonRow key={`${row.personId ?? row.tempEntityId}-${idx}`} row={row} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary bar */}
      <div className="mt-4 rounded-md border border-amber-200 bg-amber-50/50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="font-semibold text-amber-900">Summering:</span>
          <span className="text-slate-600">
            Verklig {summary.actualTotalHours}h ({summary.actualUtilization}%)
          </span>
          <span className="text-amber-600">&#8594;</span>
          <span className="font-medium text-amber-900">
            Scenario {summary.scenarioTotalHours}h ({summary.scenarioUtilization}%)
          </span>
          <span
            className={`font-medium ${
              summary.deltaHours > 0
                ? 'text-emerald-600'
                : summary.deltaHours < 0
                  ? 'text-red-600'
                  : 'text-slate-400'
            }`}
          >
            {summary.deltaHours > 0 ? '+' : ''}
            {summary.deltaHours}h
          </span>
          {summary.newConflicts.length > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              Nya konflikter: {summary.newConflicts.join(', ')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
