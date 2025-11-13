// File Header: Hook coordinating spreadsheet fill handle interactions.
import React from 'react'
import { cloneRow, createCell, type TableRow } from '../../../services/workbookService'
import { createLocalizedText, type CellPosition, type Notice, type SelectionRange, type UpdateRows } from '../types'
import { createEmptyRow } from '../utils/spreadsheetTableUtils'

export type UseFillControllerParams = {
  columns: string[]
  rows: TableRow[]
  selection: SelectionRange | null
  setSelection: React.Dispatch<React.SetStateAction<SelectionRange | null>>
  setAnchorCell: React.Dispatch<React.SetStateAction<CellPosition | null>>
  setIsSelecting: React.Dispatch<React.SetStateAction<boolean>>
  updateRows: UpdateRows
  setNotice: React.Dispatch<React.SetStateAction<Notice | null>>
}

export type UseFillControllerResult = {
  fillPreview: SelectionRange | null
  isFillDragActive: boolean
  startFillDrag: (_event: React.PointerEvent<HTMLButtonElement>) => void
  resetFillState: () => void
  updateFillPreview: (_rowIndex: number, _columnIndex: number) => void
}

// Function Header: Manages fill preview updates and fill-down application.
export const useFillController = ({
  columns,
  rows,
  selection,
  setSelection,
  setAnchorCell,
  setIsSelecting,
  updateRows,
  setNotice,
}: UseFillControllerParams): UseFillControllerResult => {
  const [fillPreview, setFillPreview] = React.useState<SelectionRange | null>(null)
  const [isFillDragActive, setIsFillDragActive] = React.useState<boolean>(false)
  const columnCount = columns.length

  const resetFillState = React.useCallback((): void => {
    setIsFillDragActive(false)
    setFillPreview(null)
  }, [])

  const applyFill = React.useCallback(
    (targetRange: SelectionRange): void => {
      if (!selection) {
        return
      }
      const extendsRows = targetRange.endRow > selection.endRow
      const extendsCols = targetRange.endCol > selection.endCol
      if (!extendsRows && !extendsCols) {
        return
      }

      const patternRows = rows.slice(selection.startRow, selection.endRow + 1).map((row) => cloneRow(row))
      const patternHeight = Math.max(1, selection.endRow - selection.startRow + 1)
      const patternWidth = Math.max(1, selection.endCol - selection.startCol + 1)
      let nextRows = rows.map((row) => cloneRow(row))

      while (nextRows.length <= targetRange.endRow) {
        nextRows = [...nextRows, createEmptyRow(columns)]
      }

      for (let rowIndex = selection.startRow; rowIndex <= targetRange.endRow; rowIndex += 1) {
        const patternRow =
          patternRows[((rowIndex - selection.startRow) % patternHeight + patternHeight) % patternHeight] ??
          createEmptyRow(columns)
        const baseRow = nextRows[rowIndex] ?? createEmptyRow(columns)
        const updatedRow = cloneRow(baseRow)

        for (let columnIndex = selection.startCol; columnIndex <= targetRange.endCol; columnIndex += 1) {
          if (rowIndex <= selection.endRow && columnIndex <= selection.endCol) {
            continue
          }
          const targetColumnKey = columns[columnIndex]
          if (!targetColumnKey) {
            continue
          }
          const patternColumnIndex =
            selection.startCol +
            ((columnIndex - selection.startCol) % patternWidth + patternWidth) % patternWidth
          const patternColumnKey = columns[patternColumnIndex]
          const sourceCell = patternRow?.[patternColumnKey]
          const nextCell = sourceCell ? { ...sourceCell } : createCell()
          updatedRow[targetColumnKey] = nextCell
        }

        nextRows[rowIndex] = updatedRow
      }

      updateRows(nextRows)
      setSelection((prev) =>
        prev
          ? {
              ...prev,
              endRow: Math.max(prev.endRow, targetRange.endRow),
              endCol: Math.max(prev.endCol, targetRange.endCol),
            }
          : null,
      )
      setAnchorCell((prev) => (prev ? { rowIndex: prev.rowIndex, columnIndex: prev.columnIndex } : null))
      setNotice({
        text: createLocalizedText('フィルを適用しました。', 'Applied the fill operation.'),
        tone: 'success',
      })
    },
    [columns, rows, selection, setSelection, setAnchorCell, updateRows, setNotice],
  )

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const handlePointerUp = () => {
      setIsSelecting(false)
      if (!isFillDragActive) {
        return
      }
      if (
        fillPreview &&
        selection &&
        (fillPreview.endRow > selection.endRow || fillPreview.endCol > selection.endCol)
      ) {
        applyFill(fillPreview)
      }
      resetFillState()
    }
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [applyFill, fillPreview, isFillDragActive, selection, resetFillState, setIsSelecting])

  const startFillDrag = React.useCallback(
    (event: React.PointerEvent<HTMLButtonElement>): void => {
      event.preventDefault()
      event.stopPropagation()
      if (!selection) {
        setNotice({
          text: createLocalizedText('フィル対象のセルを選択してください。', 'Select cells to fill.'),
          tone: 'error',
        })
        return
      }
      setIsFillDragActive(true)
      setFillPreview(selection)
    },
    [selection, setNotice],
  )

  const updateFillPreview = React.useCallback(
    (rowIndex: number, columnIndex: number): void => {
      if (!selection) {
        return
      }
      let nextPreview = selection
      if (rowIndex > selection.endRow) {
        nextPreview = { ...nextPreview, endRow: rowIndex }
      }
      if (columnIndex > selection.endCol) {
        const maxColumnIndex = columnCount - 1
        nextPreview = { ...nextPreview, endCol: Math.min(columnIndex, maxColumnIndex) }
      }
      setFillPreview(nextPreview)
    },
    [columnCount, selection],
  )

  return {
    fillPreview,
    isFillDragActive,
    startFillDrag,
    resetFillState,
    updateFillPreview,
  }
}
