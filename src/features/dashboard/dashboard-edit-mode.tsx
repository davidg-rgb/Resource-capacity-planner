'use client';

import React, { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { GripVertical, Pencil, Plus, X } from 'lucide-react';

import { getWidgetsByDashboard } from './widget-registry';
import type { WidgetCategory, WidgetPlacement, WidgetProps } from './widget-registry.types';

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

export function SortableWidget({
  placement,
  component: Component,
  minColSpan: _minColSpan,
  timeRange,
  isEditMode,
  onResize,
  onRemove,
}: {
  placement: WidgetPlacement;
  component: React.ComponentType<WidgetProps>;
  minColSpan: 4 | 6;
  timeRange: { from: string; to: string };
  isEditMode: boolean;
  onResize: (widgetId: string) => void;
  onRemove: (widgetId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: placement.widgetId,
    disabled: !isEditMode,
  });

  const transformStr = transform
    ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
    : undefined;

  const style: React.CSSProperties = {
    gridColumn: `span ${placement.colSpan}`,
    transform: transformStr,
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
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
  const availableWidgets = getWidgetsByDashboard(dashboardId);

  // Group by category
  const grouped = availableWidgets.reduce(
    (acc, w) => {
      const cat = w.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(w);
      return acc;
    },
    {} as Record<WidgetCategory, typeof availableWidgets>,
  );

  return (
    <div
      className={[
        'bg-background fixed top-0 right-0 z-50 h-full w-80 transform border-l shadow-xl transition-transform duration-300',
        isOpen ? 'translate-x-0' : 'translate-x-full',
      ].join(' ')}
    >
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

      <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(100% - 57px)' }}>
        {(Object.entries(grouped) as [WidgetCategory, typeof availableWidgets][]).map(
          ([category, widgets]) => (
            <div key={category} className="mb-6">
              <h4 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                {CATEGORY_LABELS[category] ?? category}
              </h4>
              <div className="space-y-2">
                {widgets.map((def) => {
                  const isAdded = currentWidgetIds.includes(def.id);
                  const Icon = def.icon;
                  return (
                    <button
                      key={def.id}
                      type="button"
                      disabled={isAdded}
                      onClick={() => onAddWidget(def.id)}
                      className={[
                        'flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors',
                        isAdded
                          ? 'border-muted bg-muted/50 cursor-default opacity-60'
                          : 'hover:bg-accent',
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
                      {!isAdded && (
                        <Plus className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
