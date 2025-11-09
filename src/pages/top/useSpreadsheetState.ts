// File Header: Custom hook composing spreadsheet data and interaction controllers.
import React from 'react'
import type { TableRow, TableSheet } from '../../services/workbookService'
import { useSpreadsheetDataController } from './hooks/useSpreadsheetDataController'
import { useSpreadsheetInteractionController } from './hooks/useSpreadsheetInteractionController'
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
  newColumnName: string
  setNewColumnName: React.Dispatch<React.SetStateAction<string>>
  handleAddRow: () => void
  handleAddColumn: () => void
  handleDeleteRow: (_rowIndex: number) => void
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
    newColumnName,
    setNewColumnName,
    updateRows,
    handleAddRow,
    handleAddColumn,
    handleDeleteRow,
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
  } = useSpreadsheetInteractionController({
    columns,
    rows,
    bulkValue,
    updateRows,
    setColumnOrder,
    setNotice,
  })

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
    newColumnName,
    setNewColumnName,
    handleAddRow,
    handleAddColumn,
    handleDeleteRow,
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
