// File Header: Hook responsible for spreadsheet data state and YAML/column operations.
import React from 'react'
import {
  deriveColumns,
  parseYamlWorkbook,
  stringifyYamlWorkbook,
  type TableRow,
  type TableSheet,
} from '../../../utils/yamlTable'
import type { Notice } from '../types'
import { createEmptyRow } from '../utils/spreadsheetTableUtils'

type SheetState = TableSheet & {
  columnOrder: string[]
}

type UseSpreadsheetDataController = {
  notice: Notice | null
  setNotice: React.Dispatch<React.SetStateAction<Notice | null>>
  yamlBuffer: string
  setYamlBuffer: React.Dispatch<React.SetStateAction<string>>
  tableYaml: string
  sheets: TableSheet[]
  activeSheetIndex: number
  setActiveSheetIndex: React.Dispatch<React.SetStateAction<number>>
  rows: TableRow[]
  columns: string[]
  columnOrder: string[]
  setColumnOrder: React.Dispatch<React.SetStateAction<string[]>>
  newColumnName: string
  setNewColumnName: React.Dispatch<React.SetStateAction<string>>
  updateRows: (_rows: TableRow[]) => void
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
  handleCellChange: (_rowIndex: number, _columnKey: string, _value: string) => void
}

// Function Header: Manages sheets/rows/YAML state and exposes primary data mutations.
export const useSpreadsheetDataController = (initialSheets: TableSheet[]): UseSpreadsheetDataController => {
  const baseSheets = React.useMemo(() => createSheetState(initialSheets), [initialSheets])
  const [sheets, setSheets] = React.useState<SheetState[]>(baseSheets)
  const [activeSheetIndex, setActiveSheetIndex] = React.useState<number>(0)
  const [yamlBuffer, setYamlBuffer] = React.useState<string>(() =>
    stringifyYamlWorkbook(baseSheets.map(stripSheetState)),
  )
  const [notice, setNotice] = React.useState<Notice | null>(null)
  const [newColumnName, setNewColumnName] = React.useState<string>('')

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
  const tableYaml = React.useMemo(
    () => stringifyYamlWorkbook(sheets.map(stripSheetState)),
    [sheets],
  )

  const rebuildYamlBuffer = React.useCallback((nextSheets: SheetState[]) => {
    setYamlBuffer(stringifyYamlWorkbook(nextSheets.map(stripSheetState)))
  }, [])

  const updateRows = React.useCallback(
    (nextRows: TableRow[]) => {
      setSheets((current) => {
        if (!current.length) {
          return current
        }
        const targetIndex = Math.min(activeSheetIndex, current.length - 1)
        const updatedRows = nextRows.map((row) => ({ ...row }))
        const next = current.map((sheet, index) =>
          index === targetIndex
            ? {
                ...sheet,
                rows: updatedRows,
                columnOrder: syncColumnOrder(sheet.columnOrder, deriveColumns(updatedRows)),
              }
            : sheet,
        )
        rebuildYamlBuffer(next)
        setNotice(null)
        return next
      })
    },
    [activeSheetIndex, rebuildYamlBuffer],
  )

  const handleAddRow = React.useCallback((): void => {
    const baseColumns = columns.length ? columns : ['column_1']
    const newRow = createEmptyRow(baseColumns)
    updateRows([...rows, newRow])
  }, [columns, rows, updateRows])

  const handleAddColumn = React.useCallback((): void => {
    const trimmed = newColumnName.trim()
    if (!trimmed) {
      setNotice({ text: '列名を入力してください。', tone: 'error' })
      return
    }
    if (columns.includes(trimmed)) {
      setNotice({ text: '同名の列がすでに存在します。', tone: 'error' })
      return
    }

    const nextRows =
      rows.length === 0
        ? [{ [trimmed]: '' }]
        : rows.map((row) => ({
            ...row,
            [trimmed]: row[trimmed] ?? '',
          }))

    updateRows(nextRows)
    setNewColumnName('')
    setNotice({ text: `列「${trimmed}」を追加しました。`, tone: 'success' })
  }, [columns, newColumnName, rows, updateRows])

  const handleDeleteRow = React.useCallback(
    (rowIndex: number): void => {
      const nextRows = rows.filter((_, index) => index !== rowIndex)
      updateRows(nextRows)
    },
    [rows, updateRows],
  )

  const handleAddSheet = React.useCallback((): void => {
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
      rebuildYamlBuffer(next)
      setNotice({ text: `シート「${sheetName}」を追加しました。`, tone: 'success' })
      setActiveSheetIndex(next.length - 1)
      return next
    })
  }, [rebuildYamlBuffer])

  const handleRenameSheet = React.useCallback(
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
        rebuildYamlBuffer(next)
        setNotice({ text: `シート名を「${trimmed}」に更新しました。`, tone: 'success' })
        return next
      })
    },
    [activeSheetIndex, rebuildYamlBuffer])

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
    [activeSheetIndex],
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
          index === targetIndex
            ? {
                ...sheet,
                columnOrder: nextOrder,
              }
            : sheet,
        )
        return next
      })
    },
    [activeSheetIndex],
  )

  const applyYamlBuffer = React.useCallback((): void => {
    try {
      const parsed = parseYamlWorkbook(yamlBuffer)
      const next = createSheetState(parsed)
      setSheets(next)
      rebuildYamlBuffer(next)
      setActiveSheetIndex((prev) => {
        if (!next.length) {
          return 0
        }
        return Math.min(prev, next.length - 1)
      })
      setNotice({ text: 'YAMLをテーブルに反映しました。', tone: 'success' })
    } catch (error) {
      setNotice({ text: (error as Error).message, tone: 'error' })
    }
  }, [rebuildYamlBuffer, yamlBuffer])

  const handleFileUpload = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const file = event.target.files?.[0]
      if (!file) {
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        const content = String(reader.result ?? '')
        setYamlBuffer(content)
        try {
          const parsed = createSheetState(parseYamlWorkbook(content))
          setSheets(parsed)
          rebuildYamlBuffer(parsed)
          setActiveSheetIndex((prev) => {
            if (!parsed.length) {
              return 0
            }
            return Math.min(prev, parsed.length - 1)
          })
          setNotice({ text: 'ファイルを読み込みました。', tone: 'success' })
        } catch (error) {
          setNotice({
            text: `アップロードしたファイルを解析できませんでした: ${(error as Error).message}`,
            tone: 'error',
          })
        }
      }
      reader.readAsText(file)
      event.target.value = ''
    },
    [rebuildYamlBuffer],
  )

  const handleDownloadYaml = React.useCallback((): void => {
    const blob = new Blob([tableYaml], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'table.yaml'
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice({ text: 'table.yaml をダウンロードしました。', tone: 'success' })
  }, [tableYaml])

  const handleCopyYaml = React.useCallback(async (): Promise<void> => {
    if (!navigator.clipboard) {
      setNotice({ text: 'クリップボードAPIが利用できません。', tone: 'error' })
      return
    }

    try {
      await navigator.clipboard.writeText(tableYaml)
      setNotice({ text: 'YAMLをクリップボードにコピーしました。', tone: 'success' })
    } catch {
      setNotice({ text: 'クリップボードへのコピーに失敗しました。', tone: 'error' })
    }
  }, [tableYaml])

  const handleCellChange = React.useCallback(
    (rowIndex: number, columnKey: string, value: string): void => {
      const nextRows = rows.map((row, index) => (index === rowIndex ? { ...row, [columnKey]: value } : row))
      updateRows(nextRows)
    },
    [rows, updateRows],
  )

  return {
    notice,
    setNotice,
    yamlBuffer,
    setYamlBuffer,
    tableYaml,
    sheets: sheets.map(stripSheetState),
    activeSheetIndex,
    setActiveSheetIndex,
    rows,
    columns,
    columnOrder,
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
  }
}

function createSheetState(sheets: TableSheet[]): SheetState[] {
  const safeSheets = sheets.length
    ? sheets
    : [
        {
          name: 'Sheet 1',
          rows: [],
        },
      ]
  return safeSheets.map((sheet) => {
    const rows = sheet.rows.map((row) => ({ ...row }))
    return {
      name: sheet.name,
      rows,
      columnOrder: deriveColumns(rows),
    }
  })
}

function stripSheetState(sheet: SheetState): TableSheet {
  return { name: sheet.name, rows: sheet.rows }
}

function syncColumnOrder(currentOrder: string[], derivedColumns: string[]): string[] {
  const filtered = currentOrder.filter((column) => derivedColumns.includes(column))
  const appended = derivedColumns.filter((column) => !filtered.includes(column))
  return [...filtered, ...appended]
}

function generateSheetName(sheets: SheetState[]): string {
  const existing = new Set(sheets.map((sheet) => sheet.name))
  let index = sheets.length + 1
  let candidate = `Sheet ${index}`
  while (existing.has(candidate)) {
    index += 1
    candidate = `Sheet ${index}`
  }
  return candidate
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false
  }
  return a.every((value, index) => value === b[index])
}
