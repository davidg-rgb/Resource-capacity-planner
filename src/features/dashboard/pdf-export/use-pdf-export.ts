/**
 * Hook for generating multi-widget PDF exports client-side.
 *
 * Uses @react-pdf/renderer's `pdf()` to generate a blob in the browser,
 * then triggers a download. SVG snapshots are captured from the live DOM
 * before PDF generation.
 */

'use client';

import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { PdfWidgetEntry } from './dashboard-pdf-document';
import { captureWidgetSnapshots } from './svg-snapshot';

interface ExportOptions {
  widgetIds: string[];
  widgetMeta: Record<string, { name: string; colSpan: 4 | 6 | 12 }>;
  orgName: string;
  dashboardTitle: string;
  dateRange: { from: string; to: string };
  orientation: 'landscape' | 'portrait';
  includeCoverPage: boolean;
}

interface UsePdfExportReturn {
  isExporting: boolean;
  progress: string;
  exportDashboard: (options: ExportOptions) => Promise<void>;
  exportSingleWidget: (options: {
    widgetId: string;
    widgetName: string;
    colSpan: 4 | 6 | 12;
    orgName: string;
    dashboardTitle: string;
    dateRange: { from: string; to: string };
  }) => Promise<void>;
}

export function usePdfExport(): UsePdfExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState('');
  const isExportingRef = useRef(false);

  const generateAndDownload = useCallback(
    async (widgets: PdfWidgetEntry[], options: Omit<ExportOptions, 'widgetIds' | 'widgetMeta'>) => {
      // Dynamic import to keep @react-pdf/renderer out of main bundle
      const { pdf } = await import('@react-pdf/renderer');
      const { DashboardPdfDocument } = await import('./dashboard-pdf-document');

      setProgress('Genererar PDF...');

      const element = DashboardPdfDocument({
        orgName: options.orgName,
        dashboardTitle: options.dashboardTitle,
        dateRange: options.dateRange,
        orientation: options.orientation,
        includeCoverPage: options.includeCoverPage,
        widgets,
      });
      // @react-pdf/renderer pdf() types don't accept generic ReactElement
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = pdf(element as any);

      const blob = await doc.toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const dateStr = new Date().toISOString().slice(0, 10);
      const safeName = options.orgName.replace(/[^a-zA-Z0-9-_]/g, '-');
      a.download = `${safeName}-${options.dashboardTitle.replace(/\s+/g, '-')}-${dateStr}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [],
  );

  const exportDashboard = useCallback(
    async (options: ExportOptions) => {
      if (isExportingRef.current) return;
      isExportingRef.current = true;
      setIsExporting(true);
      setProgress('Fanger widget-bilder...');

      try {
        // Capture SVG snapshots from live DOM
        const snapshots = await captureWidgetSnapshots(options.widgetIds);

        // Build widget entries for PDF
        const widgets: PdfWidgetEntry[] = options.widgetIds
          .map((id) => {
            const meta = options.widgetMeta[id];
            if (!meta) return null;
            return {
              widgetId: id,
              name: meta.name,
              colSpan: meta.colSpan,
              snapshotUri: snapshots[id] ?? null,
            };
          })
          .filter((w): w is PdfWidgetEntry => w !== null);

        await generateAndDownload(widgets, options);
        toast.success('PDF exporterad');
      } catch (err) {
        console.error('PDF export failed:', err);
        toast.error('Kunde inte exportera PDF');
      } finally {
        isExportingRef.current = false;
        setIsExporting(false);
        setProgress('');
      }
    },
    [generateAndDownload],
  );

  const exportSingleWidget = useCallback(
    async (options: {
      widgetId: string;
      widgetName: string;
      colSpan: 4 | 6 | 12;
      orgName: string;
      dashboardTitle: string;
      dateRange: { from: string; to: string };
    }) => {
      if (isExportingRef.current) return;
      isExportingRef.current = true;
      setIsExporting(true);
      setProgress('Exporterar widget...');

      try {
        const snapshots = await captureWidgetSnapshots([options.widgetId]);
        const widget: PdfWidgetEntry = {
          widgetId: options.widgetId,
          name: options.widgetName,
          colSpan: options.colSpan,
          snapshotUri: snapshots[options.widgetId] ?? null,
        };

        await generateAndDownload([widget], {
          orgName: options.orgName,
          dashboardTitle: options.dashboardTitle,
          dateRange: options.dateRange,
          orientation: 'landscape',
          includeCoverPage: false,
        });
        toast.success('PDF exporterad');
      } catch (err) {
        console.error('Single widget PDF export failed:', err);
        toast.error('Kunde inte exportera PDF');
      } finally {
        isExportingRef.current = false;
        setIsExporting(false);
        setProgress('');
      }
    },
    [generateAndDownload],
  );

  return { isExporting, progress, exportDashboard, exportSingleWidget };
}
