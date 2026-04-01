'use client';

import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { CHART_COLORS } from './chart-colors';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SparklineEntity {
  id: string;
  name: string;
  type: 'department' | 'person';
  headcount?: number;
  /** Ordered YYYY-MM -> utilization % entries (oldest first) */
  months: Record<string, number>;
  currentUtilization: number;
  changePercent: number;
  direction: 'up' | 'down' | 'stable';
  isOverloaded: boolean;
}

interface UtilizationSparklinesProps {
  entities: SparklineEntity[];
  viewMode: 'department' | 'person';
  onViewModeChange?: (mode: 'department' | 'person') => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getUtilizationColor(pct: number): string {
  if (pct > 100) return CHART_COLORS.over;
  if (pct >= 85) return CHART_COLORS.under;
  return CHART_COLORS.healthy;
}

function getDirectionArrow(direction: 'up' | 'down' | 'stable'): string {
  switch (direction) {
    case 'up':
      return '\u25B2';
    case 'down':
      return '\u25BC';
    default:
      return '\u2192';
  }
}

function getChangeColor(change: number, current: number): string {
  if (current > 100) return change > 0 ? CHART_COLORS.over : CHART_COLORS.healthy;
  if (current >= 85) return change > 0 ? CHART_COLORS.under : CHART_COLORS.healthy;
  return change > 5 ? CHART_COLORS.under : CHART_COLORS.healthy;
}

// ---------------------------------------------------------------------------
// SVG Sparkline — custom path for lightweight rendering
// ---------------------------------------------------------------------------

const SPARK_W = 80;
const SPARK_H = 24;
const SPARK_PADDING = 2;

const SparklineSvg = React.memo(function SparklineSvg({
  values,
  isOverloaded,
}: {
  values: number[];
  isOverloaded: boolean;
}) {
  const pathD = useMemo(() => {
    if (values.length < 2) return '';

    const min = Math.min(...values, 0);
    const max = Math.max(...values, 100);
    const range = max - min || 1;

    const usableW = SPARK_W - SPARK_PADDING * 2;
    const usableH = SPARK_H - SPARK_PADDING * 2;
    const step = usableW / (values.length - 1);

    return values
      .map((v, i) => {
        const x = SPARK_PADDING + i * step;
        const y = SPARK_PADDING + usableH - ((v - min) / range) * usableH;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [values]);

  if (!pathD) return null;

  return (
    <svg
      width={SPARK_W}
      height={SPARK_H}
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      className="shrink-0"
      role="img"
      aria-label="Utilization trend sparkline"
    >
      <path
        d={pathD}
        fill="none"
        stroke={isOverloaded ? CHART_COLORS.over : CHART_COLORS.primary}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

// ---------------------------------------------------------------------------
// Sparkline Row
// ---------------------------------------------------------------------------

const SparklineRow = React.memo(function SparklineRow({ entity }: { entity: SparklineEntity }) {
  const router = useRouter();

  const monthValues = useMemo(() => {
    const keys = Object.keys(entity.months).sort();
    return keys.map((k) => entity.months[k]);
  }, [entity.months]);

  const href =
    entity.type === 'department' ? `/dashboard/team?dept=${entity.id}` : `/input/${entity.id}`;

  return (
    <tr
      className="hover:bg-surface-container-low cursor-pointer transition-colors"
      onClick={() => router.push(href)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push(href);
        }
      }}
    >
      {/* Name */}
      <td className="text-on-surface py-2 pr-4 text-sm font-medium">
        <span className="hover:underline">{entity.name}</span>
      </td>

      {/* Sparkline */}
      <td className="py-2 pr-4">
        <SparklineSvg values={monthValues} isOverloaded={entity.isOverloaded} />
      </td>

      {/* Current value */}
      <td className="py-2 pr-4 text-right text-sm font-semibold tabular-nums">
        <span style={{ color: getUtilizationColor(entity.currentUtilization) }}>
          {entity.currentUtilization.toFixed(1)}%
        </span>
      </td>

      {/* Direction + change */}
      <td className="py-2 text-right text-sm tabular-nums">
        <span
          className="inline-flex items-center gap-1"
          style={{ color: getChangeColor(entity.changePercent, entity.currentUtilization) }}
        >
          {getDirectionArrow(entity.direction)} {entity.changePercent > 0 ? '+' : ''}
          {entity.changePercent}%
          {entity.isOverloaded && (
            <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-[var(--md-sys-color-error)]" />
          )}
        </span>
      </td>
    </tr>
  );
});

// ---------------------------------------------------------------------------
// Utilization Sparklines Table
// ---------------------------------------------------------------------------

export const UtilizationSparklines = React.memo(function UtilizationSparklines({
  entities,
  viewMode,
  onViewModeChange,
}: UtilizationSparklinesProps) {
  if (entities.length === 0) {
    return (
      <div className="text-on-surface-variant py-10 text-center text-sm">
        No utilization trend data available
      </div>
    );
  }

  return (
    <div>
      {/* View toggle */}
      {onViewModeChange && (
        <div className="mb-3 flex items-center gap-4 text-sm">
          <span className="text-on-surface-variant">View:</span>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="radio"
              name="sparkline-view"
              checked={viewMode === 'department'}
              onChange={() => onViewModeChange('department')}
              className="accent-[var(--md-sys-color-primary)]"
            />
            <span className="text-on-surface">Departments</span>
          </label>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="radio"
              name="sparkline-view"
              checked={viewMode === 'person'}
              onChange={() => onViewModeChange('person')}
              className="accent-[var(--md-sys-color-primary)]"
            />
            <span className="text-on-surface">People (top 10)</span>
          </label>
        </div>
      )}

      {/* Table */}
      <table className="w-full">
        <thead>
          <tr className="text-on-surface-variant border-b border-[var(--md-sys-color-outline-variant)] text-xs">
            <th scope="col" className="pr-4 pb-2 text-left font-medium">
              {viewMode === 'department' ? 'Department' : 'Person'}
            </th>
            <th scope="col" className="pr-4 pb-2 text-left font-medium">
              6-month trend
            </th>
            <th scope="col" className="pr-4 pb-2 text-right font-medium">
              Current
            </th>
            <th scope="col" className="pb-2 text-right font-medium">
              Direction
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--md-sys-color-outline-variant)]/30">
          {entities.map((entity) => (
            <SparklineRow key={entity.id} entity={entity} />
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="text-on-surface-variant mt-3 text-xs">
        <AlertTriangle className="mr-1 inline h-3 w-3 text-[var(--md-sys-color-error)]" /> =
        currently overloaded (&gt;100%) &middot; Trend period: last 6 months vs current month
      </div>
    </div>
  );
});

export default UtilizationSparklines;
