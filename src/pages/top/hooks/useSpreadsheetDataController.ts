// File Header: Hook responsible for spreadsheet data state and YAML/column operations.
import React from 'react'
import {
  stringifyWorkbook,
  parseWorkbook,
  type TableRow,
  type TableSheet,
  cloneRow,
  createCell,
} from '../../../services/workbookService'
import { copyText } from '../../../services/clipboardService'
import { downloadTextFile, readFileAsText } from '../../../services/fileTransferService'
import { createLocalizedText, type LocalizedText, type Notice } from '../types'
import { useSheetState } from './internal/useSheetState'
import { createSheetState, stripSheetState } from './internal/spreadsheetDataUtils'
import { parseWorkbookAsync } from '../../../services/yamlWorkerClient'
import { stringifyWorkbookAsync } from '../../../services/yamlStringifyWorkerClient'
import { TABLE_STORAGE_KEY, BUFFER_STORAGE_KEY } from '../../../utils/storageKeys'

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
  handleDeleteSheet: (_index?: number) => void
  handleRenameSheet: (_index: number, _name: string) => void
  moveColumn: (_columnKey: string, _direction: 'left' | 'right') => void
  applyYamlBuffer: () => void
  ingestYamlContent: (
    _content: string,
    _options?: {
      successNotice?: LocalizedText
      errorNoticePrefix?: LocalizedText
    },
  ) => Promise<void>
  handleFileUpload: (_event: React.ChangeEvent<HTMLInputElement>) => void
  handleDownloadYaml: () => void
  handleCopyYaml: () => Promise<void>
  handleCellChange: (_rowIndex: number, _columnKey: string, _value: string) => void
}

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

  const parseAndApplyYaml = React.useCallback(
    async (
      content: string,
      options?: { successNotice?: LocalizedText; errorNoticePrefix?: LocalizedText },
    ): Promise<void> => {
      const requestId = Date.now()
      parseRequestIdRef.current = requestId
      setYamlBuffer(content)
      setNotice({ text: createLocalizedText('YAMLを解析しています…', 'Parsing YAML…'), tone: 'success' })

      try {
        const parsedSheets = await parseWorkbookAsync(content, {
          onParseStart: () => parseHooks?.onParseStart?.(),
          onParseSuccess: () => parseHooks?.onParseSuccess?.(),
          onParseError: (error: Error) => parseHooks?.onParseError?.(error),
        })

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
        setNotice({
          text:
            options?.successNotice ??
            createLocalizedText('YAMLをテーブルに反映しました。', 'Applied the YAML to the table.'),
          tone: 'success',
        })
      } catch (error) {
        if (parseRequestIdRef.current !== requestId) {
          throw error
        }
        const message = error instanceof Error ? error.message : String(error)
        const noticeText = options?.errorNoticePrefix
          ? {
              ja: `${options.errorNoticePrefix.ja}: ${message}`,
              en: `${options.errorNoticePrefix.en}: ${message}`,
            }
          : createLocalizedText(message, message)
        setNotice({ text: noticeText, tone: 'error' })
        throw error
      }
    },
    [parseHooks, parseRequestIdRef, replaceSheets, setActiveSheetIndex, setNotice, setYamlBuffer],
  )

  const applyYamlBuffer = React.useCallback((): void => {
    void parseAndApplyYaml(yamlBuffer).catch(() => {
      // Error notice already handled inside parseAndApplyYaml.
    })
  }, [parseAndApplyYaml, yamlBuffer])

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
          void parseAndApplyYaml(content, {
            successNotice: createLocalizedText('ファイルを読み込みました。', 'Loaded the file.'),
            errorNoticePrefix: createLocalizedText(
              'アップロードしたファイルを解析できませんでした',
              'Failed to parse the uploaded file',
            ),
          }).catch(() => {
            // Notice already handled in parseAndApplyYaml.
          })
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error)
          setNotice({
            text: createLocalizedText(
              `ファイルの読み込みに失敗しました: ${message}`,
              `Failed to read the file: ${message}`,
            ),
            tone: 'error',
          })
        })
    },
    [parseAndApplyYaml, setNotice],
  )

  const handleDownloadYaml = React.useCallback((): void => {
    downloadTextFile('table.yaml', tableYaml)
    setNotice({ text: createLocalizedText('table.yaml をダウンロードしました。', 'Downloaded table.yaml.'), tone: 'success' })
  }, [tableYaml])

  const handleCopyYaml = React.useCallback(async (): Promise<void> => {
    try {
      await copyText(tableYaml)
      setNotice({
        text: createLocalizedText('YAMLをクリップボードにコピーしました。', 'Copied the YAML to the clipboard.'),
        tone: 'success',
      })
    } catch {
      setNotice({
        text: createLocalizedText('クリップボードへのコピーに失敗しました。', 'Failed to copy to the clipboard.'),
        tone: 'error',
      })
    }
  }, [tableYaml])

  const handleCellChange = React.useCallback(
    (rowIndex: number, columnKey: string, value: string): void => {
      const nextRows = rows.map((row, index) => {
        if (index !== rowIndex) {
          return row
        }
        const nextRow = cloneRow(row)
        const existing = nextRow[columnKey] ?? createCell()
        const nextCell = {
          ...existing,
          value,
        }
        if (nextCell.func) {
          delete nextCell.func
        }
        nextRow[columnKey] = nextCell
        return nextRow
      })
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
    ingestYamlContent: parseAndApplyYaml,
    handleFileUpload,
    handleDownloadYaml,
    handleCopyYaml,
    handleCellChange,
  }
}
