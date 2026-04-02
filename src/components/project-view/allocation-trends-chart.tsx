'use client';

import type { ProjectStaffingPerson } from '@/features/analytics/analytics.types';

interface AllocationTrendsChartProps {
  people: ProjectStaffingPerson[];
  months: string[];
}

export function AllocationTrendsChart({ people, months }: AllocationTrendsChartProps) {
  const monthTotals = months.map((month) =>
    people.reduce((sum, person) => sum + (person.months[month] ?? 0), 0),
  );

  const maxTotal = Math.max(...monthTotals, 1);

  // Labels from YYYY-MM
  const firstLabel = months[0]?.split('-')[1] ?? '';
  const lastLabel = months[months.length - 1]?.split('-')[1] ?? '';
  const MONTH_ABBR = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ];
  const firstMonth = MONTH_ABBR[parseInt(firstLabel, 10) - 1] ?? firstLabel;
  const lastMonth = MONTH_ABBR[parseInt(lastLabel, 10) - 1] ?? lastLabel;

  return (
    <div className="bg-surface-container-low rounded-sm p-6">
      <h3 className="text-on-surface font-headline mb-4 text-lg font-semibold">
        Allokeringstrender
      </h3>
      <div className="flex h-48 items-end gap-3 px-2">
        {monthTotals.map((total, i) => {
          const heightPct = Math.round((total / maxTotal) * 100);
          const isAboveAvg = total > monthTotals.reduce((a, b) => a + b, 0) / monthTotals.length;

          return (
            <div
              key={months[i]}
              className={`group relative flex-1 rounded-t-sm ${
                isAboveAvg ? 'bg-primary/30' : 'bg-primary/20'
              }`}
              style={{ height: `${heightPct}%` }}
            >
              <div className="bg-on-surface text-surface absolute -top-8 left-1/2 -translate-x-1/2 rounded px-2 py-1 text-[10px] opacity-0 transition-opacity group-hover:opacity-100">
                {total.toLocaleString()}h
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex justify-between px-2">
        <span className="text-outline text-[10px] font-bold">{firstMonth}</span>
        <span className="text-outline text-[10px] font-bold">{lastMonth}</span>
      </div>
    </div>
  );
}
