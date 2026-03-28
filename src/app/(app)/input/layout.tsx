'use client';

import { usePathname } from 'next/navigation';

import { PersonSidebar } from '@/components/person/person-sidebar';

/**
 * Input section layout: sidebar on left, content area on right.
 * Extracts personId from the URL path to highlight active person in sidebar.
 */
export default function InputLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Extract personId from /input/:personId path
  const segments = pathname.split('/');
  const inputIndex = segments.indexOf('input');
  const activePersonId =
    inputIndex !== -1 && segments.length > inputIndex + 1 ? segments[inputIndex + 1] : undefined;

  return (
    <div className="flex h-full">
      <PersonSidebar activePersonId={activePersonId} />
      <div className="flex-1 space-y-6 overflow-auto p-8">{children}</div>
    </div>
  );
}
