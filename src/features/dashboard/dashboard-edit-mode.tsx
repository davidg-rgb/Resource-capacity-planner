'use client';

import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { FileDown, GripVertical, MoreHorizontal, Pencil, Plus, Search, X } from 'lucide-react';

import { getWidgetsByDashboard } from './widget-registry';
import type {
  WidgetCategory,
  WidgetDefinition,
  WidgetPlacement,
  WidgetProps,
} from './widget-registry.types';

// ---------------------------------------------------------------------------
// EditModeToggle
// ---------------------------------------------------------------------------

export function EditModeToggle({
  isEditMode,
  onToggle,
}: {
  isEditMode: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
        isEditMode
          ? 'border-primary bg-primary/10 text-primary ring-primary/30 ring-2'
          : 'hover:bg-accent',
      ].join(' ')}
    >
      {isEditMode ? (
        <>Klar</>
      ) : (
        <>
          <Pencil className="h-4 w-4" />
          Redigera
        </>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// ResizeHandle
// ---------------------------------------------------------------------------

function ResizeHandle({ colSpan, onResize }: { colSpan: 4 | 6 | 12; onResize: () => void }) {
  const label = `${colSpan}/12`;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onResize();
      }}
      title={`Storlek: ${label} (klicka for att andra)`}
      className="bg-muted text-muted-foreground hover:bg-muted-foreground/20 absolute right-1 bottom-1 z-10 flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors"
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// RemoveButton
// ---------------------------------------------------------------------------

function RemoveButton({ onRemove }: { onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onRemove();
      }}
      title="Ta bort widget"
      className="bg-destructive/10 text-destructive hover:bg-destructive/20 absolute top-1 right-1 z-10 flex h-6 w-6 items-center justify-center rounded-full transition-colors"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// MemoizedWidgetContent — avoids re-renders on edit mode toggle
// ---------------------------------------------------------------------------

const MemoizedWidgetContent = memo(function MemoizedWidgetContent({
  Component,
  timeRange,
  isEditMode,
  config,
}: {
  Component: React.ComponentType<WidgetProps>;
  timeRange: { from: string; to: string };
  isEditMode: boolean;
  config?: Record<string, unknown>;
}) {
  return <Component timeRange={timeRange} isEditMode={isEditMode} config={config} />;
});

// ---------------------------------------------------------------------------
// SortableWidget
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// WidgetMenu — always-visible ⋯ menu with "Export as PDF" action (R31-04)
// ---------------------------------------------------------------------------

function WidgetMenu({ onExportPdf }: { onExportPdf: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }, []);

  const handleExport = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsOpen(false);
      onExportPdf();
    },
    [onExportPdf],
  );

  // Close on outside click
  React.useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={menuRef} className="absolute top-2 right-2 z-10">
      <button
        type="button"
        onClick={handleToggle}
        className="text-muted-foreground hover:bg-accent flex h-7 w-7 items-center justify-center rounded-md transition-colors"
        title="Widgetalternativ"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {isOpen && (
        <div className="bg-background absolute top-full right-0 z-20 mt-1 min-w-[160px] rounded-md border py-1 shadow-lg">
          <button
            type="button"
            onClick={handleExport}
            className="hover:bg-accent flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm"
          >
            <FileDown className="h-3.5 w-3.5" />
            Exportera som PDF
          </button>
        </div>
      )}
    </div>
  );
}

