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
  viewportHeight: number
  scrollTop: number
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
  viewportHeight,
  scrollTop,
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

  const VIRTUALIZATION_THRESHOLD = 200
  const DEFAULT_ROW_HEIGHT = 36
  const OVERSCAN_ROWS = 10

  const [rowHeight, setRowHeight] = React.useState<number>(DEFAULT_ROW_HEIGHT)
  const measurementRowRef = React.useRef<HTMLTableRowElement | null>(null)

  const virtualizationEnabled = rows.length > VIRTUALIZATION_THRESHOLD && viewportHeight > 0

  const { startIndex, endIndex, topPaddingHeight, bottomPaddingHeight } = React.useMemo(() => {
    if (!virtualizationEnabled) {
      return {
        startIndex: 0,
        endIndex: rows.length,
        topPaddingHeight: 0,
        bottomPaddingHeight: 0,
      }
    }
    const safeRowHeight = Math.max(1, rowHeight || DEFAULT_ROW_HEIGHT)
    const rawStart = Math.floor(scrollTop / safeRowHeight) - OVERSCAN_ROWS
    const clampedStart = Math.max(0, rawStart)
    const visibleCapacity = Math.ceil(viewportHeight / safeRowHeight) + OVERSCAN_ROWS * 2
    const rawEnd = clampedStart + visibleCapacity
    const clampedEnd = Math.min(rows.length, rawEnd)
    const topPadding = clampedStart * safeRowHeight
    const bottomPadding = Math.max(0, (rows.length - clampedEnd) * safeRowHeight)
    return {
      startIndex: clampedStart,
      endIndex: clampedEnd,
      topPaddingHeight: topPadding,
      bottomPaddingHeight: bottomPadding,
    }
  }, [virtualizationEnabled, rows.length, rowHeight, scrollTop, viewportHeight])

  const visibleRows = React.useMemo(() => rows.slice(startIndex, endIndex), [rows, startIndex, endIndex])

  const handleMeasurementRef = React.useCallback(
    (node: HTMLTableRowElement | null) => {
      measurementRowRef.current = node
      if (!node) {
        return
      }
      const measured = node.getBoundingClientRect().height
      if (measured && Math.abs(measured - rowHeight) > 1) {
        setRowHeight(measured)
      }
    },
    [rowHeight],
  )

  React.useLayoutEffect(() => {
    if (!measurementRowRef.current) {
      return
    }
    const measured = measurementRowRef.current.getBoundingClientRect().height
    if (measured && Math.abs(measured - rowHeight) > 1) {
      setRowHeight(measured)
    }
  }, [columns.length, rowHeight, visibleRows.length])

  return (
    <tbody>
      {virtualizationEnabled && topPaddingHeight > 0 ? (
        <tr aria-hidden="true" style={{ height: topPaddingHeight }}>
          <td colSpan={columns.length + 1} style={{ padding: 0, border: 'none' }} />
        </tr>
      ) : null}
      {visibleRows.map((row, offsetIndex) => {
        const actualRowIndex = startIndex + offsetIndex
        const ref = offsetIndex === 0 ? handleMeasurementRef : undefined
        return (
          <TableRow
            key={`row-${actualRowIndex}`}
            ref={ref}
            row={row}
            rowIndex={actualRowIndex}
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
        )
      })}
      {virtualizationEnabled && bottomPaddingHeight > 0 ? (
        <tr aria-hidden="true" style={{ height: bottomPaddingHeight }}>
          <td colSpan={columns.length + 1} style={{ padding: 0, border: 'none' }} />
        </tr>
      ) : null}
    </tbody>
  )
}
