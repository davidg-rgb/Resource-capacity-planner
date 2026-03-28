'use client';

import { useAlertCount } from '@/hooks/use-alerts';
import { generateMonthRange, getCurrentMonth } from '@/lib/date-utils';

/**
 * Alert count badge overlay for the TopNav Bell button.
 * Shows the number of active capacity alerts (overloaded + underutilized).
 * Renders nothing when count is 0 or still loading.
 */
export function AlertBadge() {
  const monthFrom = getCurrentMonth();
  const monthTo = generateMonthRange(monthFrom, 3).at(-1)!;

  const { data: count } = useAlertCount(monthFrom, monthTo);

  if (!count || count === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}
