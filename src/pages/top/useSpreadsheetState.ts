// File Header: Custom hook composing spreadsheet data and interaction controllers.
import React from 'react'
import type { TableRow, TableSheet } from '../../services/workbookService'
import { useSpreadsheetDataController } from './hooks/useSpreadsheetDataController'
import { useSpreadsheetInteractionController } from './hooks/useSpreadsheetInteractionController'
import { generateNextColumnKey } from './hooks/internal/spreadsheetDataUtils'
import { createEmptyRow } from './utils/spreadsheetTableUtils'
import type { CellPosition, Notice, SelectionRange } from './types'

export type { CellPosition, SelectionRange } from './types'

type UseSpreadsheetState = {
  notice: Notice | null
  yamlBuffer: string
  setYamlBuffer: React.Dispatch<React.SetStateAction<string>>
  tableYaml: string
  sheets: TableSheet[]
  activeSheetIndex: number
  setActiveSheetIndex: React.Dispatch<React.SetStateAction<number>>
  handleSelectSheet: (_index: number) => void
  currentSheetName: string
  rows: TableRow[]
  columns: string[]
  handleAddRow: () => void
  handleInsertRowBelowSelection: () => void
  handleAddColumn: () => void
  handleInsertColumnRightOfSelection: () => void
  handleDeleteSelectedColumns: () => void
  handleDeleteSelectedRows: () => void
  handleAddSheet: () => void
  handleRenameSheet: (_name: string) => void
  moveColumn: (_columnKey: string, _direction: 'left' | 'right') => void
  applyYamlBuffer: () => void
  handleFileUpload: (_event: React.ChangeEvent<HTMLInputElement>) => void
  handleDownloadYaml: () => void
  handleCopyYaml: () => Promise<void>
  bulkValue: string
  setBulkValue: React.Dispatch<React.SetStateAction<string>>
  applyBulkInput: () => void
  handleRowNumberClick: (_rowIndex: number, _extend: boolean) => void
  handleColumnHeaderClick: (_columnIndex: number, _extend: boolean) => void
  selection: SelectionRange | null
  activeRange: SelectionRange | null
  selectionSummary: string
  fillPreview: SelectionRange | null
  clearSelection: () => void
  handleCellPointerDown: (
    _event: React.PointerEvent<HTMLTableCellElement>,
    _rowIndex: number,
    _columnIndex: number,
  ) => void
  handleCellPointerEnter: (_rowIndex: number, _columnIndex: number) => void
  handleCellClick: (
    _event: React.MouseEvent<HTMLTableCellElement>,
    _rowIndex: number,
    _columnIndex: number,
  ) => void
  handleCellDoubleClick: (_rowIndex: number, _columnIndex: number) => void
  handleTableKeyDown: (_event: React.KeyboardEvent<HTMLDivElement>) => void
  startFillDrag: (_event: React.PointerEvent<HTMLButtonElement>) => void
  handleCellChange: (_rowIndex: number, _column: string, _value: string) => void
  handlePaste: (_event: React.ClipboardEvent<HTMLDivElement>) => void
  isFillDragActive: boolean
  editingCell: CellPosition | null
  handleCellEditorBlur: () => void
  handleCellEditorKeyDown: (_event: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

const DEFAULT_SHEETS: TableSheet[] = [
  {
    name: 'バックログ',
    rows: [
      { feature: 'テーブル編集', owner: 'Alice', status: 'READY', effort: '3' },
      { feature: 'YAML Export', owner: 'Bob', status: 'REVIEW', effort: '5' },
      { feature: 'CSVインポート', owner: 'Carol', status: 'BACKLOG', effort: '2' },
      { feature: '権限管理', owner: 'Dave', status: 'DOING', effort: '8' },
      { feature: '操作ガイド作成', owner: 'Eve', status: 'DONE', effort: '1' },
    ],
  },
  {
    name: '完了済み',
    rows: [
      { feature: 'リリースノート作成', owner: 'Fiona', status: 'DONE', effort: '2' },
      { feature: 'QAレビュー', owner: 'George', status: 'DONE', effort: '4' },
    ],
  },
]

// Function Header: Provides high-level spreadsheet state by composing specialized hooks.
export function useSpreadsheetState(): UseSpreadsheetState {
  const {
    notice,
    setNotice,
    yamlBuffer,
    setYamlBuffer,
    tableYaml,
    sheets,
    activeSheetIndex,
    setActiveSheetIndex,
    rows,
    columns,
    setColumnOrder,
    updateRows,
    handleAddRow,
    handleAddColumn,
    handleAddSheet,
    handleRenameSheet,
    moveColumn,
    applyYamlBuffer,
    handleFileUpload,
    handleDownloadYaml,
    handleCopyYaml,
    handleCellChange,
  } = useSpreadsheetDataController(DEFAULT_SHEETS)

  const [bulkValue, setBulkValue] = React.useState<string>('')

  const {
    selection,
    activeRange,
    fillPreview,
    selectionSummary,
    isFillDragActive,
    editingCell,
    clearSelection,
    applyBulkInput,
    handleCellPointerDown,
    handleCellPointerEnter,
    handleCellClick,
    handleCellDoubleClick,
    handleTableKeyDown,
    startFillDrag,
    handlePaste,
    handleCellEditorBlur,
    handleCellEditorKeyDown,
    handleRowNumberClick,
    handleColumnHeaderClick,
  } = useSpreadsheetInteractionController({
    columns,
    rows,
    bulkValue,
    updateRows,
    setColumnOrder,
    setNotice,
  })

  const handleInsertRowBelowSelection = React.useCallback((): void => {
    if (!selection) {
      setNotice({ text: '挿入する行を選択してください。', tone: 'error' })
      return
    }
    const baseColumns = columns.length ? columns : ['column_1']
    const newRow = createEmptyRow(baseColumns)
    if (!rows.length) {
      updateRows([newRow])
      setNotice({ text: '行を追加しました。', tone: 'success' })
      return
    }
    const maxIndex = rows.length - 1
    const insertAfter = Math.min(Math.max(selection.endRow, 0), maxIndex)
    const insertIndex = insertAfter + 1
    const nextRows = insertIndex >= rows.length
      ? [...rows, newRow]
      : [...rows.slice(0, insertIndex), newRow, ...rows.slice(insertIndex)]
    updateRows(nextRows)
    setNotice({ text: '選択行の下に行を追加しました。', tone: 'success' })
  }, [selection, columns, rows, updateRows, setNotice])

  const handleInsertColumnRightOfSelection = React.useCallback((): void => {
    if (!selection) {
      setNotice({ text: '挿入する列を選択してください。', tone: 'error' })
      return
    }
    const newColumnKey = generateNextColumnKey(columns)
    const updatedRows = rows.length
      ? rows.map((row) => ({ ...row, [newColumnKey]: row[newColumnKey] ?? '' }))
      : [{ [newColumnKey]: '' }]
    const insertAfter = columns.length ? Math.min(Math.max(selection.endCol, 0), columns.length - 1) : -1
    const insertIndex = insertAfter + 1
    updateRows(updatedRows)
    setColumnOrder((currentOrder) => {
      const baseOrder = currentOrder.length ? currentOrder : columns
      if (!baseOrder.length) {
        return [newColumnKey]
      }
      const filtered = baseOrder.filter((key) => key !== newColumnKey)
      const targetIndex = Math.min(insertIndex, filtered.length)
      filtered.splice(targetIndex, 0, newColumnKey)
      return filtered
    })
    setNotice({ text: `列「${newColumnKey}」を選択列の右に追加しました。`, tone: 'success' })
  }, [selection, columns, rows, updateRows, setColumnOrder, setNotice])

  const handleDeleteSelectedColumns = React.useCallback((): void => {
    if (!selection) {
      setNotice({ text: '削除する列を選択してください。', tone: 'error' })
      return
    }
    if (!columns.length) {
      setNotice({ text: '削除できる列がありません。', tone: 'error' })
      return
    }
    const maxIndex = columns.length - 1
    const start = Math.max(0, Math.min(selection.startCol, maxIndex))
    const end = Math.max(0, Math.min(selection.endCol, maxIndex))
    const normalizedStart = Math.min(start, end)
    const normalizedEnd = Math.max(start, end)
    const targetColumns = columns.slice(normalizedStart, normalizedEnd + 1)
    if (!targetColumns.length) {
      setNotice({ text: '削除できる列が見つかりません。', tone: 'error' })
      return
    }
    const targetColumnSet = new Set(targetColumns)
    const remainingColumns = columns.filter((key) => !targetColumnSet.has(key))
    const nextRows = remainingColumns.length
      ? rows.map((row) => {
          const nextRow = { ...row }
          targetColumns.forEach((key) => {
            delete nextRow[key]
          })
          return nextRow
        })
      : []
    updateRows(nextRows)
    setColumnOrder(() => remainingColumns)
    clearSelection()
    const message = remainingColumns.length
      ? `${targetColumns.length}列を削除しました。`
      : 'すべての列を削除しました。'
    setNotice({ text: message, tone: 'success' })
  }, [selection, columns, rows, updateRows, setColumnOrder, clearSelection, setNotice])

  const handleDeleteSelectedRows = React.useCallback((): void => {
    if (!selection) {
      setNotice({ text: '削除する行を選択してください。', tone: 'error' })
      return
    }
    if (!rows.length) {
      setNotice({ text: '削除できる行がありません。', tone: 'error' })
      return
    }
    const maxIndex = rows.length - 1
    const start = Math.max(0, Math.min(selection.startRow, maxIndex))
    const end = Math.max(0, Math.min(selection.endRow, maxIndex))
    const normalizedStart = Math.min(start, end)
    const normalizedEnd = Math.max(start, end)
    const nextRows = rows.filter((_, index) => index < normalizedStart || index > normalizedEnd)
    updateRows(nextRows)
    clearSelection()
    const removedCount = normalizedEnd - normalizedStart + 1
    setNotice({ text: `${removedCount}行を削除しました。`, tone: 'success' })
  }, [selection, rows, updateRows, clearSelection, setNotice])

  return {
    notice,
    yamlBuffer,
    setYamlBuffer,
    tableYaml,
    sheets,
    activeSheetIndex,
    setActiveSheetIndex,
    handleSelectSheet: (index: number) => {
      clearSelection()
      setActiveSheetIndex(index)
    },
    currentSheetName: sheets[activeSheetIndex]?.name ?? '',
    rows,
    columns,
    handleAddRow,
    handleInsertRowBelowSelection,
    handleAddColumn,
    handleInsertColumnRightOfSelection,
    handleDeleteSelectedColumns,
    handleDeleteSelectedRows,
    handleAddSheet,
    handleRenameSheet,
    moveColumn,
    applyYamlBuffer,
    handleFileUpload,
    handleDownloadYaml,
    handleCopyYaml,
    bulkValue,
    setBulkValue,
    applyBulkInput,
    handleRowNumberClick,
    handleColumnHeaderClick,
    selection,
    activeRange,
    fillPreview,
    selectionSummary,
    clearSelection,
    handleCellPointerDown,
    handleCellPointerEnter,
    handleCellClick,
    handleCellDoubleClick,
    handleTableKeyDown,
    startFillDrag,
    handleCellChange,
    handlePaste,
    isFillDragActive,
    editingCell,
    handleCellEditorBlur,
    handleCellEditorKeyDown,
  }
}
