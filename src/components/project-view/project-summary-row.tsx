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

  const grandTotal = totals.reduce((sum, t) => sum + t, 0);

  return (
    <tr className="bg-surface-container-high border-outline-variant/10 border-t-2 font-bold">
      <td className="bg-surface-container-high text-on-surface sticky left-0 z-10 border-r border-[#a9b4b7]/10 px-6 py-4 text-xs tracking-widest uppercase">
        Monthly Project Total
      </td>
      {months.map((month, i) => (
        <td key={month} className="font-tabular px-6 py-4 text-right text-sm">
          {totals[i].toLocaleString()}
        </td>
      ))}
      <td className="font-tabular bg-primary text-on-primary px-6 py-4 text-right text-sm font-bold">
        {grandTotal.toLocaleString()}
      </td>
    </tr>
  );
}
