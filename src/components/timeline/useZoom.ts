'use client';

/**
 * v5.0 — Phase 42 / Plan 42-03 (Wave 2): URL-synced zoom hook.
 *
 * Reads `?zoom=month|quarter|year` from the URL (default 'month') and returns
 * a setter that updates the query string via `router.replace` preserving all
 * other params. Mirrors the change-log-feed URL-sync pattern (Phase 41).
 *
 * TC-ZOOM-003: Also persists to localStorage key `nc:timelineZoom:<persona>:<screen>`
 * so the user's zoom preference survives full page reloads / deep links.
 * Priority on init: localStorage → URL param → default 'month'.
 */

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { TimelineZoom } from './timeline-columns';

const VALID: readonly TimelineZoom[] = ['month', 'quarter', 'year'];

function parseZoom(raw: string | null): TimelineZoom {
  if (raw && (VALID as readonly string[]).includes(raw)) return raw as TimelineZoom;
  return 'month';
}

function buildStorageKey(persona?: string, screen?: string): string | null {
  if (!persona || !screen) return null;
  return `nc:timelineZoom:${persona}:${screen}`;
}

function readFromStorage(key: string | null): TimelineZoom | null {
  if (!key) return null;
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    return parseZoom(raw) !== 'month' || raw === 'month' ? parseZoom(raw) : null;
  } catch {
    return null;
  }
}

function writeToStorage(key: string | null, value: TimelineZoom): void {
  if (!key) return;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {
    // Storage full or unavailable — ignore silently.
  }
}

export interface UseZoomOptions {
  /** Persona identifier, e.g. 'pm', 'line-manager', 'staff', 'rd'. */
  persona?: string;
  /** Screen identifier, e.g. 'project', 'timeline', 'schedule', 'portfolio'. */
  screen?: string;
}

export function useZoom(options?: UseZoomOptions): [TimelineZoom, (next: TimelineZoom) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const storageKey = buildStorageKey(options?.persona, options?.screen);

  // Priority: localStorage → URL param → default 'month'
  const fromStorage = readFromStorage(storageKey);
  const fromUrl = parseZoom(searchParams?.get('zoom') ?? null);
  const zoom: TimelineZoom = fromStorage ?? fromUrl;

  const setZoom = useCallback(
    (next: TimelineZoom) => {
      // 1. Update URL
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (next === 'month') {
        params.delete('zoom');
      } else {
        params.set('zoom', next);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : `${pathname}`, { scroll: false });

      // 2. Persist to localStorage
      writeToStorage(storageKey, next);
    },
    [router, pathname, searchParams, storageKey],
  );

  return [zoom, setZoom];
}
