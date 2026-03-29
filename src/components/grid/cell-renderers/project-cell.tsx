'use client';

import type { ICellRendererParams } from 'ag-grid-community';

/** Props extended with onAddProject callback for the "Add project..." row. */
type ProjectCellProps = ICellRendererParams & {
  onAddProject?: () => void;
};

/** Renders the project name column: bold labels for pinned rows, a button for the add row, plain text for data rows. */
export function ProjectCell(props: ProjectCellProps) {
  const isAddRow = props.data?.isAddRow;
  const isPinned = props.node?.isRowPinned();

  if (isPinned) {
    // Pinned rows (SUMMA, Target, Status): bold label
    return <span className="text-on-surface font-semibold">{props.value}</span>;
  }

  if (isAddRow) {
    return (
      <button
        type="button"
        onClick={() => props.onAddProject?.()}
        className="text-on-surface-variant hover:text-primary w-full text-left italic"
      >
        Add project...
      </button>
    );
  }

  // Regular project row
  return <span className="text-on-surface font-semibold">{props.value}</span>;
}
