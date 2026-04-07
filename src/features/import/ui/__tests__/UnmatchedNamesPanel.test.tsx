/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useState, type ReactNode } from 'react';

import sv from '@/messages/sv.json';

import type { UnmatchedName } from '../../actuals-import.types';
import { UnmatchedNamesPanel } from '../UnmatchedNamesPanel';
import type { NameResolution } from '../import-wizard.types';

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="sv" messages={sv as Record<string, unknown>}>
      {children}
    </NextIntlClientProvider>
  );
}

const fuzzyPerson: UnmatchedName = {
  kind: 'person',
  input: 'Anna Sven',
  match: { kind: 'fuzzy', id: 'p-anna', name: 'Anna Svensson', confidence: 0.92 },
};

const ambiguousProject: UnmatchedName = {
  kind: 'project',
  input: 'Atlas',
  match: {
    kind: 'ambiguous',
    candidates: [
      { id: 'pr-1', name: 'Atlas Phase I', confidence: 0.78 },
      { id: 'pr-2', name: 'Atlas Phase II', confidence: 0.74 },
    ],
  },
};

describe('UnmatchedNamesPanel', () => {
  it('calls onResolve when fuzzy Accept clicked', () => {
    const onResolve = vi.fn();
    render(
      <Wrapper>
        <UnmatchedNamesPanel
          unmatchedNames={[fuzzyPerson]}
          resolutions={[]}
          onResolve={onResolve}
        />
      </Wrapper>,
    );
    fireEvent.click(screen.getByTestId('accept-Anna Sven'));
    expect(onResolve).toHaveBeenCalledWith({
      input: 'Anna Sven',
      kind: 'person',
      resolvedId: 'p-anna',
      action: 'fuzzy-accept',
    });
  });

  it('calls onResolve when ambiguous dropdown changes', () => {
    const onResolve = vi.fn();
    render(
      <Wrapper>
        <UnmatchedNamesPanel
          unmatchedNames={[ambiguousProject]}
          resolutions={[]}
          onResolve={onResolve}
        />
      </Wrapper>,
    );
    fireEvent.change(screen.getByTestId('ambiguous-select-Atlas'), {
      target: { value: 'pr-2' },
    });
    expect(onResolve).toHaveBeenCalledWith({
      input: 'Atlas',
      kind: 'project',
      resolvedId: 'pr-2',
      action: 'manual-pick',
    });
  });

  it('Mark-as-new button is disabled (v5.0 deferred)', () => {
    render(
      <Wrapper>
        <UnmatchedNamesPanel unmatchedNames={[fuzzyPerson]} resolutions={[]} onResolve={vi.fn()} />
      </Wrapper>,
    );
    const btn = screen.getByTestId('mark-new-Anna Sven') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('reflects resolution state via aria-pressed', () => {
    function Host() {
      const [res, setRes] = useState<NameResolution[]>([]);
      return (
        <UnmatchedNamesPanel
          unmatchedNames={[fuzzyPerson]}
          resolutions={res}
          onResolve={(r) => setRes([r])}
        />
      );
    }
    render(
      <Wrapper>
        <Host />
      </Wrapper>,
    );
    const btn = screen.getByTestId('accept-Anna Sven');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(btn);
    expect(screen.getByTestId('accept-Anna Sven').getAttribute('aria-pressed')).toBe('true');
  });
});
