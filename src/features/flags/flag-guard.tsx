'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useFlags } from './flag.context';
import { FLAG_ROUTE_MAP, type FlagName } from './flag.types';

export function FlagGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const flags = useFlags();
  const router = useRouter();

  // Check if current path is gated by a disabled flag.
  // Match route exactly or as a prefix followed by '/' so that
  // '/dashboard' gates both '/dashboard' and '/dashboard/team'.
  let blocked = false;
  for (const [flagName, routes] of Object.entries(FLAG_ROUTE_MAP)) {
    for (const route of routes) {
      const isMatch = pathname === route || pathname.startsWith(route + '/');
      if (isMatch && !flags[flagName as FlagName]) {
        blocked = true;
      }
    }
  }

  useEffect(() => {
    if (blocked) {
      // Redirect to /input — always safe, never flag-gated.
      // Cannot use /dashboard/team here as it may itself be gated.
      router.replace('/input');
    }
  }, [blocked, router]);

  if (blocked) {
    return null;
  }

  return <>{children}</>;
}
