'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { CHART_COLORS, CHART_FONT } from './chart-colors';
import type { DisciplineBreakdown } from '@/features/analytics/analytics.types';

interface DisciplineChartProps {
  data: DisciplineBreakdown[];
}

/**
 * Horizontal bar chart showing total hours per discipline.
 * Parent must provide explicit height (e.g. h-[300px]) for ResponsiveContainer.
 */
export function DisciplineChart({ data }: DisciplineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ left: 120 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
        <XAxis
          type="number"
          tickFormatter={(v: number) => `${v}h`}
          tick={{
            fontSize: CHART_FONT.size,
            fontFamily: CHART_FONT.family,
            fill: CHART_COLORS.text,
          }}
        />
        <YAxis
          type="category"
          dataKey="disciplineName"
          width={110}
          tick={{
            fontSize: CHART_FONT.size,
            fontFamily: CHART_FONT.family,
            fill: CHART_COLORS.text,
          }}
        />
        <Tooltip
          formatter={(v) => [`${v} hours`, 'Total Hours']}
          contentStyle={{
            fontFamily: CHART_FONT.family,
            fontSize: CHART_FONT.size,
          }}
        />
        <Bar dataKey="totalHours" fill={CHART_COLORS.secondary} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
