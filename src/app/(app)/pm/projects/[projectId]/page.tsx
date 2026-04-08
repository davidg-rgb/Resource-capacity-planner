'use client';

// v5.0 — Phase 40 / Plan 40-03 (Wave 2): PM project timeline page shell.
// Loads PM timeline data via GET /api/v5/planning/allocations?scope=pm.
// Renders project header + placeholder where Wave 3 will mount
// <TimelineGrid /> built on PlanVsActualCell.

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';

import { usePersona } from '@/features/personas/persona.context';
import { generateMonthRange, getCurrentMonth } from '@/lib/date-utils';
import type { PmTimelineView } from '@/features/planning/planning.read';

function defaultMonthWindow(): { from: string; to: string } {
  const current = getCurrentMonth();
  const [y, m] = current.split('-').map(Number);
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
  const range = generateMonthRange(prev, 13);
  return { from: range[0]!, to: range[range.length - 1]! };
}

async function fetchPmTimeline(
  projectId: string,
  from: string,
  to: string,
): Promise<PmTimelineView> {
  const qs = new URLSearchParams({ scope: 'pm', projectId, startMonth: from, endMonth: to });
  const res = await fetch(`/api/v5/planning/allocations?${qs.toString()}`);
  if (!res.ok) throw new Error(`pm-timeline ${res.status}`);
  return (await res.json()) as PmTimelineView;
}

export default function PmProjectTimelinePage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const { persona } = usePersona();
  const t = useTranslations('v5.pm.timeline');
  const tScreens = useTranslations('v5.screens.pmTimeline');

  const { from, to } = defaultMonthWindow();
  const enabled = !!projectId && persona.kind === 'pm';

  const { data, isLoading, error } = useQuery({
    queryKey: ['pm-timeline', projectId, from, to],
    queryFn: () => fetchPmTimeline(projectId, from, to),
    enabled,
  });

  if (isLoading) return <div className="p-8">{tScreens('loading')}</div>;
  if (error) return <div className="text-error p-8">{tScreens('error')}</div>;
  if (!data) return <div className="p-8">{tScreens('empty')}</div>;

  return (
    <div className="space-y-4 p-8">
      <h1 className="font-headline text-2xl font-bold">{data.project.name}</h1>
      <div className="text-on-surface-variant text-sm">{t('title')}</div>
      <div
        data-testid="pm-timeline-grid-placeholder"
        className="border-outline-variant/30 bg-surface-container-low text-on-surface-variant rounded-md border p-8 text-center text-sm"
      >
        {t('placeholder')}
      </div>
    </div>
  );
}
