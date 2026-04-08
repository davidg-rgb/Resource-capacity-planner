// v5.0 — Phase 41 / Plan 41-02 Task 2 (D-11, UX-V5-04):
// Line Manager capacity heatmap. Rows = people, columns = months, sticky
// header row and sticky first column. Dumb component — parent fetches.
//
// Deliberately isolated from v4 analytics / heat-map modules — those use
// v4 thresholds (>100 / <50) which do not match v5 spec (under <60 /
// ok 60–100 / over >100 / absent).

'use client';

import { useMemo } from 'react';

import type { UtilizationMap, UtilizationCell } from '@/features/capacity/capacity.types';
import { formatMonthHeader } from '@/lib/date-utils';

import { CapacityHeatmapCell } from './capacity-heatmap-cell';

export interface CapacityHeatmapProps {
  data: UtilizationMap;
  months: string[];
}

export function CapacityHeatmap({ data, months }: CapacityHeatmapProps) {
  // O(1) cell lookup: personId → monthKey → cell
  const lookup = useMemo(() => {
    const map = new Map<string, Map<string, UtilizationCell>>();
    for (const cell of data.cells) {
      let inner = map.get(cell.personId);
      if (!inner) {
        inner = new Map<string, UtilizationCell>();
        map.set(cell.personId, inner);
      }
      inner.set(cell.monthKey, cell);
    }
    return map;
  }, [data.cells]);

  return (
    <div
      data-testid="capacity-heatmap"
      className="border-outline-variant/30 overflow-x-auto rounded-md border"
    >
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-surface-container-low sticky top-0 z-10">
          <tr>
            <th className="bg-surface-container-low border-outline-variant/20 sticky left-0 z-20 border px-3 py-2 text-left font-semibold">
              Person
            </th>
            {months.map((m) => (
              <th
                key={m}
                className="border-outline-variant/20 border px-3 py-2 text-center font-semibold"
              >
                {formatMonthHeader(m)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.people.map((person) => {
            const inner = lookup.get(person.id);
            return (
              <tr key={person.id} data-person-id={person.id}>
                <th
                  scope="row"
                  className="bg-surface-container-low border-outline-variant/20 sticky left-0 z-10 border px-3 py-2 text-left font-normal"
                >
                  {person.name}
                </th>
                {months.map((m) => (
                  <CapacityHeatmapCell key={`${person.id}:${m}`} cell={inner?.get(m) ?? null} />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
