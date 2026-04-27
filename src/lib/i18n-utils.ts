// audit-r1 / D-CR-11: shared i18n helpers.
//
// `safeT` wraps `useTranslations(...)` so missing keys / parsing errors
// fall back to a caller-supplied default string instead of throwing.
// next-intl's default `t(key)` raises when a key is missing, which is too
// strict for partial-rollout pages where copy is still being authored.
//
// Prior to this module the helper was duplicated across:
//   - src/features/personas/persona-route-guard.ts (line 98)
//   - src/app/(app)/line-manager/page.tsx (line 121)
//   - src/app/(app)/line-manager/timeline/page.tsx (line 154)
//   - src/components/capacity/capacity-heatmap-legend.tsx (line 37)
//   - src/components/persona/notification-bell.tsx (inline t() calls,
//     no fallback — the audit motivator)
//
// New code should import from here. Existing consumers may migrate
// incrementally; the function bodies are byte-identical.

import type { useTranslations } from 'next-intl';

type T = ReturnType<typeof useTranslations>;

/**
 * Translate `key` via `t`, returning `fallback` when the key is missing
 * or the result is empty/non-string.
 */
export function safeT(t: T, key: string, fallback: string): string {
  try {
    const value = t(key);
    return typeof value === 'string' && value.length > 0 ? value : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Translate `key` with ICU `count` plural args. Returns `fallback` on
 * missing-key / parse errors. Mirrors the safeTCount helper that lives
 * in src/app/(app)/line-manager/page.tsx.
 */
export function safeTCount(t: T, key: string, args: { count: number }, fallback: string): string {
  try {
    const value = t(key, args);
    return typeof value === 'string' && value.length > 0 ? value : fallback;
  } catch {
    return fallback;
  }
}
