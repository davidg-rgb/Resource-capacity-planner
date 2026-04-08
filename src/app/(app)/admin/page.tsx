'use client';

// v5.0 — Phase 43 / Plan 43-04 (ADM-04): /admin landing page.
//
// The admin persona's default landing route (D-19). Renders the universal
// change_log feed with no filter (scope=all) so the admin sees every
// mutation across the tenant. The pre-existing /admin/change-log route is
// now a thin server-side redirect to /admin to keep Phase 41 deep links
// alive — see src/app/(app)/admin/change-log/page.tsx.

import { useTranslations } from 'next-intl';

import { ChangeLogFeed } from '@/components/change-log/change-log-feed';

export default function AdminLandingPage() {
  const t = useTranslations('v5.admin.landing');
  return (
    <div className="space-y-4 p-4" data-testid="admin-landing-page">
      <h1 className="text-xl font-semibold">{t('title')}</h1>
      <ChangeLogFeed initialFilter={{}} projects={[]} people={[]} />
    </div>
  );
}
