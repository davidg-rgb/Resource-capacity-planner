'use client';

import type { ReactNode } from 'react';

import { TopNav } from './top-nav';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-surface min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
