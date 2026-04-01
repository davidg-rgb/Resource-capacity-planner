'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { DashboardLayoutData, WidgetPlacement } from './widget-registry.types';

// ---------------------------------------------------------------------------
// Device class detection (useSyncExternalStore for SSR safety)
// ---------------------------------------------------------------------------

const MOBILE_QUERY = '(max-width: 768px)';

function subscribeToMediaQuery(callback: () => void): () => void {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getDeviceSnapshot(): 'desktop' | 'mobile' {
  return window.matchMedia(MOBILE_QUERY).matches ? 'mobile' : 'desktop';
}

function getServerSnapshot(): 'desktop' | 'mobile' {
  return 'desktop';
}

function useDeviceClass(): 'desktop' | 'mobile' {
  return useSyncExternalStore(subscribeToMediaQuery, getDeviceSnapshot, getServerSnapshot);
}

// ---------------------------------------------------------------------------
// Layout query key factory
// ---------------------------------------------------------------------------

function layoutQueryKey(dashboardId: string, deviceClass: string) {
  return ['dashboard-layout', dashboardId, deviceClass] as const;
}

// ---------------------------------------------------------------------------
// Response shape from GET /api/dashboard/layout
// ---------------------------------------------------------------------------

interface LayoutResponse {
  source: 'personal' | 'cloned' | 'tenant-default' | 'built-in';
  layout: DashboardLayoutData;
}

// ---------------------------------------------------------------------------
// useDashboardLayout
// ---------------------------------------------------------------------------

export function useDashboardLayout(dashboardId: string = 'manager') {
  const deviceClass = useDeviceClass();

  const query = useQuery<LayoutResponse>({
    queryKey: layoutQueryKey(dashboardId, deviceClass),
    queryFn: async () => {
      const params = new URLSearchParams({ dashboardId, deviceClass });
      const res = await fetch(`/api/dashboard/layout?${params}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch layout: ${res.status}`);
      }
      return res.json();
    },
    staleTime: 5 * 60_000,
  });

  return {
    ...query,
    deviceClass,
    source: query.data?.source,
    layout: query.data?.layout,
  };
}

// ---------------------------------------------------------------------------
// useSaveLayout — mutation with optimistic update
// ---------------------------------------------------------------------------

export function useSaveLayout(dashboardId: string = 'manager') {
  const queryClient = useQueryClient();
  const deviceClass = useDeviceClass();
  const queryKey = layoutQueryKey(dashboardId, deviceClass);

  const mutation = useMutation<{ layout: unknown }, Error, { widgets: WidgetPlacement[] }>({
    mutationFn: async ({ widgets }) => {
      const res = await fetch('/api/dashboard/layout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dashboardId, deviceClass, widgets }),
      });
      if (!res.ok) {
        throw new Error(`Failed to save layout: ${res.status}`);
      }
      return res.json();
    },
    onMutate: async ({ widgets }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previous = queryClient.getQueryData<LayoutResponse>(queryKey);

      // Optimistic update
      queryClient.setQueryData<LayoutResponse>(queryKey, (old) => {
        if (!old) return old;
        return {
          source: 'personal',
          layout: { ...old.layout, widgets },
        };
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Roll back to previous
      if ((context as { previous?: LayoutResponse })?.previous) {
        queryClient.setQueryData(queryKey, (context as { previous: LayoutResponse }).previous);
      }
      // Invalidate on error to re-fetch the true server state
      queryClient.invalidateQueries({ queryKey });
      toast.error('Kunde inte spara layout');
    },
  });

  const saveLayout = useCallback(
    (widgets: WidgetPlacement[]) => {
      mutation.mutate({ widgets });
    },
    [mutation],
  );

  return { saveLayout, isSaving: mutation.isPending };
}
