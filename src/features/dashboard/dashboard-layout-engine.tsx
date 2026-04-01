'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { FileDown, Loader2 } from 'lucide-react';

import { useDashboardLayout, useSaveLayout } from './use-dashboard-layout';
import { EditModeToggle, SortableWidget, WidgetDrawer } from './dashboard-edit-mode';
import { useWidgetTimeRange } from './dashboard-time-range';
import { CrossLinkProvider, useCrossLinks } from './dashboard-cross-links';
import { ExportPdfModal, usePdfExport } from './pdf-export';
import { getWidget } from './widget-registry';
import type { WidgetPlacement } from './widget-registry.types';

// ---------------------------------------------------------------------------
// DashboardGrid
// ---------------------------------------------------------------------------

export function DashboardGrid({ dashboardId = 'manager' }: { dashboardId?: string }) {
  return (
    <CrossLinkProvider>
      <DashboardGridInner dashboardId={dashboardId} />
    </CrossLinkProvider>
  );
}

function DashboardGridInner({ dashboardId = 'manager' }: { dashboardId?: string }) {
  const { layout, isLoading, isError } = useDashboardLayout(dashboardId);
  const { saveLayout } = useSaveLayout(dashboardId);
  const timeRange = useWidgetTimeRange();
  const { registerWidgetRef } = useCrossLinks();
  const [isEditMode, setIsEditMode] = useState(false);
  const [widgets, setWidgets] = useState<WidgetPlacement[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const { exportSingleWidget } = usePdfExport();

  // Sync layout data from server into local state
  const layoutWidgets = layout?.widgets;
  React.useEffect(() => {
    if (layoutWidgets) {
      setWidgets(layoutWidgets);
    }
  }, [layoutWidgets]);

  // dnd-kit sensors: require 8px movement before drag starts + keyboard for a11y
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sortableItems = useMemo(() => widgets.map((w) => w.widgetId), [widgets]);

  // ------- Drag handlers -------

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setWidgets((prev) => {
        const oldIndex = prev.findIndex((w) => w.widgetId === active.id);
        const newIndex = prev.findIndex((w) => w.widgetId === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;

        const reordered = arrayMove(prev, oldIndex, newIndex).map((w, i) => ({
          ...w,
          position: i,
        }));
        saveLayout(reordered);
        return reordered;
      });
    },
    [saveLayout],
  );

  // ------- Widget mutations -------

  const handleResize = useCallback(
    (widgetId: string) => {
      setWidgets((prev) => {
        const updated = prev.map((w) => {
          if (w.widgetId !== widgetId) return w;
          const def = getWidget(widgetId);
          const minSpan = def?.minColSpan ?? 4;
          const cycle: Array<4 | 6 | 12> = [4, 6, 12];
          const validCycle = cycle.filter((s) => s >= minSpan);
          const currentIdx = validCycle.indexOf(w.colSpan);
          const nextSpan = validCycle[(currentIdx + 1) % validCycle.length];
          return { ...w, colSpan: nextSpan };
        });
        saveLayout(updated);
        return updated;
      });
    },
    [saveLayout],
  );

  const handleRemove = useCallback(
    (widgetId: string) => {
      setWidgets((prev) => {
        const updated = prev
          .filter((w) => w.widgetId !== widgetId)
          .map((w, i) => ({ ...w, position: i }));
        saveLayout(updated);
        return updated;
      });
    },
    [saveLayout],
  );

  const handleAddWidget = useCallback(
    (widgetId: string) => {
      const def = getWidget(widgetId);
      if (!def) return;
      setWidgets((prev) => {
        if (prev.some((w) => w.widgetId === widgetId)) return prev;
        const newPlacement: WidgetPlacement = {
          widgetId,
          position: prev.length,
          colSpan: def.defaultColSpan,
        };
        const updated = [...prev, newPlacement];
        saveLayout(updated);
        return updated;
      });
    },
    [saveLayout],
  );

  // ------- Single-widget PDF export (R31-04) -------

  const handleExportWidgetPdf = useCallback(
    (widgetId: string, widgetName: string, colSpan: 4 | 6 | 12) => {
      exportSingleWidget({
        widgetId,
        widgetName,
        colSpan,
        orgName: 'Nordic Capacity', // TODO: resolve from org context
        dashboardTitle: dashboardId === 'manager' ? 'Management Overview' : 'Dashboard',
        dateRange: timeRange,
      });
    },
    [exportSingleWidget, dashboardId, timeRange],
  );

  // ------- Active drag overlay widget -------

  const activeWidget = activeId ? widgets.find((w) => w.widgetId === activeId) : null;
  const ActiveWidgetComponent = activeWidget ? getWidget(activeWidget.widgetId)?.component : null;

  // ------- Render -------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-destructive flex items-center justify-center py-20">
        Kunde inte ladda dashboard-layout
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Edit mode controls + Export PDF */}
      <div className="mb-4 flex items-center justify-end gap-2">
        {!isEditMode && (
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="border-outline-variant/30 text-primary hover:bg-surface-container-low inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
          >
            <FileDown className="h-4 w-4" />
            Exportera PDF
          </button>
        )}
        {isEditMode && (
          <button
            type="button"
            onClick={() => setIsDrawerOpen((o) => !o)}
            className="hover:bg-accent rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
          >
            Lagg till widget
          </button>
        )}
        <EditModeToggle isEditMode={isEditMode} onToggle={() => setIsEditMode((v) => !v)} />
      </div>

      {/* PDF Export Modal (R31-01) */}
      <ExportPdfModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        widgets={widgets}
        orgName="Nordic Capacity"
        dashboardTitle={dashboardId === 'manager' ? 'Management Overview' : 'Dashboard'}
        dateRange={timeRange}
      />

      {/* Widget drawer */}
      {isEditMode && (
        <WidgetDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          dashboardId={dashboardId}
          currentWidgetIds={sortableItems}
          onAddWidget={handleAddWidget}
        />
      )}

      {/* Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortableItems} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-12 gap-6">
            {widgets.map((placement) => {
              const def = getWidget(placement.widgetId);
              if (!def) return null;
              return (
                <SortableWidget
                  key={placement.widgetId}
                  placement={placement}
                  component={def.component}
                  widgetName={def.name}
                  minColSpan={def.minColSpan}
                  timeRange={timeRange}
                  isEditMode={isEditMode}
                  onResize={handleResize}
                  onRemove={handleRemove}
                  onExportPdf={handleExportWidgetPdf}
                  onRegisterRef={registerWidgetRef}
                />
              );
            })}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {activeWidget && ActiveWidgetComponent ? (
            <div
              className="bg-card rounded-lg border opacity-80 shadow-lg"
              style={{ width: `${(activeWidget.colSpan / 12) * 100}%`, maxWidth: '100%' }}
            >
              <ActiveWidgetComponent timeRange={timeRange} isEditMode={false} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

export default DashboardGrid;
