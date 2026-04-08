'use client';

/**
 * v5.0 — Phase 42 / Plan 42-03 (Wave 2): 3-button zoom toggle.
 *
 * Mounted on PM project, LM group, Staff, and (Wave 3) R&D timeline pages.
 * Labels are i18n'd via `v5.timeline.zoom.{month|quarter|year}`.
 *
 * Controlled component: parent owns the zoom state via useZoom() and passes
 * {value, onChange}. Render-time aria-pressed reflects the active selection.
 */

import { useTranslations } from 'next-intl';

import type { TimelineZoom } from './timeline-columns';

export interface ZoomControlsProps {
  value: TimelineZoom;
  onChange: (next: TimelineZoom) => void;
}

const LEVELS: readonly TimelineZoom[] = ['month', 'quarter', 'year'];

export function ZoomControls(props: ZoomControlsProps) {
  const { value, onChange } = props;
  const t = useTranslations('v5.timeline.zoom');

  return (
    <div
      role="group"
      aria-label={t('month') /* fallback aria label uses the month key */}
      data-testid="zoom-controls"
      className="border-outline-variant/30 inline-flex overflow-hidden rounded-md border"
    >
      {LEVELS.map((level) => {
        const active = value === level;
        return (
          <button
            key={level}
            type="button"
            aria-pressed={active}
            data-testid={`zoom-${level}`}
            onClick={() => onChange(level)}
            className={
              active
                ? 'bg-primary text-on-primary px-3 py-1 text-sm font-medium'
                : 'bg-surface text-on-surface hover:bg-surface-container px-3 py-1 text-sm'
            }
          >
            {t(level)}
          </button>
        );
      })}
    </div>
  );
}
