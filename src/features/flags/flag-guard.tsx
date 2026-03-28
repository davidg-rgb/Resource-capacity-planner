'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useFlags } from './flag.context';
import { FLAG_ROUTE_MAP, type FlagName } from './flag.types';

export function FlagGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const flags = useFlags();
  const router = useRouter();

  // Check if current path is gated by a disabled flag
  let blocked = false;
  for (const [flagName, routes] of Object.entries(FLAG_ROUTE_MAP)) {
    for (const route of routes) {
      if (pathname.startsWith(route) && !flags[flagName as FlagName]) {
        blocked = true;
      }
    }
  }

  useEffect(() => {
    if (blocked) {
      router.replace('/input');
    }
  }, [blocked, router]);

  if (blocked) {
    return null;
  }

  return <>{children}</>;
}
