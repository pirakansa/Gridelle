// File Header: Custom hook composing spreadsheet data and interaction controllers.
import React from 'react'
import { createCell, type TableRow, type TableSheet } from '../../services/workbookService'
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
  handleMoveSelectedRowsUp: () => void
  handleMoveSelectedRowsDown: () => void
  handleAddColumn: () => void
  handleInsertColumnRightOfSelection: () => void
  handleDeleteSelectedColumns: () => void
  handleMoveSelectedColumnsLeft: () => void
  handleMoveSelectedColumnsRight: () => void
  canMoveSelectedColumnsLeft: boolean
  canMoveSelectedColumnsRight: boolean
  canMoveSelectedRowsUp: boolean
  canMoveSelectedRowsDown: boolean
  handleDeleteSelectedRows: () => void
  handleAddSheet: () => void
    handleDeleteSheet: () => void
  handleRenameSheet: (_name: string) => void
  canDeleteSheet: boolean
  moveColumn: (_columnKey: string, _direction: 'left' | 'right') => void
  applyYamlBuffer: () => void
  handleFileUpload: (_event: React.ChangeEvent<HTMLInputElement>) => void
  handleDownloadYaml: () => void
  handleCopyYaml: () => Promise<void>
  bulkValue: string
  setBulkValue: React.Dispatch<React.SetStateAction<string>>
  applyBulkInput: () => void
  selectionTextColor: string
  selectionBackgroundColor: string
  applySelectionTextColor: (_color: string | null) => void
  applySelectionBackgroundColor: (_color: string | null) => void
  clearSelectionStyles: () => void
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

const createSeedRow = (entries: Record<string, string>): TableRow =>
  Object.fromEntries(Object.entries(entries).map(([key, value]) => [key, createCell(value)]))

