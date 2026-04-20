'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useFlags } from '@/features/flags/flag.context';
import { usePersona } from '@/features/personas/persona.context';
import { getLandingRoute } from '@/features/personas/persona.routes';

/**
 * Persona-aware landing redirect (NAV-01, per D-01).
 *
 * The server root (src/app/page.tsx) redirects here when uiV6Landing is on.
 * This client component reads the persona from context (localStorage-backed)
 * and redirects to the persona's landing page via router.replace().
 *
 * When the flag is off, users never reach this page (server redirects to /dashboard).
 * The brief blank flash is acceptable per ADR-004 (personas are UX shortcuts).
 */
export default function PersonaRedirect() {
  const { persona } = usePersona();
  const flags = useFlags();
  const router = useRouter();

  useEffect(() => {
    if (flags.uiV6Landing) {
      router.replace(getLandingRoute(persona));
    } else {
      // Safety fallback: if somehow reached without flag, go to dashboard
      router.replace('/dashboard');
    }
  }, [persona, flags, router]);

  return null;
}
