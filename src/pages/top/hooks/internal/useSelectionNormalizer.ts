import React from 'react'
import type { SelectionRange } from '../../types'

type UseSelectionNormalizerOptions = {
  selection: SelectionRange | null
  rowsLength: number
  columnsLength: number
  setSelection: (_range: SelectionRange) => void
  clearSelection: () => void
}

export function useSelectionNormalizer({
  selection,
  rowsLength,
  columnsLength,
  setSelection,
  clearSelection,
}: UseSelectionNormalizerOptions): void {
  React.useEffect(() => {
    if (!selection) {
      return
    }
    if (!rowsLength || !columnsLength) {
      clearSelection()
      return
    }

    const maxRow = rowsLength - 1
    const maxCol = columnsLength - 1

    const nextRange: SelectionRange = {
      startRow: Math.min(selection.startRow, maxRow),
      endRow: Math.min(selection.endRow, maxRow),
      startCol: Math.min(selection.startCol, maxCol),
      endCol: Math.min(selection.endCol, maxCol),
    }

    if (
      nextRange.startRow !== selection.startRow ||
      nextRange.endRow !== selection.endRow ||
      nextRange.startCol !== selection.startCol ||
      nextRange.endCol !== selection.endCol
    ) {
      setSelection(nextRange)
    }
  }, [selection, rowsLength, columnsLength, clearSelection, setSelection])
}