export function SortableWidget({
  placement,
  component: Component,
  widgetName,
  minColSpan: _minColSpan,
  timeRange,
  isEditMode,
  onResize,
  onRemove,
  onExportPdf,
  onRegisterRef,
}: {
  placement: WidgetPlacement;
  component: React.ComponentType<WidgetProps>;
  widgetName: string;
  minColSpan: 4 | 6;
  timeRange: { from: string; to: string };
  isEditMode: boolean;
  onResize: (widgetId: string) => void;
  onRemove: (widgetId: string) => void;
  onExportPdf: (widgetId: string, widgetName: string, colSpan: 4 | 6 | 12) => void;
  onRegisterRef?: (widgetId: string, el: HTMLElement | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: placement.widgetId,
    disabled: !isEditMode,
  });

  const combinedRef = React.useCallback(
    (el: HTMLDivElement | null) => {
      setNodeRef(el);
      onRegisterRef?.(placement.widgetId, el);
    },
    [setNodeRef, onRegisterRef, placement.widgetId],
  );

  const transformStr = transform
    ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
    : undefined;

  const style: React.CSSProperties = {
    gridColumn: `span ${placement.colSpan}`,
    transform: transformStr,
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleWidgetExport = useCallback(() => {
    onExportPdf(placement.widgetId, widgetName, placement.colSpan);
  }, [onExportPdf, placement.widgetId, widgetName, placement.colSpan]);

  return (
    <div
      ref={combinedRef}
      style={style}
      className="group relative"
      data-widget-id={placement.widgetId}
    >
      {/* Edit mode chrome: drag handle, remove, resize */}
      {isEditMode && (
        <>
          <div
            {...attributes}
            {...listeners}
            className="bg-muted text-muted-foreground hover:bg-muted-foreground/20 absolute top-1 left-1 z-10 flex h-6 w-6 cursor-grab items-center justify-center rounded transition-colors active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <RemoveButton onRemove={() => onRemove(placement.widgetId)} />
          <ResizeHandle colSpan={placement.colSpan} onResize={() => onResize(placement.widgetId)} />
        </>
      )}

      {/* Widget ⋯ menu (always visible on hover) */}
      {!isEditMode && (
        <div className="opacity-0 transition-opacity group-hover:opacity-100">
          <WidgetMenu onExportPdf={handleWidgetExport} />
        </div>
      )}

      {/* Widget content */}
      <div
        className={[
          'bg-card rounded-lg border',
          isEditMode ? 'ring-dashed ring-muted-foreground/30 ring-1' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <MemoizedWidgetContent
          Component={Component}
          timeRange={timeRange}
          isEditMode={isEditMode}
          config={placement.config}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category labels
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<WidgetCategory, string> = {
  'health-capacity': 'Halsa & Kapacitet',
  'timelines-planning': 'Tidslinjer & Planering',
  breakdowns: 'Fordelningar',
  'alerts-actions': 'Notiser & Atgarder',
};

// ---------------------------------------------------------------------------
// WidgetDrawer
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// WidgetDrawerItem — single widget card in the drawer
// ---------------------------------------------------------------------------

function WidgetDrawerItem({
  def,
  isAdded,
  onAdd,
}: {
  def: WidgetDefinition;
  isAdded: boolean;
  onAdd: (id: string) => void;
}) {
  const Icon = def.icon;
  return (
    <button
      key={def.id}
      type="button"
      disabled={isAdded}
      onClick={() => onAdd(def.id)}
      className={[
        'flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors',
        isAdded ? 'border-muted bg-muted/50 cursor-default opacity-60' : 'hover:bg-accent',
      ].join(' ')}
    >
      <Icon className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{def.name}</span>
          {isAdded ? (
            <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[10px] font-semibold">
              Tillagd
            </span>
          ) : (
            <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-semibold">
              {def.defaultColSpan}/12
            </span>
          )}
        </div>
        <p className="text-muted-foreground mt-0.5 text-xs">{def.description}</p>
      </div>
      {!isAdded && <Plus className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// WidgetDrawer — with search and category grouping (R30-05)
// ---------------------------------------------------------------------------

export function WidgetDrawer({
  isOpen,
  onClose,
  dashboardId,
  currentWidgetIds,
  onAddWidget,
}: {
  isOpen: boolean;
  onClose: () => void;
  dashboardId: string;
  currentWidgetIds: string[];
  onAddWidget: (widgetId: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const availableWidgets = getWidgetsByDashboard(dashboardId);

  // Filter by search query (name or description)
  const filteredWidgets = useMemo(() => {
    if (!searchQuery.trim()) return availableWidgets;
    const q = searchQuery.toLowerCase();
    return availableWidgets.filter(
      (w) => w.name.toLowerCase().includes(q) || w.description.toLowerCase().includes(q),
    );
  }, [availableWidgets, searchQuery]);

  // Group by category
  const grouped = useMemo(() => {
    return filteredWidgets.reduce(
      (acc, w) => {
        const cat = w.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(w);
        return acc;
      },
      {} as Record<WidgetCategory, WidgetDefinition[]>,
    );
  }, [filteredWidgets]);

  // Category display order
  const categoryOrder: WidgetCategory[] = [
    'health-capacity',
    'timelines-planning',
    'breakdowns',
    'alerts-actions',
  ];

  const sortedEntries = useMemo(() => {
    return categoryOrder
      .filter((cat) => grouped[cat]?.length)
      .map((cat) => [cat, grouped[cat]] as [WidgetCategory, WidgetDefinition[]]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grouped]);

  return (
    <div
      className={[
        'bg-background fixed top-0 right-0 z-50 h-full w-80 transform border-l shadow-xl transition-transform duration-300',
        isOpen ? 'translate-x-0' : 'translate-x-full',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="text-sm font-semibold">Tillgangliga widgets</h3>
        <button
          type="button"
          onClick={onClose}
          className="hover:bg-accent flex h-7 w-7 items-center justify-center rounded-md"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="border-b px-4 py-3">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Sok widgets..."
            className="bg-muted/50 text-foreground placeholder:text-muted-foreground focus:ring-primary/30 w-full rounded-md border py-1.5 pr-3 pl-9 text-sm focus:ring-2 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Widget list */}
      <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(100% - 120px)' }}>
        {sortedEntries.length === 0 && (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Inga widgets matchar &quot;{searchQuery}&quot;
          </p>
        )}

        {sortedEntries.map(([category, widgets]) => (
          <div key={category} className="mb-6">
            <h4 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
              {CATEGORY_LABELS[category] ?? category}
            </h4>
            <div className="space-y-2">
              {widgets.map((def) => (
                <WidgetDrawerItem
                  key={def.id}
                  def={def}
                  isAdded={currentWidgetIds.includes(def.id)}
                  onAdd={onAddWidget}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
