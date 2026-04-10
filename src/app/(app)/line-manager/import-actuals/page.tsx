import { getTranslations } from 'next-intl/server';

import { DesktopOnlyScreen } from '@/components/responsive/desktop-only-screen';
import { PersonaGate } from '@/features/personas/persona-route-guard';
import { ImportWizard } from '@/features/import/ui/ImportWizard';

/**
 * v5.0 — Phase 38 / Plan 38-03 (WIZ-01): Line Manager actuals import page.
 *
 * Wraps the client-side <ImportWizard /> with a localized header and the
 * <DesktopOnlyScreen> interstitial (TC-MOBILE-001 — wizard is desktop-only).
 * Gated by <PersonaGate allowed={['line-manager', 'admin']}> (LM-GATE-004).
 */
export default async function ImportActualsPage() {
  const t = await getTranslations('v5.import');
  return (
    <PersonaGate allowed={['line-manager', 'admin']}>
      <DesktopOnlyScreen>
        <main>
          <h1>{t('upload.title')}</h1>
          <p>{t('upload.dropHint')}</p>
          <ImportWizard />
        </main>
      </DesktopOnlyScreen>
    </PersonaGate>
  );
}
