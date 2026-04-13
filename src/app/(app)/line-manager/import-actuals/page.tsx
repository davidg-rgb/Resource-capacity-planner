import { DesktopOnlyScreen } from '@/components/responsive/desktop-only-screen';
import { PersonaGate } from '@/features/personas/persona-route-guard';
import { ImportWizard } from '@/features/import/ui/ImportWizard';

/**
 * v5.0 — Phase 38 / Plan 38-03 (WIZ-01): Line Manager actuals import page.
 *
 * Wraps the client-side <ImportWizard /> with the <DesktopOnlyScreen>
 * interstitial (TC-MOBILE-001 — wizard is desktop-only).
 * Gated by <PersonaGate allowed={['line-manager', 'admin']}> (LM-GATE-004).
 */
export default function ImportActualsPage() {
  return (
    <PersonaGate allowed={['line-manager', 'admin']}>
      <DesktopOnlyScreen>
        <main>
          <ImportWizard />
        </main>
      </DesktopOnlyScreen>
    </PersonaGate>
  );
}
