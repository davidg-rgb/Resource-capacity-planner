'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { useAvailabilitySearch } from '@/hooks/use-availability';
import { useDisciplines, useDepartments } from '@/hooks/use-reference-data';
import { usePersonCard } from '@/features/dashboard/person-card/person-card-provider';
import { useCrossLinkSubscription } from '../dashboard-cross-links';
import { registerWidget } from '../widget-registry';
import type { WidgetProps } from '../widget-registry.types';
import { QuickAssignModal } from './quick-assign-modal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortOption = 'available' | 'utilization' | 'name';

interface AssignTarget {
  personId: string;
  firstName: string;
  lastName: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMonth(m: string): string {
  const [year, month] = m.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('sv-SE', { month: 'short' });
}

// ---------------------------------------------------------------------------
// Mini utilization bar
// ---------------------------------------------------------------------------

function MiniBar({ allocated, target }: { allocated: number; target: number }) {
  const pct = target > 0 ? Math.min((allocated / target) * 100, 100) : 0;
  const available = Math.max(target - allocated, 0);

  return (
    <div className="flex items-center gap-2">
      <div className="bg-surface-container h-3 w-full max-w-[140px] overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-on-surface-variant w-16 text-right text-xs tabular-nums">
        {available}h free
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Availability Finder Widget
// ---------------------------------------------------------------------------

const AvailabilityFinderContent = React.memo(function AvailabilityFinderContent({
  timeRange,
}: WidgetProps) {
  const { openPersonCard } = usePersonCard();

  // Filter state
  const [disciplineId, setDisciplineId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [minHours, setMinHours] = useState<number>(0);
  const [sort, setSort] = useState<SortOption>('available');

  // Subscribe to cross-link events (e.g., forecast deficit click -> pre-fill discipline)
  const handleCrossLink = useCallback((payload: Record<string, unknown>) => {
    if (payload.disciplineId) {
      setDisciplineId(payload.disciplineId as string);
    }
  }, []);
  useCrossLinkSubscription('open-finder', handleCrossLink);

  // Quick-assign modal state
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  // Reference data for dropdowns
  const { data: disciplines } = useDisciplines();
  const { data: departments } = useDepartments();

  // Build filters
  const filters = useMemo(
    () => ({
      disciplineId: disciplineId || undefined,
      departmentId: departmentId || undefined,
      minHours: minHours > 0 ? minHours : undefined,
      sort,
    }),
    [disciplineId, departmentId, minHours, sort],
  );

  const { data, isLoading, error } = useAvailabilitySearch(timeRange.from, timeRange.to, filters);

  const handleAssign = useCallback((person: AssignTarget) => {
    setAssignTarget(person);
    setAssignModalOpen(true);
  }, []);

  const handleCloseAssign = useCallback(() => {
    setAssignModalOpen(false);
    setAssignTarget(null);
  }, []);

  const handlePersonClick = useCallback(
    (personId: string) => {
      openPersonCard(personId);
    },
    [openPersonCard],
  );

  // Extract ordered months from first result
  const months = useMemo(() => {
    if (!data?.results?.[0]) return [];
    return Object.keys(data.results[0].months).sort();
  }, [data]);

  // Error state
  if (error) {
    return <div className="text-sm text-red-600">Failed to load availability data</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-on-surface-variant mb-1 block text-xs">Discipline</label>
          <select
            value={disciplineId}
            onChange={(e) => setDisciplineId(e.target.value)}
            className="border-outline-variant bg-surface-container-lowest text-on-surface rounded-md border px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {disciplines?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.abbreviation ?? d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-on-surface-variant mb-1 block text-xs">Department</label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="border-outline-variant bg-surface-container-lowest text-on-surface rounded-md border px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {departments?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-on-surface-variant mb-1 block text-xs">Min available</label>
          <select
            value={minHours}
            onChange={(e) => setMinHours(Number(e.target.value))}
            className="border-outline-variant bg-surface-container-lowest text-on-surface rounded-md border px-2 py-1.5 text-sm"
          >
            <option value={0}>Any</option>
            <option value={40}>40h</option>
            <option value={80}>80h</option>
            <option value={120}>120h</option>
          </select>
        </div>

        <div>
          <label className="text-on-surface-variant mb-1 block text-xs">Sort by</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="border-outline-variant bg-surface-container-lowest text-on-surface rounded-md border px-2 py-1.5 text-sm"
          >
            <option value="available">Most available</option>
            <option value="utilization">Least utilized</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface-container-low h-24 animate-pulse rounded-lg" />
          ))}
        </div>
      )}

      {/* Results header */}
      {data && !isLoading && (
        <p className="text-on-surface-variant text-sm">
          Found <span className="text-on-surface font-medium">{data.total}</span> people
          {minHours > 0 && ` with \u2265${minHours}h available`}
        </p>
      )}

      {/* Empty state */}
      {data && data.results.length === 0 && !isLoading && (
        <div className="bg-surface-container-low text-on-surface-variant rounded-lg p-6 text-center text-sm">
          No one matching your filters has availability in this period. Try widening the date range
          or removing the discipline filter.
        </div>
      )}

      {/* Results list */}
      {data && data.results.length > 0 && (
        <div className="divide-outline-variant divide-y">
          {data.results.map((person, index) => (
            <div key={person.personId} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {/* Person header */}
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface-variant text-xs font-medium">
                      {index + 1}.
                    </span>
                    <button
                      onClick={() => handlePersonClick(person.personId)}
                      className="text-primary text-sm font-medium hover:underline"
                    >
                      {person.firstName} {person.lastName}
                    </button>
                    <span className="text-on-surface-variant text-xs">
                      {person.disciplineAbbreviation} · {person.departmentName}
                    </span>
                  </div>

                  {/* Per-month bars */}
                  <div className="mt-2 space-y-1">
                    {months.map((m) => {
                      const monthData = person.months[m];
                      if (!monthData) return null;
                      return (
                        <div key={m} className="flex items-center gap-2">
                          <span className="text-on-surface-variant w-10 text-xs">
                            {formatMonth(m)}:
                          </span>
                          <MiniBar
                            allocated={monthData.allocated}
                            target={person.targetHoursPerMonth}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Total available */}
                  <p className="text-on-surface-variant mt-1 text-xs">
                    Total available:{' '}
                    <span className="text-on-surface font-medium">{person.totalAvailable}h</span>{' '}
                    across {months.length} months
                  </p>
                </div>

                {/* Assign button */}
                <button
                  onClick={() =>
                    handleAssign({
                      personId: person.personId,
                      firstName: person.firstName,
                      lastName: person.lastName,
                    })
                  }
                  className="bg-primary text-on-primary shrink-0 rounded-md px-3 py-1.5 text-xs font-medium hover:opacity-90"
                >
                  Assign
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick-assign modal */}
      <QuickAssignModal
        isOpen={assignModalOpen}
        onClose={handleCloseAssign}
        person={assignTarget}
        monthFrom={timeRange.from}
        monthTo={timeRange.to}
      />
    </div>
  );
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

registerWidget({
  id: 'availability-finder',
  name: 'Availability Finder',
  description:
    'Search and filter available resources with ranked results. Quick-assign to projects.',
  category: 'alerts-actions',
  icon: Search,
  component: AvailabilityFinderContent,
  defaultColSpan: 12,
  minColSpan: 6,
  supportedDashboards: ['manager', 'project-leader'],
  dataHook: 'useAvailabilitySearch',
});
