// File Header: Top page rendering the YAML-driven spreadsheet preview.
import React from 'react'
import { layoutTheme } from '../../utils/Theme'
import {
  deriveColumns,
  parseYamlTable,
  stringifyYamlTable,
  type TableRow,
} from '../../utils/yamlTable'

type CellPosition = { rowIndex: number; columnIndex: number }
type SelectionRange = {
  startRow: number
  endRow: number
  startCol: number
  endCol: number
}

const buildSelectionRange = (start: CellPosition, end: CellPosition): SelectionRange => ({
  startRow: Math.min(start.rowIndex, end.rowIndex),
  endRow: Math.max(start.rowIndex, end.rowIndex),
  startCol: Math.min(start.columnIndex, end.columnIndex),
  endCol: Math.max(start.columnIndex, end.columnIndex),
})

const isCellWithinRange = (
  selection: SelectionRange | null,
  rowIndex: number,
  columnIndex: number,
): boolean => {
  if (!selection) {
    return false
  }
  return (
    rowIndex >= selection.startRow &&
    rowIndex <= selection.endRow &&
    columnIndex >= selection.startCol &&
    columnIndex <= selection.endCol
  )
}

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

const DEFAULT_ROWS: TableRow[] = [
  { feature: 'テーブル編集', owner: 'Alice', status: 'READY', effort: '3' },
  { feature: 'YAML Export', owner: 'Bob', status: 'REVIEW', effort: '5' },
]
const DEFAULT_YAML = stringifyYamlTable(DEFAULT_ROWS)

const primaryButton =
  'rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500'
const ghostButton =
  'rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800 disabled:border-slate-200 disabled:text-slate-400'
const columnIconButton =
  'rounded-full border border-slate-200 p-1 text-[10px] text-slate-500 transition hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent'
const copyCellButton =
  'inline-flex items-center rounded-full border border-transparent px-2 text-xs text-slate-400 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-blue-200'
const subtleButton =
  'rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 disabled:opacity-50'

