// File Header: Custom hook encapsulating spreadsheet state, selection, and editing behaviors.
import React from 'react'
import {
  deriveColumns,
  parseYamlTable,
  stringifyYamlTable,
  type TableRow,
} from '../../utils/yamlTable'

type Notice = { text: string; tone: 'error' | 'success' }

export type CellPosition = { rowIndex: number; columnIndex: number }
export type SelectionRange = {
  startRow: number
  endRow: number
  startCol: number
  endCol: number
}

const DEFAULT_ROWS: TableRow[] = [
  { feature: 'テーブル編集', owner: 'Alice', status: 'READY', effort: '3' },
  { feature: 'YAML Export', owner: 'Bob', status: 'REVIEW', effort: '5' },
]

const buildSelectionRange = (start: CellPosition, end: CellPosition): SelectionRange => ({
  startRow: Math.min(start.rowIndex, end.rowIndex),
  endRow: Math.max(start.rowIndex, end.rowIndex),
  startCol: Math.min(start.columnIndex, end.columnIndex),
  endCol: Math.max(start.columnIndex, end.columnIndex),
})

const createEmptyRow = (columnKeys: string[]): TableRow =>
  columnKeys.reduce((acc, key) => {
    acc[key] = ''
    return acc
  }, {} as TableRow)

const ensureColumnCapacity = (columnKeys: string[], targetLength: number): string[] => {
  const nextColumns = [...columnKeys]
  while (nextColumns.length < targetLength) {
    nextColumns.push(`column_${nextColumns.length + 1}`)
  }
  return nextColumns
}

const syncRowsToColumns = (sourceRows: TableRow[], columnKeys: string[]): TableRow[] =>
  sourceRows.map((row) => {
    const nextRow: TableRow = { ...row }
    columnKeys.forEach((key) => {
      if (nextRow[key] === undefined) {
        nextRow[key] = ''
      }
    })
    return nextRow
  })

const stringifySelection = (selection: SelectionRange | null): string => {
  if (!selection) {
    return 'セルをクリックまたはドラッグして選択'
  }
  const count =
    (selection.endRow - selection.startRow + 1) * (selection.endCol - selection.startCol + 1)
  return `${count}セル選択中 (R${selection.startRow + 1}〜${selection.endRow + 1}, C${
    selection.startCol + 1
  }〜${selection.endCol + 1})`
}

