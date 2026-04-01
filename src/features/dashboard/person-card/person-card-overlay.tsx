'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

import { usePersonSummary } from './use-person-card';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PersonCardOverlayProps {
  personId: string;
  isOpen: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Capacity status badge colors (Material Design 3 compatible)
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  available: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'fully-allocated': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  overloaded: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_LABELS: Record<string, string> = {
  available: 'Available',
  'fully-allocated': 'Fully Allocated',
  overloaded: 'Overloaded',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PersonCardOverlay({ personId, isOpen, onClose }: PersonCardOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError, refetch } = usePersonSummary(personId);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[59] bg-black/20 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Person details"
        aria-modal="true"
        className={`bg-surface border-outline-variant/30 fixed top-0 right-0 z-[60] flex h-full w-[360px] flex-col border-l shadow-xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="border-outline-variant/30 flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-on-surface font-headline text-lg font-semibold">Person Details</h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:bg-surface-container-low rounded-full p-1.5 transition-colors"
            aria-label="Close person card"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && <LoadingSkeleton />}
          {isError && <ErrorState onRetry={() => refetch()} />}
          {data && <PersonContent data={data} />}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Content sub-components
// ---------------------------------------------------------------------------

function PersonContent({
  data,
}: {
  data: NonNullable<ReturnType<typeof usePersonSummary>['data']>;
}) {
  const statusStyle = STATUS_STYLES[data.capacityStatus] ?? STATUS_STYLES.available;
  const statusLabel = STATUS_LABELS[data.capacityStatus] ?? data.capacityStatus;

  return (
    <div className="space-y-5 p-5">
      {/* Name + status badge */}
      <div>
        <h3 className="text-on-surface font-headline text-xl font-bold">
          {data.firstName} {data.lastName}
        </h3>
        <span
          className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle}`}
        >
          {statusLabel}
        </span>
      </div>

      {/* Info section */}
      <div className="border-outline-variant/30 bg-surface-container-low space-y-3 rounded-lg border p-4">
        {data.department && <InfoRow label="Department" value={data.department.name} />}
        {data.disciplines.length > 0 && (
          <div>
            <span className="text-on-surface-variant text-xs font-medium tracking-wide uppercase">
              Disciplines
            </span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {data.disciplines.map((d) => (
                <span
                  key={d.id}
                  className="bg-surface-container text-on-surface-variant rounded-md px-2 py-0.5 text-xs"
                >
                  {d.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Utilization bar */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-on-surface-variant text-xs font-medium tracking-wide uppercase">
              Utilization
            </span>
            <span className="text-on-surface text-sm font-semibold">
              {data.utilizationPercent}%
            </span>
          </div>
          <div className="bg-surface-container mt-1.5 h-2 overflow-hidden rounded-full">
            <div
              className={`h-full rounded-full transition-all ${
                data.utilizationPercent > 100
                  ? 'bg-red-500'
                  : data.utilizationPercent >= 80
                    ? 'bg-amber-500'
                    : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(data.utilizationPercent, 100)}%` }}
            />
          </div>
        </div>

        {data.totalFteEquivalent > 0 && (
          <InfoRow label="FTE Equivalent" value={data.totalFteEquivalent.toFixed(2)} />
        )}
      </div>

      {/* Active allocations */}
      {data.activeAllocations.length > 0 && (
        <div>
          <h4 className="text-on-surface mb-3 text-sm font-semibold">Active Allocations</h4>
          <div className="space-y-2">
            {data.activeAllocations.map((alloc) => (
              <div
                key={alloc.projectId}
                className="border-outline-variant/30 bg-surface-container-low rounded-lg border p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-on-surface text-sm font-medium">{alloc.projectName}</span>
                  <span className="text-on-surface-variant text-xs font-semibold">
                    {alloc.percentage}%
                  </span>
                </div>
                {alloc.role && (
                  <span className="text-on-surface-variant text-xs">{alloc.role}</span>
                )}
                <div className="bg-surface-container mt-1.5 h-1.5 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${Math.min(alloc.percentage, 100)}%` }}
                  />
                </div>
                <div className="text-on-surface-variant mt-1 text-[11px]">
                  {formatDate(alloc.startDate)} - {formatDate(alloc.endDate)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.activeAllocations.length === 0 && (
        <div className="border-outline-variant/30 bg-surface-container-low rounded-lg border p-4 text-center">
          <p className="text-on-surface-variant text-sm">No active allocations</p>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-on-surface-variant text-xs font-medium tracking-wide uppercase">
        {label}
      </span>
      <p className="text-on-surface text-sm">{value}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-5 p-5">
      <div>
        <div className="bg-surface-container-low h-6 w-40 rounded" />
        <div className="bg-surface-container-low mt-2 h-5 w-24 rounded-full" />
      </div>
      <div className="bg-surface-container-low h-32 rounded-lg" />
      <div className="bg-surface-container-low h-24 rounded-lg" />
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <p className="text-on-surface-variant mb-3 text-sm">Failed to load person data</p>
      <button
        onClick={onRetry}
        className="bg-primary text-on-primary rounded-md px-4 py-2 text-sm font-medium transition-colors hover:opacity-90"
      >
        Retry
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('sv-SE', { year: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}
