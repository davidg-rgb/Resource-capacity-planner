'use client';

// v6.0 Phase 53-01 Task 3 (D-03): Staff persona's landing reduces to
// Home + Help, and every other persona gets a "Help" top-nav link. This
// page is the landing target — a stub this phase, richer docs ship later.

import { useTranslations } from 'next-intl';

export default function HelpPage() {
  const t = useTranslations('v6.polish.help');
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="font-headline text-2xl font-semibold">{t('title')}</h1>
      <p className="text-on-surface-variant">{t('body')}</p>
      <a
        href="https://docs.nordiccapacity.example/"
        className="text-primary underline"
        target="_blank"
        rel="noreferrer"
      >
        {t('externalDocs')}
      </a>
    </main>
  );
}
