'use client';

import type { ProjectStaffingPerson } from '@/features/analytics/analytics.types';

interface DisciplineDistributionProps {
  people: ProjectStaffingPerson[];
  months: string[];
}

/** Map discipline abbreviations to bar colors */
const DISCIPLINE_COLORS: Record<string, string> = {
  SW: 'bg-primary',
  Mek: 'bg-outline',
  Elnik: 'bg-tertiary',
};

/** Map discipline abbreviations to full names */
const DISCIPLINE_LABELS: Record<string, string> = {
  SW: 'Software (SW)',
  Mek: 'Mechanical (Mek)',
  Elnik: 'Electronics (Elnik)',
};

export function DisciplineDistribution({ people, months }: DisciplineDistributionProps) {
  // Sum total hours per discipline
  const disciplineHours: Record<string, number> = {};

  for (const person of people) {
    const total = months.reduce((sum, m) => sum + (person.months[m] ?? 0), 0);
    disciplineHours[person.discipline] = (disciplineHours[person.discipline] ?? 0) + total;
  }

  const grandTotal = Object.values(disciplineHours).reduce((a, b) => a + b, 0) || 1;

  // Sort by hours descending
  const sorted = Object.entries(disciplineHours).sort(([, a], [, b]) => b - a);

  return (
    <div className="bg-surface-container-low rounded-sm p-6">
      <h3 className="text-on-surface font-headline mb-4 text-lg font-semibold">
        Discipline Distribution
      </h3>
      <div className="space-y-4">
        {sorted.map(([discipline, hours]) => {
          const pct = Math.round((hours / grandTotal) * 100);
          const colorClass = DISCIPLINE_COLORS[discipline] ?? 'bg-secondary';
          const label = DISCIPLINE_LABELS[discipline] ?? discipline;

          return (
            <div key={discipline}>
              <div className="mb-1.5 flex justify-between text-xs font-bold tracking-wider uppercase">
                <span className="text-on-surface-variant">{label}</span>
                <span className="text-on-surface">{pct}%</span>
              </div>
              <div className="bg-surface-container-high h-1.5 w-full overflow-hidden rounded-full">
                <div className={`${colorClass} h-full`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
