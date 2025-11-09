// File Header: Applies bulk input values across the currently selected spreadsheet range.
import React from 'react'
import type { TableRow } from '../../../../services/workbookService'
import type { Notice, SelectionRange, UpdateRows } from '../../types'
import { parseClipboardText } from '../../utils/clipboardFormat'

type UseBulkInputOptions = {
  selection: SelectionRange | null
  columns: string[]
  rows: TableRow[]
  bulkValue: string
  updateRows: UpdateRows
  setNotice: React.Dispatch<React.SetStateAction<Notice | null>>
}

// Function Header: Returns a memoized handler that applies the bulk input buffer to the selection.
export function useBulkInput({
  selection,
  columns,
  rows,
  bulkValue,
  updateRows,
  setNotice,
}: UseBulkInputOptions): () => void {
  return React.useCallback((): void => {
    if (!selection) {
      setNotice({ text: '一括入力するセルを選択してください。', tone: 'error' })
      return
    }

    const targetColumns = columns.slice(selection.startCol, selection.endCol + 1)

    const selectionRowCount = selection.endRow - selection.startRow + 1
    const selectionColCount = targetColumns.length
    const isSingleCellSelection = selectionRowCount === 1 && selectionColCount === 1

    const parsedMatrixSource = bulkValue.length ? parseClipboardText(bulkValue) : []
    const parsedMatrix = (parsedMatrixSource.length ? parsedMatrixSource : [[bulkValue]]).map((rowValues) =>
      rowValues.length ? rowValues : ['']
    )
    const matrixRowCount = parsedMatrix.length
    const matrixHasMultipleColumns = parsedMatrix.some((row) => row.length > 1)
    const hasExplicitTab = bulkValue.includes('\t')

    const shouldBroadcastLiteral =
      !isSingleCellSelection &&
      !matrixHasMultipleColumns &&
      !hasExplicitTab &&
      (selectionColCount > 1 || matrixRowCount !== selectionRowCount)

    const nextRows = rows.map((row, rowIndex) => {
      if (rowIndex < selection.startRow || rowIndex > selection.endRow) {
        return row
      }
      const updatedRow = { ...row }
      if (isSingleCellSelection) {
        updatedRow[targetColumns[0]] = bulkValue
        return updatedRow
      }

      if (shouldBroadcastLiteral) {
        targetColumns.forEach((columnKey) => {
          updatedRow[columnKey] = bulkValue
        })
        return updatedRow
      }

      const rowOffset = rowIndex - selection.startRow
      const sourceRow = parsedMatrix[Math.min(rowOffset, parsedMatrix.length - 1)] ?? ['']
      targetColumns.forEach((columnKey, columnOffset) => {
        const sourceValue = sourceRow[Math.min(columnOffset, sourceRow.length - 1)] ?? ''
        updatedRow[columnKey] = sourceValue
      })
      return updatedRow
    })

    updateRows(nextRows)
    setNotice({ text: '選択セルを一括更新しました。', tone: 'success' })
  }, [bulkValue, columns, rows, selection, setNotice, updateRows])
}
