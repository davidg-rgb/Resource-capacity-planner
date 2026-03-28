'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type {
  DashboardKPIs,
  DepartmentUtilization,
  DisciplineBreakdown,
} from '@/features/analytics/analytics.types';

/**
 * TanStack Query hook for fetching dashboard KPI data.
 * Returns total headcount, utilization %, overloaded and underutilized counts.
 */
export function useDashboardKPIs(
  monthFrom: string,
  monthTo: string,
): UseQueryResult<DashboardKPIs> {
  return useQuery<DashboardKPIs>({
    queryKey: ['dashboard-kpis', monthFrom, monthTo],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/dashboard?from=${monthFrom}&to=${monthTo}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard KPIs: ${response.status}`);
      }
      return response.json();
    },
    staleTime: 60_000,
  });
}

/**
 * TanStack Query hook for fetching per-department utilization percentages.
 */
export function useDepartmentUtilization(
  monthFrom: string,
  monthTo: string,
): UseQueryResult<DepartmentUtilization[]> {
  return useQuery<DepartmentUtilization[]>({
    queryKey: ['department-utilization', monthFrom, monthTo],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/departments?from=${monthFrom}&to=${monthTo}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch department utilization: ${response.status}`);
      }
      return response.json();
    },
    staleTime: 60_000,
  });
}

/**
 * TanStack Query hook for fetching discipline breakdown (hours by discipline).
 */
export function useDisciplineBreakdown(
  monthFrom: string,
  monthTo: string,
): UseQueryResult<DisciplineBreakdown[]> {
  return useQuery<DisciplineBreakdown[]>({
    queryKey: ['discipline-breakdown', monthFrom, monthTo],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/disciplines?from=${monthFrom}&to=${monthTo}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch discipline breakdown: ${response.status}`);
      }
      return response.json();
    },
    staleTime: 60_000,
  });
}
