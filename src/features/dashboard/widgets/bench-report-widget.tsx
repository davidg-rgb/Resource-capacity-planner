'use client';

import React, { useState } from 'react';
import {
  Users,
  TrendingDown,
  TrendingUp,
  Minus,
  ChevronDown,
  ChevronUp,
  UserPlus,
} from 'lucide-react';

import { useBenchReport } from '@/hooks/use-bench-report';
import { registerWidget } from '../widget-registry';
import type { WidgetProps } from '../widget-registry.types';

// ---------------------------------------------------------------------------
// V8: Bench & Idle Cost Report Widget
// ---------------------------------------------------------------------------

const THRESHOLD_DEFAULT = 80;

function TrendArrow({ direction }: { direction: 'up' | 'down' | 'stable' }) {
  if (direction === 'down') return <TrendingDown size={14} className="text-tertiary inline" />;
  if (direction === 'up') return <TrendingUp size={14} className="text-error inline" />;
  return <Minus size={14} className="text-outline inline" />;
}

/** Inline horizontal bar scaled to percentage of max value. */
function InlineBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="bg-surface-container-high h-3 w-full rounded-sm">
      <div className="bg-primary h-3 rounded-sm transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

const BenchReportContent = React.memo(function BenchReportContent({ timeRange }: WidgetProps) {
  const [showAllPeople, setShowAllPeople] = useState(false);
  const { data, isLoading, error } = useBenchReport(
    timeRange.from,
    timeRange.to,
    THRESHOLD_DEFAULT,
  );

  if (error) {
    return <div className="text-sm text-red-600">Failed to load bench report</div>;
  }

  if (isLoading || !data) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface-container-high h-20 rounded-sm" />
          ))}
        </div>
        <div className="bg-surface-container-high h-40 rounded-sm" />
      </div>
    );
  }

  const { summary, byDepartment, byDiscipline, topAvailable, insight } = data;

  if (byDepartment.length === 0 && byDiscipline.length === 0) {
    return (
      <div className="bg-surface-container-low text-on-surface-variant rounded-sm p-6 text-sm">
        No bench data found for the selected period.
      </div>
    );
  }

  const maxDeptHours = Math.max(...byDepartment.map((d) => d.benchHours), 1);
  const maxDiscHours = Math.max(...byDiscipline.map((d) => d.benchHours), 1);
  const visiblePeople = showAllPeople ? topAvailable : topAvailable.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* --- Summary KPI Cards --- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-surface-container-low rounded-sm p-4 text-center">
          <div className="text-on-surface text-2xl font-bold tabular-nums">
            {summary.totalBenchHours.toLocaleString()}h
          </div>
          <div className="text-outline text-xs font-medium">Bench Hours</div>
        </div>
        <div className="bg-surface-container-low rounded-sm p-4 text-center">
          <div className="text-on-surface text-2xl font-bold tabular-nums">
            {summary.fteEquivalent.toFixed(1)} FTE
          </div>
          <div className="text-outline text-xs font-medium">Equivalent</div>
        </div>
        <div className="bg-surface-container-low rounded-sm p-4 text-center">
          <div className="text-on-surface text-2xl font-bold tabular-nums">
            {summary.peopleCount}
          </div>
          <div className="text-outline text-xs font-medium">People below {THRESHOLD_DEFAULT}%</div>
        </div>
      </div>

      {/* --- Trend --- */}
      <div className="text-on-surface-variant flex items-center gap-2 text-xs">
        <TrendArrow direction={summary.trendVsPrevious.direction} />
        <span>
          {summary.trendVsPrevious.direction === 'stable'
            ? 'Stable vs previous period'
            : `${Math.abs(summary.trendVsPrevious.changePercent)}% ${summary.trendVsPrevious.direction === 'down' ? 'decrease' : 'increase'} vs previous period (was ${summary.trendVsPrevious.previousBenchHours.toLocaleString()}h)`}
        </span>
      </div>

      {/* --- By Department --- */}
      {byDepartment.length > 0 && (
        <div>
          <h4 className="text-on-surface-variant mb-2 text-[10px] font-bold tracking-widest uppercase">
            By Department
          </h4>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-outline border-outline-variant/10 border-b text-[10px] font-bold tracking-wider uppercase">
                <th className="py-2 text-left">Department</th>
                <th className="w-1/3 py-2" />
                <th className="py-2 text-right">Hours</th>
                <th className="py-2 text-right">FTE</th>
              </tr>
            </thead>
            <tbody className="divide-outline-variant/5 divide-y">
              {byDepartment.map((dept) => (
                <tr
                  key={dept.departmentId}
                  className="hover:bg-surface-container-low transition-colors"
                >
                  <td className="text-on-surface py-2 font-medium">{dept.departmentName}</td>
                  <td className="px-2 py-2">
                    <InlineBar value={dept.benchHours} max={maxDeptHours} />
                  </td>
                  <td className="text-on-surface py-2 text-right tabular-nums">
                    {dept.benchHours.toLocaleString()}h
                  </td>
                  <td className="text-on-surface py-2 text-right tabular-nums">
                    {dept.fteEquivalent.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- By Discipline --- */}
      {byDiscipline.length > 0 && (
        <div>
          <h4 className="text-on-surface-variant mb-2 text-[10px] font-bold tracking-widest uppercase">
            By Discipline
          </h4>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-outline border-outline-variant/10 border-b text-[10px] font-bold tracking-wider uppercase">
                <th className="py-2 text-left">Discipline</th>
                <th className="w-1/3 py-2" />
                <th className="py-2 text-right">Hours</th>
                <th className="py-2 text-right">FTE</th>
              </tr>
            </thead>
            <tbody className="divide-outline-variant/5 divide-y">
              {byDiscipline.map((disc) => (
                <tr
                  key={disc.disciplineId}
                  className="hover:bg-surface-container-low transition-colors"
                >
                  <td className="text-on-surface py-2 font-medium">{disc.disciplineName}</td>
                  <td className="px-2 py-2">
                    <InlineBar value={disc.benchHours} max={maxDiscHours} />
                  </td>
                  <td className="text-on-surface py-2 text-right tabular-nums">
                    {disc.benchHours.toLocaleString()}h
                  </td>
                  <td className="text-on-surface py-2 text-right tabular-nums">
                    {disc.fteEquivalent.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- Top Available People --- */}
      {topAvailable.length > 0 && (
        <div>
          <h4 className="text-on-surface-variant mb-2 text-[10px] font-bold tracking-widest uppercase">
            People with Most Available Capacity
          </h4>
          <div className="divide-outline-variant/5 divide-y">
            {visiblePeople.map((person, idx) => (
              <div
                key={person.personId}
                className="hover:bg-surface-container-low flex items-center justify-between py-2 text-xs transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-outline w-5 text-right tabular-nums">{idx + 1}.</span>
                  <span className="text-on-surface font-medium">
                    {person.firstName} {person.lastName}
                  </span>
                  <span className="bg-secondary-container/50 rounded-full px-1.5 py-0.5 text-[9px] font-bold">
                    {person.disciplineAbbreviation}
                  </span>
                  <span className="text-outline">{person.departmentName}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-on-surface-variant tabular-nums">
                    {person.utilizationPercent}% util
                  </span>
                  <span className="text-on-surface font-medium tabular-nums">
                    {person.freeHoursPerMonth}h/mo free
                  </span>
                </div>
              </div>
            ))}
          </div>
          {topAvailable.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllPeople((prev) => !prev)}
              className="text-primary mt-1 flex items-center gap-1 text-xs font-medium hover:underline"
            >
              {showAllPeople ? (
                <>
                  Show less <ChevronUp size={12} />
                </>
              ) : (
                <>
                  Show all ({topAvailable.length}) <ChevronDown size={12} />
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* --- Insight Callout --- */}
      {insight && (
        <div className="bg-tertiary-container/20 border-tertiary/30 rounded-sm border-l-4 px-4 py-3 text-xs">
          <div className="text-on-surface flex items-start gap-2">
            <UserPlus size={14} className="text-tertiary mt-0.5 shrink-0" />
            <span>{insight}</span>
          </div>
        </div>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

registerWidget({
  id: 'bench-report',
  name: 'Bench Report',
  description:
    'Bench & idle cost analysis: KPI summary, department/discipline breakdown with bars, and top available people.',
  category: 'health-capacity',
  icon: Users,
  component: BenchReportContent,
  defaultColSpan: 12,
  minColSpan: 6,
  supportedDashboards: ['manager'],
  requiredFeatureFlag: 'dashboards',
  dataHook: 'useBenchReport',
});
