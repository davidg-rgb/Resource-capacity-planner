// Phase 52-01 Task 2 — Playwright click-count verification infrastructure (D-13).
//
// `ClickTrackerProvider` installs a capture-phase delegated click listener on
// `document` that increments `window.__clickCount` every time the user clicks
// an element inside a `[data-clicks="true"]` boundary. The counter is opt-in
// per annotation: only primary journey affordances carry the attribute, so
// secondary UI noise (e.g. tooltip expanders) does not inflate the count.
//
// Critically gated on `process.env.NEXT_PUBLIC_E2E_CLICK_TRACKING === 'true'`
// so production bundles ship a zero-overhead provider (React reads the env
// once at module-eval time via Next's inlining; the effect early-returns).
// The env flag is set by `e2e/playwright.config.ts` under `webServer.env`.
//
// Spec helpers live at `e2e/helpers/click-counter.ts` (`resetClickCount`,
// `getClickCount`). Every journey spec calls `resetClickCount(page)` before
// acting and asserts `getClickCount(page) <= journey.target` after.
//
// Anti-pitfall: Pitfall #9 from 52-RESEARCH.md — "Nested [data-clicks='true']
// double-count trap". We use a single capture-phase listener that fires once
// per real DOM click event, and bump the counter by exactly 1 when the event
// target's closest `[data-clicks="true"]` ancestor exists. Nesting is
// therefore idempotent: three nested `data-clicks` parents still yield +1 per
// click.

'use client';

import { useEffect, type ReactNode } from 'react';

type WindowWithCounter = Window & { __clickCount?: number };

export function ClickTrackerProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_E2E_CLICK_TRACKING !== 'true') return;

    const w = window as WindowWithCounter;
    w.__clickCount = 0;

    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-clicks="true"]')) {
        w.__clickCount = (w.__clickCount ?? 0) + 1;
      }
    }

    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
    };
  }, []);

  return <>{children}</>;
}
