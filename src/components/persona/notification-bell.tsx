'use client';

// v6.0 — Phase 53 / Plan 53-02 (POLISH-01): persona-scoped NotificationBell.
//
// Replaces the legacy `<Link href="/alerts"><Bell/><AlertBadge/></Link>`
// block in top-nav.tsx when `uiV6Polish=true`. Flag-off → returns null
// (top-nav still renders the legacy bell next to this mount point).
//
// Per-persona behavior (POLISH-01):
//   staff        → returns null                               (bell hidden)
//   pm           → rejected-wish count → /pm/wishes?tab=rejected
//   line-manager → pending-approval count → /line-manager/approval-queue
//   rd           → overcommit count → /alerts
//   admin        → fall-through to useAlertCount → /alerts
//
// Badge rules:
//   count === 0  → no badge (icon + aria-label only)
//   count > 99   → badge shows '99+'
//
// Data-hook gating (T-53-11 — D DoS):
//   Each hook's `enabled` flag is tied to the active persona, so only ONE
//   hook actually polls per user at a time. TanStack Query skips fetches
//   for inactive personas entirely.
//
// Threat model (T-53-09): the PM branch uses `useAuth().userId` (Clerk-
// signed) for clerkUserId — NEVER `persona.personId` (client-settable).

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@clerk/nextjs';

import { ALERTS_WINDOW_MONTHS } from '@/features/alerts/constants';
import { useFlags } from '@/features/flags/flag.context';
import { usePersona } from '@/features/personas/persona.context';
import { usePmWishCounts } from '@/features/proposals/use-pm-wish-counts';
import { useLmQueueCount } from '@/features/proposals/use-lm-queue-count';
import { useRdOvercommitCount } from '@/features/proposals/use-rd-overcommit-count';
import { useAlertCount } from '@/hooks/use-alerts';
import { generateMonthRange, getCurrentMonth } from '@/lib/date-utils';

export function NotificationBell() {
  const flags = useFlags();
  const { uiV6Polish } = flags;
  const { persona } = usePersona();
  const { userId } = useAuth();
  const t = useTranslations('v6.polish.bell');

  const monthFrom = getCurrentMonth();
  const months = generateMonthRange(monthFrom, ALERTS_WINDOW_MONTHS);
  const monthTo = months[months.length - 1];

  const pmEnabled = uiV6Polish && persona.kind === 'pm' && !!userId;
  const lmEnabled = uiV6Polish && persona.kind === 'line-manager';
  const rdEnabled = uiV6Polish && persona.kind === 'rd';
  const adminEnabled = uiV6Polish && persona.kind === 'admin';

  const { data: pm } = usePmWishCounts(userId ?? '', pmEnabled);
  const { data: lm } = useLmQueueCount(
    persona.kind === 'line-manager' ? persona.departmentId : null,
    lmEnabled,
  );
  const { data: rdCount } = useRdOvercommitCount(rdEnabled);
  // Phase 53 REVIEW-FIX WR-02: pass `adminEnabled` so non-admin personas
  // skip the fetch. Prior to this, PM/LM/RD users polled
  // /api/analytics/alerts/count continuously even though the returned
  // count was only consumed inside the admin branch below — which
  // defeated the T-53-11 DoS mitigation the header comment claims.
  const { data: alertCount } = useAlertCount(monthFrom, monthTo, adminEnabled);

  if (!uiV6Polish) return null; // legacy bell renders in top-nav.tsx when OFF
  if (persona.kind === 'staff') return null; // POLISH-01: Staff hides bell

  let count = 0;
  let href = '/alerts';
  let label = t('adminAlertsLabel', { count: 0 });

  if (persona.kind === 'pm') {
    count = pm?.rejected ?? 0;
    href = '/pm/wishes?tab=rejected';
    label = t('pmRejectedLabel', { count });
  } else if (persona.kind === 'line-manager') {
    count = lm ?? 0;
    href = '/line-manager/approval-queue';
    label = t('lmPendingLabel', { count });
  } else if (persona.kind === 'rd') {
    count = rdCount ?? 0;
    href = '/alerts';
    label = t('rdOvercommitsLabel', { count });
  } else {
    // admin — fall-through to alert-count behavior
    count = alertCount ?? 0;
    href = '/alerts';
    label = t('adminAlertsLabel', { count });
  }

  return (
    <Link
      href={href}
      aria-label={label}
      data-testid="notification-bell"
      className="text-on-surface-variant hover:bg-surface-container-low relative rounded-full p-2"
    >
      <Bell size={18} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
