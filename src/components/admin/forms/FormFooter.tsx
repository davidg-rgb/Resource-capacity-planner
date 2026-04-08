'use client';

/**
 * v5.0 — Phase 43 / Plan 43-03 Task 1. Shared save / cancel / restore footer
 * used by every per-entity register form. When `isArchived` is true, shows
 * a single "Återställ" (unarchive) button; otherwise shows Cancel + Save.
 */

import { useTranslations } from 'next-intl';

export interface FormFooterProps {
  isArchived: boolean;
  submitting: boolean;
  onCancel: () => void;
  onRestore: () => void | Promise<void>;
}

export function FormFooter(props: FormFooterProps) {
  const { isArchived, submitting, onCancel, onRestore } = props;
  const t = useTranslations('v5.admin.register');

  if (isArchived) {
    return (
      <div className="border-outline-variant/30 flex justify-end gap-2 border-t pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high rounded-sm border px-4 py-2 text-xs"
        >
          {t('cancel')}
        </button>
        <button
          type="button"
          onClick={() => void onRestore()}
          disabled={submitting}
          data-testid="register-form-restore"
          className="bg-primary text-on-primary rounded-sm px-4 py-2 text-xs font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {t('unarchive')}
        </button>
      </div>
    );
  }
  return (
    <div className="border-outline-variant/30 flex justify-end gap-2 border-t pt-4">
      <button
        type="button"
        onClick={onCancel}
        className="border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high rounded-sm border px-4 py-2 text-xs"
      >
        {t('cancel')}
      </button>
      <button
        type="submit"
        disabled={submitting}
        data-testid="register-form-save"
        className="bg-primary text-on-primary rounded-sm px-4 py-2 text-xs font-semibold hover:opacity-90 disabled:opacity-50"
      >
        {t('submit')}
      </button>
    </div>
  );
}
