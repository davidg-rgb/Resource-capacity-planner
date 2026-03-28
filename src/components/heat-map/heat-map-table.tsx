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
    <div className="border-outline overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-surface-variant">
            <th className="bg-surface-variant text-on-surface sticky left-0 z-20 min-w-[200px] px-3 py-2 text-left font-medium">
              Name
            </th>
            {data.months.map((m) => (
              <th
                key={m}
                className="text-on-surface-variant min-w-[60px] px-2 py-2 text-center font-medium whitespace-nowrap"
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
                className="bg-surface-dim hover:bg-surface-variant cursor-pointer"
                onClick={() => toggleDept(dept.departmentId)}
              >
                <td
                  colSpan={data.months.length + 1}
                  className="bg-surface-dim text-on-surface sticky left-0 z-10 px-3 py-1.5 font-semibold"
                >
                  {isCollapsed ? (
                    <ChevronRight size={16} className="mr-1 inline" />
                  ) : (
                    <ChevronDown size={16} className="mr-1 inline" />
                  )}
                  {dept.departmentName} ({dept.people.length})
                </td>
              </tr>
              {/* Person rows (hidden when collapsed) */}
              {!isCollapsed &&
                dept.people.map((person) => (
                  <tr
                    key={person.personId}
                    className="border-outline/30 hover:bg-surface-variant/30 border-t"
                  >
                    <td className="bg-surface sticky left-0 z-10 px-3 py-1 whitespace-nowrap">
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
