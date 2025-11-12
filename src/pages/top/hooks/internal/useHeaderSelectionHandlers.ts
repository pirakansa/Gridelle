// File Header: Exposes handlers for selecting entire rows or columns from headers.
import React from 'react'
import type { CellPosition, SelectionRange } from '../../types'
import type { TableRow } from '../../../../services/workbookService'

type Options = {
  columns: string[]
  rows: TableRow[]
  resetFillState: () => void
  setSelection: React.Dispatch<React.SetStateAction<SelectionRange | null>>
  setAnchorCell: React.Dispatch<React.SetStateAction<CellPosition | null>>
  setIsSelecting: React.Dispatch<React.SetStateAction<boolean>>
  setEditingCell: React.Dispatch<React.SetStateAction<CellPosition | null>>
}

type Result = {
  handleRowNumberClick: (_rowIndex: number, _extend: boolean) => void
  handleColumnHeaderClick: (_columnIndex: number, _extend: boolean) => void
}

// Function Header: Returns memoized handlers for row/column header-based selection changes.
export function useHeaderSelectionHandlers({
  columns,
  rows,
  resetFillState,
  setSelection,
  setAnchorCell,
  setIsSelecting,
  setEditingCell,
}: Options): Result {
  const handleRowNumberClick = React.useCallback(
    (rowIndex: number, extend: boolean): void => {
      if (!columns.length) {
        return
      }
      resetFillState()
      const lastColumnIndex = columns.length - 1
      if (extend) {
        let computedSelection: SelectionRange | null = null
        setSelection((previous) => {
          const base =
            previous ?? {
              startRow: rowIndex,
              endRow: rowIndex,
              startCol: 0,
              endCol: lastColumnIndex,
            }
          const selection: SelectionRange =
            rowIndex < base.startRow
              ? { ...base, startRow: rowIndex }
              : rowIndex > base.endRow
                ? { ...base, endRow: rowIndex }
                : base
          computedSelection = selection
          return selection
        })
        setAnchorCell((previous) => {
          if (previous) {
            return { rowIndex, columnIndex: previous.columnIndex }
          }
          if (computedSelection) {
            return { rowIndex: computedSelection.startRow, columnIndex: computedSelection.startCol }
          }
          return { rowIndex, columnIndex: 0 }
        })
      } else {
        const nextSelection: SelectionRange = {
          startRow: rowIndex,
          endRow: rowIndex,
          startCol: 0,
          endCol: lastColumnIndex,
        }
        setSelection(() => nextSelection)
        setAnchorCell({ rowIndex, columnIndex: 0 })
      }
      setIsSelecting(false)
      setEditingCell(null)
    },
    [columns.length, resetFillState, setSelection, setAnchorCell, setIsSelecting, setEditingCell],
  )

  const handleColumnHeaderClick = React.useCallback(
    (columnIndex: number, extend: boolean): void => {
      if (!rows.length) {
        return
      }
      resetFillState()
      const lastRowIndex = rows.length - 1
      if (extend) {
        let computedSelection: SelectionRange | null = null
        setSelection((previous) => {
          const base =
            previous ?? {
              startRow: 0,
              endRow: lastRowIndex,
              startCol: columnIndex,
              endCol: columnIndex,
            }
          const selection: SelectionRange =
            columnIndex < base.startCol
              ? { ...base, startCol: columnIndex }
              : columnIndex > base.endCol
                ? { ...base, endCol: columnIndex }
                : base
          computedSelection = selection
          return selection
        })
        setAnchorCell((previous) => {
          if (previous) {
            return { rowIndex: Math.min(previous.rowIndex, lastRowIndex), columnIndex }
          }
          if (computedSelection) {
            return { rowIndex: computedSelection.startRow, columnIndex: computedSelection.startCol }
          }
          return { rowIndex: 0, columnIndex }
        })
      } else {
        const nextSelection: SelectionRange = {
          startRow: 0,
          endRow: lastRowIndex,
          startCol: columnIndex,
          endCol: columnIndex,
        }
        setSelection(() => nextSelection)
        setAnchorCell({ rowIndex: 0, columnIndex })
      }
      setIsSelecting(false)
      setEditingCell(null)
    },
    [resetFillState, rows.length, setSelection, setAnchorCell, setIsSelecting, setEditingCell],
  )

  return { handleRowNumberClick, handleColumnHeaderClick }
}
