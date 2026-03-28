import { Toaster } from 'sonner';

import { AppShell } from '@/components/layout/app-shell';
import { FlagProvider } from '@/features/flags/flag.context';
import { getOrgFlags } from '@/features/flags/flag.service';
import { getTenantId } from '@/lib/auth';
import { ImpersonationBanner } from '@/components/platform/impersonation-banner';
import { QueryProvider } from '@/components/providers/query-provider';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const orgId = await getTenantId();
  const flags = await getOrgFlags(orgId);

  return (
    <QueryProvider>
      <FlagProvider flags={flags}>
        <ImpersonationBanner />
        <AppShell>{children}</AppShell>
        <Toaster position="top-right" richColors closeButton />
      </FlagProvider>
    </QueryProvider>
  );
}
