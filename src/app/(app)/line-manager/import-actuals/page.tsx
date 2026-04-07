import { getTranslations } from 'next-intl/server';

import { ImportWizard } from '@/features/import/ui/ImportWizard';

/**
 * v5.0 — Phase 38 / Plan 38-03 (WIZ-01): Line Manager actuals import page.
 *
 * Wraps the client-side <ImportWizard /> with a localized header. Admin
 * access for this surface lands with Phase 41 (persona views part 2).
 */
export default async function ImportActualsPage() {
  const t = await getTranslations('v5.import');
  return (
    <main>
      <h1>{t('upload.title')}</h1>
      <p>{t('upload.dropHint')}</p>
      <ImportWizard />
    </main>
  );
}
