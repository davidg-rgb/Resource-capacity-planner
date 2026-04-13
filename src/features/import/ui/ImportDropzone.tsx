'use client';

/**
 * v5.0 — Phase 38 / Plan 38-03 (WIZ-01): drag-and-drop file zone.
 *
 * Pure presentational. The wizard hook handles parse + preview + error
 * routing once the file is handed off via onFile.
 */

import { useTranslations } from 'next-intl';
import { useCallback, useId, useRef, useState } from 'react';

export interface ImportDropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function ImportDropzone({ onFile, disabled }: ImportDropzoneProps) {
  const t = useTranslations('v5.import.upload');
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      onFile(files[0]);
    },
    [onFile],
  );

  return (
    <div data-testid="import-dropzone">
      <div
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (disabled) return;
          handleFiles(e.dataTransfer.files);
        }}
        style={{
          border: '2px dashed #ccc',
          borderRadius: 6,
          padding: 32,
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          backgroundColor: isDragging ? '#f0f4f8' : 'transparent',
        }}
      >
        <p>{isDragging ? t('dropActive') : t('dropHint')}</p>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".xlsx"
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
          data-testid="import-dropzone-input"
        />
      </div>
      <p className="mt-2">
        <a
          href="/templates/template_row_per_entry.xlsx"
          download
          className="text-primary inline-flex items-center gap-1 text-sm underline hover:opacity-80"
        >
          {t('templateLink')}
        </a>
      </p>
    </div>
  );
}
