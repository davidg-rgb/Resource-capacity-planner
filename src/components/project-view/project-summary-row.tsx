'use client';

import type { ProjectStaffingPerson } from '@/features/analytics/analytics.types';

interface ProjectSummaryRowProps {
  people: ProjectStaffingPerson[];
  months: string[];
}

export function ProjectSummaryRow({ people, months }: ProjectSummaryRowProps) {
  const totals = months.map((month) =>
    people.reduce((sum, person) => sum + (person.months[month] ?? 0), 0),
  );

  const hasPeople = people.length > 0;

  return (
    <tr className="bg-surface-container-low">
      <td className="text-on-surface px-3 py-2 font-bold">Total</td>
      {months.map((month, i) => {
        const total = totals[i];
        const isUnderstaffed = total === 0 && hasPeople;

        if (isUnderstaffed) {
          return (
            <td
              key={month}
              className="border border-dashed border-amber-300 bg-amber-100 px-2 py-2 text-center tabular-nums"
              title="No allocations this month"
            >
              --
            </td>
          );
        }

        return (
          <td
            key={month}
            className={`px-2 py-2 text-center tabular-nums ${
              total > 0 ? 'text-on-surface font-semibold' : 'text-on-surface-variant/50'
            }`}
          >
            {total}
          </td>
        );
      })}
    </tr>
  );
}
