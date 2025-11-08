// File Header: Hook exposing spreadsheet cell editing helpers.
import React from 'react'
import type { CellPosition } from '../types'

type UseCellEditingHandlersParams = {
  editingCell: CellPosition | null
  setEditingCell: React.Dispatch<React.SetStateAction<CellPosition | null>>
  columnsLength: number
  rowsLength: number
}

type UseCellEditingHandlersResult = {
  handleCellEditorBlur: () => void
  handleCellEditorKeyDown: (_event: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

// Function Header: Supplies blur and key handlers for the spreadsheet cell editor.
export const useCellEditingHandlers = ({
  editingCell,
  setEditingCell,
  columnsLength,
  rowsLength,
}: UseCellEditingHandlersParams): UseCellEditingHandlersResult => {
  const handleCellEditorBlur = React.useCallback((): void => {
    setEditingCell(null)
  }, [setEditingCell])

  const handleCellEditorKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setEditingCell(null)
        return
      }
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        setEditingCell(null)
      }
    },
    [setEditingCell],
  )

  React.useEffect(() => {
    if (!editingCell) {
      return
    }
    if (editingCell.rowIndex >= rowsLength || editingCell.columnIndex >= columnsLength) {
      setEditingCell(null)
    }
  }, [editingCell, rowsLength, columnsLength, setEditingCell])

  return { handleCellEditorBlur, handleCellEditorKeyDown }
}
