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
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null)
  const [viewportHeight, setViewportHeight] = React.useState<number>(0)
  const [scrollTop, setScrollTop] = React.useState<number>(0)
  const wasEditingRef = React.useRef<boolean>(false)

  React.useLayoutEffect(() => {
    const container = scrollContainerRef.current
    if (!container) {
      return undefined
    }
    const updateMetrics = () => {
      setViewportHeight(container.clientHeight)
      setScrollTop(container.scrollTop)
    }
    updateMetrics()
    if (typeof ResizeObserver === 'undefined') {
      return undefined
    }
    const observer = new ResizeObserver(() => updateMetrics())
    observer.observe(container)
    return () => {
      observer.disconnect()
    }
  }, [])

  React.useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) {
      return
    }
    setScrollTop(container.scrollTop)
  }, [rows.length])

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

  const handleScroll = React.useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop)
  }, [])

  return (
    <div
      className={`${layoutTheme.tableScroll} mt-6`}
      id="sheet-workspace"
      tabIndex={0}
      role="region"
      aria-label="スプレッドシートエリア"
      onPaste={onPaste}
      onScroll={handleScroll}
      onKeyDown={onTableKeyDown}
      data-testid="interactive-table-shell"
      ref={scrollContainerRef}
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
          viewportHeight={viewportHeight}
          scrollTop={scrollTop}
        />
      </table>
    </div>
  )
}
