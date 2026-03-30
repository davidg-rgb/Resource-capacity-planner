'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle2, X } from 'lucide-react';

import { useTeamHeatMap } from '@/hooks/use-team-heatmap';
import { HeatMapTable } from '@/components/heat-map/heat-map-table';
import { HeatMapFilters } from '@/components/heat-map/heat-map-filters';
import { HeatMapSummaryBanner } from '@/components/heat-map/heat-map-summary-banner';
import { HeatMapActions } from '@/components/heat-map/heat-map-actions';
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

  // Import success banner state (from import wizard redirect)
  const importedCount = searchParams.get('imported');
  const [showImportBanner, setShowImportBanner] = useState(!!importedCount);

  const dismissImportBanner = useCallback(() => {
    setShowImportBanner(false);
    // Clean URL params
    const params = new URLSearchParams(searchParams.toString());
    params.delete('imported');
    params.delete('source');
    const remaining = params.toString();
    router.replace(remaining ? `?${remaining}` : '/dashboard/team');
  }, [searchParams, router]);

  useEffect(() => {
    if (showImportBanner) {
      const timer = setTimeout(dismissImportBanner, 10000);
      return () => clearTimeout(timer);
    }
  }, [showImportBanner, dismissImportBanner]);

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
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-headline text-on-surface mb-1 text-2xl font-semibold">
            Teambelastning
          </h1>
          <p className="text-on-surface-variant text-sm">
            Beläggningsöversikt per medarbetare och månad
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HeatMapActions />
          {data && (
            <button
              onClick={handleExportPdf}
              disabled={exporting}
              className="border-outline-variant/30 text-primary hover:bg-surface-container-low inline-flex items-center gap-2 rounded-sm border px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">picture_as_pdf</span>
              {exporting ? 'Exporterar...' : 'Exportera PDF'}
            </button>
          )}
        </div>
      </div>

      {showImportBanner && importedCount && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-sm border border-green-200 bg-green-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-800">
              {importedCount} medarbetare importerade — här ser du teamets belastning
            </p>
          </div>
          <button
            type="button"
            onClick={dismissImportBanner}
            className="shrink-0 rounded-sm p-1 text-emerald-600 hover:bg-green-100"
            aria-label="Stäng"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {data && (
        <div className="mt-4">
          <HeatMapSummaryBanner data={data} />
        </div>
      )}

      <div className="mt-4">
        <HeatMapFilters filters={filters} onFilterChange={setFilter} />
      </div>

      {isLoading && <div className="text-on-surface-variant mt-6 text-sm">Loading heat map...</div>}

      {error && <div className="mt-6 text-sm text-red-600">Failed to load heat map data</div>}

      {data && data.departments.length === 0 && (
        <div className="text-on-surface-variant mt-6 text-sm">
          No people found for the selected filters
        </div>
      )}

      {data && data.departments.length > 0 && (
        <div className="mt-4">
          <HeatMapTable data={data} />
        </div>
      )}

      {/* Footer Summary */}
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-4">
        {/* Grid Legend */}
        <div className="bg-surface-container-low border-outline-variant/10 flex flex-col justify-between rounded-sm border p-5 md:col-span-1">
          <span className="text-outline mb-4 text-[10px] font-bold tracking-wider uppercase">
            Färgkarta
          </span>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="bg-surface-container-low border-outline-variant/30 h-3 w-3 rounded-[1px] border" />
              <span className="text-on-surface-variant text-[11px] font-medium">
                {'Låg/Tom (<140 tim)'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-[1px] bg-green-100" />
              <span className="text-on-surface-variant text-[11px] font-medium">
                Hälsosam (140–160 tim)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-[1px] bg-amber-100" />
              <span className="text-on-surface-variant text-[11px] font-medium">
                Hög (161–179 tim)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-error/20 h-3 w-3 rounded-[1px]" />
              <span className="text-on-surface-variant text-[11px] font-medium">
                Överbelastad (180+ tim)
              </span>
            </div>
          </div>
        </div>

        {/* Aggregated Team Health Metrics */}
        <div className="bg-surface-container-lowest border-outline-variant/10 flex flex-col rounded-sm border p-6 shadow-sm md:col-span-3">
          <div className="mb-6 flex items-center justify-between">
            <span className="text-outline text-[10px] font-bold tracking-wider uppercase">
              Sammanfattande teamhälsa
            </span>
            <span className="text-primary flex items-center gap-1 text-[11px] font-semibold">
              Visa trender
            </span>
          </div>
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            <div>
              <p className="text-outline-variant mb-1 text-[10px] font-medium tracking-tighter uppercase">
                Avg. Utilization
              </p>
              <p className="font-headline text-2xl font-bold tabular-nums">94.2%</p>
              <p className="mt-1 text-[10px] font-bold text-emerald-600">+2.1% vs LM</p>
            </div>
            <div>
              <p className="text-outline-variant mb-1 text-[10px] font-medium tracking-tighter uppercase">
                Critical Risk
              </p>
              <p className="font-headline text-error text-2xl font-bold tabular-nums">4</p>
              <p className="text-outline mt-1 text-[10px] font-medium">Resources over 110%</p>
            </div>
            <div>
              <p className="text-outline-variant mb-1 text-[10px] font-medium tracking-tighter uppercase">
                Hiring Gap
              </p>
              <p className="font-headline text-2xl font-bold tabular-nums">2.5 FTE</p>
              <p className="text-outline mt-1 text-[10px] font-medium">Software / Electronics</p>
            </div>
            <div>
              <p className="text-outline-variant mb-1 text-[10px] font-medium tracking-tighter uppercase">
                Project Coverage
              </p>
              <p className="font-headline text-2xl font-bold tabular-nums">98%</p>
              <div className="bg-surface-container-low mt-2 h-1 w-full overflow-hidden rounded-full">
                <div className="bg-primary h-full w-[98%]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function TeamOverviewPage() {
  return (
    <Suspense fallback={<div className="text-on-surface-variant text-sm">Loading...</div>}>
      <TeamOverviewContent />
    </Suspense>
  );
}
