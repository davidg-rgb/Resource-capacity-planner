'use client';

import type { ProjectStaffingPerson } from '@/features/analytics/analytics.types';

interface ProjectStaffingGridProps {
  people: ProjectStaffingPerson[];
  months: string[];
}

export function ProjectStaffingGrid({ people, months }: ProjectStaffingGridProps) {
  if (people.length === 0) {
    return (
      <tr>
        <td colSpan={months.length + 2} className="text-on-surface-variant px-6 py-8 text-center">
          No people allocated to this project. Go to the Input page to add allocations.
        </td>
      </tr>
    );
  }

  return (
    <>
      {people.map((person) => {
        const personTotal = months.reduce((sum, m) => sum + (person.months[m] ?? 0), 0);

        return (
          <tr
            key={person.personId}
            className="group hover:bg-surface-container-low transition-colors"
          >
            <td className="bg-surface-container-lowest group-hover:bg-surface-container-low sticky left-0 z-10 border-r border-[#a9b4b7]/10 px-6 py-3">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-on-surface text-sm font-semibold">
                    {person.firstName} {person.lastName}
                  </span>
                  <span className="bg-secondary-container text-on-secondary-fixed mt-0.5 w-fit rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                    {person.discipline}
                  </span>
                </div>
              </div>
            </td>
            {months.map((month) => {
              const hours = person.months[month] ?? 0;
              return (
                <td
                  key={month}
                  className="text-on-surface-variant font-tabular px-6 py-3 text-right text-sm"
                >
                  {hours.toLocaleString()}
                </td>
              );
            })}
            <td className="text-primary font-tabular bg-primary/5 px-6 py-3 text-right text-sm font-bold">
              {personTotal.toLocaleString()}
            </td>
          </tr>
        );
      })}
    </>
  );
}
