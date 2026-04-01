'use client';

import { createContext, useCallback, useContext, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getCurrentMonth, generateMonthRange } from '@/lib/date-utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TimeRange {
  from: string;
  to: string;
}

interface TimeRangeContextValue {
  from: string;
  to: string;
  setTimeRange: (range: TimeRange) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const TimeRangeContext = createContext<TimeRangeContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

function getDefaultRange(): TimeRange {
  const currentMonth = getCurrentMonth();
  const months = generateMonthRange(currentMonth, 3);
  return { from: months[0], to: months[months.length - 1] };
}

export function TimeRangeProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Derive range directly from URL search params — always in sync
  const range = useMemo(() => {
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    if (fromParam && toParam) {
      return { from: fromParam, to: toParam };
    }
    return getDefaultRange();
  }, [searchParams]);

  // Update range by pushing new search params into the URL
  const setTimeRange = useCallback(
    (newRange: TimeRange) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('from', newRange.from);
      params.set('to', newRange.to);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname],
  );

  const value = useMemo(
    () => ({ from: range.from, to: range.to, setTimeRange }),
    [range.from, range.to, setTimeRange],
  );

  return <TimeRangeContext.Provider value={value}>{children}</TimeRangeContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Read the global dashboard time range.
 */
export function useTimeRange(): TimeRangeContextValue {
  const ctx = useContext(TimeRangeContext);
  if (!ctx) {
    throw new Error('useTimeRange must be used within a TimeRangeProvider');
  }
  return ctx;
}

/**
 * Per-widget time range — returns the override if set, otherwise falls back
 * to the global context. This is how widgets support individual time ranges.
 */
export function useWidgetTimeRange(override?: TimeRange | null): TimeRange {
  const global = useTimeRange();
  if (override) {
    return override;
  }
  return { from: global.from, to: global.to };
}
