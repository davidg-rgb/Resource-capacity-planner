/**
 * Pre-export modal for multi-widget PDF export (R31-01).
 *
 * Shows a checkbox list of all active widgets on the current dashboard,
 * orientation toggle, cover page option, and triggers PDF generation.
 */

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileDown, Loader2, X } from 'lucide-react';

import { getWidget } from '../widget-registry';
import type { WidgetPlacement } from '../widget-registry.types';
import { usePdfExport } from './use-pdf-export';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  widgets: WidgetPlacement[];
  orgName: string;
  dashboardTitle: string;
  dateRange: { from: string; to: string };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExportPdfModal({
  isOpen,
  onClose,
  widgets,
  orgName,
  dashboardTitle,
  dateRange,
}: ExportPdfModalProps) {
  const { isExporting, progress, exportDashboard } = usePdfExport();

  // Widget selection state — all checked by default
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(widgets.map((w) => w.widgetId)),
  );
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [includeCoverPage, setIncludeCoverPage] = useState(true);

  // Reset selection when widgets change
  React.useEffect(() => {
    setSelectedIds(new Set(widgets.map((w) => w.widgetId)));
  }, [widgets]);

  // Build widget display data
  const widgetItems = useMemo(
    () =>
      widgets
        .map((placement) => {
          const def = getWidget(placement.widgetId);
          if (!def) return null;
          return {
            id: placement.widgetId,
            name: def.name,
            colSpan: placement.colSpan,
            Icon: def.icon,
          };
        })
        .filter(Boolean) as Array<{
        id: string;
        name: string;
        colSpan: 4 | 6 | 12;
        Icon: React.ComponentType<{ className?: string }>;
      }>,
    [widgets],
  );

  const toggleWidget = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(widgetItems.map((w) => w.id)));
  }, [widgetItems]);

  const clearAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleExport = useCallback(async () => {
    const selectedWidgetIds = Array.from(selectedIds);
    const widgetMeta: Record<string, { name: string; colSpan: 4 | 6 | 12 }> = {};
    for (const item of widgetItems) {
      if (selectedIds.has(item.id)) {
        widgetMeta[item.id] = { name: item.name, colSpan: item.colSpan };
      }
    }

    await exportDashboard({
      widgetIds: selectedWidgetIds,
      widgetMeta,
      orgName,
      dashboardTitle,
      dateRange,
      orientation,
      includeCoverPage,
    });
    onClose();
  }, [
    selectedIds,
    widgetItems,
    exportDashboard,
    orgName,
    dashboardTitle,
    dateRange,
    orientation,
    includeCoverPage,
    onClose,
  ]);

  const modalRef = useRef<HTMLDivElement>(null);
  const headingId = 'export-pdf-modal-heading';

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap: focus first focusable on open + trap Tab
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;
    const modal = modalRef.current;
    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const focusableEls = modal.querySelectorAll<HTMLElement>(focusableSelector);

    // Focus first element on mount
    focusableEls[0]?.focus();

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      // Re-query in case DOM changed
      const currentFocusable = modal.querySelectorAll<HTMLElement>(focusableSelector);
      const first = currentFocusable[0];
      const last = currentFocusable[currentFocusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedCount = selectedIds.size;
  const totalCount = widgetItems.length;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="bg-background fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <FileDown className="text-primary h-5 w-5" />
            <h2 id={headingId} className="text-base font-semibold">
              Exportera dashboard till PDF
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hover:bg-accent flex h-7 w-7 items-center justify-center rounded-md"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          {/* Select all / clear all */}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-muted-foreground text-sm">
              Valj innehall ({selectedCount}/{totalCount})
            </span>
            <div className="flex gap-3 text-xs">
              <button type="button" onClick={selectAll} className="text-primary hover:underline">
                Markera alla
              </button>
              <button type="button" onClick={clearAll} className="text-primary hover:underline">
                Avmarkera alla
              </button>
            </div>
          </div>

          {/* Widget checkboxes */}
          <div className="space-y-1.5">
            {widgetItems.map((item) => {
              const checked = selectedIds.has(item.id);
              return (
                <label
                  key={item.id}
                  className={[
                    'flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors',
                    checked ? 'bg-primary/5' : 'hover:bg-accent',
                  ].join(' ')}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleWidget(item.id)}
                    className="accent-primary h-4 w-4 rounded"
                  />
                  <item.Icon className="text-muted-foreground h-4 w-4 shrink-0" />
                  <span className="text-sm">{item.name}</span>
                  <span className="text-muted-foreground ml-auto text-[10px]">
                    {item.colSpan}/12
                  </span>
                </label>
              );
            })}
          </div>

          {/* Options divider */}
          <div className="my-4 border-t" />

          {/* Orientation */}
          <div className="mb-3">
            <span className="text-muted-foreground mb-2 block text-xs font-semibold tracking-wider uppercase">
              Orientering
            </span>
            <div className="flex gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="orientation"
                  checked={orientation === 'landscape'}
                  onChange={() => setOrientation('landscape')}
                  className="accent-primary"
                />
                Liggande
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="orientation"
                  checked={orientation === 'portrait'}
                  onChange={() => setOrientation('portrait')}
                  className="accent-primary"
                />
                Staende
              </label>
            </div>
          </div>

          {/* Cover page */}
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeCoverPage}
              onChange={(e) => setIncludeCoverPage(e.target.checked)}
              className="accent-primary h-4 w-4 rounded"
            />
            Inkludera forsattsblad
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-6 py-4">
          {isExporting && (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {progress}
            </div>
          )}
          {!isExporting && <div />}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="hover:bg-accent rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            >
              Avbryt
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || selectedCount === 0}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <FileDown className="h-4 w-4" />
              Exportera PDF
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
