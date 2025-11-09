// File Header: Hook responsible for spreadsheet data state and YAML/column operations.
import React from 'react'
import { stringifyWorkbook, parseWorkbook, type TableRow, type TableSheet } from '../../../services/workbookService'
import { copyText } from '../../../services/clipboardService'
import { downloadTextFile, readFileAsText } from '../../../services/fileTransferService'
import type { Notice } from '../types'
import { useSheetState } from './internal/useSheetState'
import { createSheetState, stripSheetState } from './internal/spreadsheetDataUtils'
import { parseWorkbookAsync } from '../../../services/yamlWorkerClient'
import { stringifyWorkbookAsync } from '../../../services/yamlStringifyWorkerClient'

type ParseLifecycleHooks = {
  onParseStart?: () => void
  onParseSuccess?: () => void
  onParseError?: (_error: Error) => void
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
  updateRows: (_rows: TableRow[]) => void
  handleAddRow: () => void
  handleAddColumn: () => void
  handleAddSheet: () => void
  handleDeleteSheet: () => void
  handleRenameSheet: (_name: string) => void
  moveColumn: (_columnKey: string, _direction: 'left' | 'right') => void
  applyYamlBuffer: () => void
  handleFileUpload: (_event: React.ChangeEvent<HTMLInputElement>) => void
  handleDownloadYaml: () => void
  handleCopyYaml: () => Promise<void>
  handleCellChange: (_rowIndex: number, _columnKey: string, _value: string) => void
}

const TABLE_STORAGE_KEY = 'gridelle:tableYaml'
const BUFFER_STORAGE_KEY = 'gridelle:yamlBuffer'

const readPersistedValue = (key: string): string | null => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null
  }
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

const writePersistedValue = (key: string, value: string): void => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // ignore storage write failures (quota, privacy mode, etc.)
  }
}

const removePersistedValue = (key: string): void => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }
  try {
    window.localStorage.removeItem(key)
  } catch {
    // noop
  }
}