// Function Header: Builds the interactive YAML table playground described in README.md.
export default function App(): React.ReactElement {
  const [yamlBuffer, setYamlBuffer] = React.useState<string>(DEFAULT_YAML)
  const [rows, setRows] = React.useState<TableRow[]>(() =>
    DEFAULT_ROWS.map((row) => ({ ...row })),
  )
  const [columnOrder, setColumnOrder] = React.useState<string[]>(() => deriveColumns(DEFAULT_ROWS))
  const [notice, setNotice] = React.useState<{ text: string; tone: 'error' | 'success' } | null>(
    null,
  )
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
  const activeRange = fillPreview ?? selection
  const selectedCellCount = activeRange
    ? (activeRange.endRow - activeRange.startRow + 1) *
      (activeRange.endCol - activeRange.startCol + 1)
    : 0
  const selectionSummary = activeRange
    ? `${selectedCellCount}セル選択中 (R${activeRange.startRow + 1}〜${activeRange.endRow + 1}, C${
        activeRange.startCol + 1
      }〜${activeRange.endCol + 1})`
    : 'セルをクリックまたはドラッグして選択'

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
    [columns, rows, selection],
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
      setSelection(null)
      setAnchorCell(null)
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
  }, [rows.length, columns.length, selection])

  const getSelectionAnchor = (): CellPosition => {
    if (selection) {
      return { rowIndex: selection.startRow, columnIndex: selection.startCol }
    }
    if (anchorCell) {
      return anchorCell
    }
    return { rowIndex: 0, columnIndex: 0 }
  }

  const clearSelection = (): void => {
    setSelection(null)
    setAnchorCell(null)
    setIsSelecting(false)
    setIsFillDragActive(false)
    setFillPreview(null)
  }

  const beginSelection = (position: CellPosition, preserveAnchor = false): void => {
    const baseAnchor = preserveAnchor ? getSelectionAnchor() : position
    setAnchorCell(baseAnchor)
    setSelection(buildSelectionRange(baseAnchor, position))
    setIsSelecting(true)
  }

  const extendSelection = (position: CellPosition): void => {
    const base = anchorCell ?? getSelectionAnchor()
    setSelection(buildSelectionRange(base, position))
  }

  const applyYamlBuffer = (): void => {
    try {
      const parsed = parseYamlTable(yamlBuffer)
      updateRows(parsed)
    } catch (error) {
      setNotice({ text: (error as Error).message, tone: 'error' })
      return
    }
    setNotice({ text: 'YAMLをテーブルに反映しました。', tone: 'success' })
  }

  const updateRows = (nextRows: TableRow[]): void => {
    setRows(nextRows)
    setYamlBuffer(stringifyYamlTable(nextRows))
    setNotice(null)
  }

  const handleCellChange = (rowIndex: number, columnKey: string, value: string): void => {
    const nextRows = rows.map((row, index) =>
      index === rowIndex ? { ...row, [columnKey]: value } : row,
    )
    updateRows(nextRows)
  }

  const handleAddRow = (): void => {
    const baseColumns = columns.length ? columns : ['column_1']
    const newRow: TableRow = baseColumns.reduce((acc, key) => {
      acc[key] = ''
      return acc
    }, {} as TableRow)
    updateRows([...rows, newRow])
  }

  const handleDeleteRow = (rowIndex: number): void => {
    const nextRows = rows.filter((_, index) => index !== rowIndex)
    updateRows(nextRows)
  }

  const handleAddColumn = (): void => {
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
  }

  const handleCellPointerDown = (
    event: React.PointerEvent<HTMLTableCellElement>,
    rowIndex: number,
    columnIndex: number,
  ): void => {
    if (isFillDragActive) {
      return
    }
    if (event.button !== 0) {
      return
    }
    const cellPosition: CellPosition = { rowIndex, columnIndex }
    if (event.shiftKey) {
      beginSelection(cellPosition, true)
      return
    }
    beginSelection(cellPosition)
  }

  const handleCellPointerEnter = (rowIndex: number, columnIndex: number): void => {
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
  }

  const handleCellClick = (
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
  }

  const handleTableKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      clearSelection()
    }
  }

  const startFillDrag = (event: React.PointerEvent<HTMLButtonElement>): void => {
    event.preventDefault()
    event.stopPropagation()
    if (!selection) {
      setNotice({ text: 'フィル対象のセルを選択してください。', tone: 'error' })
      return
    }
    setIsFillDragActive(true)
    setFillPreview(selection)
  }

  const moveColumn = (columnKey: string, direction: 'left' | 'right'): void => {
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
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>): void => {
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
  }

  const handleDownloadYaml = (): void => {
    const blob = new Blob([tableYaml], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'table.yaml'
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice({ text: 'table.yaml をダウンロードしました。', tone: 'success' })
  }

  const handleCopyYaml = async (): Promise<void> => {
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
  }

  const handleCopyCell = async (value: string): Promise<void> => {
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
  }

  const applyBulkInput = (): void => {
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
  }

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>): void => {
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
    applyMatrixToTable(matrix, start.rowIndex, start.columnIndex)
  }

  const applyMatrixToTable = (matrix: string[][], startRow: number, startCol: number): void => {
    const widths = matrix.map((row) => (row.length ? row.length : 1))
    const requiredRows = startRow + matrix.length
    const requiredColumns = startCol + Math.max(...widths)

    let nextColumns = ensureColumnCapacity(columns, requiredColumns)
    let nextRows = syncRowsToColumns(rows, nextColumns)
    while (nextRows.length < requiredRows) {
      nextRows = [...nextRows, createEmptyRow(nextColumns)]
    }

    matrix.forEach((rowValues, rowOffset) => {
      const targetRowIndex = startRow + rowOffset
      const updatedRow = { ...nextRows[targetRowIndex] }
      rowValues.forEach((value, columnOffset) => {
        const targetColumnIndex = startCol + columnOffset
        const columnKey = nextColumns[targetColumnIndex]
        updatedRow[columnKey] = value
      })
      nextRows[targetRowIndex] = updatedRow
    })

    setColumnOrder(nextColumns)
    updateRows(nextRows)
    setSelection({
      startRow,
      endRow: startRow + matrix.length - 1,
      startCol,
      endCol: startCol + Math.max(...widths) - 1,
    })
    setAnchorCell({ rowIndex: startRow, columnIndex: startCol })
    setNotice({ text: '貼り付けを適用しました。', tone: 'success' })
  }

  return (
    <div className={layoutTheme.pageShell}>
      <main className={layoutTheme.contentWrapper}>
        <header className="flex flex-col gap-4">
          <span className="inline-flex w-fit rounded-full bg-blue-50 px-4 py-1 text-xs font-semibold text-blue-600">
            YAML ⇄ Table Preview
          </span>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">YAMLテーブルサンドボックス</h1>
            <p className="text-slate-600">
              READMEで定義した「YAMLをインポートし、スプレッドシート風に編集して再びYAMLに戻す」ための最小バージョンです。
            </p>
          </div>
        </header>

        <section className={layoutTheme.card}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="yaml-input" className={layoutTheme.sectionTitle}>
                YAML入力 / プレビュー
              </label>
              <textarea
                id="yaml-input"
                aria-label="YAML入力エリア"
                data-testid="yaml-textarea"
                value={yamlBuffer}
                onChange={(event) => setYamlBuffer(event.target.value)}
                className="h-56 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 font-mono text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                spellCheck={false}
              />
              <p className={layoutTheme.helperText}>
                直接編集して「YAMLを反映」ボタンを押すか、ファイルを読み込んでテーブルに変換してください。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={primaryButton}
                onClick={applyYamlBuffer}
                disabled={!yamlBuffer.trim()}
              >
                YAMLを反映
              </button>
              <label className={`${ghostButton} cursor-pointer`}>
                YAMLファイルを読み込む
                <input
                  type="file"
                  accept=".yml,.yaml,.json,text/yaml"
                  className="sr-only"
                  onChange={handleFileUpload}
                />
              </label>
              <button
                type="button"
                className={ghostButton}
                onClick={handleDownloadYaml}
                disabled={!rows.length}
              >
                YAMLをダウンロード
              </button>
              <button
                type="button"
                className={ghostButton}
                onClick={handleCopyYaml}
                disabled={!rows.length}
              >
                YAMLをコピー
              </button>
            </div>

            {notice && (
              <p
                className={`text-sm ${
                  notice.tone === 'error' ? 'text-red-600' : 'text-emerald-600'
                }`}
                role={notice.tone === 'error' ? 'alert' : 'status'}
              >
                {notice.text}
              </p>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className={layoutTheme.card}>
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <h2 className={layoutTheme.sectionTitle}>テーブル編集</h2>
                <p className={layoutTheme.helperText}>セルを直接編集できます。</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" className={primaryButton} onClick={handleAddRow}>
                  行を追加
                </button>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="列名を入力"
                    value={newColumnName}
                    onChange={(event) => setNewColumnName(event.target.value)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <button type="button" className={ghostButton} onClick={handleAddColumn}>
                    列を追加
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <p data-testid="selection-summary" className="font-medium text-slate-700">
                {selectionSummary}
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>⌘/Ctrl+V で貼り付け / Escape で選択解除</span>
                <button
                  type="button"
                  className={subtleButton}
                  onClick={clearSelection}
                  disabled={!selection && !anchorCell}
                >
                  選択をクリア
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="選択セルへ一括入力"
                value={bulkValue}
                onChange={(event) => setBulkValue(event.target.value)}
                className="min-w-[200px] flex-1 rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                data-testid="bulk-input"
                onPointerDown={(event) => event.stopPropagation()}
              />
              <button
                type="button"
                className={ghostButton}
                onClick={applyBulkInput}
                disabled={!selection}
                data-testid="bulk-apply"
              >
                一括入力する
              </button>
            </div>
            <div
              className={`${layoutTheme.tableScroll} mt-6`}
              tabIndex={0}
              role="region"
              aria-label="スプレッドシートエリア"
              onPaste={handlePaste}
              onKeyDown={handleTableKeyDown}
              data-testid="interactive-table-shell"
            >
              {rows.length ? (
                <table className="spreadsheet-table">
                  <thead>
                    <tr>
                      {columns.map((column, columnIndex) => (
                        <th key={column} data-testid="column-header">
                          <div className="flex items-center gap-2">
                            <span data-testid="column-title" className="font-semibold">
                              {column}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                className={columnIconButton}
                                aria-label={`${column}列を左へ移動`}
                                onClick={() => moveColumn(column, 'left')}
                                disabled={columnIndex === 0}
                              >
                                ←
                              </button>
                              <button
                                type="button"
                                className={columnIconButton}
                                aria-label={`${column}列を右へ移動`}
                                onClick={() => moveColumn(column, 'right')}
                                disabled={columnIndex === columns.length - 1}
                              >
                                →
                              </button>
                            </div>
                          </div>
                        </th>
                      ))}
                      <th aria-label="actions">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rowIndex) => (
                      <tr key={`row-${rowIndex}`} className="border-t border-slate-200">
                        {columns.map((column, columnIndex) => {
                          const isInActiveRange =
                            activeRange !== null
                              ? isCellWithinRange(activeRange, rowIndex, columnIndex)
                              : false
                          const isInBaseSelection =
                            selection !== null
                              ? isCellWithinRange(selection, rowIndex, columnIndex)
                              : false
                          const cellClassNames = [
                            'border border-slate-200',
                            isInActiveRange ? 'selected-cell' : '',
                            fillPreview && isInActiveRange && !isInBaseSelection
                              ? 'fill-preview-cell'
                              : '',
                          ]
                            .filter(Boolean)
                            .join(' ')
                          return (
                            <td
                              key={`${column}-${rowIndex}`}
                              className={cellClassNames}
                              data-testid={`cell-box-${rowIndex}-${column}`}
                              data-selected={isInActiveRange ? 'true' : undefined}
                              onPointerDown={(event) =>
                                handleCellPointerDown(event, rowIndex, columnIndex)
                              }
                              onPointerEnter={() => handleCellPointerEnter(rowIndex, columnIndex)}
                              onClick={(event) => handleCellClick(event, rowIndex, columnIndex)}
                            >
                              <div className="relative flex items-center gap-1 px-1">
                                <input
                                  type="text"
                                  value={row[column] ?? ''}
                                  onChange={(event) =>
                                    handleCellChange(rowIndex, column, event.target.value)
                                  }
                                  data-testid={`cell-${rowIndex}-${column}`}
                                  className="w-full flex-1 border-none bg-transparent px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                                  onPointerDown={(event) => event.stopPropagation()}
                                />
                                <button
                                  type="button"
                                  className={copyCellButton}
                                  aria-label={`行${rowIndex + 1}列${column}をコピー`}
                                  data-testid={`copy-${rowIndex}-${column}`}
                                  onClick={() => handleCopyCell(row[column] ?? '')}
                                  onPointerDown={(event) => event.stopPropagation()}
                                >
                                  ⧉
                                </button>
                                {selection &&
                                  !isFillDragActive &&
                                  rowIndex === selection.endRow &&
                                  columnIndex === selection.endCol && (
                                    <button
                                      type="button"
                                      className="fill-handle"
                                      aria-label="塗りつぶしハンドル"
                                      data-testid="fill-handle"
                                      onPointerDown={startFillDrag}
                                    />
                                  )}
                              </div>
                            </td>
                          )
                        })}
                        <td className="border border-slate-200 text-center">
                          <button
                            type="button"
                            aria-label={`行${rowIndex + 1}を削除`}
                            className="text-xs font-semibold text-red-500 hover:text-red-600"
                            onClick={() => handleDeleteRow(rowIndex)}
                          >
                            削除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-slate-500">
                  <p>表示するデータがありません。</p>
                  <p>YAMLを読み込むか、行・列を追加して開始してください。</p>
                </div>
              )}
            </div>
          </div>

          <section className={layoutTheme.card}>
            <h2 className={layoutTheme.sectionTitle}>出力YAML</h2>
            <p className={layoutTheme.helperText}>現在のテーブル状態を常に反映します。</p>
            <pre className="mt-4 overflow-auto rounded-2xl bg-slate-900 p-4 text-sm text-slate-100">
              {tableYaml}
            </pre>
          </section>
        </section>
      </main>
    </div>
  )
}
