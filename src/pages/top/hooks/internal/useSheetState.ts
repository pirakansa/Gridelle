import React from 'react'
import { cloneRow, deriveColumns, type TableRow, type TableSheet, createCell } from '../../../../services/workbookService'
import { createEmptyRow } from '../../utils/spreadsheetTableUtils'
import type { Notice } from '../../types'
import {
  arraysEqual,
  cloneRows,
  createSheetState,
  generateNextColumnKey,
  generateSheetName,
  SheetState,
  syncColumnOrder,
} from './spreadsheetDataUtils'

export type UseSheetStateOptions = {
  initialSheets: TableSheet[]
  setNotice: React.Dispatch<React.SetStateAction<Notice | null>>
}

export type UseSheetStateResult = {
  sheets: SheetState[]
  activeSheetIndex: number
  setActiveSheetIndex: React.Dispatch<React.SetStateAction<number>>
  rows: TableRow[]
  columns: string[]
  columnOrder: string[]
  setColumnOrder: React.Dispatch<React.SetStateAction<string[]>>
  updateRows: (_rows: TableRow[]) => void
  addRow: () => void
  addColumn: () => void
  addSheet: () => void
  deleteSheet: () => void
  renameSheet: (_name: string) => void
  moveColumn: (_columnKey: string, _direction: 'left' | 'right') => void
  replaceSheets: (_next: SheetState[]) => void
}

