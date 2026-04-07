/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import sv from '@/messages/sv.json';

import type { PreviewResult } from '../../actuals-import.types';
import { ImportWizard } from '../ImportWizard';
import { WizardHttpError, type WizardFetcher } from '../use-import-wizard';

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="sv" messages={sv as Record<string, unknown>}>
      {children}
    </NextIntlClientProvider>
  );
}

function makeFetcher(overrides: Partial<WizardFetcher> = {}): WizardFetcher {
  const defaults: WizardFetcher = {
    parse: vi.fn().mockResolvedValue({ sessionId: 'sess-1' }),
    preview: vi.fn().mockResolvedValue({
      sessionId: 'sess-1',
      new: 10,
      updated: 2,
      warnings: [],
      rowsSkippedManual: 0,
      rowsSkippedPriorBatch: 0,
      unmatchedNames: [],
    } satisfies PreviewResult),
    commit: vi.fn().mockResolvedValue({ batchId: 'batch-1', rowsInserted: 10, rowsUpdated: 2 }),
    rollback: vi.fn().mockResolvedValue({ batchId: 'batch-1', rowsDeleted: 10, rowsRestored: 2 }),
  };
  return { ...defaults, ...overrides };
}

function fileFromString(name: string): File {
  return new File([new Uint8Array([0])], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('ImportWizard', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('walks happy path upload → preview → confirm → result', async () => {
    const fetcher = makeFetcher();
    render(
      <Wrapper>
        <ImportWizard fetcher={fetcher} now={() => new Date('2026-04-07T10:00:00Z')} />
      </Wrapper>,
    );

    // Step 1: upload
    const input = screen.getByTestId('import-dropzone-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [fileFromString('actuals.xlsx')] } });

    // Wait for preview step
    await waitFor(() => expect(screen.getByTestId('step-preview')).toBeTruthy());
    expect(screen.getByTestId('preview-count-new').textContent).toContain('10');
    expect(fetcher.parse).toHaveBeenCalled();
    expect(fetcher.preview).toHaveBeenCalledWith('sess-1');

    // Step 2 → 3: skip unmatched (none), go to confirm
    fireEvent.click(screen.getByTestId('preview-next'));
    await waitFor(() => expect(screen.getByTestId('step-confirm')).toBeTruthy());

    // Step 3: commit
    fireEvent.click(screen.getByTestId('commit-button'));
    await waitFor(() => expect(screen.getByTestId('step-result')).toBeTruthy());
    expect(fetcher.commit).toHaveBeenCalledWith('sess-1', {
      overrideManualEdits: false,
      overrideUnrolledImports: false,
      nameOverrides: undefined,
    });

    // RollbackButton is rendered
    expect(screen.getByTestId('rollback-button')).toBeTruthy();
  });

  it('keeps wizard on upload step when ERR_US_WEEK_HEADERS is returned', async () => {
    const fetcher = makeFetcher({
      parse: vi.fn().mockImplementation(() => {
        throw new WizardHttpError({
          code: 'ERR_US_WEEK_HEADERS',
          message: 'us week detected',
        });
      }),
    });

    render(
      <Wrapper>
        <ImportWizard fetcher={fetcher} />
      </Wrapper>,
    );

    const input = screen.getByTestId('import-dropzone-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [fileFromString('us-week.xlsx')] } });

    await waitFor(() => expect(screen.getByTestId('wizard-error')).toBeTruthy());
    // Still on upload step
    expect(screen.getByTestId('step-upload')).toBeTruthy();
    // Error message includes the Swedish US-week translation
    expect(screen.getByTestId('wizard-error').textContent).toContain('amerikansk');
  });

  it('rejects non-xlsx file with UNSUPPORTED_FILE_TYPE error and stays on upload', async () => {
    const fetcher = makeFetcher();
    render(
      <Wrapper>
        <ImportWizard fetcher={fetcher} />
      </Wrapper>,
    );

    const input = screen.getByTestId('import-dropzone-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [fileFromString('bad.csv')] } });

    await waitFor(() => expect(screen.getByTestId('wizard-error')).toBeTruthy());
    expect(screen.getByTestId('step-upload')).toBeTruthy();
    expect(fetcher.parse).not.toHaveBeenCalled();
  });
});
