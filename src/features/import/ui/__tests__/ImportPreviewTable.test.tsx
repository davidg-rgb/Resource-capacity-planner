/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import sv from '@/messages/sv.json';

import type { PreviewResult } from '../../actuals-import.types';
import { ImportPreviewTable } from '../ImportPreviewTable';

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="sv" messages={sv as Record<string, unknown>}>
      {children}
    </NextIntlClientProvider>
  );
}

const basePreview: PreviewResult = {
  sessionId: 's1',
  new: 12,
  updated: 5,
  warnings: [],
  rowsSkippedManual: 0,
  rowsSkippedPriorBatch: 0,
  unmatchedNames: [],
};

describe('ImportPreviewTable', () => {
  it('renders new/updated/warning counts', () => {
    render(
      <Wrapper>
        <ImportPreviewTable preview={{ ...basePreview }} />
      </Wrapper>,
    );
    expect(screen.getByTestId('preview-count-new').textContent).toContain('12');
    expect(screen.getByTestId('preview-count-updated').textContent).toContain('5');
    expect(screen.getByTestId('preview-count-warnings').textContent).toContain('0');
  });

  it('renders warning details when warnings exist', () => {
    render(
      <Wrapper>
        <ImportPreviewTable
          preview={{
            ...basePreview,
            warnings: [
              { code: 'ERR_BAD_HOURS', message: 'row 3 hours invalid', sourceRow: 3 },
              { code: 'ERR_BAD_DATE', message: 'row 7 date invalid', sourceRow: 7 },
            ],
          }}
        />
      </Wrapper>,
    );
    expect(screen.getByTestId('preview-count-warnings').textContent).toContain('2');
    expect(screen.getByTestId('preview-warnings').textContent).toContain('ERR_BAD_HOURS');
  });

  it('renders skipped counters', () => {
    render(
      <Wrapper>
        <ImportPreviewTable
          preview={{ ...basePreview, rowsSkippedManual: 4, rowsSkippedPriorBatch: 2 }}
        />
      </Wrapper>,
    );
    expect(screen.getByTestId('preview-skipped-manual').textContent).toContain('4');
    expect(screen.getByTestId('preview-skipped-prior-batch').textContent).toContain('2');
  });
});