// Function Header: Manages spreadsheet state transitions, exposing handlers for App UI.
export function useSpreadsheetState(): {
  notice: Notice | null
  yamlBuffer: string
  setYamlBuffer: React.Dispatch<React.SetStateAction<string>>
  tableYaml: string
  rows: TableRow[]
  columns: string[]
  newColumnName: string
  setNewColumnName: React.Dispatch<React.SetStateAction<string>>
  handleAddRow: () => void
  handleAddColumn: () => void
  handleDeleteRow: (_rowIndex: number) => void
  moveColumn: (_columnKey: string, _direction: 'left' | 'right') => void
  applyYamlBuffer: () => void
  handleFileUpload: (_event: React.ChangeEvent<HTMLInputElement>) => void
  handleDownloadYaml: () => void
  handleCopyYaml: () => Promise<void>
  bulkValue: string
  setBulkValue: React.Dispatch<React.SetStateAction<string>>
  applyBulkInput: () => void
  selection: SelectionRange | null
  activeRange: SelectionRange | null
  selectionSummary: string
  fillPreview: SelectionRange | null
  clearSelection: () => void
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
  handleTableKeyDown: (_event: React.KeyboardEvent<HTMLDivElement>) => void
  startFillDrag: (_event: React.PointerEvent<HTMLButtonElement>) => void
  handleCellChange: (_rowIndex: number, _column: string, _value: string) => void
  handleCopyCell: (_value: string) => Promise<void>
  handlePaste: (_event: React.ClipboardEvent<HTMLDivElement>) => void
  isFillDragActive: boolean
} {
  const [yamlBuffer, setYamlBuffer] = React.useState<string>(stringifyYamlTable(DEFAULT_ROWS))
  const [rows, setRows] = React.useState<TableRow[]>(() =>
    DEFAULT_ROWS.map((row) => ({ ...row })),
  )
  const [columnOrder, setColumnOrder] = React.useState<string[]>(() => deriveColumns(DEFAULT_ROWS))
  const [notice, setNotice] = React.useState<Notice | null>(null)
  const [newColumnName, setNewColumnName] = React.useState<string>('')
  const [selection, setSelection] = React.useState<SelectionRange | null>(null)
  const [anchorCell, setAnchorCell] = React.useState<CellPosition | null>(null)
  const [isSelecting, setIsSelecting] = React.useState<boolean>(false)
  const [bulkValue, setBulkValue] = React.useState<string>('')
  const [isFillDragActive, setIsFillDragActive] = React.useState<boolean>(false)
  const [fillPreview, setFillPreview] = React.useState<SelectionRange | null>(null)

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

  const getSelectionAnchor = React.useCallback((): CellPosition => {
    if (selection) {
      return { rowIndex: selection.startRow, columnIndex: selection.startCol }
    }
    if (anchorCell) {
      return anchorCell
    }
    return { rowIndex: 0, columnIndex: 0 }
  }, [selection, anchorCell])

  const updateRows = React.useCallback(
    (nextRows: TableRow[]) => {
      setRows(nextRows)
      setYamlBuffer(stringifyYamlTable(nextRows))
      setNotice(null)
    },
    [setRows],
  )

  const clearSelection = React.useCallback(() => {
    setSelection(null)
    setAnchorCell(null)
    setIsSelecting(false)
    setIsFillDragActive(false)
    setFillPreview(null)
  }, [])

  const beginSelection = React.useCallback(
    (position: CellPosition, preserveAnchor = false) => {
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

  const handleCellChange = React.useCallback(
    (rowIndex: number, columnKey: string, value: string): void => {
      const nextRows = rows.map((row, index) => (index === rowIndex ? { ...row, [columnKey]: value } : row))
      updateRows(nextRows)
    },
    [rows, updateRows],
  )

  const handleAddRow = React.useCallback((): void => {
    const baseColumns = columns.length ? columns : ['column_1']
    const newRow: TableRow = baseColumns.reduce((acc, key) => {
      acc[key] = ''
      return acc
    }, {} as TableRow)
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

  const handleCopyCell = React.useCallback(async (value: string): Promise<void> => {
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
  }, [])

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
  }, [bulkValue, columns, rows, selection, updateRows])

  const applyFillDown = React.useCallback(
    (targetEndRow: number) => {
      if (!selection) {
        return
      }
      if (targetEndRow <= selection.endRow) {
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
      setAnchorCell((prev) =>
        prev ? { rowIndex: prev.rowIndex, columnIndex: prev.columnIndex } : null,
      )
      setNotice({ text: 'フィルを適用しました。', tone: 'success' })
    },
    [columns, rows, selection, updateRows],
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

  const handleTableKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>): void => {
      if (event.key === 'Escape') {
        clearSelection()
      }
    },
    [clearSelection],
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
    [selection],
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
    [columns, rows, getSelectionAnchor, updateRows],
  )

  const activeRange = fillPreview ?? selection
  const selectionSummary = stringifySelection(activeRange)

  return {
    notice,
    yamlBuffer,
    setYamlBuffer,
    tableYaml,
    rows,
    columns,
    newColumnName,
    setNewColumnName,
    handleAddRow,
    handleAddColumn,
    handleDeleteRow,
    moveColumn,
    applyYamlBuffer,
    handleFileUpload,
    handleDownloadYaml,
    handleCopyYaml,
    bulkValue,
    setBulkValue,
    applyBulkInput,
    selection,
    activeRange,
    fillPreview,
    selectionSummary,
    clearSelection,
    handleCellPointerDown,
    handleCellPointerEnter,
    handleCellClick,
    handleTableKeyDown,
    startFillDrag,
    handleCellChange,
    handleCopyCell,
    handlePaste,
    isFillDragActive,
  }
}
