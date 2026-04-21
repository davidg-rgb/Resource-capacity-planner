// Phase 52-01 Task 2 — ClickTrackerProvider behavior contract.
//
// Four behaviors verified:
//   1. Env var OFF → provider renders children + does NOT install listener
//      (window.__clickCount remains undefined).
//   2. Env var ON → click inside [data-clicks="true"] increments counter by 1.
//   3. Click OUTSIDE [data-clicks="true"] does NOT increment.
//   4. Nested [data-clicks="true"] elements → single increment per real click
//      (Pitfall #9 from 52-RESEARCH).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';

import { ClickTrackerProvider } from '../click-tracker';

type WindowWithCounter = Window & { __clickCount?: number };

afterEach(() => {
  cleanup();
  delete (window as WindowWithCounter).__clickCount;
  vi.unstubAllEnvs();
});

describe('ClickTrackerProvider', () => {
  describe('when NEXT_PUBLIC_E2E_CLICK_TRACKING is not "true"', () => {
    beforeEach(() => {
      vi.stubEnv('NEXT_PUBLIC_E2E_CLICK_TRACKING', 'false');
    });

    it('renders children and does not install click listener', () => {
      const { getByTestId } = render(
        <ClickTrackerProvider>
          <button data-testid="btn" data-clicks="true">
            click
          </button>
        </ClickTrackerProvider>,
      );

      expect(getByTestId('btn')).toBeInTheDocument();

      fireEvent.click(getByTestId('btn'));

      expect((window as WindowWithCounter).__clickCount).toBeUndefined();
    });
  });

  describe('when NEXT_PUBLIC_E2E_CLICK_TRACKING === "true"', () => {
    beforeEach(() => {
      vi.stubEnv('NEXT_PUBLIC_E2E_CLICK_TRACKING', 'true');
    });

    it('increments counter exactly once when clicking a [data-clicks="true"] element', () => {
      const { getByTestId } = render(
        <ClickTrackerProvider>
          <button data-testid="tracked" data-clicks="true">
            click
          </button>
        </ClickTrackerProvider>,
      );

      fireEvent.click(getByTestId('tracked'));

      expect((window as WindowWithCounter).__clickCount).toBe(1);
    });

    it('does NOT increment counter when clicking outside [data-clicks="true"]', () => {
      const { getByTestId } = render(
        <ClickTrackerProvider>
          <button data-testid="untracked">click</button>
        </ClickTrackerProvider>,
      );

      fireEvent.click(getByTestId('untracked'));

      expect((window as WindowWithCounter).__clickCount).toBe(0);
    });

    it('increments only once when clicking nested [data-clicks="true"] elements (Pitfall #9)', () => {
      const { getByTestId } = render(
        <ClickTrackerProvider>
          <div data-clicks="true">
            <span data-clicks="true">
              <button data-testid="inner">click</button>
            </span>
          </div>
        </ClickTrackerProvider>,
      );

      fireEvent.click(getByTestId('inner'));

      expect((window as WindowWithCounter).__clickCount).toBe(1);
    });
  });
});
