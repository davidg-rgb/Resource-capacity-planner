'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { formatMonthHeader } from '@/lib/date-utils';
import { HeatMapCell } from './heat-map-cell';
import type { HeatMapResponse } from '@/features/analytics/analytics.types';

interface HeatMapTableProps {
  data: HeatMapResponse;
}

export function HeatMapTable({ data }: HeatMapTableProps) {
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set());

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
    <div className="overflow-x-auto rounded-lg border border-outline">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-surface-variant">
            <th className="sticky left-0 z-20 bg-surface-variant px-3 py-2 text-left font-medium text-on-surface min-w-[200px]">
              Name
            </th>
            {data.months.map((m) => (
              <th
                key={m}
                className="px-2 py-2 text-center font-medium text-on-surface-variant whitespace-nowrap min-w-[60px]"
              >
                {formatMonthHeader(m)}
              </th>
            ))}
          </tr>
        </thead>
        {data.departments.map((dept) => {
          const isCollapsed = collapsedDepts.has(dept.departmentId);
          return (
            <tbody key={dept.departmentId}>
              {/* Department header row */}
              <tr
                className="cursor-pointer bg-surface-dim hover:bg-surface-variant"
                onClick={() => toggleDept(dept.departmentId)}
              >
                <td
                  colSpan={data.months.length + 1}
                  className="sticky left-0 z-10 bg-surface-dim px-3 py-1.5 font-semibold text-on-surface"
                >
                  {isCollapsed ? (
                    <ChevronRight size={16} className="inline mr-1" />
                  ) : (
                    <ChevronDown size={16} className="inline mr-1" />
                  )}
                  {dept.departmentName} ({dept.people.length})
                </td>
              </tr>
              {/* Person rows (hidden when collapsed) */}
              {!isCollapsed &&
                dept.people.map((person) => (
                  <tr
                    key={person.personId}
                    className="border-t border-outline/30 hover:bg-surface-variant/30"
                  >
                    <td className="sticky left-0 z-10 bg-surface px-3 py-1 whitespace-nowrap">
                      <Link
                        href={`/input/${person.personId}`}
                        className="text-primary hover:underline"
                      >
                        {person.lastName}, {person.firstName}
                      </Link>
                    </td>
                    {data.months.map((m) => (
                      <HeatMapCell
                        key={m}
                        hours={person.months[m] ?? 0}
                        targetHours={person.targetHours}
                      />
                    ))}
                  </tr>
                ))}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
