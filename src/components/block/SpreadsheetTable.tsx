// File Header: Spreadsheet-like table rendering selection, fill, and editing interactions.
import React from 'react'
import type { CellPosition, SelectionRange } from '../../pages/top/useSpreadsheetState'
import type { TableRow } from '../../services/workbookService'
import { layoutTheme } from '../../utils/Theme'
import TableHead from './table/TableHead'
import TableBody from './table/TableBody'

type Props = {
  rows: TableRow[]
  columns: string[]
  activeRange: SelectionRange | null
  selection: SelectionRange | null
  fillPreview: SelectionRange | null
  isFillDragActive: boolean
  editingCell: CellPosition | null
  onRowNumberClick: (_rowIndex: number, _extend: boolean) => void
  onColumnHeaderClick: (_columnIndex: number, _extend: boolean) => void
  onPointerDown: (
    _event: React.PointerEvent<HTMLTableCellElement>,
    _rowIndex: number,
    _columnIndex: number,
  ) => void
  onPointerEnter: (_rowIndex: number, _columnIndex: number) => void
  onCellClick: (
    _event: React.MouseEvent<HTMLTableCellElement>,
    _rowIndex: number,
    _columnIndex: number,
  ) => void
  onCellDoubleClick: (_rowIndex: number, _columnIndex: number) => void
  onTableKeyDown: (_event: React.KeyboardEvent<HTMLDivElement>) => void
  onStartFillDrag: (_event: React.PointerEvent<HTMLButtonElement>) => void
  onCellChange: (_rowIndex: number, _column: string, _value: string) => void
  onPaste: (_event: React.ClipboardEvent<HTMLDivElement>) => void
  onCellEditorBlur: () => void
  onCellEditorKeyDown: (_event: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

// Function Header: Renders the spreadsheet grid complete with selection/fill affordances.
export default function SpreadsheetTable({
  rows,
  columns,
  activeRange,
  selection,
  fillPreview,
  isFillDragActive,
  editingCell,
  onRowNumberClick,
  onColumnHeaderClick,
  onPointerDown,
  onPointerEnter,
  onCellClick,
  onCellDoubleClick,
  onTableKeyDown,
  onStartFillDrag,
  onCellChange,
  onPaste,
  onCellEditorBlur,
  onCellEditorKeyDown,
}: Props): React.ReactElement {
  return (
    <div
      className={`${layoutTheme.tableScroll} mt-6`}
      id="sheet-workspace"
      tabIndex={0}
      role="region"
      aria-label="スプレッドシートエリア"
      onPaste={onPaste}
      onKeyDown={onTableKeyDown}
      data-testid="interactive-table-shell"
    >
      <table className="spreadsheet-table">
        <TableHead columns={columns} onColumnHeaderClick={onColumnHeaderClick} />
        <TableBody
          rows={rows}
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
      </table>
    </div>
  )
}
