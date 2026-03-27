'use client';

import { useMutation } from '@tanstack/react-query';

import type {
  ColumnMapping,
  ImportResult,
  ImportRow,
  ParsedFile,
  ValidationResult,
} from '@/features/import/import.types';

/** Response from the upload endpoint: parsed file data + auto-detected mappings */
export type UploadResponse = ParsedFile & {
  suggestedMappings: ColumnMapping[];
};

/** Upload and parse an Excel/CSV file server-side */
export function useUploadFile() {
  return useMutation<UploadResponse, Error, { file: File; codepage?: number }>({
    mutationFn: async ({ file, codepage }) => {
      const formData = new FormData();
      formData.append('file', file);

      const url = codepage
        ? `/api/import/upload?codepage=${codepage}`
        : '/api/import/upload';

      const res = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to upload file');
      }

      return res.json();
    },
  });
}

/** Validate mapped import rows against existing data */
export function useValidateRows() {
  return useMutation<ValidationResult, Error, { rows: ImportRow[] }>({
    mutationFn: async ({ rows }) => {
      const res = await fetch('/api/import/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to validate rows');
      }

      return res.json();
    },
  });
}

/** Execute the final import of validated rows */
export function useExecuteImport() {
  return useMutation<
    ImportResult,
    Error,
    {
      rows: Array<{
        rowIndex: number;
        personId: string;
        projectId: string;
        month: string;
        hours: number;
      }>;
    }
  >({
    mutationFn: async ({ rows }) => {
      const res = await fetch('/api/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to execute import');
      }

      return res.json();
    },
  });
}
