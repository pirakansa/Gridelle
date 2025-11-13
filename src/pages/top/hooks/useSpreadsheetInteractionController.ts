// File Header: Hook encapsulating selection, fill, clipboard, and editing interactions.
import React from 'react'
import { type TableRow, type CellFunctionConfig } from '../../../services/workbookService'
import type { CellPosition, EditingCellState, Notice, SelectionRange, UpdateRows } from '../types'
import { stringifySelection } from '../utils/spreadsheetTableUtils'
import { useClipboardHandlers } from './useClipboardHandlers'
import { useCellEditingHandlers } from './useCellEditingHandlers'
import { useFillController } from './useFillController'
import { useSelectionController } from './useSelectionController'
import { useBulkInput } from './internal/useBulkInput'
import { useKeyboardShortcuts } from './internal/useKeyboardShortcuts'
import { useSelectionNormalizer } from './internal/useSelectionNormalizer'
import { useSelectionStyling } from './internal/useSelectionStyling'
import { useHeaderSelectionHandlers } from './internal/useHeaderSelectionHandlers'
import { useI18n } from '../../../utils/i18n'
import { summarizeCellFunction } from '../utils/cellFunctionSummary'

type UseSpreadsheetInteractionControllerParams = {
  columns: string[]
  rows: TableRow[]
  bulkValue: string
  updateRows: UpdateRows
  setColumnOrder: React.Dispatch<React.SetStateAction<string[]>>
  setNotice: React.Dispatch<React.SetStateAction<Notice | null>>
}

