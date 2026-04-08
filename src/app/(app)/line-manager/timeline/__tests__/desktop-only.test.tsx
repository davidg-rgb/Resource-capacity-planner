// TC-MOBILE-001
// v5.0 — Phase 41 / Plan 41-05 Task 2: DesktopOnlyScreen interstitial test.
//
// At <768px the LM timeline must show the desktop-only message instead of
// the grid. At >=768px it renders children.
//
// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

import { DesktopOnlyScreen } from '@/components/responsive/desktop-only-screen';

const messages = {
  v5: {
    lineManager: {
      desktopOnlyMessage:
        'This view requires a screen at least 768px wide. Please open it on a desktop.',
    },
  },
};

function setMatchMedia(matches: boolean) {
  // jsdom does not implement matchMedia — install a stub.
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('TC-MOBILE-001 — <DesktopOnlyScreen> interstitial', () => {
  beforeEach(() => {
    cleanup();
  });

  it('TC-MOBILE-001: at <768px viewport, hides children and shows desktop-only message', () => {
    setMatchMedia(false); // matchMedia('(min-width: 768px)') → false
    renderWithIntl(
      <DesktopOnlyScreen>
        <div data-testid="grid">GRID</div>
      </DesktopOnlyScreen>,
    );

    expect(screen.queryByTestId('grid')).toBeNull();
    expect(
      screen.getByText(
        'This view requires a screen at least 768px wide. Please open it on a desktop.',
      ),
    ).toBeTruthy();
  });

  it('at >=768px viewport, renders the children grid', () => {
    setMatchMedia(true);
    renderWithIntl(
      <DesktopOnlyScreen>
        <div data-testid="grid">GRID</div>
      </DesktopOnlyScreen>,
    );

    expect(screen.getByTestId('grid')).toBeTruthy();
    expect(
      screen.queryByText(
        'This view requires a screen at least 768px wide. Please open it on a desktop.',
      ),
    ).toBeNull();
  });
});
