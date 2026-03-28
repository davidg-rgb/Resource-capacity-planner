'use client';

import { useCallback, useRef, useState } from 'react';
import { UploadCloud, FileDown, AlertTriangle, Loader2, FileText } from 'lucide-react';

import type { ColumnMapping, ParsedFile } from '@/features/import/import.types';
import { useUploadFile } from '@/hooks/use-import';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_EXTENSIONS = '.xlsx,.xls,.csv';

const CODEPAGE_OPTIONS = [
  { label: 'UTF-8', value: 65001 },
  { label: 'Windows-1252 (Swedish)', value: 1252 },
  { label: 'ISO-8859-1', value: 28591 },
];

type StepUploadProps = {
  onFileUploaded: (parsedFile: ParsedFile, mappings: ColumnMapping[]) => void;
};

export function StepUpload({ onFileUploaded }: StepUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPivotConfirm, setShowPivotConfirm] = useState(false);
  const [pendingResult, setPendingResult] = useState<{
    parsedFile: ParsedFile;
    mappings: ColumnMapping[];
  } | null>(null);
  const [selectedCodepage, setSelectedCodepage] = useState<number | undefined>(undefined);

  const upload = useUploadFile();

  const processFile = useCallback(
    async (file: File, codepage?: number) => {
      setSizeError(null);

      if (file.size > MAX_FILE_SIZE) {
        setSizeError(
          `File size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds the 10 MB limit.`,
        );
        return;
      }

      setSelectedFile(file);
      setShowPivotConfirm(false);
      setPendingResult(null);

      const result = await upload.mutateAsync({ file, codepage });
      const { suggestedMappings, ...parsedFile } = result;

      // If pivot format detected, show confirmation before proceeding
      if (parsedFile.formatInfo.isPivot) {
        setPendingResult({ parsedFile, mappings: suggestedMappings });
        setShowPivotConfirm(true);
      } else {
        onFileUploaded(parsedFile, suggestedMappings);
      }
    },
    [upload, onFileUploaded],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file, selectedCodepage);
    },
    [processFile, selectedCodepage],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file, selectedCodepage);
    },
    [processFile, selectedCodepage],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handlePivotConfirm = useCallback(() => {
    if (pendingResult) {
      onFileUploaded(pendingResult.parsedFile, pendingResult.mappings);
    }
  }, [pendingResult, onFileUploaded]);

  const handleReuploadWithCodepage = useCallback(() => {
    if (selectedFile && selectedCodepage) {
      processFile(selectedFile, selectedCodepage);
    }
  }, [selectedFile, selectedCodepage, processFile]);

  const parsedFile =
    pendingResult?.parsedFile ??
    (upload.data
      ? (() => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { suggestedMappings, ...pf } = upload.data;
          return pf;
        })()
      : null);

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed p-10 transition-colors ${
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-outline-variant hover:border-primary/50 hover:bg-surface-container'
        }`}
      >
        <UploadCloud className="text-on-surface-variant mb-3 h-10 w-10" />
        <p className="text-on-surface text-sm font-medium">
          Drag and drop your file here, or click to browse
        </p>
        <p className="text-on-surface-variant mt-1 text-xs">
          Accepts .xlsx, .xls, .csv (max 10 MB)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Size error */}
      {sizeError && (
        <div className="bg-error-container text-on-error-container flex items-center gap-2 rounded-sm px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {sizeError}
        </div>
      )}

      {/* Upload error */}
      {upload.isError && (
        <div className="bg-error-container text-on-error-container flex items-center gap-2 rounded-sm px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {upload.error.message}
        </div>
      )}

      {/* Loading state */}
      {upload.isPending && selectedFile && (
        <div className="bg-surface-container flex items-center gap-3 rounded-sm px-4 py-3">
          <Loader2 className="text-primary h-4 w-4 animate-spin" />
          <div>
            <p className="text-on-surface text-sm font-medium">{selectedFile.name}</p>
            <p className="text-on-surface-variant text-xs">
              Uploading and parsing ({(selectedFile.size / 1024).toFixed(0)} KB)...
            </p>
          </div>
        </div>
      )}

      {/* File info after upload */}
      {parsedFile && !upload.isPending && (
        <div className="bg-surface-container flex items-center gap-3 rounded-sm px-4 py-3">
          <FileText className="text-primary h-4 w-4" />
          <div>
            <p className="text-on-surface text-sm font-medium">
              {selectedFile?.name} &mdash; {parsedFile.totalRows} rows, sheet &quot;
              {parsedFile.sheetName}&quot;
            </p>
          </div>
        </div>
      )}

      {/* Hidden rows warning */}
      {parsedFile?.hiddenRowsSkipped != null && parsedFile.hiddenRowsSkipped > 0 && (
        <div className="border-warning bg-warning-container rounded-sm border px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-on-warning-container h-4 w-4 shrink-0" />
            <p className="text-on-warning-container text-sm">
              {parsedFile.hiddenRowsSkipped} hidden row
              {parsedFile.hiddenRowsSkipped === 1 ? ' was' : 's were'} skipped during import.
            </p>
          </div>
        </div>
      )}

      {/* Encoding warning */}
      {parsedFile?.encodingWarning && (
        <div className="border-warning bg-warning-container rounded-sm border px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-on-warning-container h-4 w-4 shrink-0" />
            <p className="text-on-warning-container text-sm">
              Some Swedish characters may be garbled. Try a different encoding?
            </p>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <select
              value={selectedCodepage ?? ''}
              onChange={(e) => setSelectedCodepage(Number(e.target.value) || undefined)}
              className="border-outline-variant bg-surface text-on-surface rounded-sm border px-2 py-1 text-xs"
            >
              <option value="">Select encoding</option>
              {CODEPAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleReuploadWithCodepage}
              disabled={!selectedCodepage}
              className="bg-primary text-on-primary hover:bg-primary/90 rounded-sm px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50"
            >
              Re-upload
            </button>
          </div>
        </div>
      )}

      {/* Pivot format confirmation */}
      {showPivotConfirm && pendingResult && (
        <div className="border-outline-variant bg-surface-container rounded-sm border px-4 py-4">
          <p className="text-on-surface text-sm font-medium">
            We detected a grid format (months as columns). We&apos;ll unpivot to flat rows.
          </p>

          {/* Before/after preview */}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr]">
            {/* Before: original pivot format */}
            <div>
              <p className="text-on-surface-variant mb-1 text-xs font-medium">Original (pivot)</p>
              <div className="border-outline-variant overflow-x-auto rounded border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-surface">
                      {pendingResult.parsedFile.headers.slice(0, 5).map((h, i) => (
                        <th
                          key={i}
                          className="text-on-surface-variant px-2 py-1 text-left font-medium"
                        >
                          {h}
                        </th>
                      ))}
                      {pendingResult.parsedFile.headers.length > 5 && (
                        <th className="text-on-surface-variant px-2 py-1">...</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingResult.parsedFile.sampleRows.slice(0, 2).map((row, ri) => (
                      <tr key={ri}>
                        {(row as unknown[]).slice(0, 5).map((cell, ci) => (
                          <td key={ci} className="text-on-surface px-2 py-1">
                            {String(cell ?? '')}
                          </td>
                        ))}
                        {(row as unknown[]).length > 5 && (
                          <td className="text-on-surface-variant px-2 py-1">...</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden items-center justify-center sm:flex">
              <span className="text-on-surface-variant text-lg">&rarr;</span>
            </div>

            {/* After: flat format */}
            <div>
              <p className="text-on-surface-variant mb-1 text-xs font-medium">
                Flat (after unpivot)
              </p>
              <div className="border-outline-variant overflow-x-auto rounded border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-surface">
                      <th className="text-on-surface-variant px-2 py-1 text-left font-medium">
                        Person
                      </th>
                      <th className="text-on-surface-variant px-2 py-1 text-left font-medium">
                        Project
                      </th>
                      <th className="text-on-surface-variant px-2 py-1 text-left font-medium">
                        Month
                      </th>
                      <th className="text-on-surface-variant px-2 py-1 text-left font-medium">
                        Hours
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingResult.parsedFile.sampleRows.slice(0, 2).map((row, ri) => {
                      const cells = row as unknown[];
                      return (
                        <tr key={ri}>
                          <td className="text-on-surface px-2 py-1">{String(cells[0] ?? '')}</td>
                          <td className="text-on-surface px-2 py-1">{String(cells[1] ?? '')}</td>
                          <td className="text-on-surface px-2 py-1">
                            {pendingResult.parsedFile.headers[
                              pendingResult.parsedFile.formatInfo.monthColumns[0]
                            ] ?? 'Month'}
                          </td>
                          <td className="text-on-surface px-2 py-1 tabular-nums">
                            {String(
                              cells[pendingResult.parsedFile.formatInfo.monthColumns[0]] ?? '0',
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePivotConfirm}
            className="bg-primary text-on-primary hover:bg-primary/90 mt-3 rounded-sm px-4 py-2 text-sm font-medium transition-colors"
          >
            Confirm
          </button>
        </div>
      )}

      {/* Template downloads */}
      <div className="border-outline-variant border-t pt-4">
        <p className="text-on-surface-variant text-xs">Or download a template to get started:</p>
        <div className="mt-2 flex items-center gap-3">
          <a
            href="/api/import/templates?format=flat"
            download
            className="text-primary inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
          >
            <FileDown className="h-3.5 w-3.5" />
            Flat format (.xlsx)
          </a>
          <a
            href="/api/import/templates?format=pivot"
            download
            className="text-primary inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
          >
            <FileDown className="h-3.5 w-3.5" />
            Pivot format (.xlsx)
          </a>
        </div>
      </div>
    </div>
  );
}
