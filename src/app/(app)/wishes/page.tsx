'use client';

// v5.0 — Phase 39 / Plan 39-08 (PROP-06): PM "My Wishes" route.
// Scopes MyWishesPanel to the current Clerk userId (proposerId).
// i18n via useTranslations('v5.proposals') (Plan 39-09 sweep).

import { useAuth } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';

import { MyWishesPanel } from '@/features/proposals/ui/my-wishes-panel';

export default function WishesPage() {
  const { userId, isLoaded } = useAuth();
  const t = useTranslations('v5.proposals');

  if (!isLoaded) {
    return <div className="text-muted-foreground p-4 text-sm">{t('page.loading')}</div>;
  }
  if (!userId) {
    return <div className="p-4 text-sm">{t('page.notAuthenticated')}</div>;
  }

  return (
    <div className="p-4">
      <h1 className="mb-3 text-xl font-semibold">{t('page.myWishes')}</h1>
      <p className="text-muted-foreground mb-4 text-sm">{t('page.myWishesIntro')}</p>
      <MyWishesPanel proposerId={userId} />
    </div>
  );
}
