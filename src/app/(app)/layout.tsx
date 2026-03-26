import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { QueryProvider } from '@/components/providers/query-provider';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId, orgId } = await auth();

  // Extra safety -- proxy.ts should already redirect unauthenticated users
  if (!userId) redirect('/sign-in');

  // If no org selected, redirect to onboarding
  if (!orgId) redirect('/onboarding');

  return (
    <QueryProvider>
      <AppShell>{children}</AppShell>
    </QueryProvider>
  );
}
