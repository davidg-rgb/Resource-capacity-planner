'use client';

/**
 * v5.0 — Phase 43 / Plan 43-02: generic admin register list view.
 *
 * Drives all five admin register pages (people / projects / departments /
 * disciplines / programs) in Plan 43-03 via a columns config +
 * row-action callbacks. No per-entity logic lives here.
 *
 * States:
 *  - loading: 3 skeleton rows
 *  - error:   inline banner with retry
 *  - empty:   "Inga rader. Lägg till" CTA
 *  - populated: rows with Pencil / Trash2 / RotateCcw actions
 *  - banner prop: optional top-of-table status (used by pages to surface
 *    DEPENDENT_ROWS_EXIST blocker messages)
 *
 * Archive confirm uses window.confirm (matching v4 /admin/departments).
 * Archived rows render with reduced opacity + an "Återställ" action.
 */

import { AlertTriangle, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

export interface RegisterTableColumn<TRow> {
  key: string;
  header: string;
  cell: (row: TRow) => ReactNode;
  align?: 'left' | 'right';
}

export type RegisterRowLike = {
  id: string;
  name?: string | null;
  archivedAt?: string | Date | null;
  [k: string]: unknown;
};

export interface RegisterTableBanner {
  tone: 'info' | 'error' | 'success';
  message: ReactNode;
  onDismiss?: () => void;
}

export interface RegisterTableProps<TRow extends RegisterRowLike> {
  title: string;
  description?: string;
  columns: ReadonlyArray<RegisterTableColumn<TRow>>;
  rows: readonly TRow[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry?: () => void;
  onCreate: () => void;
  onEdit: (row: TRow) => void;
  onArchive: (row: TRow) => void;
  onUnarchive?: (row: TRow) => void;
  includeArchived: boolean;
  onToggleArchived: (next: boolean) => void;
  banner?: RegisterTableBanner | null;
  /** i18n-ready strings (callers pass translated values). */
  labels: {
    newButton: string;
    showArchived: string;
    edit: string;
    archive: string;
    unarchive: string;
    archiveConfirm: (name: string) => string;
    empty: string;
    addFirst: string;
    loading: string;
    errorTitle: string;
    retry: string;
    actionsColumn: string;
    archivedBadge: string;
  };
}

function isArchived(row: RegisterRowLike): boolean {
  return row.archivedAt !== null && row.archivedAt !== undefined;
}

export function RegisterTable<TRow extends RegisterRowLike>(props: RegisterTableProps<TRow>) {
  const {
    title,
    description,
    columns,
    rows,
    isLoading,
    error,
    onRetry,
    onCreate,
    onEdit,
    onArchive,
    onUnarchive,
    includeArchived,
    onToggleArchived,
    banner,
    labels,
  } = props;

  const handleArchiveClick = (row: TRow) => {
    const name = String(row.name ?? row.id);
    if (!window.confirm(labels.archiveConfirm(name))) return;
    onArchive(row);
  };

  const handleUnarchiveClick = (row: TRow) => {
    if (onUnarchive) onUnarchive(row);
    else onEdit(row);
  };

  return (
    <div className="space-y-4" data-testid="register-table">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-headline text-on-surface text-2xl font-semibold tracking-tight">
            {title}
          </h1>
          {description && <p className="text-on-surface-variant text-sm">{description}</p>}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-on-surface-variant inline-flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => onToggleArchived(e.target.checked)}
              data-testid="register-toggle-archived"
            />
            {labels.showArchived}
          </label>
          <button
            type="button"
            onClick={onCreate}
            data-testid="register-new-button"
            className="bg-primary text-on-primary inline-flex items-center gap-1.5 rounded-sm px-4 py-2 text-xs font-semibold hover:opacity-90"
          >
            <Plus size={14} />
            {labels.newButton}
          </button>
        </div>
      </div>

      {/* Banner slot (e.g. DEPENDENT_ROWS_EXIST message) */}
      {banner && (
        <div
          role={banner.tone === 'error' ? 'alert' : 'status'}
          data-testid="register-banner"
          className={
            banner.tone === 'error'
              ? 'border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-800'
              : banner.tone === 'success'
                ? 'border-l-4 border-green-600 bg-green-50 px-4 py-3 text-sm text-green-800'
                : 'border-outline-variant/30 bg-surface-container-low text-on-surface border-l-4 px-4 py-3 text-sm'
          }
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-2">
              {banner.tone === 'error' && <AlertTriangle size={16} className="mt-0.5" />}
              <div>{banner.message}</div>
            </div>
            {banner.onDismiss && (
              <button
                type="button"
                onClick={banner.onDismiss}
                className="text-xs underline"
                data-testid="register-banner-dismiss"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div
          role="alert"
          data-testid="register-error-banner"
          className="flex items-center justify-between gap-4 border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{labels.errorTitle}</span>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-sm border border-red-600 px-3 py-1 text-xs font-semibold"
              data-testid="register-retry-button"
            >
              {labels.retry}
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {!error && (
        <div className="overflow-x-auto">
          <table className="border-outline-variant/15 w-full rounded-sm border text-sm">
            <thead>
              <tr className="bg-surface-container-low">
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={`text-on-surface-variant px-4 py-3 font-medium ${
                      c.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {c.header}
                  </th>
                ))}
                <th className="text-on-surface-variant px-4 py-3 text-right font-medium">
                  {labels.actionsColumn}
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Loading skeletons */}
              {isLoading &&
                [0, 1, 2].map((i) => (
                  <tr
                    key={`skeleton-${i}`}
                    data-testid="register-skeleton-row"
                    className="border-outline-variant/15 border-t"
                  >
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3">
                        <span className="bg-surface-container-high inline-block h-4 w-24 animate-pulse rounded" />
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <span className="bg-surface-container-high inline-block h-4 w-12 animate-pulse rounded" />
                    </td>
                  </tr>
                ))}

              {/* Populated */}
              {!isLoading &&
                rows &&
                rows.map((row) => {
                  const archived = isArchived(row);
                  return (
                    <tr
                      key={row.id}
                      data-testid="register-row"
                      data-archived={archived ? 'true' : 'false'}
                      className={`border-outline-variant/15 even:bg-surface-container-low/30 border-t ${
                        archived ? 'opacity-50' : ''
                      }`}
                    >
                      {columns.map((c) => (
                        <td
                          key={c.key}
                          className={`text-on-surface px-4 py-3 ${
                            c.align === 'right' ? 'text-right' : ''
                          }`}
                        >
                          {c.cell(row)}
                          {archived && c === columns[0] && (
                            <span className="text-on-surface-variant ml-2 text-xs">
                              ({labels.archivedBadge})
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {archived ? (
                            <button
                              type="button"
                              onClick={() => handleUnarchiveClick(row)}
                              title={labels.unarchive}
                              data-testid="register-unarchive-button"
                              className="text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface rounded p-1"
                            >
                              <RotateCcw size={16} />
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => onEdit(row)}
                                title={labels.edit}
                                data-testid="register-edit-button"
                                className="text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface rounded p-1"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleArchiveClick(row)}
                                title={labels.archive}
                                data-testid="register-archive-button"
                                className="text-on-surface-variant rounded p-1 hover:bg-red-100 hover:text-red-600"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

              {/* Empty */}
              {!isLoading && rows && rows.length === 0 && (
                <tr className="border-outline-variant/15 border-t">
                  <td
                    colSpan={columns.length + 1}
                    className="text-on-surface-variant px-4 py-6 text-center text-sm"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span>{labels.empty}</span>
                      <button
                        type="button"
                        onClick={onCreate}
                        data-testid="register-empty-add-button"
                        className="bg-primary text-on-primary inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-semibold hover:opacity-90"
                      >
                        <Plus size={12} />
                        {labels.addFirst}
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isLoading && (
        <span data-testid="register-loading" className="sr-only">
          {labels.loading}
        </span>
      )}
    </div>
  );
}
