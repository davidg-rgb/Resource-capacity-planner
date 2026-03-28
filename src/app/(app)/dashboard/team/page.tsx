'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { useTeamHeatMap } from '@/hooks/use-team-heatmap';
import { HeatMapTable } from '@/components/heat-map/heat-map-table';
import { HeatMapFilters } from '@/components/heat-map/heat-map-filters';
import { getCurrentMonth, generateMonthRange } from '@/lib/date-utils';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import type { HeatMapFilters as HeatMapFiltersType } from '@/features/analytics/analytics.types';

function TeamOverviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentMonth = getCurrentMonth();
  const defaultEnd = generateMonthRange(currentMonth, 12).at(-1)!;

  const filters: HeatMapFiltersType = {
    departmentId: searchParams.get('dept') ?? undefined,
    disciplineId: searchParams.get('disc') ?? undefined,
    monthFrom: searchParams.get('from') ?? currentMonth,
    monthTo: searchParams.get('to') ?? defaultEnd,
  };

  const setFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`?${params.toString()}`);
  };

  const { data, isLoading, error } = useTeamHeatMap(filters);
  const [exporting, setExporting] = useState(false);

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const res = await fetch(
        `/api/reports/team-heatmap?from=${filters.monthFrom}&to=${filters.monthTo}`,
      );
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `team-overview-${filters.monthFrom}-to-${filters.monthTo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Breadcrumbs />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-semibold tracking-tight text-on-surface">
            Team Overview
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Capacity heat map across all team members and months
          </p>
        </div>
        {data && (
          <button
            onClick={handleExportPdf}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-on-primary hover:bg-primary/90 disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : 'Export PDF'}
          </button>
        )}
      </div>

      <div className="mt-4">
        <HeatMapFilters filters={filters} onFilterChange={setFilter} />
      </div>

      {isLoading && (
        <div className="mt-6 text-sm text-on-surface-variant">Loading heat map...</div>
      )}

      {error && (
        <div className="mt-6 text-sm text-red-600">Failed to load heat map data</div>
      )}

      {data && data.departments.length === 0 && (
        <div className="mt-6 text-sm text-on-surface-variant">
          No people found for the selected filters
        </div>
      )}

      {data && data.departments.length > 0 && (
        <div className="mt-4">
          <HeatMapTable data={data} />
        </div>
      )}

      {/* Color legend */}
      <div className="mt-3 flex items-center gap-4 text-xs text-on-surface-variant">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-red-500/80" /> Over 100%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-green-500/60" /> 80-100%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-amber-400/60" /> 50-79%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-gray-200" /> Under 50%
        </span>
      </div>
    </>
  );
}

export default function TeamOverviewPage() {
  return (
    <Suspense fallback={<div className="text-sm text-on-surface-variant">Loading...</div>}>
      <TeamOverviewContent />
    </Suspense>
  );
}
