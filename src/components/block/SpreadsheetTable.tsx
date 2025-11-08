// File Header: Spreadsheet-like table rendering selection, fill, and editing interactions.
import React from 'react'
import type { CellPosition, SelectionRange } from '../../pages/top/useSpreadsheetState'
import type { TableRow } from '../../utils/yamlTable'
import { layoutTheme } from '../../utils/Theme'
import {
  columnIconButtonClass,
  copyCellButtonClass,
} from '../constants'

type Props = {
  rows: TableRow[]
  columns: string[]
  activeRange: SelectionRange | null
  selection: SelectionRange | null
  fillPreview: SelectionRange | null
  isFillDragActive: boolean
  editingCell: CellPosition | null
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
  onCopyCell: (_value: string) => Promise<void>
  onPaste: (_event: React.ClipboardEvent<HTMLDivElement>) => void
  onMoveColumn: (_columnKey: string, _direction: 'left' | 'right') => void
  onDeleteRow: (_rowIndex: number) => void
  onCellEditorBlur: () => void
  onCellEditorKeyDown: (_event: React.KeyboardEvent<HTMLInputElement>) => void
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
  onPointerDown,
  onPointerEnter,
  onCellClick,
  onCellDoubleClick,
  onTableKeyDown,
  onStartFillDrag,
  onCellChange,
  onCopyCell,
  onPaste,
  onMoveColumn,
  onDeleteRow,
  onCellEditorBlur,
  onCellEditorKeyDown,
}: Props): React.ReactElement {
  return (
    <div
      className={`${layoutTheme.tableScroll} mt-6`}
      tabIndex={0}
      role="region"
      aria-label="スプレッドシートエリア"
      onPaste={onPaste}
      onKeyDown={onTableKeyDown}
      data-testid="interactive-table-shell"
    >
      {rows.length ? (
        <table className="spreadsheet-table">
          <thead>
            <tr>
              <th className="row-number-header" aria-label="行番号">
                #
              </th>
              {columns.map((column, columnIndex) => (
                <th key={column} data-testid="column-header">
                  <div className="flex items-center gap-2">
                    <span data-testid="column-title" className="font-semibold">
                      {column}
                    </span>
                    <ColumnMover
                      column={column}
                      columnIndex={columnIndex}
                      columnCount={columns.length}
                      onMoveColumn={onMoveColumn}
                    />
                  </div>
                </th>
              ))}
              <th aria-label="actions">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`} className="border-t border-slate-200">
                <th
                  scope="row"
                  className="row-number-cell"
                  data-testid={`row-number-${rowIndex}`}
                >
                  {rowIndex + 1}
                </th>
                {columns.map((column, columnIndex) => {
                  const className = deriveCellClassName({
                    activeRange,
                    baseRange: selection,
                    fillPreview,
                    rowIndex,
                    columnIndex,
                  })
                  const isEditing =
                    editingCell?.rowIndex === rowIndex && editingCell?.columnIndex === columnIndex
                  return (
                    <td
                      key={`${column}-${rowIndex}`}
                      className={className}
                      data-testid={`cell-box-${rowIndex}-${column}`}
                      data-selected={
                        activeRange && isCellWithinRange(activeRange, rowIndex, columnIndex)
                          ? 'true'
                          : undefined
                      }
                      onPointerDown={(event) => onPointerDown(event, rowIndex, columnIndex)}
                      onPointerEnter={() => onPointerEnter(rowIndex, columnIndex)}
                      onClick={(event) => onCellClick(event, rowIndex, columnIndex)}
                      onDoubleClick={() => onCellDoubleClick(rowIndex, columnIndex)}
                    >
                      <div className="relative flex items-center gap-1 px-1">
                        {isEditing ? (
                          <input
                            type="text"
                            value={row[column] ?? ''}
                            onChange={(event) => onCellChange(rowIndex, column, event.target.value)}
                            data-testid={`cell-${rowIndex}-${column}`}
                            className="w-full flex-1 border-none bg-transparent px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                            autoFocus
                            onBlur={onCellEditorBlur}
                            onKeyDown={onCellEditorKeyDown}
                            onPointerDown={(event) => event.stopPropagation()}
                            onDoubleClick={(event) => event.stopPropagation()}
                          />
                        ) : (
                          <div
                            className="w-full flex-1 rounded px-2 py-2 text-left text-sm"
                            data-testid={`cell-display-${rowIndex}-${column}`}
                          >
                            {row[column] ?? ''}
                          </div>
                        )}
                        <button
                          type="button"
                          className={copyCellButtonClass}
                          aria-label={`行${rowIndex + 1}列${column}をコピー`}
                          data-testid={`copy-${rowIndex}-${column}`}
                          onClick={() => onCopyCell(row[column] ?? '')}
                          onPointerDown={(event) => event.stopPropagation()}
                        >
                          ⧉
                        </button>
                        {selection &&
                          !isFillDragActive &&
                          rowIndex === selection.endRow &&
                          columnIndex === selection.endCol && (
                            <button
                              type="button"
                              className="fill-handle"
                              aria-label="塗りつぶしハンドル"
                              data-testid="fill-handle"
                              onPointerDown={onStartFillDrag}
                            />
                          )}
                      </div>
                    </td>
                  )
                })}
                <td className="border border-slate-200 text-center">
                  <button
                    type="button"
                    aria-label={`行${rowIndex + 1}を削除`}
                    className="text-xs font-semibold text-red-500 hover:text-red-600"
                    onClick={() => onDeleteRow(rowIndex)}
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-slate-500">
          <p>表示するデータがありません。</p>
          <p>YAMLを読み込むか、行・列を追加して開始してください。</p>
        </div>
      )}
    </div>
  )
}

type ColumnMoverProps = {
  column: string
  columnIndex: number
  columnCount: number
  onMoveColumn: (_columnKey: string, _direction: 'left' | 'right') => void
}

// Function Header: Provides left/right move handles for each column header.
function ColumnMover({
  column,
  columnIndex,
  columnCount,
  onMoveColumn,
}: ColumnMoverProps): React.ReactElement {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className={columnIconButtonClass}
        aria-label={`${column}列を左へ移動`}
        onClick={() => onMoveColumn(column, 'left')}
        disabled={columnIndex === 0}
      >
        ←
      </button>
      <button
        type="button"
        className={columnIconButtonClass}
        aria-label={`${column}列を右へ移動`}
        onClick={() => onMoveColumn(column, 'right')}
        disabled={columnIndex === columnCount - 1}
      >
        →
      </button>
    </div>
  )
}

type CellClassArgs = {
  activeRange: SelectionRange | null
  baseRange: SelectionRange | null
  fillPreview: SelectionRange | null
  rowIndex: number
  columnIndex: number
}

// Function Header: Computes the class list for each table cell.
function deriveCellClassName({
  activeRange,
  baseRange,
  fillPreview,
  rowIndex,
  columnIndex,
}: CellClassArgs): string {
  const inActive = activeRange ? isCellWithinRange(activeRange, rowIndex, columnIndex) : false
  const inBase = baseRange ? isCellWithinRange(baseRange, rowIndex, columnIndex) : false
  const inFillPreview = fillPreview && inActive && !inBase

  return [
    'border border-slate-200',
    inActive ? 'selected-cell' : '',
    inFillPreview ? 'fill-preview-cell' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function isCellWithinRange(
  selection: SelectionRange | null,
  rowIndex: number,
  columnIndex: number,
): boolean {
  if (!selection) {
    return false
  }
  return (
    rowIndex >= selection.startRow &&
    rowIndex <= selection.endRow &&
    columnIndex >= selection.startCol &&
    columnIndex <= selection.endCol
  )
}
