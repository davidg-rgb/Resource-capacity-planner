import { AppShell } from '@/components/layout/app-shell';
import { ImpersonationBanner } from '@/components/platform/impersonation-banner';
import { QueryProvider } from '@/components/providers/query-provider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ImpersonationBanner />
      <AppShell>{children}</AppShell>
    </QueryProvider>
  );
}
