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
          className={`flex-1 px-4 py-6 sm:px-6 lg:px-8 ${
            showSideNav ? 'lg:ml-64' : ''
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
