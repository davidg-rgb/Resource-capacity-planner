'use client';

/**
 * v5.0 — Phase 37-02: PlanVsActualCell.
 *
 * Reusable cell rendering planned/actual/delta for one
 * (person, project, monthKey) tuple. Imported by PM, Line Mgr, Staff,
 * R&D persona timelines (Phases 40/41/42) — single source file.
 *
 * State machine:
 *   - 'no-actual'  → actual === null            (grey/muted, shows planned only)
 *   - 'on-plan'    → |actual - planned| < 0.005 (neutral/blue)
 *   - 'under'      → actual < planned            (green tint)
 *   - 'over'       → actual > planned            (red tint)
 *
 * Modes:
 *   - editable:  onCellEdit set → planned is an inline-editable input,
 *                fires onCellEdit after a 600ms debounce (TC-UI-002).
 *   - read-only: onCellEdit omitted → root is a button, fires onCellClick
 *                with the cell context (TC-UI-001 / TC-UI-003).
 *
 * Every user-facing string flows through useTranslations('v5.cell') —
 * the no-restricted-syntax JSXText guard in eslint.config.mjs is enforced.
 */

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';

import styles from './PlanVsActualCell.module.css';

export interface PlanVsActualCellProps {
  planned: number;
  actual: number | null;
  delta: number | null;
  personId: string;
  projectId: string;
  monthKey: string;
  editable?: boolean;
  /** v5.0 Phase 42 Plan 42-03: when true the cell renders a Σ badge indicating
   *  the plan/actual values are summed across multiple months (quarter/year zoom). */
  aggregate?: boolean;
  /** Fires after 600ms debounce of input changes. */
  onCellEdit?: (next: number) => void;
  /** Fires on click in read-only mode. */
  onCellClick?: (ctx: { personId: string; projectId: string; monthKey: string }) => void;
}

type CellState = 'no-actual' | 'on-plan' | 'under' | 'over';

function computeState(planned: number, actual: number | null): CellState {
  if (actual === null) return 'no-actual';
  if (Math.abs(actual - planned) < 0.005) return 'on-plan';
  return actual < planned ? 'under' : 'over';
}

function formatHours(value: number): string {
  return value.toFixed(1);
}

const DEBOUNCE_MS = 600;

export function PlanVsActualCell(props: PlanVsActualCellProps) {
  const {
    planned,
    actual,
    delta,
    personId,
    projectId,
    monthKey,
    aggregate,
    onCellEdit,
    onCellClick,
  } = props;

  const t = useTranslations('v5.cell');
  const editable = !!onCellEdit;
  const state = useMemo(() => computeState(planned, actual), [planned, actual]);

  const [draft, setDraft] = useState<string>(formatHours(planned));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset draft when external `planned` changes (e.g. server reconciliation).
  useEffect(() => {
    setDraft(formatHours(planned));
  }, [planned]);

  // Cleanup any pending debounce on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setDraft(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const parsed = Number(next);
      if (Number.isFinite(parsed)) {
        onCellEdit?.(parsed);
      }
    }, DEBOUNCE_MS);
  }

  function handleClick() {
    onCellClick?.({ personId, projectId, monthKey });
  }

  const plannedLabel = t('planned');
  const actualLabel = t('actual');
  const deltaLabel = t('delta');
  const noActualLabel = t('noActual');
  const hoursSuffix = t('hoursSuffix');

  const deltaText =
    delta === null
      ? noActualLabel
      : delta === 0
        ? t('onPlan')
        : delta > 0
          ? t('overBy', { hours: formatHours(delta) })
          : t('underBy', { hours: formatHours(Math.abs(delta)) });

  const body = (
    <>
      {aggregate && (
        <span
          className={styles.row}
          data-testid="cell-aggregate-badge"
          aria-label="aggregated"
          style={{ fontSize: '0.75em', opacity: 0.7 }}
        >
          Σ
        </span>
      )}
      <span className={styles.row}>
        <span className={styles.label}>{plannedLabel}</span>
        {editable ? (
          <input
            type="number"
            step="0.5"
            className={styles.input}
            value={draft}
            onChange={handleInputChange}
            aria-label={plannedLabel}
          />
        ) : (
          <span className={styles.value}>
            {formatHours(planned)}
            {hoursSuffix}
          </span>
        )}
      </span>
      <span className={styles.row}>
        <span className={styles.label}>{actualLabel}</span>
        <span className={styles.value} data-testid="cell-actual">
          {actual === null ? noActualLabel : `${formatHours(actual)}${hoursSuffix}`}
        </span>
      </span>
      <span className={styles.row}>
        <span className={styles.label}>{deltaLabel}</span>
        <span className={styles.value} data-testid="cell-delta">
          {deltaText}
        </span>
      </span>
    </>
  );

  if (editable) {
    return (
      <div
        className={styles.cell}
        data-state={state}
        data-testid="plan-vs-actual-cell"
        data-person={personId}
        data-project={projectId}
        data-month={monthKey}
      >
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={styles.cell}
      data-state={state}
      data-testid="plan-vs-actual-cell"
      data-person={personId}
      data-project={projectId}
      data-month={monthKey}
      onClick={handleClick}
      aria-label={t('planned')}
    >
      {body}
    </button>
  );
}
