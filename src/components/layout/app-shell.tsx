'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { TopNav } from './top-nav';
import { SideNav } from './side-nav';

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // The /input route has its own PersonSidebar, so skip the generic SideNav there
  const showSideNav = !pathname.startsWith('/input');

  return (
    <div className="bg-surface min-h-screen">
      <TopNav />
      <div className="flex">
        {showSideNav && (
          <div className="hidden lg:block">
            <SideNav />
          </div>
        )}
        <main
          className={`mx-auto max-w-[1440px] flex-1 p-4 sm:p-6 lg:p-8 ${showSideNav ? 'lg:ml-64' : ''}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
