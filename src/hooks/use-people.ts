'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { PersonRow } from '@/features/people/person.types';
import type { PersonUpdate } from '@/features/people/person.schema';

// ---------------------------------------------------------------------------
// People hooks
// ---------------------------------------------------------------------------

/** Fetch tenant-scoped people with optional filters */
export function usePeople(filters?: Record<string, string>) {
  return useQuery<PersonRow[]>({
    queryKey: ['people', filters],
    queryFn: async () => {
      const params = filters ? `?${new URLSearchParams(filters)}` : '';
      const res = await fetch(`/api/people${params}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to fetch people');
      }
      const data = await res.json();
      return data.people;
    },
  });
}

/** Create a new person */
export function useCreatePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      firstName: string;
      lastName: string;
      disciplineId: string;
      departmentId: string;
      targetHoursPerMonth?: number;
    }) => {
      const res = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to create person');
      }
      const data = await res.json();
      return data.person as PersonRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });
}

/** Update an existing person */
export function useUpdatePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PersonUpdate }) => {
      const res = await fetch(`/api/people/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to update person');
      }
      const json = await res.json();
      return json.person as PersonRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });
}

/** Soft-delete a person (sets archivedAt) */
export function useDeletePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/people/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to delete person');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Reference data hooks (minimal read-only for form dropdowns)
// ---------------------------------------------------------------------------

interface Department {
  id: string;
  name: string;
  organizationId: string;
}

interface Discipline {
  id: string;
  name: string;
  abbreviation: string;
  organizationId: string;
}

/** Fetch departments for the current tenant */
export function useDepartments() {
  return useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await fetch('/api/departments');
      if (!res.ok) throw new Error('Failed to fetch departments');
      const data = await res.json();
      return data.departments;
    },
  });
}

/** Fetch disciplines for the current tenant */
export function useDisciplines() {
  return useQuery<Discipline[]>({
    queryKey: ['disciplines'],
    queryFn: async () => {
      const res = await fetch('/api/disciplines');
      if (!res.ok) throw new Error('Failed to fetch disciplines');
      const data = await res.json();
      return data.disciplines;
    },
  });
}
