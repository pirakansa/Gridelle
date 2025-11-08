// File Header: Hook encapsulating selection, fill, clipboard, and editing interactions.
import React from 'react'
import type { TableRow } from '../../../utils/yamlTable'
import type { CellPosition, Notice, SelectionRange, UpdateRows } from '../types'
import {
  buildSelectionRange,
  createEmptyRow,
  ensureColumnCapacity,
  stringifySelection,
  syncRowsToColumns,
} from '../utils/spreadsheetTableUtils'

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
  handleCopyCell: (_value: string) => Promise<void>
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
  handleCellEditorKeyDown: (_event: React.KeyboardEvent<HTMLInputElement>) => void
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
  const [selection, setSelection] = React.useState<SelectionRange | null>(null)
  const [anchorCell, setAnchorCell] = React.useState<CellPosition | null>(null)
  const [isSelecting, setIsSelecting] = React.useState<boolean>(false)
  const [fillPreview, setFillPreview] = React.useState<SelectionRange | null>(null)
  const [isFillDragActive, setIsFillDragActive] = React.useState<boolean>(false)
  const [editingCell, setEditingCell] = React.useState<CellPosition | null>(null)

  const getSelectionAnchor = React.useCallback((): CellPosition => {
    if (selection) {
      return { rowIndex: selection.startRow, columnIndex: selection.startCol }
    }
    if (anchorCell) {
      return anchorCell
    }
    return { rowIndex: 0, columnIndex: 0 }
  }, [selection, anchorCell])

  const clearSelection = React.useCallback((): void => {
    setSelection(null)
    setAnchorCell(null)
    setIsSelecting(false)
    setIsFillDragActive(false)
    setFillPreview(null)
    setEditingCell(null)
  }, [])

  const beginSelection = React.useCallback(
    (position: CellPosition, preserveAnchor = false) => {
      setEditingCell(null)
      const baseAnchor = preserveAnchor ? getSelectionAnchor() : position
      setAnchorCell(baseAnchor)
      setSelection(buildSelectionRange(baseAnchor, position))
      setIsSelecting(true)
      setFillPreview(null)
    },
    [getSelectionAnchor],
  )

  const extendSelection = React.useCallback(
    (position: CellPosition) => {
      const base = anchorCell ?? getSelectionAnchor()
      setSelection(buildSelectionRange(base, position))
    },
    [anchorCell, getSelectionAnchor],
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

  const applyFillDown = React.useCallback(
    (targetEndRow: number) => {
      if (!selection || targetEndRow <= selection.endRow) {
        return
      }

      const columnKeys = columns.slice(selection.startCol, selection.endCol + 1)
      const patternRows = rows
        .slice(selection.startRow, selection.endRow + 1)
        .map((row) => ({ ...row }))
      let nextRows = rows.map((row) => ({ ...row }))
      while (nextRows.length <= targetEndRow) {
        nextRows = [...nextRows, createEmptyRow(columns)]
      }

      for (let rowIndex = selection.endRow + 1; rowIndex <= targetEndRow; rowIndex += 1) {
        const patternRow =
          patternRows[((rowIndex - selection.startRow) % patternRows.length + patternRows.length) % patternRows.length]
        const updatedRow = { ...nextRows[rowIndex] }
        columnKeys.forEach((columnKey) => {
          updatedRow[columnKey] = patternRow[columnKey] ?? ''
        })
        nextRows[rowIndex] = updatedRow
      }

      updateRows(nextRows)
      setSelection((prev) =>
        prev
          ? {
              ...prev,
              endRow: targetEndRow,
            }
          : null,
      )
      setAnchorCell((prev) => (prev ? { rowIndex: prev.rowIndex, columnIndex: prev.columnIndex } : null))
      setNotice({ text: 'フィルを適用しました。', tone: 'success' })
    },
    [columns, rows, selection, updateRows, setNotice],
  )

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const handlePointerUp = () => {
      setIsSelecting(false)
      if (isFillDragActive) {
        if (fillPreview && selection && fillPreview.endRow > selection.endRow) {
          applyFillDown(fillPreview.endRow)
        }
        setIsFillDragActive(false)
        setFillPreview(null)
      }
    }
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isFillDragActive, fillPreview, selection, applyFillDown])

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
  }, [rows.length, columns.length, selection, clearSelection])

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
        beginSelection(cellPosition, true)
        return
      }
      beginSelection(cellPosition)
    },
    [beginSelection, isFillDragActive],
  )

  const handleRowNumberClick = React.useCallback(
    (rowIndex: number, extend: boolean): void => {
      if (!columns.length) {
        return
      }
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
      setFillPreview(null)
    },
    [columns.length, selection],
  )

  const handleCellPointerEnter = React.useCallback(
    (rowIndex: number, columnIndex: number): void => {
      if (isFillDragActive && selection) {
        if (rowIndex > selection.endRow) {
          setFillPreview({ ...selection, endRow: rowIndex })
        } else {
          setFillPreview(selection)
        }
        return
      }
      if (!isSelecting) {
        return
      }
      extendSelection({ rowIndex, columnIndex })
    },
    [extendSelection, isFillDragActive, isSelecting, selection],
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
        beginSelection(cellPosition, true)
        setIsSelecting(false)
        return
      }
      beginSelection(cellPosition)
      setIsSelecting(false)
    },
    [beginSelection, isFillDragActive],
  )

  const handleCellDoubleClick = React.useCallback(
    (rowIndex: number, columnIndex: number): void => {
      const cellPosition: CellPosition = { rowIndex, columnIndex }
      beginSelection(cellPosition)
      setIsSelecting(false)
      setEditingCell(cellPosition)
    },
    [beginSelection],
  )

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
      if (event.key === 'Enter' && !editingCell) {
        event.preventDefault()
        const target = getSelectionAnchor()
        setEditingCell(target)
      }
    },
    [clearSelection, editingCell, getSelectionAnchor],
  )

  const startFillDrag = React.useCallback(
    (event: React.PointerEvent<HTMLButtonElement>): void => {
      event.preventDefault()
      event.stopPropagation()
      if (!selection) {
        setNotice({ text: 'フィル対象のセルを選択してください。', tone: 'error' })
        return
      }
      setIsFillDragActive(true)
      setFillPreview(selection)
    },
    [selection, setNotice],
  )

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
    [columns, rows, getSelectionAnchor, setColumnOrder, updateRows, setNotice],
  )

  const activeRange = fillPreview ?? selection
  const selectionSummary = stringifySelection(activeRange)

  const handleCellEditorBlur = React.useCallback((): void => {
    setEditingCell(null)
  }, [])

  const handleCellEditorKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter' || event.key === 'Escape') {
      event.preventDefault()
      setEditingCell(null)
    }
  }, [])

  React.useEffect(() => {
    if (!editingCell) {
      return
    }
    if (editingCell.rowIndex >= rows.length || editingCell.columnIndex >= columns.length) {
      setEditingCell(null)
    }
  }, [editingCell, rows.length, columns.length])

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
  }
}