// Function Header: Manages sheets/rows/YAML state and exposes primary data mutations.
export const useSpreadsheetDataController = (
  initialSheets: TableSheet[],
  parseHooks?: ParseLifecycleHooks,
): UseSpreadsheetDataController => {
  const persistenceDefaults = React.useMemo(() => {
    const fallbackYaml = stringifyWorkbook(createSheetState(initialSheets).map(stripSheetState))
    if (typeof window === 'undefined') {
      return {
        initialSheets,
        initialTableYaml: fallbackYaml,
        initialYamlBuffer: fallbackYaml,
      }
    }

    const storedTableYaml = readPersistedValue(TABLE_STORAGE_KEY)
    if (storedTableYaml) {
      try {
        const parsedSheets = parseWorkbook(storedTableYaml)
        const storedBuffer = readPersistedValue(BUFFER_STORAGE_KEY)
        return {
          initialSheets: parsedSheets,
          initialTableYaml: storedTableYaml,
          initialYamlBuffer: storedBuffer ?? storedTableYaml,
        }
      } catch {
        removePersistedValue(TABLE_STORAGE_KEY)
        removePersistedValue(BUFFER_STORAGE_KEY)
      }
    }

    return {
      initialSheets,
      initialTableYaml: fallbackYaml,
      initialYamlBuffer: fallbackYaml,
    }
  }, [initialSheets])

  const [notice, setNotice] = React.useState<Notice | null>(null)
  const [yamlBuffer, setYamlBuffer] = React.useState<string>(persistenceDefaults.initialYamlBuffer)

  const {
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
  } = useSheetState({ initialSheets: persistenceDefaults.initialSheets, setNotice })

  const parseRequestIdRef = React.useRef<number>(0)

  const sheetsMemo = React.useMemo(() => sheets.map(stripSheetState), [sheets])
  const [tableYaml, setTableYaml] = React.useState<string>(persistenceDefaults.initialTableYaml)

  React.useEffect(() => {
    let cancelled = false

    if (sheetsMemo.length === 0) {
      setTableYaml('[]\n')
      setYamlBuffer('[]\n')
      return
    }

    stringifyWorkbookAsync(sheetsMemo)
      .then((yaml) => {
        if (!cancelled) {
          setTableYaml(yaml)
          setYamlBuffer(yaml)
        }
      })
      .catch(() => {
        if (!cancelled) {
          const fallbackYaml = stringifyWorkbook(sheetsMemo)
          setTableYaml(fallbackYaml)
          setYamlBuffer(fallbackYaml)
        }
      })

    return () => {
      cancelled = true
    }
  }, [sheetsMemo, setYamlBuffer])

  React.useEffect(() => {
    writePersistedValue(TABLE_STORAGE_KEY, tableYaml)
  }, [tableYaml])

  React.useEffect(() => {
    writePersistedValue(BUFFER_STORAGE_KEY, yamlBuffer)
  }, [yamlBuffer])

  const applyYamlBuffer = React.useCallback((): void => {
    const requestId = Date.now()
    parseRequestIdRef.current = requestId
    setNotice({ text: 'YAMLを解析しています…', tone: 'success' })
    parseWorkbookAsync(yamlBuffer, {
      onParseStart: () => parseHooks?.onParseStart?.(),
      onParseSuccess: () => parseHooks?.onParseSuccess?.(),
      onParseError: (error: Error) => parseHooks?.onParseError?.(error),
    })
      .then((parsed) => {
        if (parseRequestIdRef.current !== requestId) {
          return
        }
        const next = createSheetState(parsed)
        replaceSheets(next)
        setActiveSheetIndex((prev) => {
          if (!next.length) {
            return 0
          }
          return Math.min(prev, next.length - 1)
        })
        setNotice({ text: 'YAMLをテーブルに反映しました。', tone: 'success' })
      })
      .catch((error) => {
        if (parseRequestIdRef.current !== requestId) {
          return
        }
        const message = error instanceof Error ? error.message : String(error)
        setNotice({ text: message, tone: 'error' })
      })
  }, [parseHooks, parseRequestIdRef, replaceSheets, setActiveSheetIndex, setNotice, yamlBuffer])

  const handleFileUpload = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const input = event.target
      const file = input.files?.[0]
      input.value = ''
      if (!file) {
        return
      }

      readFileAsText(file)
        .then((content) => {
          setYamlBuffer(content)
          const requestId = Date.now()
          parseRequestIdRef.current = requestId
          setNotice({ text: 'YAMLを解析しています…', tone: 'success' })
          return parseWorkbookAsync(content, {
            onParseStart: () => parseHooks?.onParseStart?.(),
            onParseSuccess: () => parseHooks?.onParseSuccess?.(),
            onParseError: (error: Error) => parseHooks?.onParseError?.(error),
          })
            .then((parsedSheets) => {
              if (parseRequestIdRef.current !== requestId) {
                return
              }
              const parsed = createSheetState(parsedSheets)
              replaceSheets(parsed)
              setActiveSheetIndex((prev) => {
                if (!parsed.length) {
                  return 0
                }
                return Math.min(prev, parsed.length - 1)
              })
              setNotice({ text: 'ファイルを読み込みました。', tone: 'success' })
            })
            .catch((error) => {
              if (parseRequestIdRef.current !== requestId) {
                return
              }
              setNotice({
                text: `アップロードしたファイルを解析できませんでした: ${
                  error instanceof Error ? error.message : String(error)
                }`,
                tone: 'error',
              })
            })
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error)
          setNotice({
            text: `ファイルの読み込みに失敗しました: ${message}`,
            tone: 'error',
          })
        })
    },
    [parseHooks, parseRequestIdRef, replaceSheets, setActiveSheetIndex, setNotice],
  )

  const handleDownloadYaml = React.useCallback((): void => {
    downloadTextFile('table.yaml', tableYaml)
    setNotice({ text: 'table.yaml をダウンロードしました。', tone: 'success' })
  }, [tableYaml])

  const handleCopyYaml = React.useCallback(async (): Promise<void> => {
    try {
      await copyText(tableYaml)
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
    sheets: sheetsMemo,
    activeSheetIndex,
    setActiveSheetIndex,
    rows,
    columns,
    columnOrder,
    setColumnOrder,
    updateRows,
    handleAddRow: addRow,
    handleAddColumn: addColumn,
    handleAddSheet: addSheet,
    handleDeleteSheet: deleteSheet,
    handleRenameSheet: renameSheet,
    moveColumn,
    applyYamlBuffer,
    handleFileUpload,
    handleDownloadYaml,
    handleCopyYaml,
    handleCellChange,
  }
}
