import React from 'react'
import type { TableRow } from '../../../../services/workbookService'
import type { Notice, SelectionRange, UpdateRows } from '../../types'

type UseBulkInputOptions = {
  selection: SelectionRange | null
  columns: string[]
  rows: TableRow[]
  bulkValue: string
  updateRows: UpdateRows
  setNotice: React.Dispatch<React.SetStateAction<Notice | null>>
}

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
    const nextRows = rows.map((row, rowIndex) => {
      if (rowIndex < selection.startRow || rowIndex > selection.endRow) {
        return row
      }
      const updatedRow = { ...row }
      targetColumns.forEach((columnKey) => {
        updatedRow[columnKey] = bulkValue
      })
      return updatedRow
    })

    updateRows(nextRows)
    setNotice({ text: '選択セルを一括更新しました。', tone: 'success' })
  }, [bulkValue, columns, rows, selection, setNotice, updateRows])
}
