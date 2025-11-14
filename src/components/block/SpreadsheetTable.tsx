// File Header: Spreadsheet-like table rendering selection, fill, and editing interactions.
import React from 'react'
import ReactDataSheet from 'react-datasheet'
import type {
  Cell as DataSheetCell,
  CellRendererProps,
  RowRendererProps,
  Selection as DataSheetSelection,
  SheetRendererProps,
} from 'react-datasheet'
import 'react-datasheet/lib/react-datasheet.css'
import type { EditingCellState, SelectionRange } from '../../pages/top/useSpreadsheetState'
import type { TableCell, TableRow } from '../../services/workbookService'
import { layoutTheme } from '../../utils/Theme'
import TableHead from './table/TableHead'
import EditableCell from './table/EditableCell'
import { useI18n } from '../../utils/i18n'

type SpreadsheetGridCell = DataSheetCell<SpreadsheetGridCell, string> & {
  rowIndex: number
  columnIndex: number
  columnKey: string
  tableCell: TableCell | undefined
}

type Props = {
  rows: TableRow[]
  columns: string[]
  activeRange: SelectionRange | null
  selection: SelectionRange | null
  fillPreview: SelectionRange | null
  isFillDragActive: boolean
  editingCell: EditingCellState | null
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
  availableHeight?: number
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
  availableHeight,
}: Props): React.ReactElement {
  const { select } = useI18n()
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null)
  const wasEditingRef = React.useRef<boolean>(false)
  const tableContainerStyle = React.useMemo<React.CSSProperties | undefined>(() => {
    if (typeof availableHeight !== 'number') {
      return undefined
    }
    return { height: availableHeight }
  }, [availableHeight])

  React.useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) {
      wasEditingRef.current = Boolean(editingCell)
      return
    }
    if (wasEditingRef.current && !editingCell) {
      container.focus({ preventScroll: true })
    }
    wasEditingRef.current = Boolean(editingCell)
  }, [editingCell])

  const focusTableShell = React.useCallback(() => {
    const container = scrollContainerRef.current
    if (container && document.activeElement !== container) {
      container.focus({ preventScroll: true })
    }
  }, [])

  const shouldIgnoreGlobalHotkey = React.useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) {
        return false
      }
      const tagName = target.tagName.toLowerCase()
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
        return true
      }
      if (target.isContentEditable) {
        return true
      }
      const container = scrollContainerRef.current
      if (container && container.contains(target)) {
        return true
      }
      return false
    },
    [],
  )

  React.useEffect(() => {
    if (!selection || editingCell) {
      return undefined
    }
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreGlobalHotkey(event)) {
        return
      }
      onTableKeyDown(event as unknown as React.KeyboardEvent<HTMLDivElement>)
    }
    window.addEventListener('keydown', handleWindowKeyDown)
    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown)
    }
  }, [selection, editingCell, onTableKeyDown, shouldIgnoreGlobalHotkey])

  const handleCellPointerDownWithFocus = React.useCallback(
    (
      event: React.PointerEvent<HTMLTableCellElement>,
      rowIndex: number,
      columnIndex: number,
    ): void => {
      focusTableShell()
      onPointerDown(event, rowIndex, columnIndex)
    },
    [focusTableShell, onPointerDown],
  )

  const dataSheetSelection = React.useMemo<DataSheetSelection | null>(() => {
    if (!selection) {
      return null
    }
    const startRow = Math.min(selection.startRow, selection.endRow)
    const endRow = Math.max(selection.startRow, selection.endRow)
    const startCol = Math.min(selection.startCol, selection.endCol)
    const endCol = Math.max(selection.startCol, selection.endCol)
    return {
      start: { i: startRow, j: startCol },
      end: { i: endRow, j: endCol },
    }
  }, [selection])

  const gridData = React.useMemo<SpreadsheetGridCell[][]>(() => {
    return rows.map((row, rowIndex) =>
      columns.map((columnKey, columnIndex) => ({
        rowIndex,
        columnIndex,
        columnKey,
        tableCell: row[columnKey],
        value: row[columnKey]?.value ?? '',
        readOnly: false,
      })),
    )
  }, [columns, rows])

  const valueRenderer = React.useCallback(
    (cell: SpreadsheetGridCell) => cell.tableCell?.value ?? '',
    [],
  )

  const handleCellsChanged = React.useCallback(
    (changes: { row: number; col: number; value: string | null }[]) => {
      changes.forEach(({ row, col, value }) => {
        const columnKey = columns[col]
        if (typeof columnKey === 'undefined' || row < 0 || row >= rows.length) {
          return
        }
        onCellChange(row, columnKey, value ?? '')
      })
    },
    [columns, onCellChange, rows.length],
  )

  const sheetRenderer = React.useCallback(
    (
      sheetProps: SheetRendererProps<SpreadsheetGridCell>,
    ): React.ReactElement => (
      <table className={`spreadsheet-table ${sheetProps.className ?? ''}`}>
        <TableHead
          columns={columns}
          onColumnHeaderClick={(columnIndex, extend) => {
            focusTableShell()
            onColumnHeaderClick(columnIndex, extend)
          }}
        />
        <tbody>{sheetProps.children}</tbody>
      </table>
    ),
    [columns, focusTableShell, onColumnHeaderClick],
  )

  const rowRenderer = React.useCallback(
    ({ row, children }: RowRendererProps<SpreadsheetGridCell>): React.ReactElement => {
      const isRowSelected = Boolean(
        selection &&
          row >= Math.min(selection.startRow, selection.endRow) &&
          row <= Math.max(selection.startRow, selection.endRow),
      )
      return (
        <tr className="border-t border-slate-200">
          <th
            scope="row"
            className="row-number-cell"
            data-testid={`row-number-${row}`}
            data-selected={isRowSelected ? 'true' : undefined}
          >
            <div className="row-number-content">
              <button
                type="button"
                className="row-number-button"
                aria-label={select(`行${row + 1}を選択`, `Select row ${row + 1}`)}
                onClick={(event) => {
                  focusTableShell()
                  onRowNumberClick(row, event.shiftKey)
                }}
              >
                {row + 1}
              </button>
            </div>
          </th>
          {children}
        </tr>
      )
    },
    [focusTableShell, onRowNumberClick, select, selection],
  )

  const cellRenderer = React.useCallback(
    (
      cellProps: CellRendererProps<SpreadsheetGridCell>,
    ): React.ReactElement => {
      const { cell, className, style, onMouseDown, onMouseOver, onContextMenu, onKeyUp } = cellProps
      return (
        <EditableCell
          column={cell.columnKey}
          columnIndex={cell.columnIndex}
          rowIndex={cell.rowIndex}
          cell={cell.tableCell}
          selection={selection}
          activeRange={activeRange}
          fillPreview={fillPreview}
          isFillDragActive={isFillDragActive}
          editingCell={editingCell}
          onPointerDown={handleCellPointerDownWithFocus}
          onPointerEnter={onPointerEnter}
          onCellClick={onCellClick}
          onCellDoubleClick={onCellDoubleClick}
          onCellChange={onCellChange}
          onStartFillDrag={onStartFillDrag}
          onCellEditorBlur={onCellEditorBlur}
          onCellEditorKeyDown={onCellEditorKeyDown}
          dataGridBindings={{
            className,
            style: style as React.CSSProperties | null,
            onMouseDown: onMouseDown as React.MouseEventHandler<HTMLTableCellElement>,
            onMouseOver: onMouseOver as React.MouseEventHandler<HTMLTableCellElement>,
            onContextMenu: onContextMenu as React.MouseEventHandler<HTMLTableCellElement>,
            onKeyUp: onKeyUp as React.KeyboardEventHandler<HTMLTableCellElement>,
          }}
        />
      )
    },
    [
      activeRange,
      editingCell,
      fillPreview,
      handleCellPointerDownWithFocus,
      isFillDragActive,
      onCellChange,
      onCellDoubleClick,
      onCellEditorBlur,
      onCellEditorKeyDown,
      onCellClick,
      onPointerEnter,
      onStartFillDrag,
      selection,
    ],
  )

  if (!rows.length || !columns.length) {
    return (
      <div
        className={layoutTheme.tableScroll}
        style={tableContainerStyle}
        id="sheet-workspace"
        tabIndex={0}
        role="region"
        aria-label={select('スプレッドシートエリア', 'Spreadsheet workspace')}
        onPaste={onPaste}
        onKeyDown={onTableKeyDown}
        data-testid="interactive-table-shell"
        ref={scrollContainerRef}
      >
        <table className="spreadsheet-table">
          <TableHead
            columns={columns}
            onColumnHeaderClick={(columnIndex, extend) => {
              focusTableShell()
              onColumnHeaderClick(columnIndex, extend)
            }}
          />
          <tbody>
            <tr>
              <td colSpan={columns.length + 1}>
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-slate-500">
                  <p>{select('表示するデータがありません。', 'No data to display yet.')}</p>
                  <p>
                    {select(
                      'YAMLを読み込むか、行・列を追加して開始してください。',
                      'Import YAML or add rows/columns to get started.',
                    )}
                  </p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div
      className={layoutTheme.tableScroll}
      style={tableContainerStyle}
      id="sheet-workspace"
      tabIndex={0}
      role="region"
      aria-label={select('スプレッドシートエリア', 'Spreadsheet workspace')}
      onPaste={onPaste}
      onKeyDown={onTableKeyDown}
      data-testid="interactive-table-shell"
      ref={scrollContainerRef}
    >
      <ReactDataSheet
        data={gridData}
        valueRenderer={valueRenderer}
        dataRenderer={valueRenderer}
        onCellsChanged={handleCellsChanged}
        selected={dataSheetSelection}
        sheetRenderer={sheetRenderer}
        rowRenderer={rowRenderer}
        cellRenderer={cellRenderer}
      />
    </div>
  )
}
