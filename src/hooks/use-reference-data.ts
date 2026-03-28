'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { DisciplineRow } from '@/features/disciplines/discipline.types';
import type { DepartmentRow } from '@/features/departments/department.types';
import type { ProgramRow } from '@/features/programs/program.types';

// ---------------------------------------------------------------------------
// Discipline hooks
// ---------------------------------------------------------------------------

/** Fetch all disciplines for the current tenant */
export function useDisciplines() {
  return useQuery<DisciplineRow[]>({
    queryKey: ['disciplines'],
    queryFn: async () => {
      const res = await fetch('/api/disciplines');
      if (!res.ok) throw new Error('Failed to fetch disciplines');
      const data = await res.json();
      return data.disciplines;
    },
  });
}

/** Fetch a single discipline with usage count */
export function useDiscipline(id: string) {
  return useQuery<{ discipline: DisciplineRow; usageCount: number }>({
    queryKey: ['disciplines', id],
    queryFn: async () => {
      const res = await fetch(`/api/disciplines/${id}`);
      if (!res.ok) throw new Error('Failed to fetch discipline');
      return res.json();
    },
    enabled: !!id,
  });
}

/** Create a new discipline */
export function useCreateDiscipline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; abbreviation: string }) => {
      const res = await fetch('/api/disciplines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to create discipline');
      }
      const data = await res.json();
      return data.discipline as DisciplineRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disciplines'] });
    },
  });
}

/** Update an existing discipline */
export function useUpdateDiscipline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; abbreviation?: string };
    }) => {
      const res = await fetch(`/api/disciplines/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to update discipline');
      }
      const json = await res.json();
      return json.discipline as DisciplineRow;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['disciplines'] });
      queryClient.invalidateQueries({ queryKey: ['disciplines', variables.id] });
    },
  });
}

/** Delete a discipline */
export function useDeleteDiscipline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/disciplines/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to delete discipline');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disciplines'] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Department hooks
// ---------------------------------------------------------------------------

/** Fetch all departments for the current tenant */
export function useDepartments() {
  return useQuery<DepartmentRow[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await fetch('/api/departments');
      if (!res.ok) throw new Error('Failed to fetch departments');
      const data = await res.json();
      return data.departments;
    },
  });
}

/** Fetch a single department with usage count */
export function useDepartment(id: string) {
  return useQuery<{ department: DepartmentRow; usageCount: number }>({
    queryKey: ['departments', id],
    queryFn: async () => {
      const res = await fetch(`/api/departments/${id}`);
      if (!res.ok) throw new Error('Failed to fetch department');
      return res.json();
    },
    enabled: !!id,
  });
}

/** Create a new department */
export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string }) => {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to create department');
      }
      const data = await res.json();
      return data.department as DepartmentRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}

/** Update an existing department */
export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string } }) => {
      const res = await fetch(`/api/departments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to update department');
      }
      const json = await res.json();
      return json.department as DepartmentRow;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['departments', variables.id] });
    },
  });
}

/** Delete a department */
export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to delete department');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Program hooks
// ---------------------------------------------------------------------------

/** Fetch all programs for the current tenant */
export function usePrograms() {
  return useQuery<ProgramRow[]>({
    queryKey: ['programs'],
    queryFn: async () => {
      const res = await fetch('/api/programs');
      if (!res.ok) throw new Error('Failed to fetch programs');
      const data = await res.json();
      return data.programs;
    },
  });
}

/** Fetch a single program with usage count */
export function useProgram(id: string) {
  return useQuery<{ program: ProgramRow; usageCount: number }>({
    queryKey: ['programs', id],
    queryFn: async () => {
      const res = await fetch(`/api/programs/${id}`);
      if (!res.ok) throw new Error('Failed to fetch program');
      return res.json();
    },
    enabled: !!id,
  });
}

/** Create a new program */
export function useCreateProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; description?: string | null }) => {
      const res = await fetch('/api/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to create program');
      }
      const data = await res.json();
      return data.program as ProgramRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    },
  });
}

/** Update an existing program */
export function useUpdateProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; description?: string | null };
    }) => {
      const res = await fetch(`/api/programs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to update program');
      }
      const json = await res.json();
      return json.program as ProgramRow;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['programs', variables.id] });
    },
  });
}

/** Delete a program */
export function useDeleteProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/programs/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to delete program');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
