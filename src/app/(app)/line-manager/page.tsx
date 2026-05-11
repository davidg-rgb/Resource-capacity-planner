'use client';

// v5.0 — Phase 41 / Plan 41-02 Task 3 (UX-V5-04, D-01, D-19):
// Line Manager Home — capacity heatmap for the active LM persona's department.
// Gated by <PersonaGate allowed={['line-manager']}>; fetches from
// GET /api/v5/capacity (shipped in Wave 0) via TanStack Query key
// `['line-manager-capacity', departmentId, monthRange]` per D-19.

import { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { usePersona } from '@/features/personas/persona.context';
import { PersonaGate } from '@/features/personas/persona-route-guard';
import { CapacityHeatmap } from '@/components/capacity/capacity-heatmap';
import { CapacityHeatmapLegend } from '@/components/capacity/capacity-heatmap-legend';
import { useFlags } from '@/features/flags/flag.context';
import { useLmQueueCount } from '@/features/proposals/use-lm-queue-count';
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
  const flags = useFlags();

  const departmentId = persona.kind === 'line-manager' ? persona.departmentId : '';

  const months = useMemo(() => generateMonthRange(getCurrentMonth(), MONTH_HORIZON), []);
  const startMonth = months[0];
  const endMonth = months[months.length - 1];
  const monthRange = `${startMonth}:${endMonth}`;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['line-manager-capacity', departmentId, monthRange],
    queryFn: () => fetchCapacity(departmentId, startMonth, endMonth),
    enabled: !!departmentId,
  });

  // v6.0 — Phase 52 / Plan 52-04 (LM-01 / D-06): approval-queue badge.
  // Hook is always called (rules of hooks); the `enabled` gate suppresses the
  // fetch when the flag is off or persona/dept aren't ready. The badge itself
  // is only rendered when `flag ON && count > 0` — flag-OFF = Phase 51 parity.
  const { data: queueCount = 0 } = useLmQueueCount(
    departmentId || null,
    flags.uiV6PerJourney && persona.kind === 'line-manager',
  );
  const showBadge = flags.uiV6PerJourney && queueCount > 0;
  const badgeLabel = safeTCount(
    t,
    'home.approvalQueueBadge.label',
    queueCount,
    `${queueCount} pending approvals`,
  );

  const title = safeT(t, 'home.title', 'Team capacity');

  return (
    <div className="space-y-4 p-8">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-headline text-2xl font-bold">{title}</h1>
        <div className="flex items-center gap-3">
          {showBadge && (
            <Link
              href="/line-manager/approval-queue"
              data-clicks="true"
              data-testid="lm-approval-queue-badge"
              className="bg-primary/10 text-primary hover:bg-primary/20 rounded-full px-3 py-1 text-xs font-medium"
            >
              {badgeLabel}
            </Link>
          )}
          <CapacityHeatmapLegend />
        </div>
      </div>
      {!departmentId && (
        <div className="text-on-surface-variant p-4 text-sm">{t('home.selectDepartment')}</div>
      )}
      {isLoading && (
        <div
          data-testid="lm-home-skeleton"
          className="bg-surface-container-low h-64 animate-pulse rounded-md"
        />
      )}
      {error && (
        <div className="border-error/30 bg-error-container/20 flex items-center justify-between gap-3 rounded-md border-l-4 p-4 text-sm">
          <span className="text-error">{t('home.error')}</span>
          <button
            type="button"
            onClick={() => refetch()}
            className="bg-primary text-on-primary rounded px-3 py-1 text-xs disabled:opacity-50"
          >
            {t('home.retry')}
          </button>
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

function safeTCount(
  t: ReturnType<typeof useTranslations>,
  key: string,
  count: number,
  fallback: string,
): string {
  try {
    const v = t(key, { count });
    return typeof v === 'string' && v.length > 0 ? v : fallback;
  } catch {
    return fallback;
  }
}
