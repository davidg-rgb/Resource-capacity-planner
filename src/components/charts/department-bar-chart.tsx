'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { CHART_COLORS, CHART_FONT } from './chart-colors';
import type { DepartmentUtilization } from '@/features/analytics/analytics.types';

interface DepartmentBarChartProps {
  data: DepartmentUtilization[];
}

/**
 * Horizontal bar chart showing utilization percentage per department.
 * Parent must provide explicit height (e.g. h-[300px]) for ResponsiveContainer.
 */
export function DepartmentBarChart({ data }: DepartmentBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ left: 120 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
        <XAxis
          type="number"
          domain={[0, 'auto']}
          tickFormatter={(v: number) => `${v}%`}
          tick={{
            fontSize: CHART_FONT.size,
            fontFamily: CHART_FONT.family,
            fill: CHART_COLORS.text,
          }}
        />
        <YAxis
          type="category"
          dataKey="departmentName"
          width={110}
          tick={{
            fontSize: CHART_FONT.size,
            fontFamily: CHART_FONT.family,
            fill: CHART_COLORS.text,
          }}
        />
        <Tooltip
          formatter={(v) => [`${v}%`, 'Utilization']}
          contentStyle={{
            fontFamily: CHART_FONT.family,
            fontSize: CHART_FONT.size,
          }}
        />
        <Bar dataKey="utilizationPercent" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
