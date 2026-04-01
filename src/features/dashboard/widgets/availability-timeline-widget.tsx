'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { CalendarRange, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

import { formatMonthHeader } from '@/lib/date-utils';
import { CHART_COLORS } from '@/components/charts/chart-colors';
import { useAvailabilityTimeline } from '@/hooks/use-availability-timeline';
import { usePersonCard } from '@/features/dashboard/person-card/person-card-provider';
import { registerWidget } from '../widget-registry';
import type { WidgetProps } from '../widget-registry.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Assign a colour from the palette based on project index. */
function getProjectColor(color: string | undefined, index: number): string {
  return color ?? CHART_COLORS.palette[index % CHART_COLORS.palette.length];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface AllocationBarProps {
  projectName: string;
  hours: number;
  targetHours: number;
  color: string;
  /** Fractional height within the cell (0-1) when stacked. */
  heightFraction: number;
}

function AllocationBar({
  projectName,
  hours,
  targetHours,
  color,
  heightFraction,
}: AllocationBarProps) {
  const widthPercent = Math.min((hours / targetHours) * 100, 100);
  const minHeight = Math.max(heightFraction * 100, 20);

  return (
    <div
      className="group/bar relative overflow-hidden rounded-xs"
      style={{ height: `${minHeight}%`, minHeight: '14px' }}
      title={`${projectName}: ${hours}h / ${targetHours}h`}
    >
      <div
        className="h-full rounded-xs transition-opacity group-hover/bar:opacity-80"
        style={{
          width: `${widthPercent}%`,
          backgroundColor: color,
          minWidth: '4px',
        }}
      />
      {widthPercent > 30 && (
        <span className="absolute inset-0 flex items-center truncate px-1.5 text-[9px] font-bold text-white">
          {projectName}
        </span>
      )}
    </div>
  );
}

interface TimelineCellProps {
  monthData:
    | {
        totalAllocated: number;
        available: number;
        utilizationPercent: number;
        projects: { projectId: string; projectName: string; hours: number; color: string }[];
      }
    | undefined;
  targetHours: number;
  isCurrentMonth: boolean;
}

function TimelineCell({ monthData, targetHours, isCurrentMonth }: TimelineCellProps) {
  if (!monthData || monthData.totalAllocated === 0) {
    // Fully available — white / available pattern
    return (
      <td
        className={`relative px-1 py-1.5 text-center ${isCurrentMonth ? 'bg-primary/5 border-primary/10 border-x' : ''}`}
      >
        <div className="bg-surface-container-low/40 border-outline-variant/20 flex h-8 items-center justify-center rounded-xs border border-dashed">
          <span className="text-outline-variant text-[9px]">{targetHours}h</span>
        </div>
      </td>
    );
  }

  const isOverloaded = monthData.utilizationPercent > 100;
  const isPartial = monthData.utilizationPercent < 80;

  let bgClass = '';
  if (isOverloaded) bgClass = 'bg-error/5';
  else if (isPartial) bgClass = '';

  return (
    <td
      className={`relative px-1 py-1.5 ${bgClass} ${isCurrentMonth ? 'bg-primary/5 border-primary/10 border-x' : ''}`}
    >
      <div className="flex flex-col gap-0.5" style={{ minHeight: '32px' }}>
        {monthData.projects.map((proj, idx) => (
          <AllocationBar
            key={proj.projectId}
            projectName={proj.projectName}
            hours={proj.hours}
            targetHours={targetHours}
            color={getProjectColor(proj.color, idx)}
            heightFraction={
              monthData.projects.length > 1 ? proj.hours / monthData.totalAllocated : 1
            }
          />
        ))}
      </div>
      {isOverloaded && (
        <div className="text-error absolute top-0 right-0.5 text-[8px] font-bold">
          {monthData.utilizationPercent}%
        </div>
      )}
    </td>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const AvailabilityTimelineContent = React.memo(function AvailabilityTimelineContent({
  timeRange,
}: WidgetProps) {
  const { openPersonCard } = usePersonCard();
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set());
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  const { data, isLoading, error } = useAvailabilityTimeline(
    timeRange.from,
    timeRange.to,
    showAvailableOnly ? { availableOnly: true } : undefined,
  );

  const currentMonth = getCurrentMonth();

  const toggleDept = useCallback((deptId: string) => {
    setCollapsedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) next.delete(deptId);
      else next.add(deptId);
      return next;
    });
  }, []);

  // Filter people who have any availability if toggle is on (client-side supplement)
  const departments = useMemo(() => {
    if (!data) return [];
    if (!showAvailableOnly) return data.departments;
    return data.departments
      .map((dept) => ({
        ...dept,
        people: dept.people.filter((p) => Object.values(p.months).some((m) => m.available > 0)),
      }))
      .filter((dept) => dept.people.length > 0);
  }, [data, showAvailableOnly]);

  if (error) {
    return (
      <div className="text-destructive flex items-center justify-center py-10 text-sm">
        Failed to load timeline data
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (departments.length === 0) {
    return (
      <div className="text-on-surface-variant py-10 text-center text-sm">
        No timeline data available
      </div>
    );
  }

  return (
    <div>
      {/* Header with filter toggle */}
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-headline text-sm font-semibold">Resource Availability Timeline</h4>
        <label className="text-on-surface-variant flex cursor-pointer items-center gap-1.5 text-[11px]">
          <input
            type="checkbox"
            checked={showAvailableOnly}
            onChange={(e) => setShowAvailableOnly(e.target.checked)}
            className="accent-primary h-3 w-3"
          />
          Show available only
        </label>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest border-outline-variant/10 overflow-hidden rounded-sm border shadow-sm">
        <div className="custom-scrollbar overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="bg-surface-container-low text-outline border-outline-variant/10 border-b text-[11px] font-bold tracking-wider uppercase">
                <th
                  scope="col"
                  className="bg-surface-container-low sticky left-0 z-20 w-52 px-4 py-3"
                >
                  Person
                </th>
                {data.months.map((m) => (
                  <th
                    scope="col"
                    key={m}
                    className={`px-2 py-3 text-center whitespace-nowrap ${m === currentMonth ? 'bg-surface-container-high/50' : ''}`}
                  >
                    {formatMonthHeader(m)}
                  </th>
                ))}
              </tr>
            </thead>
            {departments.map((dept) => {
              const isCollapsed = collapsedDepts.has(dept.departmentId);
              return (
                <tbody key={dept.departmentId} className="divide-outline-variant/5 divide-y">
                  {/* Department header */}
                  <tr
                    className="bg-surface-container-low/30 cursor-pointer"
                    role="button"
                    tabIndex={0}
                    aria-expanded={!isCollapsed}
                    onClick={() => toggleDept(dept.departmentId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleDept(dept.departmentId);
                      }
                    }}
                  >
                    <td
                      colSpan={data.months.length + 1}
                      className="text-outline-variant px-4 py-2 text-[10px] font-bold tracking-widest uppercase"
                    >
                      {isCollapsed ? (
                        <ChevronRight size={14} className="mr-1 inline" />
                      ) : (
                        <ChevronDown size={14} className="mr-1 inline" />
                      )}
                      {dept.departmentName} ({dept.people.length})
                    </td>
                  </tr>

                  {/* Person rows */}
                  {!isCollapsed &&
                    dept.people.map((person) => (
                      <tr
                        key={person.personId}
                        className="hover:bg-surface-container-low group transition-colors"
                      >
                        <td className="bg-surface-container-lowest group-hover:bg-surface-container-low border-outline-variant/10 sticky left-0 z-10 border-r px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="bg-primary-container text-on-primary-container flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold">
                              {getInitials(person.firstName, person.lastName)}
                            </div>
                            <div className="min-w-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPersonCard(person.personId);
                                }}
                                className="text-on-surface hover:text-primary block truncate text-[11px] font-semibold transition-colors"
                              >
                                {person.firstName} {person.lastName}
                              </button>
                              <div className="flex items-center gap-1">
                                {person.disciplineAbbreviation && (
                                  <span className="bg-secondary-container/50 rounded-full px-1 py-0 text-[8px] font-bold">
                                    {person.disciplineAbbreviation}
                                  </span>
                                )}
                                <span className="text-outline-variant text-[8px]">
                                  {person.targetHoursPerMonth}h
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        {data.months.map((m) => (
                          <TimelineCell
                            key={m}
                            monthData={person.months[m]}
                            targetHours={person.targetHoursPerMonth}
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

      {/* Legend + Insight bar */}
      <div className="text-outline-variant mt-2 flex flex-wrap items-center justify-between text-[10px]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-4 rounded-xs"
              style={{ backgroundColor: CHART_COLORS.primary }}
            />
            Allocated
          </span>
          <span className="flex items-center gap-1">
            <span className="border-outline-variant/30 bg-surface-container-low/40 inline-block h-2.5 w-4 rounded-xs border border-dashed" />
            Available
          </span>
          <span className="flex items-center gap-1">
            <span className="bg-error/20 inline-block h-2.5 w-4 rounded-xs" />
            Overloaded
          </span>
        </div>
        {data.summary && (
          <span className="text-on-surface-variant">
            {data.summary.peopleWithAvailability} people with{' '}
            {data.summary.totalAvailableHours.toLocaleString()}h available
          </span>
        )}
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

registerWidget({
  id: 'availability-timeline',
  name: 'Resource Availability Timeline',
  description:
    'Gantt-style swimlane view showing per-person allocation blocks over time with availability gaps.',
  category: 'timelines-planning',
  icon: CalendarRange,
  component: AvailabilityTimelineContent,
  defaultColSpan: 12,
  minColSpan: 6,
  supportedDashboards: ['project-leader', 'manager'],
  dataHook: 'useAvailabilityTimeline',
});
