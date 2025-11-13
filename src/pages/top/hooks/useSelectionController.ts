// File Header: Hook managing spreadsheet selection and anchor state.
import React from 'react'
import { buildSelectionRange } from '../utils/spreadsheetTableUtils'
import type { CellPosition, EditingCellState, SelectionRange } from '../types'

export type SelectionController = {
  selection: SelectionRange | null
  setSelection: React.Dispatch<React.SetStateAction<SelectionRange | null>>
  anchorCell: CellPosition | null
  setAnchorCell: React.Dispatch<React.SetStateAction<CellPosition | null>>
  isSelecting: boolean
  setIsSelecting: React.Dispatch<React.SetStateAction<boolean>>
  editingCell: EditingCellState | null
  setEditingCell: React.Dispatch<React.SetStateAction<EditingCellState | null>>
  getSelectionAnchor: () => CellPosition
  beginSelection: (_position: CellPosition, _preserveAnchor?: boolean) => void
  extendSelection: (_position: CellPosition) => void
  clearSelectionState: () => void
}

// Function Header: Provides anchor-aware selection state for spreadsheet interactions.
export const useSelectionController = (): SelectionController => {
  const [selection, setSelection] = React.useState<SelectionRange | null>(null)
  const [anchorCell, setAnchorCell] = React.useState<CellPosition | null>(null)
  const [isSelecting, setIsSelecting] = React.useState<boolean>(false)
  const [editingCell, setEditingCell] = React.useState<EditingCellState | null>(null)

  const getSelectionAnchor = React.useCallback((): CellPosition => {
    if (anchorCell) {
      return anchorCell
    }
    if (selection) {
      return { rowIndex: selection.startRow, columnIndex: selection.startCol }
    }
    return { rowIndex: 0, columnIndex: 0 }
  }, [anchorCell, selection])

  const clearSelectionState = React.useCallback((): void => {
    setSelection(null)
    setAnchorCell(null)
    setIsSelecting(false)
    setEditingCell(null)
  }, [])

  const beginSelection = React.useCallback(
    (position: CellPosition, preserveAnchor = false): void => {
      setEditingCell(null)
      const baseAnchor = preserveAnchor ? getSelectionAnchor() : position
      setAnchorCell(baseAnchor)
      setSelection(buildSelectionRange(baseAnchor, position))
      setIsSelecting(true)
    },
    [getSelectionAnchor],
  )

  const extendSelection = React.useCallback(
    (position: CellPosition): void => {
      const base = anchorCell ?? getSelectionAnchor()
      setSelection(buildSelectionRange(base, position))
    },
    [anchorCell, getSelectionAnchor],
  )

  return {
    selection,
    setSelection,
    anchorCell,
    setAnchorCell,
    isSelecting,
    setIsSelecting,
    editingCell,
    setEditingCell,
    getSelectionAnchor,
    beginSelection,
    extendSelection,
    clearSelectionState,
  }
}
