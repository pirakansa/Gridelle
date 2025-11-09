// File Header: Table body wrapper delegating per-row rendering.
import React from 'react'
import type { TableRow as TableRowData } from '../../../services/workbookService'
import type { CellPosition, SelectionRange } from '../../../pages/top/useSpreadsheetState'
import TableRow from './TableRow'

type TableBodyProps = {
  rows: TableRowData[]
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

// Function Header: Renders table rows or a placeholder when empty.
export default function TableBody({
  rows,
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
}: TableBodyProps): React.ReactElement {
  if (!rows.length) {
    return (
      <tbody>
        <tr>
          <td colSpan={columns.length + 1}>
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-slate-500">
              <p>表示するデータがありません。</p>
              <p>YAMLを読み込むか、行・列を追加して開始してください。</p>
            </div>
          </td>
        </tr>
      </tbody>
    )
  }

  return (
    <tbody>
      {rows.map((row, rowIndex) => (
        <TableRow
          key={`row-${rowIndex}`}
          row={row}
          rowIndex={rowIndex}
          columns={columns}
          selection={selection}
          activeRange={activeRange}
          fillPreview={fillPreview}
          isFillDragActive={isFillDragActive}
          editingCell={editingCell}
          onRowNumberClick={onRowNumberClick}
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
    </tbody>
  )
}
