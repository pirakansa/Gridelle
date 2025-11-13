import React from 'react'
import { cloneCell, type TableRow } from '../../../../services/workbookService'
import {
  createLocalizedText,
  type CellPosition,
  type EditingCellState,
  type Notice,
  type SelectionRange,
  type UpdateRows,
} from '../../types'

type UseKeyboardShortcutsOptions = {
  beginSelectionWithReset: (_position: CellPosition, _preserveAnchor?: boolean) => void
  clearSelection: () => void
  columns: string[]
  editingCell: EditingCellState | null
  getSelectionAnchor: () => CellPosition
  handleCopySelection: () => Promise<void>
  rows: TableRow[]
  selection: SelectionRange | null
  setEditingCell: React.Dispatch<React.SetStateAction<EditingCellState | null>>
  setIsSelecting: React.Dispatch<React.SetStateAction<boolean>>
  setNotice: React.Dispatch<React.SetStateAction<Notice | null>>
  updateRows: UpdateRows
}

export function useKeyboardShortcuts({
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
}: UseKeyboardShortcutsOptions): React.KeyboardEventHandler<HTMLDivElement> {
  return React.useCallback(
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
        !editingCell &&
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        columns.length &&
        rows.length
      ) {
        event.preventDefault()
        const maxRow = rows.length - 1
        const maxCol = columns.length - 1
        const baseAnchor = getSelectionAnchor()
        const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
        const rowIndex = clamp(baseAnchor.rowIndex, 0, maxRow)
        const columnIndex = clamp(baseAnchor.columnIndex, 0, maxCol)
        beginSelectionWithReset({ rowIndex, columnIndex })
        setIsSelecting(false)
        setEditingCell({ rowIndex, columnIndex, initialValue: event.key, replaceValue: true })
        return
      }

      if (isArrowKey(event.key) && !editingCell) {
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
            const cleared = cloneCell(row[columnKey])
            cleared.value = ''
            updated[columnKey] = cleared
          })
          return updated
        })
        updateRows(nextRows)
        setNotice({
          text: createLocalizedText('選択セルの内容を削除しました。', 'Cleared the selected cells.'),
          tone: 'success',
        })
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
}

function isArrowKey(key: string): key is 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' {
  return key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight'
}
