'use client';

// v5.0 — Phase 40 / Plan 40-03 (Wave 2): PM Home page shell.
// Loads the PM overview from GET /api/v5/planning/pm-home using the
// currently selected PM persona's personId. Renders a grid of project
// overview cards with planned/actual hours and pending-wish counts.
// Wave 3 will plug in the project drill-in timeline.

import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';

import { usePersona } from '@/features/personas/persona.context';
import { PersonaGate } from '@/features/personas/persona-route-guard';
import type { PmOverviewResult } from '@/features/planning/planning.read';

async function fetchPmHome(personId: string): Promise<PmOverviewResult> {
  const res = await fetch(`/api/v5/planning/pm-home?personId=${encodeURIComponent(personId)}`);
  if (!res.ok) throw new Error(`pm-home ${res.status}`);
  return (await res.json()) as PmOverviewResult;
}

export default function PmHomePage() {
  return (
    <PersonaGate allowed={['pm', 'admin']}>
      <PmHomeInner />
    </PersonaGate>
  );
}

function PmHomeInner() {
  const { isLoaded } = useAuth();
  const { persona } = usePersona();
  const t = useTranslations('v5.pm.home');
  const tScreens = useTranslations('v5.screens.pmHome');

  const personaId = persona.kind === 'pm' ? persona.personId : null;

  const { data, isLoading, error } = useQuery({
    queryKey: ['pm-home', personaId],
    queryFn: () => fetchPmHome(personaId as string),
    enabled: !!personaId,
  });

  if (!isLoaded || isLoading)
    return (
      <div className="space-y-4 p-8">
        <h1 className="font-headline text-2xl font-bold">{t('title')}</h1>
        <p className="text-on-surface-variant text-sm">{tScreens('loading')}</p>
      </div>
    );
  if (error)
    return (
      <div className="space-y-4 p-8">
        <h1 className="font-headline text-2xl font-bold">{t('title')}</h1>
        <p className="text-error text-sm">{tScreens('error')}</p>
      </div>
    );
  if (!data || data.projects.length === 0)
    return (
      <div className="space-y-4 p-8">
        <h1 className="font-headline text-2xl font-bold">{t('title')}</h1>
        <p className="text-on-surface-variant text-sm">{tScreens('empty')}</p>
      </div>
    );

  return (
    <div className="space-y-4 p-8">
      <h1 className="font-headline text-2xl font-bold">{t('title')}</h1>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {data.projects.map(({ project, burn, pendingWishes }) => (
          <li
            key={project.id}
            className="border-outline-variant/30 bg-surface-container-low rounded-md border p-4"
          >
            <Link
              href={`/pm/projects/${project.id}`}
              className="text-primary font-semibold hover:underline"
            >
              {project.name}
            </Link>
            <div className="text-on-surface-variant mt-1 text-sm tabular-nums">
              {t('plannedVsActual', {
                planned: burn.plannedTotalHours,
                actual: burn.actualTotalHours,
              })}
            </div>
            <div className="text-on-surface-variant text-sm">
              {t('pendingWishes', { count: pendingWishes })}
            </div>
          </li>
        ))}
      </ul>
      <Link href="/pm/wishes" className="text-primary inline-block underline">
        {t('myWishesLink')}
      </Link>
    </div>
  );
}
