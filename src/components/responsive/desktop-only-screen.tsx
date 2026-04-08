'use client';

// v5.0 — Phase 41 / Plan 41-01: <DesktopOnlyScreen> interstitial (TC-MOBILE-001).
//
// Renders children on >=768px viewports; otherwise shows a centered message.
// Returns null during SSR / pre-mount to avoid hydration mismatch.

import { useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

const DESKTOP_QUERY = '(min-width: 768px)';

export interface DesktopOnlyScreenProps {
  children: ReactNode;
}

export function DesktopOnlyScreen({ children }: DesktopOnlyScreenProps) {
  const t = useTranslations('v5.lineManager');
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(DESKTOP_QUERY);
    // Hydration sync from a browser-only API; SSR cannot know the value.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mediaQuery hydration
    setIsDesktop(mq.matches);

    setMounted(true);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (!mounted) return null;
  if (isDesktop) return <>{children}</>;

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6 text-center">
      <p className="max-w-sm text-base text-neutral-700 dark:text-neutral-300">
        {t('desktopOnlyMessage')}
      </p>
    </div>
  );
}
