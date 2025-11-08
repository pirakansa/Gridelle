// File Header: Hook responsible for spreadsheet data state and YAML/column operations.
import React from 'react'
import {
  deriveColumns,
  parseYamlTable,
  stringifyYamlTable,
  type TableRow,
} from '../../../utils/yamlTable'
import type { Notice } from '../types'
import { createEmptyRow } from '../utils/spreadsheetTableUtils'

type UseSpreadsheetDataController = {
  notice: Notice | null
  setNotice: React.Dispatch<React.SetStateAction<Notice | null>>
  yamlBuffer: string
  setYamlBuffer: React.Dispatch<React.SetStateAction<string>>
  tableYaml: string
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
  moveColumn: (_columnKey: string, _direction: 'left' | 'right') => void
  applyYamlBuffer: () => void
  handleFileUpload: (_event: React.ChangeEvent<HTMLInputElement>) => void
  handleDownloadYaml: () => void
  handleCopyYaml: () => Promise<void>
  handleCellChange: (_rowIndex: number, _columnKey: string, _value: string) => void
}

// Function Header: Manages rows/columns/YAML state and exposes primary data mutations.
export const useSpreadsheetDataController = (initialRows: TableRow[]): UseSpreadsheetDataController => {
  const [yamlBuffer, setYamlBuffer] = React.useState<string>(() => stringifyYamlTable(initialRows))
  const [rows, setRows] = React.useState<TableRow[]>(() => initialRows.map((row) => ({ ...row })))
  const [columnOrder, setColumnOrder] = React.useState<string[]>(() => deriveColumns(initialRows))
  const [notice, setNotice] = React.useState<Notice | null>(null)
  const [newColumnName, setNewColumnName] = React.useState<string>('')

  const derivedColumns = React.useMemo(() => deriveColumns(rows), [rows])
  React.useEffect(() => {
    setColumnOrder((current) => {
      const filtered = current.filter((column) => derivedColumns.includes(column))
      const appended = derivedColumns.filter((column) => !filtered.includes(column))
      if (appended.length === 0 && filtered.length === current.length) {
        return current
      }
      return [...filtered, ...appended]
    })
  }, [derivedColumns])

  const columns = columnOrder.length ? columnOrder : derivedColumns
  const tableYaml = React.useMemo(() => stringifyYamlTable(rows), [rows])

  const updateRows = React.useCallback(
    (nextRows: TableRow[]) => {
      setRows(nextRows)
      setYamlBuffer(stringifyYamlTable(nextRows))
      setNotice(null)
    },
    [],
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
    setColumnOrder((current) => [...current, trimmed])
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

  const moveColumn = React.useCallback(
    (columnKey: string, direction: 'left' | 'right'): void => {
      setColumnOrder((current) => {
        const index = current.indexOf(columnKey)
        if (index === -1) {
          return current
        }
        const targetIndex = direction === 'left' ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= current.length) {
          return current
        }
        const nextOrder = [...current]
        const [moved] = nextOrder.splice(index, 1)
        nextOrder.splice(targetIndex, 0, moved)
        setNotice({ text: `列「${columnKey}」を移動しました。`, tone: 'success' })
        return nextOrder
      })
    },
    [],
  )

  const applyYamlBuffer = React.useCallback((): void => {
    try {
      const parsed = parseYamlTable(yamlBuffer)
      updateRows(parsed)
    } catch (error) {
      setNotice({ text: (error as Error).message, tone: 'error' })
      return
    }
    setNotice({ text: 'YAMLをテーブルに反映しました。', tone: 'success' })
  }, [yamlBuffer, updateRows])

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
          const parsed = parseYamlTable(content)
          updateRows(parsed)
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
    [updateRows],
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
    moveColumn,
    applyYamlBuffer,
    handleFileUpload,
    handleDownloadYaml,
    handleCopyYaml,
    handleCellChange,
  }
}
