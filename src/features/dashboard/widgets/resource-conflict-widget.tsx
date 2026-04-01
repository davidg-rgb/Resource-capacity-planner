'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { AlertOctagon } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useConflicts } from '@/hooks/use-conflicts';
import { usePersonCard } from '@/features/dashboard/person-card/person-card-provider';
import { registerWidget } from '../widget-registry';
import type { WidgetProps } from '../widget-registry.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMonth(m: string): string {
  const [year, month] = m.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('sv-SE', { year: 'numeric', month: 'short' });
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Dismissed conflicts storage
// ---------------------------------------------------------------------------

const DISMISSED_KEY = 'nordic-capacity-dismissed-conflicts';

function getDismissed(): Set<string> {
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function setDismissed(keys: Set<string>) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...keys]));
}

function makeDismissKey(personId: string, month: string): string {
  return `${personId}:${month}`;
}

// ---------------------------------------------------------------------------
// Conflict bar component
// ---------------------------------------------------------------------------

function ConflictBar({
  projectName,
  hours,
  targetHours,
}: {
  projectName: string;
  hours: number;
  targetHours: number;
}) {
  const pct = targetHours > 0 ? (hours / targetHours) * 100 : 0;
  const isOverflow = pct > 100;

  return (
    <div className="flex items-center gap-2">
      <div className="bg-surface-container relative h-5 w-full max-w-[200px] overflow-hidden rounded">
        <div
          className={`h-full rounded transition-all ${isOverflow ? 'bg-red-500' : 'bg-primary'}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
        {/* Overflow portion */}
        {pct > 100 && (
          <div
            className="absolute top-0 h-full bg-red-300 opacity-50"
            style={{
              left: '100%',
              width: `${Math.min(pct - 100, 50)}%`,
              marginLeft: '-1px',
            }}
          />
        )}
      </div>
      <span className="text-on-surface min-w-[120px] text-xs">{projectName}</span>
      <span className="text-on-surface-variant w-12 text-right text-xs tabular-nums">{hours}h</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Redistribute Modal
// ---------------------------------------------------------------------------

function RedistributeModal({
  isOpen,
  onClose,
  person,
  month,
  projects,
  targetHours,
}: {
  isOpen: boolean;
  onClose: () => void;
  person: { personId: string; firstName: string; lastName: string };
  month: string;
  projects: { projectId: string; projectName: string; hours: number }[];
  targetHours: number;
}) {
  const queryClient = useQueryClient();
  const [editedHours, setEditedHours] = useState<Record<string, number>>(() =>
    Object.fromEntries(projects.map((p) => [p.projectId, p.hours])),
  );

  const total = useMemo(
    () => Object.values(editedHours).reduce((sum, h) => sum + h, 0),
    [editedHours],
  );
  const isValid = total <= targetHours;

  const mutation = useMutation({
    mutationFn: async (
      allocations: { personId: string; projectId: string; month: string; hours: number }[],
    ) => {
      const res = await fetch('/api/allocations/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocations }),
      });
      if (!res.ok) throw new Error('Failed to save');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conflicts'] });
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      queryClient.invalidateQueries({ queryKey: ['availability-search'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert-count'] });
      onClose();
    },
  });

  const handleSave = useCallback(() => {
    const allocations = Object.entries(editedHours).map(([projectId, hours]) => ({
      personId: person.personId,
      projectId,
      month,
      hours,
    }));
    mutation.mutate(allocations);
  }, [editedHours, person.personId, month, mutation]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest border-outline-variant w-full max-w-md rounded-lg border shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-outline-variant border-b p-4">
          <h3 className="text-on-surface text-lg font-semibold">
            Redistribute hours: {person.firstName} {person.lastName}
          </h3>
          <p className="text-on-surface-variant text-sm">
            {formatMonth(month)} — Target: {targetHours}h
          </p>
        </div>

        <div className="space-y-3 p-4">
          {projects.map((p) => (
            <div key={p.projectId} className="flex items-center justify-between gap-3">
              <span className="text-on-surface min-w-0 flex-1 truncate text-sm">
                {p.projectName}
              </span>
              <input
                type="number"
                min={0}
                max={targetHours}
                value={editedHours[p.projectId] ?? p.hours}
                onChange={(e) =>
                  setEditedHours((prev) => ({
                    ...prev,
                    [p.projectId]: Math.max(0, Number(e.target.value)),
                  }))
                }
                className="border-outline-variant bg-surface-container-lowest text-on-surface w-20 rounded-md border px-2 py-1 text-right text-sm"
              />
            </div>
          ))}

          <div className="border-outline-variant border-t pt-3">
            <div className="flex items-center justify-between">
              <span className="text-on-surface text-sm font-medium">Total</span>
              <span
                className={`text-sm font-semibold tabular-nums ${isValid ? 'text-on-surface' : 'text-red-600'}`}
              >
                {total}h / {targetHours}h
              </span>
            </div>
            {!isValid && (
              <p className="mt-1 text-xs text-red-600">
                Total exceeds target. Reduce hours to save.
              </p>
            )}
          </div>

          {mutation.error && (
            <p className="text-sm text-red-600">Failed: {mutation.error.message}</p>
          )}
        </div>

        <div className="border-outline-variant flex justify-end gap-3 border-t p-4">
          <button
            onClick={onClose}
            className="text-on-surface-variant rounded-md px-4 py-2 text-sm font-medium hover:bg-black/5"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || mutation.isPending}
            className="bg-primary text-on-primary rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resource Conflict Widget
// ---------------------------------------------------------------------------

const ResourceConflictContent = React.memo(function ResourceConflictContent({
  timeRange,
}: WidgetProps) {
  const { openPersonCard } = usePersonCard();

  const [viewMode, setViewMode] = useState<'current' | 'multi'>('current');
  const [showDismissed, setShowDismissed] = useState(false);
  const [dismissed, setDismissedState] = useState<Set<string>>(getDismissed);
  const [showAll, setShowAll] = useState(false);

  // Redistribute modal state
  const [redistModalOpen, setRedistModalOpen] = useState(false);
  const [redistTarget, setRedistTarget] = useState<{
    person: { personId: string; firstName: string; lastName: string };
    month: string;
    projects: { projectId: string; projectName: string; hours: number }[];
    targetHours: number;
  } | null>(null);

  const currentMonth = useMemo(() => {
    // Use timeRange.from if available, otherwise current month
    return timeRange.from?.slice(0, 7) || getCurrentMonth();
  }, [timeRange.from]);

  const monthsCount = viewMode === 'multi' ? 3 : 1;
  const { data, isLoading, error } = useConflicts(currentMonth, monthsCount);

  const queryClient = useQueryClient();

  // Apply suggestion mutation
  const applySuggestion = useMutation({
    mutationFn: async (
      payload: { personId: string; projectId: string; month: string; hours: number }[],
    ) => {
      const res = await fetch('/api/allocations/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocations: payload }),
      });
      if (!res.ok) throw new Error('Failed to apply suggestion');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conflicts'] });
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      queryClient.invalidateQueries({ queryKey: ['availability-search'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert-count'] });
    },
  });

  const handleDismiss = useCallback(
    (personId: string, month: string) => {
      const key = makeDismissKey(personId, month);
      const next = new Set(dismissed);
      next.add(key);
      setDismissedState(next);
      setDismissed(next);
    },
    [dismissed],
  );

  const handleApplySuggestion = useCallback(
    (personId: string, month: string, suggestion: { projectId: string; newHours: number }) => {
      applySuggestion.mutate([
        {
          personId,
          projectId: suggestion.projectId,
          month,
          hours: suggestion.newHours,
        },
      ]);
    },
    [applySuggestion],
  );

  const handleRedistribute = useCallback(
    (
      person: { personId: string; firstName: string; lastName: string },
      month: string,
      projects: { projectId: string; projectName: string; hours: number }[],
      targetHours: number,
    ) => {
      setRedistTarget({ person, month, projects, targetHours });
      setRedistModalOpen(true);
    },
    [],
  );

  // Filter conflicts: separate active vs dismissed
  const { activeConflicts, dismissedConflicts } = useMemo(() => {
    if (!data?.conflicts) return { activeConflicts: [], dismissedConflicts: [] };

    const active: typeof data.conflicts = [];
    const dimissed: typeof data.conflicts = [];

    for (const conflict of data.conflicts) {
      const monthKeys = Object.keys(conflict.months);
      const allDismissed = monthKeys.every((m) =>
        dismissed.has(makeDismissKey(conflict.personId, m)),
      );
      if (allDismissed) {
        dimissed.push(conflict);
      } else {
        active.push(conflict);
      }
    }

    return { activeConflicts: active, dismissedConflicts: dimissed };
  }, [data, dismissed]);

  // Sort by severity (most overallocated first)
  const sortedConflicts = useMemo(() => {
    return [...activeConflicts].sort((a, b) => {
      const aOver = Object.values(a.months).reduce((sum, m) => sum + m.overBy, 0);
      const bOver = Object.values(b.months).reduce((sum, m) => sum + m.overBy, 0);
      return bOver - aOver;
    });
  }, [activeConflicts]);

  const displayConflicts = showAll ? sortedConflicts : sortedConflicts.slice(0, 3);
  const hiddenCount = sortedConflicts.length - 3;

  if (error) {
    return <div className="text-sm text-red-600">Failed to load conflict data</div>;
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-on-surface-variant text-xs">Show:</label>
          <button
            onClick={() => setViewMode('current')}
            className={`rounded-md px-3 py-1 text-xs font-medium ${
              viewMode === 'current'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            Current month
          </button>
          <button
            onClick={() => setViewMode('multi')}
            className={`rounded-md px-3 py-1 text-xs font-medium ${
              viewMode === 'multi'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            Next 3 months
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-surface-container-low h-32 animate-pulse rounded-lg" />
          ))}
        </div>
      )}

      {/* Count badge */}
      {data && !isLoading && (
        <p className="text-on-surface-variant text-sm">
          <span className="text-on-surface font-medium">{activeConflicts.length}</span>{' '}
          {activeConflicts.length === 1 ? 'person' : 'people'} overallocated across competing
          projects
        </p>
      )}

      {/* Empty state */}
      {data && activeConflicts.length === 0 && !isLoading && (
        <div className="bg-surface-container-low text-on-surface-variant rounded-lg p-6 text-center text-sm">
          No resource conflicts detected. All allocations are within target hours.
        </div>
      )}

      {/* Conflict cards */}
      {displayConflicts.map((conflict) => {
        const monthEntries = Object.entries(conflict.months).sort(([a], [b]) => a.localeCompare(b));

        return (
          <div key={conflict.personId} className="border-outline-variant rounded-lg border p-4">
            {/* Person header */}
            <div className="mb-3 flex items-start justify-between">
              <div>
                <button
                  onClick={() => openPersonCard(conflict.personId)}
                  className="text-primary text-sm font-semibold hover:underline"
                >
                  {conflict.firstName} {conflict.lastName}
                </button>
                <span className="text-on-surface-variant ml-2 text-xs">
                  {conflict.disciplineAbbreviation} · {conflict.departmentName}
                </span>
              </div>
            </div>

            {/* Per-month conflict details */}
            {monthEntries.map(([month, monthData]) => {
              const isDismissed = dismissed.has(makeDismissKey(conflict.personId, month));
              if (isDismissed) return null;

              return (
                <div key={month} className="mb-3 last:mb-0">
                  {monthEntries.length > 1 && (
                    <p className="text-on-surface-variant mb-1 text-xs font-medium">
                      {formatMonth(month)}
                    </p>
                  )}

                  <div className="mb-2 flex items-center gap-4 text-xs">
                    <span className="text-on-surface-variant">
                      Target: {conflict.targetHoursPerMonth}h
                    </span>
                    <span className="text-on-surface-variant">
                      Total: {monthData.totalAllocated}h
                    </span>
                    <span className="font-medium text-red-600">Over by: {monthData.overBy}h</span>
                  </div>

                  {/* Project bars */}
                  <div className="mb-2 space-y-1">
                    {monthData.projects.map((project) => (
                      <ConflictBar
                        key={project.projectId}
                        projectName={project.projectName}
                        hours={project.hours}
                        targetHours={conflict.targetHoursPerMonth}
                      />
                    ))}
                  </div>

                  {/* Target line indicator */}
                  <div className="text-on-surface-variant mb-2 text-xs">
                    <span className="border-outline-variant inline-block w-[200px] border-t border-dashed" />{' '}
                    {conflict.targetHoursPerMonth}h target
                  </div>

                  {/* Suggested resolution */}
                  {monthData.suggestedResolution && (
                    <p className="text-on-surface-variant mb-2 text-xs italic">
                      Suggested: Reduce {monthData.suggestedResolution.projectName} by{' '}
                      {monthData.suggestedResolution.reduceBy}h (to{' '}
                      {monthData.suggestedResolution.newHours}h)
                    </p>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    {monthData.suggestedResolution && (
                      <button
                        onClick={() =>
                          handleApplySuggestion(
                            conflict.personId,
                            month,
                            monthData.suggestedResolution!,
                          )
                        }
                        disabled={applySuggestion.isPending}
                        className="bg-primary text-on-primary rounded-md px-3 py-1 text-xs font-medium hover:opacity-90 disabled:opacity-50"
                      >
                        Apply suggestion
                      </button>
                    )}
                    <button
                      onClick={() =>
                        handleRedistribute(
                          {
                            personId: conflict.personId,
                            firstName: conflict.firstName,
                            lastName: conflict.lastName,
                          },
                          month,
                          monthData.projects,
                          conflict.targetHoursPerMonth,
                        )
                      }
                      className="border-outline-variant text-on-surface rounded-md border px-3 py-1 text-xs font-medium hover:bg-black/5"
                    >
                      Redistribute manually
                    </button>
                    <button
                      onClick={() => handleDismiss(conflict.personId, month)}
                      className="text-on-surface-variant rounded-md px-3 py-1 text-xs hover:bg-black/5"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Show more */}
      {!showAll && hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="text-primary text-sm font-medium hover:underline"
        >
          Show {hiddenCount} more {hiddenCount === 1 ? 'conflict' : 'conflicts'}
        </button>
      )}

      {/* Dismissed section */}
      {dismissedConflicts.length > 0 && (
        <div className="border-outline-variant border-t pt-3">
          <button
            onClick={() => setShowDismissed(!showDismissed)}
            className="text-on-surface-variant text-xs hover:underline"
          >
            {showDismissed ? 'Hide' : 'Show'} {dismissedConflicts.length} acknowledged{' '}
            {dismissedConflicts.length === 1 ? 'conflict' : 'conflicts'}
          </button>
          {showDismissed && (
            <div className="mt-2 space-y-1">
              {dismissedConflicts.map((c) => (
                <p key={c.personId} className="text-on-surface-variant text-xs">
                  {c.firstName} {c.lastName} ({c.disciplineAbbreviation})
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History footer */}
      {data?.summary && (
        <div className="border-outline-variant text-on-surface-variant border-t pt-3 text-xs">
          {data.summary.resolvedThisMonth} conflicts resolved this month,{' '}
          {data.summary.totalConflicts} pending
        </div>
      )}

      {/* Redistribute modal */}
      {redistTarget && (
        <RedistributeModal
          isOpen={redistModalOpen}
          onClose={() => {
            setRedistModalOpen(false);
            setRedistTarget(null);
          }}
          person={redistTarget.person}
          month={redistTarget.month}
          projects={redistTarget.projects}
          targetHours={redistTarget.targetHours}
        />
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

registerWidget({
  id: 'resource-conflicts',
  name: 'Resource Conflicts',
  description:
    'Overallocated people with per-project breakdown, resolution suggestions, and manual redistribution.',
  category: 'alerts-actions',
  icon: AlertOctagon,
  component: ResourceConflictContent,
  defaultColSpan: 12,
  minColSpan: 6,
  supportedDashboards: ['manager', 'project-leader'],
  dataHook: 'useConflicts',
});
