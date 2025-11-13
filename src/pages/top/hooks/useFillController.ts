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
  updateFillPreview: (_rowIndex: number) => void
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

  const resetFillState = React.useCallback((): void => {
    setIsFillDragActive(false)
    setFillPreview(null)
  }, [])

  const applyFillDown = React.useCallback(
    (targetEndRow: number): void => {
      if (!selection || targetEndRow <= selection.endRow) {
        return
      }

      const columnKeys = columns.slice(selection.startCol, selection.endCol + 1)
      const patternRows = rows.slice(selection.startRow, selection.endRow + 1).map((row) => cloneRow(row))
      let nextRows = rows.map((row) => cloneRow(row))
      while (nextRows.length <= targetEndRow) {
        nextRows = [...nextRows, createEmptyRow(columns)]
      }

      for (let rowIndex = selection.endRow + 1; rowIndex <= targetEndRow; rowIndex += 1) {
        const patternRow =
          patternRows[((rowIndex - selection.startRow) % patternRows.length + patternRows.length) % patternRows.length]
        const updatedRow = cloneRow(nextRows[rowIndex])
        columnKeys.forEach((columnKey) => {
          const sourceCell = patternRow[columnKey]
          const nextCell = sourceCell ? { ...sourceCell } : createCell()
          updatedRow[columnKey] = nextCell
        })
        nextRows[rowIndex] = updatedRow
      }

      updateRows(nextRows)
      setSelection((prev) =>
        prev
          ? {
              ...prev,
              endRow: targetEndRow,
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
      if (fillPreview && selection && fillPreview.endRow > selection.endRow) {
        applyFillDown(fillPreview.endRow)
      }
      resetFillState()
    }
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [applyFillDown, fillPreview, isFillDragActive, selection, resetFillState, setIsSelecting])

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
    (rowIndex: number): void => {
      if (!selection) {
        return
      }
      if (rowIndex > selection.endRow) {
        setFillPreview({ ...selection, endRow: rowIndex })
      } else {
        setFillPreview(selection)
      }
    },
    [selection],
  )

  return {
    fillPreview,
    isFillDragActive,
    startFillDrag,
    resetFillState,
    updateFillPreview,
  }
}
