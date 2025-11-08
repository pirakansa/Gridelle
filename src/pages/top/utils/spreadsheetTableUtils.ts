// File Header: Spreadsheet helper utilities for selection and table shape adjustments.
import type { TableRow } from '../../../utils/yamlTable'
import type { CellPosition, SelectionRange } from '../types'

// Function Header: Builds a normalized selection range given two cell positions.
export const buildSelectionRange = (start: CellPosition, end: CellPosition): SelectionRange => ({
  startRow: Math.min(start.rowIndex, end.rowIndex),
  endRow: Math.max(start.rowIndex, end.rowIndex),
  startCol: Math.min(start.columnIndex, end.columnIndex),
  endCol: Math.max(start.columnIndex, end.columnIndex),
})

// Function Header: Converts a selection into a readable summary string.
export const stringifySelection = (selection: SelectionRange | null): string => {
  if (!selection) {
    return 'セルをクリックまたはドラッグして選択'
  }
  const count =
    (selection.endRow - selection.startRow + 1) * (selection.endCol - selection.startCol + 1)
  return `${count}セル選択中 (R${selection.startRow + 1}〜${selection.endRow + 1}, C${
    selection.startCol + 1
  }〜${selection.endCol + 1})`
}

// Function Header: Creates an empty row that satisfies the provided column keys.
export const createEmptyRow = (columnKeys: string[]): TableRow =>
  columnKeys.reduce((acc, key) => {
    acc[key] = ''
    return acc
  }, {} as TableRow)

// Function Header: Ensures columns array has the desired length by appending defaults.
export const ensureColumnCapacity = (columnKeys: string[], targetLength: number): string[] => {
  const nextColumns = [...columnKeys]
  while (nextColumns.length < targetLength) {
    nextColumns.push(`column_${nextColumns.length + 1}`)
  }
  return nextColumns
}

// Function Header: Synchronizes rows so every row has all expected column keys.
export const syncRowsToColumns = (sourceRows: TableRow[], columnKeys: string[]): TableRow[] =>
  sourceRows.map((row) => {
    const nextRow: TableRow = { ...row }
    columnKeys.forEach((key) => {
      if (nextRow[key] === undefined) {
        nextRow[key] = ''
      }
    })
    return nextRow
  })
