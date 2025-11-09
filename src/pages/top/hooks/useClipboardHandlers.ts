// File Header: Hook bundling spreadsheet clipboard interactions.
import React from 'react'
import type { TableRow } from '../../../services/workbookService'
import type { Notice, SelectionRange, UpdateRows } from '../types'
import {
  createEmptyRow,
  ensureColumnCapacity,
  syncRowsToColumns,
} from '../utils/spreadsheetTableUtils'
import { parseClipboardText, serializeClipboardMatrix } from '../utils/clipboardFormat'

type UseClipboardHandlersParams = {
  columns: string[]
  rows: TableRow[]
  selection: SelectionRange | null
  setColumnOrder: React.Dispatch<React.SetStateAction<string[]>>
  updateRows: UpdateRows
  setNotice: React.Dispatch<React.SetStateAction<Notice | null>>
  setSelection: React.Dispatch<React.SetStateAction<SelectionRange | null>>
  setAnchorCell: React.Dispatch<React.SetStateAction<{ rowIndex: number; columnIndex: number } | null>>
  getSelectionAnchor: () => { rowIndex: number; columnIndex: number }
}

type UseClipboardHandlersResult = {
  handleCopySelection: () => Promise<void>
  handlePaste: (_event: React.ClipboardEvent<HTMLDivElement>) => void
}

// Function Header: Exposes memoized copy and paste handlers for spreadsheet cells.
export const useClipboardHandlers = ({
  columns,
  rows,
  selection,
  setColumnOrder,
  updateRows,
  setNotice,
  setSelection,
  setAnchorCell,
  getSelectionAnchor,
}: UseClipboardHandlersParams): UseClipboardHandlersResult => {
  const handleCopySelection = React.useCallback(
    async (): Promise<void> => {
      if (!navigator.clipboard) {
        setNotice({ text: 'クリップボードAPIが利用できません。', tone: 'error' })
        return
      }

      if (!columns.length || !rows.length) {
        setNotice({ text: 'コピーできるセルがありません。', tone: 'error' })
        return
      }

      const anchor = getSelectionAnchor()
      const activeRange = selection ?? {
        startRow: anchor.rowIndex,
        endRow: anchor.rowIndex,
        startCol: anchor.columnIndex,
        endCol: anchor.columnIndex,
      }

      const maxRowIndex = rows.length - 1
      const maxColIndex = columns.length - 1
      const boundedRange: SelectionRange = {
        startRow: Math.max(0, Math.min(activeRange.startRow, maxRowIndex)),
        endRow: Math.max(0, Math.min(activeRange.endRow, maxRowIndex)),
        startCol: Math.max(0, Math.min(activeRange.startCol, maxColIndex)),
        endCol: Math.max(0, Math.min(activeRange.endCol, maxColIndex)),
      }

      const valueMatrix: string[][] = []
      for (let rowIndex = boundedRange.startRow; rowIndex <= boundedRange.endRow; rowIndex += 1) {
        const sourceRow = rows[rowIndex] ?? {}
        const cellValues: string[] = []
        for (let columnIndex = boundedRange.startCol; columnIndex <= boundedRange.endCol; columnIndex += 1) {
          const columnKey = columns[columnIndex]
          const value = sourceRow[columnKey]
          cellValues.push(value === undefined || value === null ? '' : String(value))
        }
        valueMatrix.push(cellValues)
      }

      try {
        await navigator.clipboard.writeText(serializeClipboardMatrix(valueMatrix))
        setNotice({ text: 'セルの値をコピーしました。', tone: 'success' })
      } catch {
        setNotice({ text: 'セルのコピーに失敗しました。', tone: 'error' })
      }
    },
    [columns, rows, selection, getSelectionAnchor, setNotice],
  )

  const handlePaste = React.useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>): void => {
      const targetNode = event.target as HTMLElement | null
      if (targetNode) {
        const tagName = targetNode.tagName
        if (tagName === 'TEXTAREA' || tagName === 'INPUT' || targetNode.isContentEditable) {
          return
        }
      }
      const text = event.clipboardData?.getData('text/plain') ?? ''
      if (!text.trim()) {
        return
      }
      event.preventDefault()
      const matrix = parseClipboardText(text)
      const hasMeaningfulValue = matrix.some((row) => row.some((value) => value.length > 0))
      if (!hasMeaningfulValue) {
        return
      }
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

  return { handleCopySelection, handlePaste }
}
