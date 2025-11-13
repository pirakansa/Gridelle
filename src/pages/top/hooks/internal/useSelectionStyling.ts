// File Header: Hook providing handlers to mutate selection styling and functions.
import React from 'react'
import { cloneCell, type TableCell, type TableRow, type CellFunctionConfig } from '../../../../services/workbookService'
import { createLocalizedText, type Notice, type SelectionRange, type UpdateRows } from '../../types'

type Options = {
  selection: SelectionRange | null
  columns: string[]
  rows: TableRow[]
  updateRows: UpdateRows
  setNotice: React.Dispatch<React.SetStateAction<Notice | null>>
}

type Result = {
  applySelectionTextColor: (_color: string | null) => void
  applySelectionBackgroundColor: (_color: string | null) => void
  clearSelectionStyles: () => void
  applySelectionFunction: (_config: CellFunctionConfig | null) => void
}

// Function Header: Returns memoized helpers for updating selection formatting and functions.
export function useSelectionStyling({
  selection,
  columns,
  rows,
  updateRows,
  setNotice,
}: Options): Result {
  const updateSelectionCells = React.useCallback(
    (mutator: (_cell: TableCell) => { cell: TableCell; changed: boolean }): boolean => {
      if (!selection) {
        setNotice({
          text: createLocalizedText('セルを選択してください。', 'Select some cells first.'),
          tone: 'error',
        })
        return false
      }
      if (!columns.length || !rows.length) {
        setNotice({
          text: createLocalizedText('セルを選択してください。', 'Select some cells first.'),
          tone: 'error',
        })
        return false
      }

      let didChange = false
      const nextRows = rows.map((row, rowIndex) => {
        if (rowIndex < selection.startRow || rowIndex > selection.endRow) {
          return row
        }

        let rowClone: TableRow | null = null
        for (let columnIndex = selection.startCol; columnIndex <= selection.endCol; columnIndex += 1) {
          const columnKey = columns[columnIndex]
          if (!columnKey) {
            continue
          }
          const clonedCell = cloneCell(row[columnKey])
          const { cell: nextCell, changed } = mutator(clonedCell)
          if (!changed) {
            continue
          }
          if (!rowClone) {
            rowClone = { ...row }
          }
          rowClone[columnKey] = nextCell
          didChange = true
        }

        return rowClone ?? row
      })

      if (didChange) {
        updateRows(nextRows)
      }

      return didChange
    },
    [columns, rows, selection, setNotice, updateRows],
  )

  const applySelectionTextColor = React.useCallback(
    (color: string | null): void => {
      const trimmed = (color ?? '').trim()
      const normalized = trimmed.length > 0 ? trimmed : ''

      const changed = updateSelectionCells((cell) => {
        if (!normalized) {
          if (cell.color) {
            const nextCell = { ...cell }
            delete nextCell.color
            return { cell: nextCell, changed: true }
          }
          return { cell, changed: false }
        }

        if (cell.color === normalized) {
          return { cell, changed: false }
        }

        return { cell: { ...cell, color: normalized }, changed: true }
      })

      if (changed) {
        setNotice({
          text: normalized
            ? createLocalizedText('選択セルの文字色を更新しました。', 'Updated the text color for the selection.')
            : createLocalizedText('選択セルの文字色をクリアしました。', 'Cleared the text color from the selection.'),
          tone: 'success',
        })
      }
    },
    [setNotice, updateSelectionCells],
  )

  const applySelectionBackgroundColor = React.useCallback(
    (color: string | null): void => {
      const trimmed = (color ?? '').trim()
      const normalized = trimmed.length > 0 ? trimmed : ''

      const changed = updateSelectionCells((cell) => {
        if (!normalized) {
          if (cell.bgColor) {
            const nextCell = { ...cell }
            delete nextCell.bgColor
            return { cell: nextCell, changed: true }
          }
          return { cell, changed: false }
        }

        if (cell.bgColor === normalized) {
          return { cell, changed: false }
        }

        return { cell: { ...cell, bgColor: normalized }, changed: true }
      })

      if (changed) {
        setNotice({
          text: normalized
            ? createLocalizedText('選択セルの背景色を更新しました。', 'Updated the background color for the selection.')
            : createLocalizedText('選択セルの背景色をクリアしました。', 'Cleared the background color from the selection.'),
          tone: 'success',
        })
      }
    },
    [setNotice, updateSelectionCells],
  )

  const clearSelectionStyles = React.useCallback((): void => {
    const changed = updateSelectionCells((cell) => {
      if (!cell.color && !cell.bgColor) {
        return { cell, changed: false }
      }
      const nextCell = { ...cell }
      delete nextCell.color
      delete nextCell.bgColor
      return { cell: nextCell, changed: true }
    })

    if (changed) {
      setNotice({
        text: createLocalizedText('選択セルのスタイルをクリアしました。', 'Cleared the selection styles.'),
        tone: 'success',
      })
    }
  }, [setNotice, updateSelectionCells])

  const applySelectionFunction = React.useCallback(
    (config: CellFunctionConfig | null): void => {
      const changed = updateSelectionCells((cell) => {
        if (!config) {
          if (!cell.func) {
            return { cell, changed: false }
          }
          const nextCell = { ...cell }
          delete nextCell.func
          return { cell: nextCell, changed: true }
        }
        const nextFunc = {
          name: config.name,
          ...(config.args ? { args: { ...config.args } } : {}),
        }
        if (cell.func && cell.func.name === nextFunc.name) {
          const currentArgs = JSON.stringify(cell.func.args ?? {})
          const incomingArgs = JSON.stringify(nextFunc.args ?? {})
          if (currentArgs === incomingArgs) {
            return { cell, changed: false }
          }
        }
        return {
          cell: {
            ...cell,
            func: nextFunc,
          },
          changed: true,
        }
      })

      if (!changed) {
        setNotice({
          text: createLocalizedText('関数を適用できるセルを選択してください。', 'Select cells that can accept the function.'),
          tone: 'error',
        })
        return
      }
      setNotice({
        text: config
          ? createLocalizedText('選択セルに関数を設定しました。', 'Applied the function to the selection.')
          : createLocalizedText('選択セルの関数をクリアしました。', 'Cleared the function from the selection.'),
        tone: 'success',
      })
    },
    [setNotice, updateSelectionCells],
  )

  return {
    applySelectionTextColor,
    applySelectionBackgroundColor,
    clearSelectionStyles,
    applySelectionFunction,
  }
}