type UseSpreadsheetInteractionController = {
  selection: SelectionRange | null
  activeRange: SelectionRange | null
  fillPreview: SelectionRange | null
  selectionSummary: string
  selectionFunctionSummary: string
  isFillDragActive: boolean
  editingCell: EditingCellState | null
  clearSelection: () => void
  applyBulkInput: () => void
  selectionTextColor: string
  selectionBackgroundColor: string
  applySelectionTextColor: (_color: string | null) => void
  applySelectionBackgroundColor: (_color: string | null) => void
  clearSelectionStyles: () => void
  applySelectionFunction: (_config: CellFunctionConfig | null) => void
  handleRowNumberClick: (_rowIndex: number, _extend: boolean) => void
  handleColumnHeaderClick: (_columnIndex: number, _extend: boolean) => void
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
  handlePaste: (_event: React.ClipboardEvent<HTMLDivElement>) => void
  handleCellEditorBlur: () => void
  handleCellEditorKeyDown: (_event: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

// Function Header: Orchestrates selection state and spreadsheet interaction handlers.
export const useSpreadsheetInteractionController = ({
  columns,
  rows,
  bulkValue,
  updateRows,
  setColumnOrder,
  setNotice,
}: UseSpreadsheetInteractionControllerParams): UseSpreadsheetInteractionController => {
  const { select } = useI18n()
  const {
    selection,
    setSelection,
    setAnchorCell,
    isSelecting,
    setIsSelecting,
    editingCell,
    setEditingCell,
    getSelectionAnchor,
    beginSelection,
    extendSelection,
    clearSelectionState,
  } = useSelectionController()

  const { fillPreview, isFillDragActive, startFillDrag, resetFillState, updateFillPreview } = useFillController({
    columns,
    rows,
    selection,
    setSelection,
    setAnchorCell,
    setIsSelecting,
    updateRows,
    setNotice,
  })

  const clearSelection = React.useCallback((): void => {
    resetFillState()
    clearSelectionState()
  }, [clearSelectionState, resetFillState])

  const beginSelectionWithReset = React.useCallback(
    (position: CellPosition, preserveAnchor = false): void => {
      resetFillState()
      beginSelection(position, preserveAnchor)
    },
    [beginSelection, resetFillState],
  )

  const applyBulkInput = useBulkInput({
    selection,
    columns,
    rows,
    bulkValue,
    updateRows,
    setNotice,
  })
  const {
    applySelectionTextColor,
    applySelectionBackgroundColor,
    clearSelectionStyles,
    applySelectionFunction,
  } = useSelectionStyling({
    selection,
    columns,
    rows,
    updateRows,
    setNotice,
  })

  useSelectionNormalizer({
    selection,
    rowsLength: rows.length,
    columnsLength: columns.length,
    setSelection,
    clearSelection,
  })

  const { handleRowNumberClick, handleColumnHeaderClick } = useHeaderSelectionHandlers({
    columns,
    rows,
    resetFillState,
    setSelection,
    setAnchorCell,
    setIsSelecting,
    setEditingCell,
  })

  const handleEditingCommit = React.useCallback(
    (cell: EditingCellState): void => {
      if (!rows.length || !columns.length) {
        return
      }
      const maxRowIndex = rows.length - 1
      const maxColIndex = columns.length - 1
      const targetRowIndex = Math.min(cell.rowIndex + 1, maxRowIndex)
      const targetColumnIndex = Math.min(cell.columnIndex, maxColIndex)
      beginSelectionWithReset({ rowIndex: targetRowIndex, columnIndex: targetColumnIndex })
      setIsSelecting(false)
    },
    [beginSelectionWithReset, columns.length, rows.length, setIsSelecting],
  )

  const handleCellPointerDown = React.useCallback(
    (
      event: React.PointerEvent<HTMLTableCellElement>,
      rowIndex: number,
      columnIndex: number,
    ): void => {
      if (isFillDragActive || event.button !== 0) {
        return
      }
      const cellPosition: CellPosition = { rowIndex, columnIndex }
      if (event.shiftKey) {
        beginSelectionWithReset(cellPosition, true)
        return
      }
      beginSelectionWithReset(cellPosition)
    },
    [beginSelectionWithReset, isFillDragActive],
  )

  const handleCellPointerEnter = React.useCallback(
    (rowIndex: number, columnIndex: number): void => {
      if (isFillDragActive && selection) {
        updateFillPreview(rowIndex, columnIndex)
        return
      }
      if (!isSelecting) {
        return
      }
      extendSelection({ rowIndex, columnIndex })
    },
    [extendSelection, isFillDragActive, isSelecting, selection, updateFillPreview],
  )

  const handleCellClick = React.useCallback(
    (
      event: React.MouseEvent<HTMLTableCellElement>,
      rowIndex: number,
      columnIndex: number,
    ): void => {
      if (isFillDragActive) {
        return
      }
      const cellPosition: CellPosition = { rowIndex, columnIndex }
      if (event.shiftKey) {
        beginSelectionWithReset(cellPosition, true)
        setIsSelecting(false)
        return
      }
      beginSelectionWithReset(cellPosition)
      setIsSelecting(false)
    },
    [beginSelectionWithReset, isFillDragActive, setIsSelecting],
  )

  const handleCellDoubleClick = React.useCallback(
    (rowIndex: number, columnIndex: number): void => {
      const cellPosition: CellPosition = { rowIndex, columnIndex }
      beginSelectionWithReset(cellPosition)
      setIsSelecting(false)
      setEditingCell(cellPosition)
    },
    [beginSelectionWithReset, setEditingCell, setIsSelecting],
  )

  const { handleCopySelection, handlePaste } = useClipboardHandlers({
    columns,
    rows,
    selection,
    setColumnOrder,
    updateRows,
    setNotice,
    setSelection,
    setAnchorCell,
    getSelectionAnchor,
  })

  const handleTableKeyDown = useKeyboardShortcuts({
    beginSelectionWithReset,
    clearSelection,
    columns,
    editingCell,
    getSelectionAnchor,
    handleCopySelection,
    rows,
    selection,
    setEditingCell,
    setIsSelecting,
    setNotice,
    updateRows,
  })

  const { handleCellEditorBlur, handleCellEditorKeyDown } = useCellEditingHandlers({
    editingCell,
    setEditingCell,
    columnsLength: columns.length,
    rowsLength: rows.length,
    onCommitEditing: handleEditingCommit,
  })

  const activeRange = fillPreview ?? selection
  const selectionSummary = stringifySelection(activeRange, {
    empty: select('セルをクリックまたはドラッグして選択', 'Click or drag cells to select'),
    summary: (count) => select(`${count}セル選択中`, `${count} cells selected`),
  })

  const anchorCell = React.useMemo(() => {
    if (!selection) {
      return null
    }
    const anchor = getSelectionAnchor()
    const columnKey = columns[anchor.columnIndex]
    if (!columnKey) {
      return null
    }
    return rows[anchor.rowIndex]?.[columnKey] ?? null
  }, [columns, getSelectionAnchor, rows, selection])

  const selectionTextColor = anchorCell?.color ?? ''
  const selectionBackgroundColor = anchorCell?.bgColor ?? ''
  const selectionFunctionSummary = React.useMemo(
    () => describeSelectionFunction(selection, columns, rows, select),
    [columns, rows, select, selection],
  )

  return {
    selection,
    activeRange,
    fillPreview,
    selectionSummary,
    selectionFunctionSummary,
    isFillDragActive,
    editingCell,
    clearSelection,
    applyBulkInput,
    selectionTextColor,
    selectionBackgroundColor,
    applySelectionTextColor,
    applySelectionBackgroundColor,
    clearSelectionStyles,
    applySelectionFunction,
    handleRowNumberClick,
    handleColumnHeaderClick,
    handleCellPointerDown,
    handleCellPointerEnter,
    handleCellClick,
    handleCellDoubleClick,
    handleTableKeyDown,
    startFillDrag,
    handlePaste,
    handleCellEditorBlur,
    handleCellEditorKeyDown,
  }
}

type SelectFn = ReturnType<typeof useI18n>['select']

function describeSelectionFunction(
  selection: SelectionRange | null,
  columns: string[],
  rows: TableRow[],
  select: SelectFn,
): string {
  if (!selection) {
    return select('関数情報: 選択されていません', 'Function info: No selection')
  }
  if (!columns.length || !rows.length) {
    return select('関数情報: 取得できません', 'Function info: Unavailable')
  }
  const maxRowIndex = rows.length - 1
  const maxColIndex = columns.length - 1
  if (maxRowIndex < 0 || maxColIndex < 0) {
    return select('関数情報: 取得できません', 'Function info: Unavailable')
  }
  const rowStart = clampIndex(Math.min(selection.startRow, selection.endRow), maxRowIndex)
  const rowEnd = clampIndex(Math.max(selection.startRow, selection.endRow), maxRowIndex)
  const colStart = clampIndex(Math.min(selection.startCol, selection.endCol), maxColIndex)
  const colEnd = clampIndex(Math.max(selection.startCol, selection.endCol), maxColIndex)

  const uniqueFunctions = new Set<string>()
  let hasFunctionlessCell = false

  for (let rowIndex = rowStart; rowIndex <= rowEnd; rowIndex += 1) {
    const row = rows[rowIndex]
    if (!row) {
      hasFunctionlessCell = true
      continue
    }
    for (let colIndex = colStart; colIndex <= colEnd; colIndex += 1) {
      const columnKey = columns[colIndex]
      if (!columnKey) {
        hasFunctionlessCell = true
        continue
      }
      const cell = row[columnKey]
      if (!cell || !cell.func) {
        hasFunctionlessCell = true
        continue
      }
      const summary = summarizeCellFunction(cell.func)
      uniqueFunctions.add(summary || cell.func.name)
    }
  }

  if (uniqueFunctions.size === 0) {
    return select('関数情報: 未設定', 'Function info: None')
  }
  if (uniqueFunctions.size === 1) {
    const [summary] = Array.from(uniqueFunctions)
    if (hasFunctionlessCell) {
      return select(`関数情報: ${summary}（一部のセルは未設定）`, `Function info: ${summary} (partial)`)
    }
    return select(`関数情報: ${summary}`, `Function info: ${summary}`)
  }
  return select('関数情報: 複数の関数が設定されています', 'Function info: Multiple functions')
}

function clampIndex(target: number, max: number): number {
  if (Number.isNaN(target)) {
    return 0
  }
  return Math.min(Math.max(target, 0), Math.max(max, 0))
}
