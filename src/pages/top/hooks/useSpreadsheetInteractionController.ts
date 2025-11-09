// File Header: Hook encapsulating selection, fill, clipboard, and editing interactions.
import React from 'react'
import type { TableRow } from '../../../services/workbookService'
import type { CellPosition, Notice, SelectionRange, UpdateRows } from '../types'
import { stringifySelection } from '../utils/spreadsheetTableUtils'
import { useClipboardHandlers } from './useClipboardHandlers'
import { useCellEditingHandlers } from './useCellEditingHandlers'
import { useFillController } from './useFillController'
import { useSelectionController } from './useSelectionController'

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

  const applyBulkInput = React.useCallback((): void => {
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
  }, [bulkValue, columns, rows, selection, updateRows, setNotice])

  React.useEffect(() => {
    if (!selection) {
      return
    }
    if (!rows.length || !columns.length) {
      clearSelection()
      return
    }
    const maxRow = rows.length - 1
    const maxCol = columns.length - 1
    const nextRange: SelectionRange = {
      startRow: Math.min(selection.startRow, maxRow),
      endRow: Math.min(selection.endRow, maxRow),
      startCol: Math.min(selection.startCol, maxCol),
      endCol: Math.min(selection.endCol, maxCol),
    }
    if (
      nextRange.startRow !== selection.startRow ||
      nextRange.endRow !== selection.endRow ||
      nextRange.startCol !== selection.startCol ||
      nextRange.endCol !== selection.endCol
    ) {
      setSelection(nextRange)
    }
  }, [rows.length, columns.length, selection, clearSelection, setSelection])

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

  const handleTableKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>): void => {
      if (event.key === 'Escape') {
        if (editingCell) {
          setEditingCell(null)
          return
        }
        clearSelection()
        return
      }
      if ((event.key === 'c' || event.key === 'C') && (event.ctrlKey || event.metaKey)) {
        if (editingCell) {
          return
        }
        event.preventDefault()
        void handleCopySelection()
        return
      }
      if (
        (event.key === 'ArrowUp' ||
          event.key === 'ArrowDown' ||
          event.key === 'ArrowLeft' ||
          event.key === 'ArrowRight') &&
        !editingCell
      ) {
        if (!columns.length || !rows.length) {
          return
        }
        event.preventDefault()

        const maxRow = rows.length - 1
        const maxCol = columns.length - 1

        const basePosition = selection
          ? { rowIndex: selection.endRow, columnIndex: selection.endCol }
          : getSelectionAnchor()

        const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

        const currentRow = clamp(basePosition.rowIndex, 0, maxRow)
        const currentCol = clamp(basePosition.columnIndex, 0, maxCol)

        let nextRow = currentRow
        let nextCol = currentCol

        switch (event.key) {
          case 'ArrowUp':
            nextRow = clamp(currentRow - 1, 0, maxRow)
            break
          case 'ArrowDown':
            nextRow = clamp(currentRow + 1, 0, maxRow)
            break
          case 'ArrowLeft':
            nextCol = clamp(currentCol - 1, 0, maxCol)
            break
          case 'ArrowRight':
            nextCol = clamp(currentCol + 1, 0, maxCol)
            break
          default:
            break
        }

        beginSelectionWithReset({ rowIndex: nextRow, columnIndex: nextCol }, event.shiftKey)
        setIsSelecting(false)
        return
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && !editingCell) {
        if (!selection) {
          return
        }
        event.preventDefault()
        const targetColumns = columns.slice(selection.startCol, selection.endCol + 1)
        const nextRows = rows.map((row, rowIndex) => {
          if (rowIndex < selection.startRow || rowIndex > selection.endRow) {
            return row
          }
          const updated = { ...row }
          targetColumns.forEach((columnKey) => {
            updated[columnKey] = ''
          })
          return updated
        })
        updateRows(nextRows)
        setNotice({ text: '選択セルの内容を削除しました。', tone: 'success' })
        return
      }
      if (event.key === 'Enter' && !editingCell) {
        event.preventDefault()
        const target = getSelectionAnchor()
        setEditingCell(target)
      }
    },
    [
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
    ],
  )

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
