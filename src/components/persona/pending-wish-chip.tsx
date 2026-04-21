'use client';

// v6.0 — Phase 52 Plan 03 (PM-02 / D-02): top-bar chip showing PM's pending
// + rejected wish counts with a deep-link to the appropriate MyWishesPanel
// tab.
//
// Visibility rule:
//   uiV6PerJourney ON  &&  persona.kind === 'pm'  &&  (pending + rejected > 0)
//
// Deep-link priority (UX-AUDIT §1C):
//   rejected > 0  →  /pm/wishes?tab=rejected
//   else          →  /pm/wishes?tab=proposed
//
// The `data-clicks="true"` attribute wires the chip into the journey 1C
// click-counter from Plan 52-01 (env-gated via NEXT_PUBLIC_E2E_CLICK_TRACKING).

import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';

import { useFlags } from '@/features/flags/flag.context';
import { usePersona } from '@/features/personas/persona.context';
import { usePmWishCounts } from '@/features/proposals/use-pm-wish-counts';

export function PendingWishChip() {
  const { uiV6PerJourney } = useFlags();
  const { persona } = usePersona();
  const { userId } = useAuth();
  const t = useTranslations('v5.pm.pendingWishChip');

  const enabled = !!(uiV6PerJourney && persona.kind === 'pm' && userId);
  const { data } = usePmWishCounts(userId ?? '', enabled);

  if (!uiV6PerJourney) return null;
  if (persona.kind !== 'pm') return null;

  const pending = data?.pending ?? 0;
  const rejected = data?.rejected ?? 0;
  if (pending + rejected === 0) return null;

  const href = rejected > 0 ? '/pm/wishes?tab=rejected' : '/pm/wishes?tab=proposed';

  return (
    <Link
      href={href}
      data-clicks="true"
      data-testid="pending-wish-chip"
      aria-label={t('label', { pending, rejected })}
      className="border-outline-variant/40 bg-surface-container hover:bg-surface-container-high text-on-surface inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs"
    >
      {rejected > 0 ? t('rejected', { count: rejected }) : t('pending', { count: pending })}
    </Link>
  );
}
