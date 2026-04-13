'use client';

/**
 * v5.0 — Phase 38 / Plan 38-03 (WIZ-01): Line Manager import wizard.
 *
 * Top-level orchestrator. State and IO live in `useImportWizard`; this
 * component is mostly a switch on `state.step`.
 *
 * All strings via `useTranslations('v5.import.*')`. No JSX text literals.
 */

import { useTranslations } from 'next-intl';

import { ImportDropzone } from './ImportDropzone';
import { ImportPreviewTable } from './ImportPreviewTable';
import { RollbackButton } from './RollbackButton';
import { UnmatchedNamesPanel } from './UnmatchedNamesPanel';
import { useImportWizard, type WizardFetcher } from './use-import-wizard';

export interface ImportWizardProps {
  /** Inject a fetcher (tests). Defaults to the HTTP fetcher. */
  fetcher?: WizardFetcher;
  /** Inject a clock (tests). */
  now?: () => Date;
}

export function ImportWizard({ fetcher, now }: ImportWizardProps) {
  const t = useTranslations('v5.import');
  const tUpload = useTranslations('v5.import.upload');
  const tPreview = useTranslations('v5.import.preview');
  const tUnmatched = useTranslations('v5.import.unmatched');
  const tConfirm = useTranslations('v5.import.confirm');
  const tResult = useTranslations('v5.import.result');
  const tError = useTranslations('v5.import.error');

  const { state, actions, derived } = useImportWizard({ fetcher, now });

  function renderError() {
    if (!state.error) return null;
    let msg = state.error.message;
    switch (state.error.code) {
      case 'ERR_US_WEEK_HEADERS':
      case 'US_WEEK_DETECTED':
        msg = tUpload('parseError.usWeek');
        break;
      case 'ERR_UNKNOWN_LAYOUT':
        msg = tUpload('parseError.unknownLayout');
        break;
      case 'UNSUPPORTED_FILE_TYPE':
        msg = tUpload('fileTypeError');
        break;
      case 'PRIOR_BATCH_ACTIVE':
        msg = tError('priorBatchActive');
        break;
      case 'UNRESOLVED_NAMES':
        msg = tError('unresolvedNames');
        break;
      case 'ROLLED_BACK':
        msg = tResult('rollbackSuccess');
        break;
      default:
        msg = tError('generic');
    }
    return (
      <div role="alert" data-testid="wizard-error">
        {msg}
      </div>
    );
  }

  return (
    <div data-testid="import-wizard" data-step={state.step}>
      <h2 className="font-headline mb-4 text-2xl font-bold">{t('upload.title')}</h2>

      {state.step === 'upload' && (
        <section data-testid="step-upload">
          <ImportDropzone onFile={actions.uploadFile} disabled={state.isLoading} />
          {renderError()}
        </section>
      )}

      {state.step === 'preview' && state.preview && (
        <section data-testid="step-preview">
          <h3>{tPreview('title')}</h3>
          <ImportPreviewTable preview={state.preview} />
          <label>
            <input
              type="checkbox"
              checked={state.overrideManualEdits}
              onChange={actions.toggleOverrideManual}
              data-testid="override-manual-checkbox"
            />
            <span> {tPreview('overrideManualLabel')}</span>
          </label>
          <p style={{ fontSize: 12, color: '#666' }}>{tPreview('overrideManualHint')}</p>
          <div>
            <button type="button" onClick={() => actions.goTo('upload')}>
              {tPreview('backButton')}
            </button>
            <button
              type="button"
              data-testid="preview-next"
              onClick={() =>
                actions.goTo(
                  (state.preview?.unmatchedNames?.length ?? 0) > 0 ? 'unmatched' : 'confirm',
                )
              }
            >
              {tPreview('nextButton')}
            </button>
          </div>
          {renderError()}
        </section>
      )}

      {state.step === 'unmatched' && state.preview && (
        <section data-testid="step-unmatched">
          <h3>{tUnmatched('title')}</h3>
          <UnmatchedNamesPanel
            unmatchedNames={state.preview.unmatchedNames}
            resolutions={state.resolutions}
            onResolve={actions.setResolution}
          />
          <div>
            <button type="button" onClick={() => actions.goTo('preview')}>
              {tUnmatched('backButton')}
            </button>
            <button
              type="button"
              data-testid="unmatched-next"
              aria-disabled={!derived.unmatchedResolved}
              disabled={!derived.unmatchedResolved}
              onClick={() => actions.goTo('confirm')}
            >
              {tUnmatched('nextButton')}
            </button>
          </div>
          {renderError()}
        </section>
      )}

      {state.step === 'confirm' && state.preview && (
        <section data-testid="step-confirm">
          <h3>{tConfirm('title')}</h3>
          <p>
            {tConfirm('summary', {
              newCount: state.preview.new,
              updatedCount: state.preview.updated,
            })}
          </p>
          {state.error?.code === 'PRIOR_BATCH_ACTIVE' && (
            <label>
              <input
                type="checkbox"
                checked={state.overrideUnrolledImports}
                onChange={actions.toggleOverridePriorBatch}
                data-testid="override-prior-batch-checkbox"
              />
              <span> {tPreview('overridePriorBatchLabel')}</span>
            </label>
          )}
          <div>
            <button type="button" onClick={() => actions.goTo('preview')}>
              {tConfirm('backButton')}
            </button>
            <button
              type="button"
              onClick={actions.commit}
              disabled={state.isLoading}
              data-testid="commit-button"
            >
              {state.isLoading ? tConfirm('committing') : tConfirm('commitButton')}
            </button>
          </div>
          {renderError()}
        </section>
      )}

      {state.step === 'result' && state.committedBatchId && state.committedAt && (
        <section data-testid="step-result">
          <h3>{tResult('successTitle')}</h3>
          <p>
            {tResult('successSummary', {
              rowsInserted: state.rowsInserted,
              rowsUpdated: state.rowsUpdated,
            })}
          </p>
          <RollbackButton
            batchId={state.committedBatchId}
            committedAt={state.committedAt}
            onRollback={actions.rollback}
            now={now}
          />
          <button type="button" onClick={actions.reset} data-testid="import-another">
            {tResult('importAnother')}
          </button>
          {renderError()}
        </section>
      )}
    </div>
  );
}
