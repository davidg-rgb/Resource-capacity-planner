'use client';

// v6.0 Phase 53 Plan 03 POLISH-03 — Donut chart primitive for unified discipline widget.
// Mirrors the `DisciplineChart` (horizontal bar) recharts shape; shares `DisciplineBreakdown`
// row type (hours per discipline) so the unified widget can render either primitive.
// Pitfall 7: short-circuit on empty data — recharts PieChart warns + mis-renders when
// `data` is []; the empty-state div prevents the chart from mounting at all.

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

import { CHART_COLORS, CHART_FONT } from './chart-colors';
import type { DisciplineBreakdown } from '@/features/analytics/analytics.types';

interface DisciplineDonutProps {
  data: DisciplineBreakdown[];
  /** Override palette. Defaults to CHART_COLORS.categoricalPalette (UI-03). */
  colors?: string[];
}

/**
 * Donut chart variant of `DisciplineChart`.
 * Parent must provide explicit height via ResponsiveContainer; height=300 matches
 * `DisciplineChart` so toggling bar <-> donut does not reflow the containing widget.
 */
export function DisciplineDonut({ data, colors }: DisciplineDonutProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="text-on-surface-variant py-10 text-center text-sm italic"
        data-testid="discipline-donut-empty"
      >
        Ingen data
      </div>
    );
  }

  const palette = colors ?? CHART_COLORS.categoricalPalette;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="totalHours"
          nameKey="disciplineName"
          innerRadius="50%"
          outerRadius="80%"
          paddingAngle={2}
          isAnimationActive={false}
        >
          {data.map((_, i) => (
            <Cell
              key={`discipline-donut-cell-${i}`}
              data-testid={`discipline-donut-cell-${i}`}
              fill={palette[i % palette.length]}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(v) => [`${v} hours`, 'Total Hours']}
          contentStyle={{
            fontFamily: CHART_FONT.family,
            fontSize: CHART_FONT.size,
          }}
        />
        <Legend
          wrapperStyle={{
            fontFamily: CHART_FONT.family,
            fontSize: CHART_FONT.size,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
