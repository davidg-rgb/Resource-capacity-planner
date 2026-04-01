'use client';

import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useMemo, useState, useCallback } from 'react';

import { CHART_COLORS, CHART_FONT } from './chart-colors';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StackedAreaGroup {
  id: string;
  name: string;
  color: string;
  months: Record<string, number>;
  totalHours: number;
  percentOfTotal: number;
}

export interface StackedAreaChartProps {
  groups: StackedAreaGroup[];
  other?: {
    months: Record<string, number>;
    totalHours: number;
    percentOfTotal: number;
  };
  supply: Record<string, number>;
  months: string[];
  insight?: string;
  /** Called when user clicks a group area segment */
  onGroupClick?: (groupId: string) => void;
}

interface ChartDataRow {
  month: string;
  label: string;
  supply: number;
  [key: string]: string | number;
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
  name: string;
  value: number;
  color: string;
}

function StackedTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  // Filter out the supply line from the stacked area entries
  const areaEntries = payload.filter((p) => p.dataKey !== 'supply');
  const total = areaEntries.reduce((sum, p) => sum + (p.value || 0), 0);

  return (
    <div
      className="bg-surface-container-lowest max-h-[280px] overflow-y-auto rounded-md border px-3 py-2 shadow-md"
      style={{ fontFamily: CHART_FONT.family, fontSize: CHART_FONT.size }}
    >
      <p className="mb-1 font-semibold">{label}</p>
      {areaEntries.map((entry) => {
        const pct = total > 0 ? ((entry.value / total) * 100).toFixed(0) : '0';
        return (
          <p key={entry.dataKey} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}: <strong>{entry.value.toLocaleString('sv-SE')}h</strong>{' '}
            <span className="text-muted-foreground">({pct}%)</span>
          </p>
        );
      })}
      {total > 0 && (
        <p className="mt-1 border-t pt-1">
          Total: <strong>{total.toLocaleString('sv-SE')}h</strong>
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Chart Component
// ---------------------------------------------------------------------------

/**
 * V5: Stacked Area Chart -- Capacity by Project/Department/Discipline
 *
 * Shows how total allocated hours are distributed across groups over time.
 * Groups beyond the limit are aggregated into an "Other" bucket.
 * A dashed supply overlay line shows total capacity.
 */
export function StackedAreaDistributionChart({
  groups,
  other,
  supply,
  months,
  insight,
  onGroupClick,
}: StackedAreaChartProps) {
  // Track hidden series via legend clicks
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  const allSeries = useMemo(() => {
    const series = groups.map((g) => ({
      key: `group_${g.id}`,
      id: g.id,
      name: g.name,
      color: g.color,
      months: g.months,
    }));
    if (other) {
      series.push({
        key: 'group_other',
        id: '__other__',
        name: 'Other',
        color: CHART_COLORS.idle,
        months: other.months,
      });
    }
    return series;
  }, [groups, other]);

  const chartData = useMemo<ChartDataRow[]>(() => {
    return months.map((m) => {
      const row: ChartDataRow = {
        month: m,
        label: formatMonthLabel(m),
        supply: supply[m] ?? 0,
      };
      for (const s of allSeries) {
        row[s.key] = s.months[m] ?? 0;
      }
      return row;
    });
  }, [months, supply, allSeries]);

  const handleLegendClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (entry: any) => {
      const key = String(entry?.dataKey ?? '');
      if (!key) return;
      setHiddenKeys((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    },
    [],
  );

  const handleAreaClick = useCallback(
    (dataKey: string) => {
      if (!onGroupClick) return;
      const series = allSeries.find((s) => s.key === dataKey);
      if (series && series.id !== '__other__') {
        onGroupClick(series.id);
      }
    },
    [allSeries, onGroupClick],
  );

  return (
    <div className="flex flex-col gap-3">
      <ResponsiveContainer width="100%" height={340}>
        <AreaChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 10 }}>
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
          <Tooltip content={<StackedTooltip />} />
          <Legend
            wrapperStyle={{
              fontSize: CHART_FONT.size,
              fontFamily: CHART_FONT.family,
              cursor: 'pointer',
            }}
            onClick={handleLegendClick}
          />

          {/* Stacked areas for each group */}
          {allSeries.map((s) => (
            <Area
              key={s.key}
              dataKey={s.key}
              name={s.name}
              stackId="capacity"
              fill={s.color}
              stroke={s.color}
              fillOpacity={hiddenKeys.has(s.key) ? 0 : 0.7}
              strokeOpacity={hiddenKeys.has(s.key) ? 0 : 1}
              strokeWidth={1}
              hide={hiddenKeys.has(s.key)}
              onClick={() => handleAreaClick(s.key)}
              style={{ cursor: onGroupClick && s.id !== '__other__' ? 'pointer' : 'default' }}
            />
          ))}

          {/* Supply overlay line */}
          <Line
            dataKey="supply"
            name="Supply"
            stroke={CHART_COLORS.text}
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            activeDot={{ r: 4 }}
            legendType="plainline"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Insight callout */}
      {insight && (
        <p className="bg-surface-container text-on-surface-variant rounded-md px-3 py-2 text-xs">
          {insight}
        </p>
      )}
    </div>
  );
}
