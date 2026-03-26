'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GridApi } from 'ag-grid-community';

import type { GridRow } from '@/features/allocations/allocation.types';

type DragToFillHandleProps = {
  gridApi: GridApi | null;
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  months: string[];
  currentMonth: string;
  localRowData: GridRow[];
  onFill: (cells: { projectId: string; month: string; hours: number }[]) => void;
};

type FocusedCellInfo = {
  rowIndex: number;
  colId: string;
  projectId: string;
  value: number;
  monthIndex: number;
};

/**
 * Custom drag-to-fill overlay for AG Grid Community.
 * Renders a 10x10px blue handle at the bottom-right of the focused editable cell.
 * Dragging horizontally copies the source cell's value across months.
 * AG Grid Enterprise fill handle is not available in Community edition.
 */
export function DragToFillHandle({
  gridApi,
  gridContainerRef,
  months,
  currentMonth,
  localRowData,
  onFill,
}: DragToFillHandleProps) {
  const [handlePos, setHandlePos] = useState<{ top: number; left: number } | null>(null);
  const [highlightRect, setHighlightRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const isDraggingRef = useRef(false);
  const focusedCellRef = useRef<FocusedCellInfo | null>(null);
  const scrollHideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /**
   * Get the bounding rect of a cell DOM element relative to the grid container.
   */
  const getCellRect = useCallback(
    (colId: string, rowIndex: number): DOMRect | null => {
      const container = gridContainerRef.current;
      if (!container) return null;

      // AG Grid marks cells with col-id and row-index attributes
      const cell = container.querySelector<HTMLElement>(
        `.ag-cell[col-id="${colId}"][aria-rowindex="${rowIndex + 1}"]`,
      );
      if (!cell) return null;

      const containerRect = container.getBoundingClientRect();
      const cellRect = cell.getBoundingClientRect();

      return new DOMRect(
        cellRect.left - containerRect.left,
        cellRect.top - containerRect.top,
        cellRect.width,
        cellRect.height,
      );
    },
    [gridContainerRef],
  );

  /**
   * Position the fill handle at the bottom-right of the focused cell.
   */
  const positionHandle = useCallback(
    (colId: string, rowIndex: number) => {
      const rect = getCellRect(colId, rowIndex);
      if (!rect) {
        setHandlePos(null);
        return;
      }
      setHandlePos({
        top: rect.top + rect.height - 5,
        left: rect.left + rect.width - 5,
      });
    },
    [getCellRect],
  );

  /**
   * Handle cell focus events to show/hide the fill handle.
   */
  useEffect(() => {
    if (!gridApi) return;

    const onCellFocused = (event: { column: { getColId: () => string } | null; rowIndex: number | null }) => {
      if (isDraggingRef.current) return; // Don't reposition during drag

      const colId = event.column?.getColId();
      const rowIndex = event.rowIndex;

      if (colId == null || rowIndex == null) {
        setHandlePos(null);
        focusedCellRef.current = null;
        return;
      }

      // Hide for project name column
      if (colId === 'projectName') {
        setHandlePos(null);
        focusedCellRef.current = null;
        return;
      }

      // Hide for pinned rows
      const rowNode = gridApi.getDisplayedRowAtIndex(rowIndex);
      if (!rowNode || rowNode.isRowPinned()) {
        setHandlePos(null);
        focusedCellRef.current = null;
        return;
      }

      // Hide for past months (read-only)
      if (colId < currentMonth) {
        setHandlePos(null);
        focusedCellRef.current = null;
        return;
      }

      // Hide for add-project row
      const data = rowNode.data as GridRow | undefined;
      if (!data || data.isAddRow) {
        setHandlePos(null);
        focusedCellRef.current = null;
        return;
      }

      const monthIndex = months.indexOf(colId);
      if (monthIndex === -1) {
        setHandlePos(null);
        focusedCellRef.current = null;
        return;
      }

      const value = Number(data[colId]) || 0;

      focusedCellRef.current = {
        rowIndex,
        colId,
        projectId: data.projectId,
        value,
        monthIndex,
      };

      positionHandle(colId, rowIndex);
    };

    gridApi.addEventListener('cellFocused', onCellFocused);

    return () => {
      gridApi.removeEventListener('cellFocused', onCellFocused);
    };
  }, [gridApi, months, currentMonth, positionHandle]);

  /**
   * Hide handle during grid scroll, reposition after scroll ends.
   */
  useEffect(() => {
    if (!gridApi) return;

    const onBodyScroll = () => {
      setHandlePos(null);
      clearTimeout(scrollHideTimerRef.current);

      scrollHideTimerRef.current = setTimeout(() => {
        const focused = focusedCellRef.current;
        if (focused && !isDraggingRef.current) {
          positionHandle(focused.colId, focused.rowIndex);
        }
      }, 150);
    };

    gridApi.addEventListener('bodyScroll', onBodyScroll);

    return () => {
      gridApi.removeEventListener('bodyScroll', onBodyScroll);
      clearTimeout(scrollHideTimerRef.current);
    };
  }, [gridApi, positionHandle]);

  /**
   * Mouse drag handlers for fill operation.
   */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!focusedCellRef.current) return;

      isDraggingRef.current = true;

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!isDraggingRef.current || !focusedCellRef.current) return;

        const container = gridContainerRef.current;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const mouseX = moveEvent.clientX - containerRect.left;

        const source = focusedCellRef.current;
        const sourceRect = getCellRect(source.colId, source.rowIndex);
        if (!sourceRect) return;

        // Find the month column the mouse is over
        let endMonthIndex = source.monthIndex;
        for (let i = 0; i < months.length; i++) {
          const month = months[i];
          if (month < currentMonth) continue; // Skip past months

          const colRect = getCellRect(month, source.rowIndex);
          if (!colRect) continue;

          if (mouseX >= colRect.left && mouseX <= colRect.left + colRect.width) {
            endMonthIndex = i;
            break;
          }
          // If mouse is past this column's right edge, this could be the target
          if (mouseX > colRect.left + colRect.width) {
            endMonthIndex = i;
          }
        }

        // Only allow dragging to the right (forward in time)
        if (endMonthIndex <= source.monthIndex) {
          setHighlightRect(null);
          return;
        }

        // Compute highlight rectangle from source+1 to endMonth
        const firstFillMonth = months[source.monthIndex + 1];
        const lastFillMonth = months[endMonthIndex];
        if (!firstFillMonth || !lastFillMonth) return;

        const firstRect = getCellRect(firstFillMonth, source.rowIndex);
        const lastRect = getCellRect(lastFillMonth, source.rowIndex);
        if (!firstRect || !lastRect) return;

        setHighlightRect({
          top: firstRect.top,
          left: firstRect.left,
          width: lastRect.left + lastRect.width - firstRect.left,
          height: firstRect.height,
        });
      };

      const onMouseUp = () => {
        isDraggingRef.current = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        const source = focusedCellRef.current;
        if (!source || !highlightRect) {
          setHighlightRect(null);
          return;
        }

        // Determine the fill range from the highlight
        const container = gridContainerRef.current;
        if (!container) {
          setHighlightRect(null);
          return;
        }

        const fillCells: { projectId: string; month: string; hours: number }[] = [];

        for (let i = source.monthIndex + 1; i < months.length; i++) {
          const month = months[i];
          if (month < currentMonth) continue;

          const colRect = getCellRect(month, source.rowIndex);
          if (!colRect) continue;

          // Check if this column is within the highlight
          if (
            colRect.left >= highlightRect.left &&
            colRect.left + colRect.width <= highlightRect.left + highlightRect.width + 1
          ) {
            fillCells.push({
              projectId: source.projectId,
              month,
              hours: source.value,
            });
          }
        }

        setHighlightRect(null);

        if (fillCells.length > 0) {
          onFill(fillCells);
        }
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [gridContainerRef, getCellRect, months, currentMonth, onFill, highlightRect],
  );

  if (!handlePos) return null;

  return (
    <>
      {/* Fill handle: 10x10px blue square at bottom-right of focused cell */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute z-10 h-2.5 w-2.5 cursor-crosshair bg-primary"
        style={{
          top: handlePos.top,
          left: handlePos.left,
        }}
        title="Drag to fill"
      />

      {/* Highlight overlay during drag */}
      {highlightRect && (
        <div
          className="pointer-events-none absolute z-10 bg-primary/20"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
          }}
        />
      )}
    </>
  );
}
