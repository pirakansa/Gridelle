// File Header: Hook bundling spreadsheet clipboard interactions.
import React from 'react'
import type { TableRow } from '../../../utils/yamlTable'
import type { Notice, SelectionRange, UpdateRows } from '../types'
import {
  createEmptyRow,
  ensureColumnCapacity,
  syncRowsToColumns,
} from '../utils/spreadsheetTableUtils'

type UseClipboardHandlersParams = {
  columns: string[]
  rows: TableRow[]
  setColumnOrder: React.Dispatch<React.SetStateAction<string[]>>
  updateRows: UpdateRows
  setNotice: React.Dispatch<React.SetStateAction<Notice | null>>
  setSelection: React.Dispatch<React.SetStateAction<SelectionRange | null>>
  setAnchorCell: React.Dispatch<React.SetStateAction<{ rowIndex: number; columnIndex: number } | null>>
  getSelectionAnchor: () => { rowIndex: number; columnIndex: number }
}

type UseClipboardHandlersResult = {
  handleCopyCell: (_value: string) => Promise<void>
  handlePaste: (_event: React.ClipboardEvent<HTMLDivElement>) => void
}

// Function Header: Exposes memoized copy and paste handlers for spreadsheet cells.
export const useClipboardHandlers = ({
  columns,
  rows,
  setColumnOrder,
  updateRows,
  setNotice,
  setSelection,
  setAnchorCell,
  getSelectionAnchor,
}: UseClipboardHandlersParams): UseClipboardHandlersResult => {
  const handleCopyCell = React.useCallback(
    async (value: string): Promise<void> => {
      if (!navigator.clipboard) {
        setNotice({ text: 'クリップボードAPIが利用できません。', tone: 'error' })
        return
      }

      try {
        await navigator.clipboard.writeText(value ?? '')
        setNotice({ text: 'セルの値をコピーしました。', tone: 'success' })
      } catch {
        setNotice({ text: 'セルのコピーに失敗しました。', tone: 'error' })
      }
    },
    [setNotice],
  )

  const handlePaste = React.useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>): void => {
      const text = event.clipboardData?.getData('text/plain') ?? ''
      if (!text.trim()) {
        return
      }
      event.preventDefault()
      const normalized = text.replace(/\r/g, '')
      const lines = normalized.split('\n')
      const trimmedLines =
        lines[lines.length - 1] === '' ? lines.slice(0, lines.length - 1) : lines.slice()
      const matrix = trimmedLines
        .filter((line, index) => !(line === '' && index === trimmedLines.length - 1))
        .map((line) => line.split('\t'))
      if (!matrix.length) {
        return
      }
      const start = getSelectionAnchor()
      const widths = matrix.map((row) => (row.length ? row.length : 1))
      const requiredRows = start.rowIndex + matrix.length
      const requiredColumns = start.columnIndex + Math.max(...widths)

      let nextColumns = ensureColumnCapacity(columns, requiredColumns)
      let nextRows = syncRowsToColumns(rows, nextColumns)
      while (nextRows.length < requiredRows) {
        nextRows = [...nextRows, createEmptyRow(nextColumns)]
      }

      matrix.forEach((rowValues, rowOffset) => {
        const targetRowIndex = start.rowIndex + rowOffset
        const updatedRow = { ...nextRows[targetRowIndex] }
        rowValues.forEach((value, columnOffset) => {
          const targetColumnIndex = start.columnIndex + columnOffset
          const columnKey = nextColumns[targetColumnIndex]
          updatedRow[columnKey] = value
        })
        nextRows[targetRowIndex] = updatedRow
      })

      setColumnOrder(nextColumns)
      updateRows(nextRows)
      const endRow = start.rowIndex + matrix.length - 1
      const endCol = start.columnIndex + Math.max(...widths) - 1
      setSelection({
        startRow: start.rowIndex,
        endRow,
        startCol: start.columnIndex,
        endCol,
      })
      setAnchorCell({ rowIndex: start.rowIndex, columnIndex: start.columnIndex })
      setNotice({ text: '貼り付けを適用しました。', tone: 'success' })
    },
    [columns, rows, getSelectionAnchor, setColumnOrder, updateRows, setNotice, setSelection, setAnchorCell],
  )

  return { handleCopyCell, handlePaste }
}
