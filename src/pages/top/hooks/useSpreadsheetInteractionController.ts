// File Header: Hook encapsulating selection, fill, clipboard, and editing interactions.
import React from 'react'
import type { TableRow } from '../../../services/workbookService'
import type { CellPosition, Notice, SelectionRange, UpdateRows } from '../types'
import { stringifySelection } from '../utils/spreadsheetTableUtils'
import { useClipboardHandlers } from './useClipboardHandlers'
import { useCellEditingHandlers } from './useCellEditingHandlers'
import { useFillController } from './useFillController'
import { useSelectionController } from './useSelectionController'
import { useBulkInput } from './internal/useBulkInput'
import { useKeyboardShortcuts } from './internal/useKeyboardShortcuts'
import { useSelectionNormalizer } from './internal/useSelectionNormalizer'

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
  isFillDragActive: boolean
  editingCell: CellPosition | null
  clearSelection: () => void
  applyBulkInput: () => void
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

  useSelectionNormalizer({
    selection,
    rowsLength: rows.length,
    columnsLength: columns.length,
    setSelection,
    clearSelection,
  })

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

  const handleRowNumberClick = React.useCallback(
    (rowIndex: number, extend: boolean): void => {
      if (!columns.length) {
        return
      }
      resetFillState()
      const lastColumnIndex = columns.length - 1
      if (extend && selection) {
        const startRow = Math.min(selection.startRow, rowIndex)
        const endRow = Math.max(selection.endRow, rowIndex)
        setSelection({
          startRow,
          endRow,
          startCol: 0,
          endCol: lastColumnIndex,
        })
        setAnchorCell({ rowIndex: startRow, columnIndex: 0 })
      } else {
        setAnchorCell({ rowIndex, columnIndex: 0 })
        setSelection({
          startRow: rowIndex,
          endRow: rowIndex,
          startCol: 0,
          endCol: lastColumnIndex,
        })
      }
      setIsSelecting(false)
      setEditingCell(null)
    },
    [columns.length, selection, resetFillState, setSelection, setAnchorCell, setIsSelecting, setEditingCell],
  )

  const handleColumnHeaderClick = React.useCallback(
    (columnIndex: number, extend: boolean): void => {
      if (!columns.length) {
        return
      }
      resetFillState()
      const hasRows = rows.length > 0
      const startRow = 0
      const endRow = hasRows ? rows.length - 1 : 0
      if (extend && selection) {
        const startCol = Math.min(selection.startCol, columnIndex)
        const endCol = Math.max(selection.endCol, columnIndex)
        setSelection({
          startRow,
          endRow,
          startCol,
          endCol,
        })
        setAnchorCell({ rowIndex: startRow, columnIndex: startCol })
      } else {
        setAnchorCell({ rowIndex: startRow, columnIndex })
        setSelection({
          startRow,
          endRow,
          startCol: columnIndex,
          endCol: columnIndex,
        })
      }
      setIsSelecting(false)
      setEditingCell(null)
    },
    [columns.length, rows.length, selection, resetFillState, setSelection, setAnchorCell, setIsSelecting, setEditingCell],
  )

  const handleCellPointerEnter = React.useCallback(
    (rowIndex: number, columnIndex: number): void => {
      if (isFillDragActive && selection) {
        updateFillPreview(rowIndex)
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
  })

  const activeRange = fillPreview ?? selection
  const selectionSummary = stringifySelection(activeRange)

  return {
    selection,
    activeRange,
    fillPreview,
    selectionSummary,
    isFillDragActive,
    editingCell,
    clearSelection,
    applyBulkInput,
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
