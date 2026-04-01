'use client';

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { CHART_COLORS, CHART_FONT } from './chart-colors';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GaugeData {
  id: string;
  name: string;
  utilizationPercent: number;
  headcount?: number;
  changePercent?: number;
  direction?: 'up' | 'down' | 'stable';
}

interface CapacityGaugesProps {
  departments: GaugeData[];
  showTrend?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getUtilizationColor(pct: number): string {
  if (pct > 100) return CHART_COLORS.over;
  if (pct >= 85) return CHART_COLORS.under; // amber for 85-100%
  return CHART_COLORS.healthy;
}

function getDirectionArrow(direction?: 'up' | 'down' | 'stable'): string {
  switch (direction) {
    case 'up':
      return '\u25B2';
    case 'down':
      return '\u25BC';
    default:
      return '\u2192';
  }
}

function getChangeColor(changePercent: number, currentUtil: number): string {
  // Red if trending toward overload, green if trending toward healthy
  if (currentUtil > 100) {
    return changePercent > 0 ? CHART_COLORS.over : CHART_COLORS.healthy;
  }
  if (currentUtil >= 85) {
    return changePercent > 0 ? CHART_COLORS.under : CHART_COLORS.healthy;
  }
  return changePercent > 5 ? CHART_COLORS.under : CHART_COLORS.healthy;
}

// ---------------------------------------------------------------------------
// Single Gauge Component
// ---------------------------------------------------------------------------

const GAUGE_START_ANGLE = 225; // 270-degree arc: from 225 to -45
const GAUGE_END_ANGLE = -45;
const BG_COLOR = '#e5e7eb'; // surface-container fallback

const SingleGauge = React.memo(function SingleGauge({
  dept,
  showTrend,
}: {
  dept: GaugeData;
  showTrend?: boolean;
}) {
  const router = useRouter();
  const fillPct = Math.min(dept.utilizationPercent, 120); // Cap visual at 120%
  const fillColor = getUtilizationColor(dept.utilizationPercent);

  const gaugeData = useMemo(
    () => [
      { name: 'filled', value: fillPct },
      { name: 'empty', value: Math.max(0, 100 - fillPct) },
    ],
    [fillPct],
  );

  return (
    <button
      type="button"
      className="bg-surface-container-lowest hover:bg-surface-container-low flex cursor-pointer flex-col items-center rounded-lg border border-transparent p-4 transition-colors hover:border-[var(--md-sys-color-outline-variant)]"
      onClick={() => router.push(`/dashboard/team?dept=${dept.id}`)}
      aria-label={`${dept.name}: ${dept.utilizationPercent}% utilization`}
    >
      {/* Gauge */}
      <div className="relative h-28 w-28">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={gaugeData}
              cx="50%"
              cy="55%"
              startAngle={GAUGE_START_ANGLE}
              endAngle={GAUGE_END_ANGLE}
              innerRadius="70%"
              outerRadius="95%"
              dataKey="value"
              stroke="none"
              isAnimationActive={false}
            >
              <Cell fill={fillColor} />
              <Cell fill={BG_COLOR} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center pt-1">
          <span
            className="text-on-surface text-xl font-bold tabular-nums"
            style={{ fontFamily: CHART_FONT.headlineFamily }}
          >
            {Math.round(dept.utilizationPercent)}%
          </span>
        </div>
      </div>

      {/* Department name */}
      <div className="mt-1 flex items-center gap-1">
        <span
          className="text-on-surface text-sm font-semibold"
          style={{ fontFamily: CHART_FONT.headlineFamily }}
        >
          {dept.name}
        </span>
        {dept.utilizationPercent > 100 && (
          <AlertTriangle className="h-3.5 w-3.5 text-[var(--md-sys-color-error)]" />
        )}
      </div>

      {/* Headcount */}
      {dept.headcount !== undefined && (
        <span className="text-on-surface-variant text-xs">{dept.headcount} people</span>
      )}

      {/* Trend indicator */}
      {showTrend && dept.changePercent !== undefined && (
        <span
          className="mt-0.5 text-xs font-medium tabular-nums"
          style={{ color: getChangeColor(dept.changePercent, dept.utilizationPercent) }}
        >
          {getDirectionArrow(dept.direction)} {dept.changePercent > 0 ? '+' : ''}
          {dept.changePercent}%
        </span>
      )}
    </button>
  );
});

// ---------------------------------------------------------------------------
// Capacity Gauges Grid
// ---------------------------------------------------------------------------

export const CapacityGauges = React.memo(function CapacityGauges({
  departments,
  showTrend = true,
}: CapacityGaugesProps) {
  if (departments.length === 0) {
    return (
      <div className="text-on-surface-variant py-10 text-center text-sm">
        No department data available
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-4">
      {departments.map((dept) => (
        <SingleGauge key={dept.id} dept={dept} showTrend={showTrend} />
      ))}
    </div>
  );
});

export default CapacityGauges;
