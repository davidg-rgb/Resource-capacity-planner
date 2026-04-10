'use client';

// v5.0 — Phase 40 / Plan 40-03 (Wave 2): /pm/wishes — thin wrapper around
// MyWishesPanel scoped to the authenticated user. The existing /wishes
// route stays alive to avoid breaking Phase 39 links (D-01).

import { useAuth } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';

import { PersonaGate } from '@/features/personas/persona-route-guard';
import { MyWishesPanel } from '@/features/proposals/ui/my-wishes-panel';

export default function PmWishesPage() {
  return (
    <PersonaGate allowed={['pm', 'admin']}>
      <PmWishesInner />
    </PersonaGate>
  );
}

function PmWishesInner() {
  const { userId, isLoaded } = useAuth();
  const tProp = useTranslations('v5.proposals.page');
  const tPm = useTranslations('v5.pm.wishes');

  if (!isLoaded) return <div className="p-8 text-sm">{tProp('loading')}</div>;
  if (!userId) return <div className="p-8 text-sm">{tProp('notAuthenticated')}</div>;

  return (
    <div className="p-8">
      <h1 className="font-headline mb-4 text-2xl font-bold">{tPm('title')}</h1>
      <MyWishesPanel proposerId={userId} />
    </div>
  );
}
