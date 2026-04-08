'use client';

/**
 * v5.0 — Phase 42 / Plan 42-03 (Wave 2): URL-synced zoom hook.
 *
 * Reads `?zoom=month|quarter|year` from the URL (default 'month') and returns
 * a setter that updates the query string via `router.replace` preserving all
 * other params. Mirrors the change-log-feed URL-sync pattern (Phase 41).
 */

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { TimelineZoom } from './timeline-columns';

const VALID: readonly TimelineZoom[] = ['month', 'quarter', 'year'];

function parseZoom(raw: string | null): TimelineZoom {
  if (raw && (VALID as readonly string[]).includes(raw)) return raw as TimelineZoom;
  return 'month';
}

export function useZoom(): [TimelineZoom, (next: TimelineZoom) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const zoom = parseZoom(searchParams?.get('zoom') ?? null);

  const setZoom = useCallback(
    (next: TimelineZoom) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (next === 'month') {
        params.delete('zoom');
      } else {
        params.set('zoom', next);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : `${pathname}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return [zoom, setZoom];
}
