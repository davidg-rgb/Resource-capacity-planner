'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { formatMonthHeader } from '@/lib/date-utils';
import { HeatMapCell } from './heat-map-cell';
import type { HeatMapResponse, HeatMapPerson } from '@/features/analytics/analytics.types';

interface HeatMapTableProps {
  data: HeatMapResponse;
}

/** Generate two-letter initials from first and last name. */
function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/** Get the current month in YYYY-MM format. */
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Sort people by max utilization ratio descending — overloaded float to top. */
function sortPeopleByUtilization(people: HeatMapPerson[]): HeatMapPerson[] {
  return [...people].sort((a, b) => {
    const maxA = Object.values(a.months).reduce(
      (max, h) => Math.max(max, a.targetHours > 0 ? h / a.targetHours : 0),
      0,
    );
    const maxB = Object.values(b.months).reduce(
      (max, h) => Math.max(max, b.targetHours > 0 ? h / b.targetHours : 0),
      0,
    );
    return maxB - maxA;
  });
}

export function HeatMapTable({ data }: HeatMapTableProps) {
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set());
  const currentMonth = getCurrentMonth();

  // Sort people within each department by utilization (overloaded first)
  const sortedDepartments = useMemo(
    () =>
      data.departments.map((dept) => ({
        ...dept,
        people: sortPeopleByUtilization(dept.people),
      })),
    [data.departments],
  );

  const toggleDept = useCallback((deptId: string) => {
    setCollapsedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) {
        next.delete(deptId);
      } else {
        next.add(deptId);
      }
      return next;
    });
  }, []);

  return (
    <div className="bg-surface-container-lowest border-outline-variant/10 overflow-hidden rounded-sm border shadow-sm">
      <div className="custom-scrollbar overflow-x-auto">
        <table className="w-full min-w-[1000px] border-collapse text-left">
          <thead>
            <tr className="bg-surface-container-low text-outline border-outline-variant/10 border-b text-[11px] font-bold tracking-wider uppercase">
              <th className="bg-surface-container-low sticky left-0 z-20 w-64 px-6 py-4">
                Medarbetare
              </th>
              {data.months.map((m) => (
                <th
                  key={m}
                  className={`px-6 py-4 text-center whitespace-nowrap ${m === currentMonth ? 'bg-surface-container-high/50' : ''}`}
                >
                  {formatMonthHeader(m)}
                </th>
              ))}
            </tr>
          </thead>
          {sortedDepartments.map((dept) => {
            const isCollapsed = collapsedDepts.has(dept.departmentId);
            return (
              <tbody key={dept.departmentId} className="divide-outline-variant/5 divide-y">
                {/* Department group row */}
                <tr
                  className="bg-surface-container-low/30 cursor-pointer"
                  onClick={() => toggleDept(dept.departmentId)}
                >
                  <td
                    colSpan={data.months.length + 1}
                    className="text-outline-variant px-6 py-2 text-[10px] font-bold tracking-widest uppercase"
                  >
                    {isCollapsed ? (
                      <ChevronRight size={14} className="mr-1 inline" />
                    ) : (
                      <ChevronDown size={14} className="mr-1 inline" />
                    )}
                    {dept.departmentName} ({dept.people.length})
                  </td>
                </tr>
                {/* Person rows (hidden when collapsed) */}
                {!isCollapsed &&
                  dept.people.map((person) => (
                    <tr
                      key={person.personId}
                      className="hover:bg-surface-container-low group transition-colors"
                    >
                      <td className="bg-surface-container-lowest group-hover:bg-surface-container-low border-outline-variant/10 sticky left-0 z-10 border-r px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary-container text-on-primary-container flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                            {getInitials(person.firstName, person.lastName)}
                          </div>
                          <div>
                            <Link
                              href={`/input/${person.personId}`}
                              className="text-on-surface hover:text-primary text-xs font-semibold transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {person.firstName} {person.lastName}
                            </Link>
                            {person.disciplineAbbreviation && (
                              <span className="bg-secondary-container/50 rounded-full px-1.5 py-0.5 text-[9px] font-bold">
                                {person.disciplineAbbreviation}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      {data.months.map((m) => (
                        <HeatMapCell
                          key={m}
                          hours={person.months[m] ?? 0}
                          targetHours={person.targetHours}
                          isCurrentMonth={m === currentMonth}
                        />
                      ))}
                    </tr>
                  ))}
              </tbody>
            );
          })}
        </table>
      </div>
    </div>
  );
}
