// File Header: Table row component handling row header actions and delegating cells.
import React from 'react'
import type { TableRow as TableRowData } from '../../../services/workbookService'
import type { CellPosition, SelectionRange } from '../../../pages/top/useSpreadsheetState'
import EditableCell from './EditableCell'

type TableRowProps = {
  row: TableRowData
  rowIndex: number
  columns: string[]
  selection: SelectionRange | null
  activeRange: SelectionRange | null
  fillPreview: SelectionRange | null
  isFillDragActive: boolean
  editingCell: CellPosition | null
  onRowNumberClick: (_rowIndex: number, _extend: boolean) => void
  onPointerDown: (
    _event: React.PointerEvent<HTMLTableCellElement>,
    _rowIndex: number,
    _columnIndex: number,
  ) => void
  onPointerEnter: (_rowIndex: number, _columnIndex: number) => void
  onCellClick: (_event: React.MouseEvent<HTMLTableCellElement>, _rowIndex: number, _columnIndex: number) => void
  onCellDoubleClick: (_rowIndex: number, _columnIndex: number) => void
  onCellChange: (_rowIndex: number, _column: string, _value: string) => void
  onStartFillDrag: (_event: React.PointerEvent<HTMLButtonElement>) => void
  onCellEditorBlur: () => void
  onCellEditorKeyDown: (_event: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

// Function Header: Renders a single spreadsheet row with editable cells.
const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(function TableRow(
  {
    row,
    rowIndex,
    columns,
    selection,
    activeRange,
    fillPreview,
    isFillDragActive,
    editingCell,
    onRowNumberClick,
    onPointerDown,
    onPointerEnter,
    onCellClick,
    onCellDoubleClick,
    onCellChange,
    onStartFillDrag,
    onCellEditorBlur,
    onCellEditorKeyDown,
  },
  ref,
): React.ReactElement {
  return (
    <tr ref={ref} className="border-t border-slate-200">
      <th scope="row" className="row-number-cell" data-testid={`row-number-${rowIndex}`}>
        <div className="row-number-content">
          <button
            type="button"
            className="row-number-button"
            aria-label={`行${rowIndex + 1}を選択`}
            onClick={(event) => onRowNumberClick(rowIndex, event.shiftKey)}
          >
            {rowIndex + 1}
          </button>
        </div>
      </th>
      {columns.map((column, columnIndex) => (
        <EditableCell
          key={`${column}-${rowIndex}`}
          column={column}
          columnIndex={columnIndex}
          rowIndex={rowIndex}
          value={row[column] ?? ''}
          selection={selection}
          activeRange={activeRange}
          fillPreview={fillPreview}
          isFillDragActive={isFillDragActive}
          editingCell={editingCell}
          onPointerDown={onPointerDown}
          onPointerEnter={onPointerEnter}
          onCellClick={onCellClick}
          onCellDoubleClick={onCellDoubleClick}
          onCellChange={onCellChange}
          onStartFillDrag={onStartFillDrag}
          onCellEditorBlur={onCellEditorBlur}
          onCellEditorKeyDown={onCellEditorKeyDown}
        />
      ))}
    </tr>
  )
})

export default TableRow
