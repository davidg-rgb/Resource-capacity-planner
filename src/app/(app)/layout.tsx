import { redirect } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { Toaster } from 'sonner';

import { AppShell } from '@/components/layout/app-shell';
import { FlagProvider } from '@/features/flags/flag.context';
import { FlagGuard } from '@/features/flags/flag-guard';
import { getOrgFlags } from '@/features/flags/flag.service';
import { isOrgOnboarded } from '@/features/onboarding/onboarding.service';
import { getTenantId } from '@/lib/auth';
import { AnnouncementBanner } from '@/components/announcements/announcement-banner';
import { ImpersonationBanner } from '@/components/platform/impersonation-banner';
import { PersonCardProvider } from '@/features/dashboard/person-card/person-card-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { PersonaProvider } from '@/features/personas/persona.context';
// Phase 40 D-03/D-19: <PersonaSwitcher /> is mounted globally inside the
// authenticated shell header (AppShell → TopNav). It is imported there,
// not here, because layout.tsx is a server component and the switcher is
// a client component. See src/components/layout/top-nav.tsx.

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const orgId = await getTenantId();
  const flags = await getOrgFlags(orgId);

  // [16-01] Onboarding redirect: new orgs go to /onboarding wizard
  if (flags.onboarding) {
    const onboarded = await isOrgOnboarded(orgId);
    if (!onboarded) {
      redirect('/onboarding');
    }
  }

  return (
    <NextIntlClientProvider>
      <QueryProvider>
        <FlagProvider flags={flags}>
          <PersonaProvider>
            <PersonCardProvider>
              <ImpersonationBanner />
              <AnnouncementBanner />
              <FlagGuard>
                <AppShell>{children}</AppShell>
              </FlagGuard>
              <Toaster position="top-right" richColors closeButton />
            </PersonCardProvider>
          </PersonaProvider>
        </FlagProvider>
      </QueryProvider>
    </NextIntlClientProvider>
  );
}
