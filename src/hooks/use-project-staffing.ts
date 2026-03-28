'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { ProjectStaffingResponse } from '@/features/analytics/analytics.types';

/**
 * TanStack Query hook for fetching project staffing data.
 * Returns per-person-per-month hours for a specific project.
 */
export function useProjectStaffing(
  projectId: string | undefined,
  monthFrom: string,
  monthTo: string,
): UseQueryResult<ProjectStaffingResponse> {
  return useQuery<ProjectStaffingResponse>({
    queryKey: ['project-staffing', projectId, monthFrom, monthTo],
    queryFn: async () => {
      const response = await fetch(
        `/api/analytics/project-staffing?projectId=${projectId}&from=${monthFrom}&to=${monthTo}`,
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch project staffing: ${response.status}`);
      }
      return response.json();
    },
    staleTime: 60_000,
    enabled: !!projectId,
  });
}
