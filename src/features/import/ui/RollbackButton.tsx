'use client';

/**
 * v5.0 — Phase 38 / Plan 38-03 (WIZ-01): time-aware rollback button.
 *
 * Disables itself once the 24h rollback window has elapsed or once
 * the server reports BATCH_ALREADY_ROLLED_BACK / ROLLBACK_WINDOW_EXPIRED.
 */

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { ROLLBACK_WINDOW_MS } from '../actuals-import.types';

export interface RollbackButtonProps {
  batchId: string;
  committedAt: string; // ISO timestamp
  onRollback: () => Promise<void> | void;
  /** Allow tests to inject a deterministic clock. */
  now?: () => Date;
  /** Set externally once the server has confirmed a successful rollback. */
  rolledBack?: boolean;
}

export function RollbackButton({
  batchId: _batchId,
  committedAt,
  onRollback,
  now,
  rolledBack = false,
}: RollbackButtonProps) {
  const t = useTranslations('v5.import.result');
  const clock = useMemo(() => now ?? (() => new Date()), [now]);
  const [isRunning, setIsRunning] = useState(false);
  const [localRolledBack, setLocalRolledBack] = useState(false);

  const committedMs = useMemo(() => new Date(committedAt).getTime(), [committedAt]);
  const [hoursRemaining, setHoursRemaining] = useState(() => {
    const elapsed = clock().getTime() - committedMs;
    return Math.max(0, (ROLLBACK_WINDOW_MS - elapsed) / 3_600_000);
  });

  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = clock().getTime() - committedMs;
      setHoursRemaining(Math.max(0, (ROLLBACK_WINDOW_MS - elapsed) / 3_600_000));
    }, 60_000);
    return () => clearInterval(id);
  }, [clock, committedMs]);

  const expired = hoursRemaining <= 0;
  const disabled = expired || isRunning || rolledBack || localRolledBack;

  async function handleClick() {
    if (disabled) return;
    if (typeof window !== 'undefined' && !window.confirm(t('rollbackConfirm'))) return;
    setIsRunning(true);
    try {
      await onRollback();
      setLocalRolledBack(true);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div data-testid="rollback-button-wrap">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        data-testid="rollback-button"
        title={expired ? t('rollbackExpired') : undefined}
      >
        {t('rollbackButton')}
      </button>
      <span data-testid="rollback-window">
        {' '}
        {expired ? t('rollbackExpired') : t('rollbackWindow', { hours: hoursRemaining.toFixed(1) })}
      </span>
    </div>
  );
}
