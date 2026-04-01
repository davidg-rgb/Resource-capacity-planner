'use client';

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useMemo, useCallback } from 'react';

import { CHART_COLORS, CHART_FONT } from './chart-colors';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CapacityForecastChartProps {
  months: string[];
  supply: Record<string, number>;
  demand: Record<string, number>;
  gap: Record<string, number>;
  summary: {
    surplusMonths: number;
    balancedMonths: number;
    deficitMonths: number;
  };
  /** Optional hiring trigger line value (hours threshold) */
  hiringTrigger?: number;
  /** If provided, clicking a deficit month calls this with YYYY-MM */
  onDeficitClick?: (month: string) => void;
}

interface ChartDataPoint {
  month: string;
  label: string;
  supply: number;
  demand: number;
  /** Range tuple [lower, upper] for surplus shading (green) */
  surplusRange: [number, number];
  /** Range tuple [lower, upper] for deficit shading (red) */
  deficitRange: [number, number];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMonthLabel(yyyyMm: string): string {
  const [year, month] = yyyyMm.split('-');
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Maj',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Okt',
    'Nov',
    'Dec',
  ];
  return `${monthNames[parseInt(month, 10) - 1]} ${year.slice(2)}`;
}

function formatHours(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${value}`;
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface TooltipPayloadEntry {
  dataKey: string;
  value: number;
  payload: ChartDataPoint;
}

function ForecastTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  if (!point) return null;

  const gapValue = point.supply - point.demand;
  const gapPercent = point.supply > 0 ? ((gapValue / point.supply) * 100).toFixed(1) : '0.0';
  const gapType = gapValue > 0 ? 'Surplus' : gapValue < 0 ? 'Deficit' : 'Balanced';
  const gapColor =
    gapType === 'Surplus'
      ? CHART_COLORS.healthy
      : gapType === 'Deficit'
        ? CHART_COLORS.over
        : CHART_COLORS.textMuted;

  return (
    <div
      className="rounded-md border bg-white px-3 py-2 shadow-md"
      style={{ fontFamily: CHART_FONT.family, fontSize: CHART_FONT.size }}
    >
      <p className="mb-1 font-semibold">{point.label}</p>
      <p>
        Supply: <strong>{point.supply.toLocaleString('sv-SE')}h</strong>
      </p>
      <p>
        Demand: <strong>{point.demand.toLocaleString('sv-SE')}h</strong>
      </p>
      <p style={{ color: gapColor }}>
        {gapType}: <strong>{Math.abs(gapValue).toLocaleString('sv-SE')}h</strong> ({gapPercent}%)
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Chart Component
// ---------------------------------------------------------------------------

/**
 * V1: Capacity Forecast Line Chart
 *
 * Shows demand vs supply lines with gap shading (green for surplus, red for
 * deficit) and an optional hiring trigger reference line.
 *
 * Gap shading uses range-type Area elements with [min, max] tuples so each
 * area spans from the lower line to the upper line only in months where the
 * relevant gap condition is true.
 */
export function CapacityForecastChart({
  months,
  supply,
  demand,
  gap,
  summary,
  hiringTrigger,
  onDeficitClick,
}: CapacityForecastChartProps) {
  const chartData = useMemo<ChartDataPoint[]>(() => {
    return months.map((m) => {
      const s = supply[m] ?? 0;
      const d = demand[m] ?? 0;
      const g = gap[m] ?? s - d;
      return {
        month: m,
        label: formatMonthLabel(m),
        supply: s,
        demand: d,
        // Surplus: shade from demand up to supply (green)
        // When no surplus, collapse range to a zero-height band at demand level
        surplusRange: g > 0 ? [d, s] : [d, d],
        // Deficit: shade from supply up to demand (red)
        deficitRange: g < 0 ? [s, d] : [s, s],
      };
    });
  }, [months, supply, demand, gap]);

  const handleClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => {
      if (!onDeficitClick) return;
      const point = state?.activePayload?.[0]?.payload as ChartDataPoint | undefined;
      if (!point) return;
      const g = gap[point.month] ?? 0;
      if (g < 0) {
        onDeficitClick(point.month);
      }
    },
    [onDeficitClick, gap],
  );

  return (
    <div className="flex flex-col gap-3">
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart
          data={chartData}
          onClick={handleClick}
          margin={{ top: 10, right: 20, bottom: 0, left: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{
              fontSize: CHART_FONT.size,
              fontFamily: CHART_FONT.family,
              fill: CHART_COLORS.text,
            }}
            tickLine={false}
            axisLine={{ stroke: CHART_COLORS.grid }}
          />
          <YAxis
            tickFormatter={(v: number) => formatHours(v)}
            tick={{
              fontSize: CHART_FONT.size,
              fontFamily: CHART_FONT.family,
              fill: CHART_COLORS.text,
            }}
            tickLine={false}
            axisLine={false}
            width={50}
          />
          <Tooltip content={<ForecastTooltip />} />
          <Legend wrapperStyle={{ fontSize: CHART_FONT.size, fontFamily: CHART_FONT.family }} />

          {/* Gap shading: surplus (green) — range area from demand to supply */}
          <Area
            dataKey="surplusRange"
            stroke="none"
            fill={CHART_COLORS.healthy}
            fillOpacity={0.2}
            connectNulls={false}
            legendType="none"
            isAnimationActive={false}
            name="Surplus"
          />

          {/* Gap shading: deficit (red) — range area from supply to demand */}
          <Area
            dataKey="deficitRange"
            stroke="none"
            fill={CHART_COLORS.over}
            fillOpacity={0.2}
            connectNulls={false}
            legendType="none"
            isAnimationActive={false}
            name="Deficit"
          />

          {/* Supply line */}
          <Line
            dataKey="supply"
            name="Supply"
            stroke={CHART_COLORS.healthy}
            strokeWidth={2}
            dot={{ r: 3, fill: CHART_COLORS.healthy }}
            activeDot={{ r: 5 }}
          />

          {/* Demand line */}
          <Line
            dataKey="demand"
            name="Demand"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            dot={{ r: 3, fill: CHART_COLORS.primary }}
            activeDot={{ r: 5 }}
          />

          {/* Hiring trigger reference line */}
          {hiringTrigger != null && (
            <ReferenceLine
              y={hiringTrigger}
              stroke={CHART_COLORS.under}
              strokeDasharray="6 4"
              strokeWidth={1.5}
              label={{
                value: `Hiring trigger: ${formatHours(hiringTrigger)}h`,
                position: 'insideTopRight',
                fill: CHART_COLORS.under,
                fontSize: CHART_FONT.smallSize,
                fontFamily: CHART_FONT.family,
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Summary bar */}
      <div className="flex items-center gap-4 px-2 text-xs">
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: CHART_COLORS.healthy }}
          />
          Surplus: {summary.surplusMonths}
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: CHART_COLORS.textMuted }}
          />
          Balanced: {summary.balancedMonths}
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: CHART_COLORS.over }}
          />
          Deficit: {summary.deficitMonths}
        </span>
      </div>
    </div>
  );
}
