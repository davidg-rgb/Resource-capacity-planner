'use client';

import type { ReactNode } from 'react';

/**
 * Minimal app shell for worktree — will be superseded when phase 3 merges.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
