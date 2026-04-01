'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { BenchReportResponse } from '@/features/analytics/analytics.types';

/**
 * TanStack Query hook for fetching bench/idle capacity report.
 * Returns people below utilization threshold with FTE equivalents and trend comparison.
 */
export function useBenchReport(
  monthFrom: string,
  monthTo: string,
  threshold?: number,
): UseQueryResult<BenchReportResponse> {
  return useQuery<BenchReportResponse>({
    queryKey: ['bench-report', monthFrom, monthTo, threshold],
    queryFn: async () => {
      const params = new URLSearchParams({ from: monthFrom, to: monthTo });
      if (threshold !== undefined) params.set('threshold', String(threshold));
      const response = await fetch(`/api/analytics/bench-report?${params}`);
      if (!response.ok) throw new Error(`Failed to fetch bench report: ${response.status}`);
      return response.json();
    },
    staleTime: 60_000,
  });
}