const DEFAULT_SHEETS: TableSheet[] = [
  {
    name: 'バックログ',
    rows: [
      createSeedRow({ feature: 'テーブル編集', owner: 'Alice', status: 'READY', effort: '3' }),
      createSeedRow({ feature: 'YAML Export', owner: 'Bob', status: 'REVIEW', effort: '5' }),
      createSeedRow({ feature: 'CSVインポート', owner: 'Carol', status: 'BACKLOG', effort: '2' }),
      createSeedRow({ feature: '権限管理', owner: 'Dave', status: 'DOING', effort: '8' }),
      createSeedRow({ feature: '操作ガイド作成', owner: 'Eve', status: 'DONE', effort: '1' }),
    ],
  },
  {
    name: '完了済み',
    rows: [
      createSeedRow({ feature: 'リリースノート作成', owner: 'Fiona', status: 'DONE', effort: '2' }),
      createSeedRow({ feature: 'QAレビュー', owner: 'George', status: 'DONE', effort: '4' }),
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
    handleDeleteSheet,
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
    selectionTextColor,
    selectionBackgroundColor,
    applySelectionTextColor,
    applySelectionBackgroundColor,
    clearSelectionStyles,
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

  const reselectRowRange = React.useCallback(
    (startIndex: number, endIndex: number) => {
      handleRowNumberClick(startIndex, false)
      if (endIndex > startIndex) {
        handleRowNumberClick(endIndex, true)
      }
    },
    [handleRowNumberClick],
  )

  const reselectColumnRange = React.useCallback(
    (startIndex: number, endIndex: number) => {
      handleColumnHeaderClick(startIndex, false)
      if (endIndex > startIndex) {
        handleColumnHeaderClick(endIndex, true)
      }
    },
    [handleColumnHeaderClick],
  )

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

  const handleMoveSelectedRowsUp = React.useCallback((): void => {
    if (!selection) {
      setNotice({ text: '移動する行を選択してください。', tone: 'error' })
      return
    }
    if (!rows.length) {
      setNotice({ text: '移動できる行がありません。', tone: 'error' })
      return
    }
    const maxIndex = rows.length - 1
    const start = Math.max(0, Math.min(selection.startRow, maxIndex))
    const end = Math.max(0, Math.min(selection.endRow, maxIndex))
    const normalizedStart = Math.min(start, end)
    const normalizedEnd = Math.max(start, end)
    if (normalizedStart === 0) {
      setNotice({ text: 'これ以上上に移動できません。', tone: 'error' })
      return
    }
    const nextRows = [...rows]
    const blockLength = normalizedEnd - normalizedStart + 1
    const block = nextRows.splice(normalizedStart, blockLength)
    nextRows.splice(normalizedStart - 1, 0, ...block)
    updateRows(nextRows)
    reselectRowRange(normalizedStart - 1, normalizedEnd - 1)
    setNotice({ text: '選択行を上へ移動しました。', tone: 'success' })
  }, [selection, rows, updateRows, reselectRowRange, setNotice])

  const handleMoveSelectedRowsDown = React.useCallback((): void => {
    if (!selection) {
      setNotice({ text: '移動する行を選択してください。', tone: 'error' })
      return
    }
    if (!rows.length) {
      setNotice({ text: '移動できる行がありません。', tone: 'error' })
      return
    }
    const maxIndex = rows.length - 1
    const start = Math.max(0, Math.min(selection.startRow, maxIndex))
    const end = Math.max(0, Math.min(selection.endRow, maxIndex))
    const normalizedStart = Math.min(start, end)
    const normalizedEnd = Math.max(start, end)
    if (normalizedEnd >= maxIndex) {
      setNotice({ text: 'これ以上下に移動できません。', tone: 'error' })
      return
    }
    const nextRows = [...rows]
    const blockLength = normalizedEnd - normalizedStart + 1
    const block = nextRows.splice(normalizedStart, blockLength)
    nextRows.splice(normalizedStart + 1, 0, ...block)
    updateRows(nextRows)
    reselectRowRange(normalizedStart + 1, normalizedEnd + 1)
    setNotice({ text: '選択行を下へ移動しました。', tone: 'success' })
  }, [selection, rows, updateRows, reselectRowRange, setNotice])

  const handleInsertColumnRightOfSelection = React.useCallback((): void => {
    if (!selection) {
      setNotice({ text: '挿入する列を選択してください。', tone: 'error' })
      return
    }
    const newColumnKey = generateNextColumnKey(columns)
    const updatedRows = rows.length
      ? rows.map((row) => ({ ...row, [newColumnKey]: row[newColumnKey] ?? createCell('') }))
      : [{ [newColumnKey]: createCell('') }]
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

  const handleMoveSelectedColumnsLeft = React.useCallback((): void => {
    if (!selection) {
      setNotice({ text: '移動する列を選択してください。', tone: 'error' })
      return
    }
    if (!columns.length) {
      setNotice({ text: '移動できる列がありません。', tone: 'error' })
      return
    }
    const start = Math.max(0, Math.min(selection.startCol, columns.length - 1))
    const end = Math.max(0, Math.min(selection.endCol, columns.length - 1))
    const normalizedStart = Math.min(start, end)
    const normalizedEnd = Math.max(start, end)
    if (normalizedStart === 0) {
      setNotice({ text: 'これ以上左に移動できません。', tone: 'error' })
      return
    }
    const nextOrder = [...columns]
    const blockLength = normalizedEnd - normalizedStart + 1
    const block = nextOrder.splice(normalizedStart, blockLength)
    nextOrder.splice(normalizedStart - 1, 0, ...block)
    setColumnOrder(() => nextOrder)
    reselectColumnRange(normalizedStart - 1, normalizedEnd - 1)
    setNotice({ text: '選択列を左へ移動しました。', tone: 'success' })
  }, [selection, columns, setColumnOrder, reselectColumnRange, setNotice])

  const handleMoveSelectedColumnsRight = React.useCallback((): void => {
    if (!selection) {
      setNotice({ text: '移動する列を選択してください。', tone: 'error' })
      return
    }
    if (!columns.length) {
      setNotice({ text: '移動できる列がありません。', tone: 'error' })
      return
    }
    const maxIndex = columns.length - 1
    const start = Math.max(0, Math.min(selection.startCol, maxIndex))
    const end = Math.max(0, Math.min(selection.endCol, maxIndex))
    const normalizedStart = Math.min(start, end)
    const normalizedEnd = Math.max(start, end)
    if (normalizedEnd >= maxIndex) {
      setNotice({ text: 'これ以上右に移動できません。', tone: 'error' })
      return
    }
    const nextOrder = [...columns]
    const blockLength = normalizedEnd - normalizedStart + 1
    const block = nextOrder.splice(normalizedStart, blockLength)
    nextOrder.splice(normalizedStart + 1, 0, ...block)
    setColumnOrder(() => nextOrder)
    reselectColumnRange(normalizedStart + 1, normalizedEnd + 1)
    setNotice({ text: '選択列を右へ移動しました。', tone: 'success' })
  }, [selection, columns, setColumnOrder, reselectColumnRange, setNotice])

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

  const canMoveSelectedRowsUp = Boolean(selection && selection.startRow > 0)
  const canMoveSelectedRowsDown = Boolean(selection && rows.length > 0 && selection.endRow < rows.length - 1)
  const canMoveSelectedColumnsLeft = Boolean(selection && selection.startCol > 0)
  const canMoveSelectedColumnsRight = Boolean(
    selection && columns.length > 0 && selection.endCol < columns.length - 1,
  )

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
    handleMoveSelectedRowsUp,
    handleMoveSelectedRowsDown,
    handleAddColumn,
    handleInsertColumnRightOfSelection,
    handleMoveSelectedColumnsLeft,
    handleMoveSelectedColumnsRight,
    handleDeleteSelectedColumns,
    handleDeleteSelectedRows,
    handleAddSheet,
    handleDeleteSheet,
    handleRenameSheet,
    moveColumn,
    applyYamlBuffer,
    handleFileUpload,
    handleDownloadYaml,
    handleCopyYaml,
    bulkValue,
    setBulkValue,
    applyBulkInput,
    selectionTextColor,
    selectionBackgroundColor,
    applySelectionTextColor,
    applySelectionBackgroundColor,
    clearSelectionStyles,
    handleRowNumberClick,
    handleColumnHeaderClick,
    canMoveSelectedRowsUp,
    canMoveSelectedRowsDown,
    canMoveSelectedColumnsLeft,
    canMoveSelectedColumnsRight,
    canDeleteSheet: sheets.length > 1,
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
