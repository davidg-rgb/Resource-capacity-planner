import { Toaster } from 'sonner';

import { PlatformShell } from '@/components/platform/platform-shell';

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PlatformShell>
      {children}
      <Toaster position="top-right" richColors closeButton />
    </PlatformShell>
  );
}
