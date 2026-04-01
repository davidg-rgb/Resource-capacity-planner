'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useProjects } from '@/hooks/use-projects';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuickAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-selected person for the assignment */
  person: {
    personId: string;
    firstName: string;
    lastName: string;
  } | null;
  /** Pre-filled month range (YYYY-MM) */
  monthFrom?: string;
  monthTo?: string;
}

interface MonthEntry {
  month: string; // YYYY-MM
  hours: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateMonthRange(from: string, to: string): string[] {
  const months: string[] = [];
  const [startYear, startMonth] = from.split('-').map(Number);
  const [endYear, endMonth] = to.split('-').map(Number);

  let y = startYear;
  let m = startMonth;

  while (y < endYear || (y === endYear && m <= endMonth)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return months;
}

function getDefaultMonthFrom(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getDefaultMonthTo(): string {
  const now = new Date();
  const future = new Date(now.getFullYear(), now.getMonth() + 2, 1);
  return `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(m: string): string {
  const [year, month] = m.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('sv-SE', { year: 'numeric', month: 'short' });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const QuickAssignModal = React.memo(function QuickAssignModal({
  isOpen,
  onClose,
  person,
  monthFrom,
  monthTo,
}: QuickAssignModalProps) {
  const queryClient = useQueryClient();
  const { data: projects } = useProjects();

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [rangeFrom, setRangeFrom] = useState(monthFrom ?? getDefaultMonthFrom);
  const [rangeTo, setRangeTo] = useState(monthTo ?? getDefaultMonthTo);
  const [monthEntries, setMonthEntries] = useState<MonthEntry[]>([]);
  const [hoursPerMonth, setHoursPerMonth] = useState(40);

  // Regenerate month entries when range changes
  const months = useMemo(() => generateMonthRange(rangeFrom, rangeTo), [rangeFrom, rangeTo]);

  const handleApplyUniform = useCallback(() => {
    setMonthEntries(months.map((m) => ({ month: m, hours: hoursPerMonth })));
  }, [months, hoursPerMonth]);

  // Initialize entries when opening
  React.useEffect(() => {
    if (isOpen) {
      setRangeFrom(monthFrom ?? getDefaultMonthFrom());
      setRangeTo(monthTo ?? getDefaultMonthTo());
      setSelectedProjectId('');
      setHoursPerMonth(40);
      setMonthEntries([]);
    }
  }, [isOpen, monthFrom, monthTo]);

  const mutation = useMutation({
    mutationFn: async (
      allocations: { personId: string; projectId: string; month: string; hours: number }[],
    ) => {
      const res = await fetch('/api/allocations/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocations }),
      });
      if (!res.ok) throw new Error('Failed to save allocations');
      return res.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['availability-search'] });
      queryClient.invalidateQueries({ queryKey: ['conflicts'] });
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert-count'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      onClose();
    },
  });

  const handleSave = useCallback(() => {
    if (!person || !selectedProjectId || monthEntries.length === 0) return;
    const allocations = monthEntries
      .filter((e) => e.hours > 0)
      .map((e) => ({
        personId: person.personId,
        projectId: selectedProjectId,
        month: e.month,
        hours: e.hours,
      }));
    if (allocations.length > 0) {
      mutation.mutate(allocations);
    }
  }, [person, selectedProjectId, monthEntries, mutation]);

  const handleMonthHoursChange = useCallback((month: string, hours: number) => {
    setMonthEntries((prev) => {
      const existing = prev.find((e) => e.month === month);
      if (existing) {
        return prev.map((e) => (e.month === month ? { ...e, hours } : e));
      }
      return [...prev, { month, hours }];
    });
  }, []);

  if (!isOpen || !person) return null;

  const canSave = selectedProjectId && monthEntries.some((e) => e.hours > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest border-outline-variant w-full max-w-lg rounded-lg border shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-outline-variant border-b p-4">
          <h3 className="text-on-surface text-lg font-semibold">
            Assign {person.firstName} {person.lastName}
          </h3>
          <p className="text-on-surface-variant text-sm">Create allocation for a project</p>
        </div>

        {/* Body */}
        <div className="space-y-4 p-4">
          {/* Project selector */}
          <div>
            <label className="text-on-surface mb-1 block text-sm font-medium">Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="border-outline-variant bg-surface-container-lowest text-on-surface w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Select project...</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Month range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-on-surface mb-1 block text-sm font-medium">From</label>
              <input
                type="month"
                value={rangeFrom}
                onChange={(e) => setRangeFrom(e.target.value)}
                className="border-outline-variant bg-surface-container-lowest text-on-surface w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-on-surface mb-1 block text-sm font-medium">To</label>
              <input
                type="month"
                value={rangeTo}
                onChange={(e) => setRangeTo(e.target.value)}
                className="border-outline-variant bg-surface-container-lowest text-on-surface w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Uniform hours */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-on-surface mb-1 block text-sm font-medium">
                Hours per month
              </label>
              <input
                type="number"
                min={0}
                max={200}
                value={hoursPerMonth}
                onChange={(e) => setHoursPerMonth(Math.max(0, Number(e.target.value)))}
                className="border-outline-variant bg-surface-container-lowest text-on-surface w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={handleApplyUniform}
              className="bg-primary text-on-primary rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              Apply to all
            </button>
          </div>

          {/* Per-month breakdown */}
          {months.length > 0 && (
            <div className="border-outline-variant max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
              {months.map((m) => {
                const entry = monthEntries.find((e) => e.month === m);
                return (
                  <div key={m} className="flex items-center justify-between gap-3">
                    <span className="text-on-surface text-sm">{formatMonth(m)}</span>
                    <input
                      type="number"
                      min={0}
                      max={200}
                      value={entry?.hours ?? 0}
                      onChange={(e) =>
                        handleMonthHoursChange(m, Math.max(0, Number(e.target.value)))
                      }
                      className="border-outline-variant bg-surface-container-lowest text-on-surface w-20 rounded-md border px-2 py-1 text-right text-sm"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {mutation.error && (
            <p className="text-sm text-red-600">Failed to save: {mutation.error.message}</p>
          )}
        </div>

        {/* Footer */}
        <div className="border-outline-variant flex justify-end gap-3 border-t p-4">
          <button
            onClick={onClose}
            className="text-on-surface-variant rounded-md px-4 py-2 text-sm font-medium hover:bg-black/5"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || mutation.isPending}
            className="bg-primary text-on-primary rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving...' : 'Save allocation'}
          </button>
        </div>
      </div>
    </div>
  );
});
