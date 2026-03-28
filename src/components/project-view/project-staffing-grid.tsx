'use client';

import Link from 'next/link';

import type { ProjectStaffingPerson } from '@/features/analytics/analytics.types';

interface ProjectStaffingGridProps {
  people: ProjectStaffingPerson[];
  months: string[];
}

export function ProjectStaffingGrid({ people, months }: ProjectStaffingGridProps) {
  if (people.length === 0) {
    return (
      <tr>
        <td colSpan={months.length + 1} className="text-on-surface-variant px-4 py-8 text-center">
          No people allocated to this project. Go to the Input page to add allocations.
        </td>
      </tr>
    );
  }

  return (
    <>
      {people.map((person) => (
        <tr
          key={person.personId}
          className="border-outline-variant hover:bg-surface-variant/30 border-t"
        >
          <td className="px-3 py-2 whitespace-nowrap">
            <Link
              href={`/input/${person.personId}`}
              className="text-primary font-medium hover:underline"
            >
              {person.lastName}, {person.firstName}
            </Link>
          </td>
          {months.map((month) => {
            const hours = person.months[month] ?? 0;
            return (
              <td
                key={month}
                className={`px-2 py-2 text-center tabular-nums ${
                  hours > 0 ? 'text-on-surface font-medium' : 'text-on-surface-variant/50'
                }`}
              >
                {hours}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
