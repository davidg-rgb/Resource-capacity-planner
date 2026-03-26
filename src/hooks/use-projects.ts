'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ProjectRow } from '@/features/projects/project.types';
import type { ProjectUpdate } from '@/features/projects/project.schema';

// ---------------------------------------------------------------------------
// Project hooks
// ---------------------------------------------------------------------------

/** Fetch tenant-scoped projects with optional filters */
export function useProjects(filters?: Record<string, string>) {
  return useQuery<ProjectRow[]>({
    queryKey: ['projects', filters],
    queryFn: async () => {
      const params = filters ? `?${new URLSearchParams(filters)}` : '';
      const res = await fetch(`/api/projects${params}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to fetch projects');
      }
      const data = await res.json();
      return data.projects;
    },
  });
}

/** Create a new project */
export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      programId?: string | null;
      status?: 'active' | 'planned';
    }) => {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to create project');
      }
      const data = await res.json();
      return data.project as ProjectRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

/** Update an existing project */
export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProjectUpdate }) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to update project');
      }
      const json = await res.json();
      return json.project as ProjectRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

/** Archive a project (soft-delete via status='archived') */
export function useArchiveProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to archive project');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Reference data hooks (minimal read-only for form dropdowns)
// ---------------------------------------------------------------------------

interface Program {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
}

/** Fetch programs for the current tenant */
export function usePrograms() {
  return useQuery<Program[]>({
    queryKey: ['programs'],
    queryFn: async () => {
      const res = await fetch('/api/programs');
      if (!res.ok) throw new Error('Failed to fetch programs');
      const data = await res.json();
      return data.programs;
    },
  });
}
