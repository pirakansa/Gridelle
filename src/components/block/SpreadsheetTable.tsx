// File Header: Spreadsheet-like table rendering selection, fill, and editing interactions.
import React from 'react'
import type { EditingCellState, SelectionRange } from '../../pages/top/useSpreadsheetState'
import type { TableRow } from '../../services/workbookService'
import { layoutTheme } from '../../utils/Theme'
import TableHead from './table/TableHead'
import TableBody from './table/TableBody'
import { useI18n } from '../../utils/i18n'

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
  const [viewportHeight, setViewportHeight] = React.useState<number>(0)
  const [scrollTop, setScrollTop] = React.useState<number>(0)
  const wasEditingRef = React.useRef<boolean>(false)
  const tableContainerStyle = React.useMemo<React.CSSProperties | undefined>(() => {
    if (typeof availableHeight !== 'number') {
      return undefined
    }
    return { height: availableHeight }
  }, [availableHeight])

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

  return (
    <div
      className={layoutTheme.tableScroll}
      style={tableContainerStyle}
      id="sheet-workspace"
      tabIndex={0}
      role="region"
      aria-label={select('スプレッドシートエリア', 'Spreadsheet workspace')}
      onPaste={onPaste}
      onScroll={handleScroll}
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
        <TableBody
          rows={rows}
          columns={columns}
          selection={selection}
          activeRange={activeRange}
          fillPreview={fillPreview}
          isFillDragActive={isFillDragActive}
          editingCell={editingCell}
          onRowNumberClick={(rowIndex, extend) => {
            focusTableShell()
            onRowNumberClick(rowIndex, extend)
          }}
          onPointerDown={handleCellPointerDownWithFocus}
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
