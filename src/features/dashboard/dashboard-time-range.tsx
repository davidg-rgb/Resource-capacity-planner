'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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

  // Derive range from URL search params — recalculated on every param change
  const urlRange = useMemo(() => {
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    if (fromParam && toParam) {
      return { from: fromParam, to: toParam };
    }
    return getDefaultRange();
  }, [searchParams]);

  // Track the URL-derived key so we can detect external navigation
  const urlKey = `${urlRange.from}|${urlRange.to}`;
  const prevUrlKeyRef = useRef(urlKey);

  const [rangeOverride, setRangeOverride] = useState<TimeRange | null>(null);

  // If URL params changed externally, clear any programmatic override
  // This runs synchronously during render (no useEffect needed)
  if (prevUrlKeyRef.current !== urlKey) {
    prevUrlKeyRef.current = urlKey;
    if (rangeOverride !== null) {
      setRangeOverride(null);
    }
  }

  const range = rangeOverride ?? urlRange;

  const setTimeRange = useCallback((newRange: TimeRange) => {
    setRangeOverride(newRange);
  }, []);

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
