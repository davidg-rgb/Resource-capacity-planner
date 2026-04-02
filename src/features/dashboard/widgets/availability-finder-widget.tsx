'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
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

function MiniBar({
  allocated,
  target,
  month,
}: {
  allocated: number;
  target: number;
  month: string;
}) {
  const pct = target > 0 ? Math.min((allocated / target) * 100, 100) : 0;
  const available = Math.max(target - allocated, 0);
  const isFullyBooked = available === 0;

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-on-surface-variant text-[10px] uppercase">{month}</span>
      <div className="bg-surface-container relative h-8 w-full min-w-[60px] overflow-hidden rounded">
        <div
          className={`h-full rounded transition-all ${isFullyBooked ? 'bg-outline-variant' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`text-xs font-medium tabular-nums ${isFullyBooked ? 'text-outline-variant' : 'text-on-surface'}`}
      >
        {available}h
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
  const t = useTranslations('widgets.availabilityFinder');
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
    return <div className="text-sm text-red-600">{t('error')}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-on-surface-variant mb-1 block text-xs">{t('discipline')}</label>
          <select
            value={disciplineId}
            onChange={(e) => setDisciplineId(e.target.value)}
            className="border-outline-variant bg-surface-container-lowest text-on-surface rounded-md border px-2 py-1.5 text-sm"
          >
            <option value="">{t('any')}</option>
            {disciplines?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.abbreviation ?? d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-on-surface-variant mb-1 block text-xs">{t('department')}</label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="border-outline-variant bg-surface-container-lowest text-on-surface rounded-md border px-2 py-1.5 text-sm"
          >
            <option value="">{t('any')}</option>
            {departments?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-on-surface-variant mb-1 block text-xs">{t('minAvailable')}</label>
          <select
            value={minHours}
            onChange={(e) => setMinHours(Number(e.target.value))}
            className="border-outline-variant bg-surface-container-lowest text-on-surface rounded-md border px-2 py-1.5 text-sm"
          >
            <option value={0}>{t('any')}</option>
            <option value={40}>40h</option>
            <option value={80}>80h</option>
            <option value={120}>120h</option>
          </select>
        </div>

        <div>
          <label className="text-on-surface-variant mb-1 block text-xs">{t('sortBy')}</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="border-outline-variant bg-surface-container-lowest text-on-surface rounded-md border px-2 py-1.5 text-sm"
          >
            <option value="available">{t('mostAvailable')}</option>
            <option value="utilization">{t('leastUtilized')}</option>
            <option value="name">{t('name')}</option>
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
          {t.rich('foundPeople', {
            count: data.total,
            bold: (chunks) => <span className="text-on-surface font-medium">{chunks}</span>,
          })}
          {minHours > 0 && ` ${t('withMinHours', { hours: minHours })}`}
        </p>
      )}

      {/* Empty state */}
      {data && data.results.length === 0 && !isLoading && (
        <div className="bg-surface-container-low text-on-surface-variant rounded-lg p-6 text-center text-sm">
          {t('emptyState')}
        </div>
      )}

      {/* Results list */}
      {data && data.results.length > 0 && (
        <div className="space-y-2">
          {data.results.map((person, index) => (
            <div
              key={person.personId}
              className="border-outline-variant/20 bg-surface-container-lowest hover:bg-surface-container-low rounded-lg border p-4 transition-colors"
            >
              {/* Top row: person info + total + assign */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-outline text-xs font-medium tabular-nums">{index + 1}</span>
                  <div>
                    <button
                      onClick={() => handlePersonClick(person.personId)}
                      className="text-primary text-sm font-semibold hover:underline"
                    >
                      {person.firstName} {person.lastName}
                    </button>
                    <span className="text-on-surface-variant ml-2 text-xs">
                      {person.disciplineAbbreviation} · {person.departmentName}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  <div className="text-right">
                    <span className="text-on-surface text-lg font-bold tabular-nums">
                      {person.totalAvailable}h
                    </span>
                    <span className="text-on-surface-variant ml-1 text-xs">
                      {t('acrossMonths', { count: months.length })}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      handleAssign({
                        personId: person.personId,
                        firstName: person.firstName,
                        lastName: person.lastName,
                      })
                    }
                    className="bg-primary text-on-primary rounded-md px-4 py-2 text-xs font-medium hover:opacity-90"
                  >
                    {t('assign')}
                  </button>
                </div>
              </div>

              {/* Bottom row: month bars spread horizontally */}
              <div
                className="mt-3 grid gap-2"
                style={{ gridTemplateColumns: `repeat(${months.length}, 1fr)` }}
              >
                {months.map((m) => {
                  const monthData = person.months[m];
                  if (!monthData) return null;
                  return (
                    <MiniBar
                      key={m}
                      month={formatMonth(m)}
                      allocated={monthData.allocated}
                      target={person.targetHoursPerMonth}
                    />
                  );
                })}
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
