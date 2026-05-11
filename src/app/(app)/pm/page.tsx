'use client';

// v5.0 — Phase 40 / Plan 40-03 (Wave 2): PM Home page shell.
// Loads the PM overview from GET /api/v5/planning/pm-home using the
// currently selected PM persona's personId. Renders a grid of project
// overview cards with planned/actual hours and pending-wish counts.
// Wave 3 will plug in the project drill-in timeline.
//
// v6.0 Phase 52 Plan 03 (PM-01 / D-01): when `uiV6PerJourney` is ON and the
// API returns `defaultProjectId !== null` (exactly-one-project rule), fire
// `router.replace('/pm/projects/<id>')` to collapse journey 1A to 2 clicks.

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';

import { usePersona } from '@/features/personas/persona.context';
import { PersonaGate } from '@/features/personas/persona-route-guard';
import type { PmOverviewResult } from '@/features/planning/planning.read';
import { useFlags } from '@/features/flags/flag.context';

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
  const router = useRouter();
  const pathname = usePathname();
  const { uiV6PerJourney } = useFlags();

  const personaId = persona.kind === 'pm' ? persona.personId : null;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['pm-home', personaId],
    queryFn: () => fetchPmHome(personaId as string),
    enabled: !!personaId,
  });

  // v6.0 Phase 52 Plan 03 (PM-01 / D-01 + Pitfall #2): when flag is ON and the
  // API returned exactly one project (defaultProjectId !== null), redirect to
  // the project drill. Pathname guard prevents clobbering a later user
  // navigation away from `/pm` while this effect's dependencies re-settle.
  useEffect(() => {
    if (!uiV6PerJourney) return;
    if (pathname !== '/pm') return;
    if (!data?.defaultProjectId) return;
    router.replace(`/pm/projects/${data.defaultProjectId}`);
  }, [uiV6PerJourney, pathname, data?.defaultProjectId, router]);

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
        <div className="border-error/30 bg-error-container/20 flex items-center justify-between gap-3 rounded-md border-l-4 p-4 text-sm">
          <span className="text-error">{tScreens('error')}</span>
          <button
            type="button"
            onClick={() => refetch()}
            className="bg-primary text-on-primary rounded px-3 py-1 text-xs disabled:opacity-50"
          >
            {tScreens('retry')}
          </button>
        </div>
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
