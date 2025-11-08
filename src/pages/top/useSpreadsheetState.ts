// File Header: Custom hook composing spreadsheet data and interaction controllers.
import React from 'react'
import type { TableRow } from '../../utils/yamlTable'
import { useSpreadsheetDataController } from './hooks/useSpreadsheetDataController'
import { useSpreadsheetInteractionController } from './hooks/useSpreadsheetInteractionController'
import type { CellPosition, Notice, SelectionRange } from './types'

export type { CellPosition, SelectionRange } from './types'

type UseSpreadsheetState = {
  notice: Notice | null
  yamlBuffer: string
  setYamlBuffer: React.Dispatch<React.SetStateAction<string>>
  tableYaml: string
  rows: TableRow[]
  columns: string[]
  newColumnName: string
  setNewColumnName: React.Dispatch<React.SetStateAction<string>>
  handleAddRow: () => void
  handleAddColumn: () => void
  handleDeleteRow: (_rowIndex: number) => void
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
  handleCopyCell: (_value: string) => Promise<void>
  handlePaste: (_event: React.ClipboardEvent<HTMLDivElement>) => void
  isFillDragActive: boolean
  editingCell: CellPosition | null
  handleCellEditorBlur: () => void
  handleCellEditorKeyDown: (_event: React.KeyboardEvent<HTMLInputElement>) => void
}

const DEFAULT_ROWS: TableRow[] = [
  { feature: 'テーブル編集', owner: 'Alice', status: 'READY', effort: '3' },
  { feature: 'YAML Export', owner: 'Bob', status: 'REVIEW', effort: '5' },
  { feature: 'CSVインポート', owner: 'Carol', status: 'BACKLOG', effort: '2' },
  { feature: '権限管理', owner: 'Dave', status: 'DOING', effort: '8' },
  { feature: '操作ガイド作成', owner: 'Eve', status: 'DONE', effort: '1' },
]

// Function Header: Provides high-level spreadsheet state by composing specialized hooks.
export function useSpreadsheetState(): UseSpreadsheetState {
  const {
    notice,
    setNotice,
    yamlBuffer,
    setYamlBuffer,
    tableYaml,
    rows,
    columns,
    setColumnOrder,
    newColumnName,
    setNewColumnName,
    updateRows,
    handleAddRow,
    handleAddColumn,
    handleDeleteRow,
    moveColumn,
    applyYamlBuffer,
    handleFileUpload,
    handleDownloadYaml,
    handleCopyYaml,
    handleCellChange,
  } = useSpreadsheetDataController(DEFAULT_ROWS)

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
    handleCopyCell,
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
    rows,
    columns,
    newColumnName,
    setNewColumnName,
    handleAddRow,
    handleAddColumn,
    handleDeleteRow,
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
    handleCopyCell,
    handlePaste,
    isFillDragActive,
    editingCell,
    handleCellEditorBlur,
    handleCellEditorKeyDown,
  }
}