export function useSheetState({ initialSheets, setNotice }: UseSheetStateOptions): UseSheetStateResult {
  const baseSheets = React.useMemo(() => createSheetState(initialSheets), [initialSheets])
  const [sheets, setSheets] = React.useState<SheetState[]>(baseSheets)
  const [activeSheetIndex, setActiveSheetIndex] = React.useState<number>(0)

  const replaceSheets = React.useCallback(
    (nextSheets: SheetState[]) => {
      setSheets(nextSheets)
    },
    [],
  )

  const activeSheet = sheets[activeSheetIndex] ?? sheets[0] ?? {
    name: 'Sheet 1',
    rows: [],
    columnOrder: [],
  }

  const rows = activeSheet.rows
  const derivedColumns = React.useMemo(() => deriveColumns(rows), [rows])

  React.useEffect(() => {
    setSheets((current) => {
      if (!current.length) {
        return current
      }
      const targetIndex = Math.min(activeSheetIndex, current.length - 1)
      const targetSheet = current[targetIndex]
      const nextOrder = syncColumnOrder(targetSheet.columnOrder, derivedColumns)
      if (arraysEqual(nextOrder, targetSheet.columnOrder)) {
        return current
      }
      const next = [...current]
      next[targetIndex] = { ...targetSheet, columnOrder: nextOrder }
      return next
    })
  }, [activeSheetIndex, derivedColumns])

  const columnOrder = activeSheet.columnOrder.length
    ? activeSheet.columnOrder
    : syncColumnOrder([], derivedColumns)
  const columns = columnOrder.length ? columnOrder : derivedColumns

  const updateRows = React.useCallback(
    (nextRows: TableRow[]) => {
      setSheets((current) => {
        if (!current.length) {
          return current
        }
        const targetIndex = Math.min(activeSheetIndex, current.length - 1)
        const updatedRows = cloneRows(nextRows)
        const nextColumns = deriveColumns(updatedRows)
        const next = current.map((sheet, index) =>
          index === targetIndex
            ? {
                ...sheet,
                rows: updatedRows,
                columnOrder: syncColumnOrder(sheet.columnOrder, nextColumns),
              }
            : sheet,
        )
        setNotice(null)
        return next
      })
    },
    [activeSheetIndex, setNotice],
  )

  const addRow = React.useCallback((): void => {
    const baseColumns = columns.length ? columns : ['column_1']
    const newRow = createEmptyRow(baseColumns)
    updateRows([...rows, newRow])
  }, [columns, rows, updateRows])

  const addColumn = React.useCallback((): void => {
    const nextColumnName = generateNextColumnKey(columns)
    const nextRows = rows.length
      ? rows.map((row) => {
          const nextRow = cloneRow(row)
          if (nextRow[nextColumnName] === undefined) {
            nextRow[nextColumnName] = createCell()
          }
          return nextRow
        })
      : [{ [nextColumnName]: createCell() }]
    updateRows(nextRows)
    setNotice({ text: `列「${nextColumnName}」を追加しました。`, tone: 'success' })
  }, [columns, rows, updateRows, setNotice])

  const addSheet = React.useCallback((): void => {
    setSheets((current) => {
      const sheetName = generateSheetName(current)
      const next: SheetState[] = [
        ...current,
        {
          name: sheetName,
          rows: [],
          columnOrder: [],
        },
      ]
      setNotice({ text: `シート「${sheetName}」を追加しました。`, tone: 'success' })
      setActiveSheetIndex(next.length - 1)
      return next
    })
  }, [setNotice])

  const deleteSheet = React.useCallback((): void => {
    setSheets((current) => {
      if (!current.length) {
        setNotice({ text: '削除できるシートがありません。', tone: 'error' })
        return current
      }
      if (current.length === 1) {
        setNotice({ text: '最後のシートは削除できません。', tone: 'error' })
        return current
      }
      const targetIndex = Math.min(activeSheetIndex, current.length - 1)
      const targetSheet = current[targetIndex]
      const next = current.filter((_, index) => index !== targetIndex)
      const nextActiveIndex = Math.min(targetIndex, next.length - 1)
      setActiveSheetIndex(nextActiveIndex)
      setNotice({ text: `シート「${targetSheet.name}」を削除しました。`, tone: 'success' })
      return next
    })
  }, [activeSheetIndex, setActiveSheetIndex, setNotice])

  const renameSheet = React.useCallback(
    (name: string): void => {
      const trimmed = name.trim()
      if (!trimmed) {
        setNotice({ text: 'シート名を入力してください。', tone: 'error' })
        return
      }
      setSheets((current) => {
        if (!current.length) {
          return current
        }
        const targetIndex = Math.min(activeSheetIndex, current.length - 1)
        const next = current.map((sheet, index) =>
          index === targetIndex
            ? {
                ...sheet,
                name: trimmed,
              }
            : sheet,
        )
        setNotice({ text: `シート名を「${trimmed}」に更新しました。`, tone: 'success' })
        return next
      })
    },
    [activeSheetIndex, setNotice],
  )

  const moveColumn = React.useCallback(
    (columnKey: string, direction: 'left' | 'right'): void => {
      setSheets((current) => {
        if (!current.length) {
          return current
        }
        const targetIndex = Math.min(activeSheetIndex, current.length - 1)
        const targetSheet = current[targetIndex]
        const index = targetSheet.columnOrder.indexOf(columnKey)
        if (index === -1) {
          return current
        }
        const delta = direction === 'left' ? -1 : 1
        const swapIndex = index + delta
        if (swapIndex < 0 || swapIndex >= targetSheet.columnOrder.length) {
          return current
        }
        const nextOrder = [...targetSheet.columnOrder]
        const [moved] = nextOrder.splice(index, 1)
        nextOrder.splice(swapIndex, 0, moved)
        const next = current.map((sheet, sheetIndex) =>
          sheetIndex === targetIndex ? { ...sheet, columnOrder: nextOrder } : sheet,
        )
        setNotice({ text: `列「${columnKey}」を移動しました。`, tone: 'success' })
        return next
      })
    },
    [activeSheetIndex, setNotice],
  )

  const setColumnOrder = React.useCallback(
    (updater: React.SetStateAction<string[]>) => {
      setSheets((current) => {
        if (!current.length) {
          return current
        }
        const targetIndex = Math.min(activeSheetIndex, current.length - 1)
        const currentOrder = current[targetIndex].columnOrder
        const nextOrder =
          typeof updater === 'function' ? (updater as (_order: string[]) => string[])(currentOrder) : updater
        const next = current.map((sheet, index) =>
          index === targetIndex ? { ...sheet, columnOrder: nextOrder } : sheet,
        )
        return next
      })
    },
    [activeSheetIndex],
  )

  return {
    sheets,
    activeSheetIndex,
    setActiveSheetIndex,
    rows,
    columns,
    columnOrder,
    setColumnOrder,
    updateRows,
    addRow,
    addColumn,
    addSheet,
    deleteSheet,
    renameSheet,
    moveColumn,
    replaceSheets,
  }
}
