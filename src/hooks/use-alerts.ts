'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { CapacityAlert } from '@/features/analytics/analytics.types';

/**
 * TanStack Query hook for fetching capacity alerts.
 * Returns overloaded (>100%) and underutilized (<50%) people.
 */
export function useAlerts(monthFrom: string, monthTo: string): UseQueryResult<CapacityAlert[]> {
  return useQuery<CapacityAlert[]>({
    queryKey: ['alerts', monthFrom, monthTo],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/alerts?from=${monthFrom}&to=${monthTo}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch alerts: ${response.status}`);
      }
      return response.json();
    },
    staleTime: 60_000,
  });
}

/**
 * TanStack Query hook for fetching the count of active capacity alerts.
 * Used by AlertBadge in TopNav for lightweight polling.
 */
export function useAlertCount(monthFrom: string, monthTo: string): UseQueryResult<number> {
  return useQuery<number>({
    queryKey: ['alert-count', monthFrom, monthTo],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/alerts/count?from=${monthFrom}&to=${monthTo}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch alert count: ${response.status}`);
      }
      const data = await response.json();
      return data.count;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
