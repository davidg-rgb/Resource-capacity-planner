// v5.0 — Phase 41 / Plan 41-02 Task 2 (D-11):
// Capacity heatmap legend — 4 threshold swatches with i18n labels.
// i18n keys land in Wave 4; a safe fallback renders English defaults.

'use client';

import { useTranslations } from 'next-intl';

const ITEMS = [
  { key: 'ok', fallback: 'Ok (60–100%)', swatch: 'bg-green-200 dark:bg-green-900/40' },
  { key: 'under', fallback: 'Under (<60%)', swatch: 'bg-amber-200 dark:bg-amber-900/40' },
  { key: 'over', fallback: 'Over (>100%)', swatch: 'bg-red-300 dark:bg-red-900/60' },
  { key: 'absent', fallback: 'Absent', swatch: 'bg-neutral-200 dark:bg-neutral-800' },
] as const;

export function CapacityHeatmapLegend() {
  const t = useTranslations('v5.lineManager.heatmap.legend');

  return (
    <ul
      data-testid="capacity-heatmap-legend"
      className="text-on-surface-variant flex flex-wrap items-center gap-3 text-xs"
    >
      {ITEMS.map((item) => (
        <li key={item.key} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={`${item.swatch} border-outline-variant/30 inline-block h-3 w-3 rounded-sm border`}
          />
          <span>{safeT(t, item.key, item.fallback)}</span>
        </li>
      ))}
    </ul>
  );
}

function safeT(t: ReturnType<typeof useTranslations>, key: string, fallback: string): string {
  try {
    const v = t(key);
    return typeof v === 'string' && v.length > 0 ? v : fallback;
  } catch {
    return fallback;
  }
}
