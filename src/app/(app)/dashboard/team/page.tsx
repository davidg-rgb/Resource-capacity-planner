'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle2, X } from 'lucide-react';

import { useTranslations } from 'next-intl';

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

  const setFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.replace(`?${params.toString()}`);
    },
    [searchParams, router],
  );

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

  const t = useTranslations('heatMap');

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
      toast.error(t('exportFailed'));
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
            {t('title')}
          </h1>
          <p className="text-on-surface-variant text-sm">{t('subtitle')}</p>
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
              {exporting ? t('exporting') : t('exportPdf')}
            </button>
          )}
        </div>
      </div>

      {showImportBanner && importedCount && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-sm border border-green-200 bg-green-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-800">
              {t('importSuccess', { count: importedCount })}
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

      {isLoading && <div className="text-on-surface-variant mt-6 text-sm">{t('loading')}</div>}

      {error && <div className="mt-6 text-sm text-red-600">{t('loadFailed')}</div>}

      {data && data.departments.length === 0 && (
        <div className="text-on-surface-variant mt-6 text-sm">{t('noResults')}</div>
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
            {t('legend')}
          </span>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="bg-surface-container-low border-outline-variant/30 h-3 w-3 rounded-[1px] border" />
              <span className="text-on-surface-variant text-[11px] font-medium">
                {t('legendLow')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-[1px] bg-amber-100" />
              <span className="text-on-surface-variant text-[11px] font-medium">
                {t('legendUnder')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-[1px] bg-green-100" />
              <span className="text-on-surface-variant text-[11px] font-medium">
                {t('legendHealthy')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-error/20 h-3 w-3 rounded-[1px]" />
              <span className="text-on-surface-variant text-[11px] font-medium">
                {t('legendOver')}
              </span>
            </div>
          </div>
        </div>

        {/* Team Health Summary — placeholder for future computed metrics */}
        <div className="bg-surface-container-lowest border-outline-variant/10 flex flex-col items-center justify-center rounded-sm border p-6 shadow-sm md:col-span-3">
          <span className="text-outline text-[10px] font-bold tracking-wider uppercase">
            {t('teamHealth')}
          </span>
          <p className="text-on-surface-variant mt-3 text-center text-sm">
            {t('teamHealthLink')}{' '}
            <a href="/dashboard" className="text-primary font-medium hover:underline">
              {t('kpiDashboard')}
            </a>
          </p>
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
