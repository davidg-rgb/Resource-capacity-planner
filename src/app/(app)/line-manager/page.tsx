'use client';

// v5.0 — Phase 41 / Plan 41-02 Task 3 (UX-V5-04, D-01, D-19):
// Line Manager Home — capacity heatmap for the active LM persona's department.
// Gated by <PersonaGate allowed={['line-manager']}>; fetches from
// GET /api/v5/capacity (shipped in Wave 0) via TanStack Query key
// `['line-manager-capacity', departmentId, monthRange]` per D-19.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { usePersona } from '@/features/personas/persona.context';
import { PersonaGate } from '@/features/personas/persona-route-guard';
import { CapacityHeatmap } from '@/components/capacity/capacity-heatmap';
import { CapacityHeatmapLegend } from '@/components/capacity/capacity-heatmap-legend';
import { generateMonthRange, getCurrentMonth } from '@/lib/date-utils';
import type { UtilizationMap } from '@/features/capacity/capacity.types';

const MONTH_HORIZON = 12;

async function fetchCapacity(
  departmentId: string,
  startMonth: string,
  endMonth: string,
): Promise<UtilizationMap> {
  const url = `/api/v5/capacity?departmentId=${encodeURIComponent(
    departmentId,
  )}&startMonth=${encodeURIComponent(startMonth)}&endMonth=${encodeURIComponent(endMonth)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`capacity ${res.status}`);
  return (await res.json()) as UtilizationMap;
}

export default function LineManagerHomePage() {
  return (
    <PersonaGate allowed={['line-manager']}>
      <LineManagerHomeInner />
    </PersonaGate>
  );
}

function LineManagerHomeInner() {
  const { persona } = usePersona();
  const t = useTranslations('v5.lineManager');

  const departmentId = persona.kind === 'line-manager' ? persona.departmentId : '';

  const months = useMemo(() => generateMonthRange(getCurrentMonth(), MONTH_HORIZON), []);
  const startMonth = months[0];
  const endMonth = months[months.length - 1];
  const monthRange = `${startMonth}:${endMonth}`;

  const { data, isLoading, error } = useQuery({
    queryKey: ['line-manager-capacity', departmentId, monthRange],
    queryFn: () => fetchCapacity(departmentId, startMonth, endMonth),
    enabled: !!departmentId,
  });

  const title = safeT(t, 'home.title', 'Team capacity');

  return (
    <div className="space-y-4 p-8">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-headline text-2xl font-bold">{title}</h1>
        <CapacityHeatmapLegend />
      </div>
      {!departmentId && (
        <div className="text-on-surface-variant p-4 text-sm">
          {safeT(t, 'home.selectDepartment', 'Select a department in the persona switcher.')}
        </div>
      )}
      {isLoading && (
        <div
          data-testid="lm-home-skeleton"
          className="bg-surface-container-low h-64 animate-pulse rounded-md"
        />
      )}
      {error && (
        <div className="text-error p-4 text-sm">
          {safeT(t, 'home.error', 'Failed to load capacity.')}
        </div>
      )}
      {data && <CapacityHeatmap data={data} months={months} />}
    </div>
  );
}

function safeT(t: ReturnType<typeof useTranslations>, key: string, fallback: string): string {
  try {
    const v = t(key);
    return typeof v === 'string' && v.length > 0 ? v : fallback;
  } catch {
    return fallback;
  }
}
