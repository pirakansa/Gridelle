// File Header: Ribbon section for loading WASM macros and applying them to selected cells.
import React from 'react'
import type { CellFunctionConfig } from '../../../services/workbookService'
import type { RegisteredFunctionMeta } from '../../../pages/top/utils/cellFunctionEngine'
import type { LoadedWasmModule } from '../../../services/wasmMacroService'
import type { SelectionRange } from '../../../pages/top/types'
import { useI18n } from '../../../utils/i18n'

type MacroSectionProps = {
  columns: string[]
  selectionRange: SelectionRange | null
  hasSelection: boolean
  availableFunctions: RegisteredFunctionMeta[]
  loadedModules: LoadedWasmModule[]
  onLoadModule: (_params: { moduleId: string; url: string }) => Promise<void>
  onApplyFunction: (_config: CellFunctionConfig | null) => void
}

const SAMPLE_MODULE_ID = 'sample_sum'
const SAMPLE_URL = '/macros/sample_sum.wasm'

type LocalizedMessage = {
  readonly ja: string
  readonly en: string
}

function createMessage(ja: string, en: string): LocalizedMessage {
  return { ja, en }
}

type InputMode = 'range' | 'cells'

type CellReferenceDraft = {
  id: string
  row: string
  columnKey: string
}

// Function Header: Renders controls for importing WASM modules and applying functions to selected cells.
export default function MacroSection({
  columns,
  selectionRange,
  hasSelection,
  availableFunctions,
  loadedModules,
  onLoadModule,
  onApplyFunction,
}: MacroSectionProps): React.ReactElement {
  const { select } = useI18n()
  const [moduleId, setModuleId] = React.useState<string>(SAMPLE_MODULE_ID)
  const [wasmUrl, setWasmUrl] = React.useState<string>(SAMPLE_URL)
  const [selectedFunctionId, setSelectedFunctionId] = React.useState<string>('')
  const [targetColumn, setTargetColumn] = React.useState<string>(columns[0] ?? '')
  const [rowStart, setRowStart] = React.useState<string>('')
  const [rowEnd, setRowEnd] = React.useState<string>('')
  const [inputMode, setInputMode] = React.useState<InputMode>('range')
  const cellRefSequence = React.useRef<number>(0)
  const [cellReferences, setCellReferences] = React.useState<CellReferenceDraft[]>([])
  const [status, setStatus] = React.useState<LocalizedMessage | null>(null)
  const [error, setError] = React.useState<LocalizedMessage | null>(null)
  const [isLoading, setLoading] = React.useState<boolean>(false)
  const inputModeFieldName = React.useId()

  const createCellReference = React.useCallback(
    (overrides?: Partial<Pick<CellReferenceDraft, 'row' | 'columnKey'>>): CellReferenceDraft => {
      const id = `cell-ref-${cellRefSequence.current}`
      cellRefSequence.current += 1
      return {
        id,
        row: '',
        columnKey: columns[0] ?? '',
        ...overrides,
      }
    },
    [cellRefSequence, columns],
  )

  React.useEffect(() => {
    setCellReferences((prev) => {
      if (!prev.length) {
        return prev
      }
      const fallback = columns[0] ?? ''
      let didChange = false
      const next = prev.map((ref) => {
        if (!ref.columnKey || !columns.includes(ref.columnKey)) {
          didChange = true
          return { ...ref, columnKey: fallback }
        }
        return ref
      })
      return didChange ? next : prev
    })
  }, [columns])

  const handleAddCellReference = React.useCallback(() => {
    setCellReferences((prev) => [...prev, createCellReference()])
    setInputMode('cells')
  }, [createCellReference])

  const handleRemoveCellReference = React.useCallback((id: string): void => {
    setCellReferences((prev) => prev.filter((ref) => ref.id !== id))
  }, [])

  const handleChangeCellReferenceRow = React.useCallback((id: string, value: string): void => {
    setCellReferences((prev) =>
      prev.map((ref) => (ref.id === id ? { ...ref, row: value } : ref)),
    )
  }, [])

  const handleChangeCellReferenceColumn = React.useCallback((id: string, value: string): void => {
    setCellReferences((prev) =>
      prev.map((ref) => (ref.id === id ? { ...ref, columnKey: value } : ref)),
    )
  }, [])

  const handleClearCellReferences = React.useCallback((): void => {
    setCellReferences([])
  }, [])

  const handleImportSelectionAsInputs = React.useCallback((): void => {
    setStatus(null)
    setError(null)
    if (!selectionRange) {
      setError(
        createMessage(
          '入力として追加するセル範囲を選択してください。',
          'Select the cells you want to add as inputs.',
        ),
      )
      return
    }
    const appended: CellReferenceDraft[] = []
    for (let rowIndex = selectionRange.startRow; rowIndex <= selectionRange.endRow; rowIndex += 1) {
      for (let columnIndex = selectionRange.startCol; columnIndex <= selectionRange.endCol; columnIndex += 1) {
        const columnKey = columns[columnIndex]
        if (!columnKey) {
          continue
        }
        appended.push(createCellReference({ row: String(rowIndex + 1), columnKey }))
      }
    }
    if (!appended.length) {
      setError(
        createMessage(
          '選択範囲に有効な列がありません。列を追加してから再度お試しください。',
          'The selection does not include valid columns. Add columns and try again.',
        ),
      )
      return
    }
    const existingKeys = new Set(cellReferences.map((ref) => `${ref.row}:${ref.columnKey}`))
    const deduped = appended.filter((ref) => {
      const key = `${ref.row}:${ref.columnKey}`
      if (existingKeys.has(key)) {
        return false
      }
      existingKeys.add(key)
      return true
    })
    if (!deduped.length) {
      setStatus(
        createMessage(
          '選択したセルはすでに入力リストに含まれています。',
          'The selected cells are already included in the input list.',
        ),
      )
      return
    }
    setCellReferences((prev) => [...prev, ...deduped])
    setInputMode('cells')
    setStatus(
      createMessage(
        '入力セルとして範囲を追加しました。結果を書き込むセルを再度選択してから適用してください。',
        'Added the selection as input cells. Reselect the destination cells before applying.',
      ),
    )
  }, [cellReferences, columns, createCellReference, selectionRange])

  React.useEffect(() => {
    if (!selectedFunctionId && availableFunctions.length) {
      setSelectedFunctionId(availableFunctions[0]?.id ?? '')
    }
  }, [availableFunctions, selectedFunctionId])

  React.useEffect(() => {
    if (!columns.length) {
      setTargetColumn('')
      return
    }
    if (!targetColumn) {
      setTargetColumn(columns[0] ?? '')
    } else if (!columns.includes(targetColumn)) {
      setTargetColumn(columns[0] ?? '')
    }
  }, [columns, targetColumn])

  const handleLoadModule = async (): Promise<void> => {
    setStatus(null)
    setError(null)
    setLoading(true)
    try {
      await onLoadModule({ moduleId, url: wasmUrl })
      setStatus(
        createMessage(
          `WASMモジュール「${moduleId}」を読み込みました。`,
          `Loaded WASM module "${moduleId}".`,
        ),
      )
    } catch (loadError) {
      const fallback = loadError instanceof Error ? loadError.message : String(loadError)
      setError(createMessage(fallback, fallback))
    } finally {
      setLoading(false)
    }
  }

  const handleApplyFunction = (): void => {
    setStatus(null)
    setError(null)
    if (!hasSelection) {
      setError(createMessage('関数を適用するセルを選択してください。', 'Select cells before applying a function.'))
      return
    }
    if (!selectedFunctionId) {
      setError(createMessage('適用する関数を選択してください。', 'Choose a function to apply.'))
      return
    }
    if (inputMode === 'cells') {
      if (!cellReferences.length) {
        setError(
          createMessage('入力セルを最低1つ追加してください。', 'Add at least one input cell before applying.'),
        )
        return
      }
      let hasInvalidReference = false
      const normalizedCells = cellReferences
        .map((reference) => {
          const columnKey = reference.columnKey?.trim()
          const parsedRow = Number(reference.row)
          if (!columnKey || !Number.isFinite(parsedRow) || parsedRow < 1) {
            hasInvalidReference = true
            return null
          }
          return {
            row: Math.round(parsedRow),
            key: columnKey,
          }
        })
        .filter((entry): entry is { row: number; key: string } => entry !== null)

      if (!normalizedCells.length) {
        setError(
          createMessage('入力セルを最低1つ追加してください。', 'Add at least one input cell before applying.'),
        )
        return
      }

      if (hasInvalidReference) {
        setError(
          createMessage(
            '入力セルの行番号と列を確認してください。',
            'Check the row numbers and columns for the input cells.',
          ),
        )
        return
      }

      onApplyFunction({
        name: selectedFunctionId,
        args: {
          cells: normalizedCells,
        },
      })
      return
    }

    if (!targetColumn) {
      setError(createMessage('対象となる列を選択してください。', 'Select a target column.'))
      return
    }
    const args: Record<string, unknown> = { key: targetColumn }
    const rowsConfig: Record<string, number> = {}

    if (rowStart.trim()) {
      const parsed = Number(rowStart)
      if (!Number.isFinite(parsed)) {
        setError(createMessage('開始行には数値を入力してください。', 'Enter a numeric start row.'))
        return
      }
      rowsConfig.start = parsed
    }
    if (rowEnd.trim()) {
      const parsed = Number(rowEnd)
      if (!Number.isFinite(parsed)) {
        setError(createMessage('終了行には数値を入力してください。', 'Enter a numeric end row.'))
        return
      }
      rowsConfig.end = parsed
    }

    if (Object.keys(rowsConfig).length) {
      args.rows = rowsConfig
    }

    const config: CellFunctionConfig = {
      name: selectedFunctionId,
      ...(Object.keys(args).length ? { args } : {}),
    }
    onApplyFunction(config)
  }

  const handleClearFunction = (): void => {
    setStatus(null)
    setError(null)
    onApplyFunction(null)
  }

  const renderLoadedModules = (): React.ReactElement => {
    if (!loadedModules.length) {
      return (
        <p className="text-sm text-slate-500">
          {select('読み込まれたWASMモジュールはありません。', 'No WASM modules have been loaded yet.')}
        </p>
      )
    }
    return (
      <ul className="space-y-1 text-sm text-slate-600" data-testid="loaded-wasm-list">
        {loadedModules.map((module) => (
          <li key={module.id}>
            <span className="font-semibold text-slate-800">{module.id}</span> ({module.exports.join(', ')})
          </li>
        ))}
      </ul>
    )
  }

  const statusText = status ? select(status.ja, status.en) : null
  const errorText = error ? select(error.ja, error.en) : null

  return (
    <section aria-label={select('関数 / マクロ', 'Functions / macros')}>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-900">
            {select('WASMモジュールを読み込む', 'Load a WASM module')}
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            {select(
              '外部のWASMファイルを読み込むと、エクスポートされた関数をセルマクロとして利用できます。サンプルとして',
              'Load an external WASM file to use its exported functions as cell macros. Sample module:',
            )}
            <code className="ml-1 font-mono text-xs text-slate-800">{SAMPLE_URL}</code>
            {select(' を用意しています。', ' is available.')}
          </p>
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              {select('モジュールID', 'Module ID')}
              <input
                type="text"
                value={moduleId}
                onChange={(event) => setModuleId(event.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="sample_sum"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              {select('WASMファイルURL', 'WASM file URL')}
              <input
                type="text"
                value={wasmUrl}
                onChange={(event) => setWasmUrl(event.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="/macros/sample_sum.wasm"
              />
            </label>
            <button
              type="button"
              className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              onClick={handleLoadModule}
              disabled={isLoading}
              data-testid="load-wasm-button"
            >
              {isLoading
                ? select('読み込み中…', 'Loading…')
                : select('WASMを読み込む', 'Load WASM')}
            </button>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <h4 className="text-xs font-semibold text-slate-700">
              {select('読み込み済みモジュール', 'Loaded modules')}
            </h4>
            {renderLoadedModules()}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-900">
            {select('関数を選択セルに適用', 'Apply a function to the selection')}
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            {select(
              '結果を書き込むセルを先に選択してから設定します。列方向の集計か、特定セルの参照かを切り替えて操作できます。',
              'Select the destination cells first, then decide whether to aggregate a range or reference explicit cells.',
            )}
          </p>
          <div className="mt-4 space-y-4">
            <label className="block text-xs font-semibold text-slate-700">
              {select('利用可能な関数', 'Available functions')}
              <select
                value={selectedFunctionId}
                onChange={(event) => setSelectedFunctionId(event.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                data-testid="macro-function-select"
              >
                {availableFunctions.length === 0 && (
                  <option value="">{select('関数が登録されていません', 'No functions registered')}</option>
                )}
                {availableFunctions.map((fn) => (
                  <option key={fn.id} value={fn.id}>
                    {fn.label}
                  </option>
                ))}
              </select>
            </label>
            <fieldset>
              <legend className="text-xs font-semibold text-slate-700">
                {select('入力タイプ', 'Input mode')}
              </legend>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-700">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name={inputModeFieldName}
                    value="range"
                    checked={inputMode === 'range'}
                    onChange={() => setInputMode('range')}
                  />
                  {select('列や行の範囲を集計', 'Aggregate a column or range')}
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name={inputModeFieldName}
                    value="cells"
                    checked={inputMode === 'cells'}
                    onChange={() => setInputMode('cells')}
                  />
                  {select('個別セルを参照', 'Reference explicit cells')}
                </label>
              </div>
            </fieldset>
            {inputMode === 'range' ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  {select(
                    '列全体または行範囲をまとめて計算する場合はこちらを利用します。',
                    'Use this mode when applying aggregate macros across a column or row range.',
                  )}
                </p>
                <label className="block text-xs font-semibold text-slate-700">
                  {select('対象列', 'Target column')}
                  <select
                    value={targetColumn}
                    onChange={(event) => setTargetColumn(event.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    data-testid="macro-column-select"
                  >
                    {columns.length === 0 && <option value="">{select('列がありません', 'No columns')}</option>}
                    {columns.map((column) => (
                      <option key={column} value={column}>
                        {column}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    {select('開始行（任意）', 'Start row (optional)')}
                    <input
                      type="number"
                      min={1}
                      value={rowStart}
                      onChange={(event) => setRowStart(event.target.value)}
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="1"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-slate-700">
                    {select('終了行（任意）', 'End row (optional)')}
                    <input
                      type="number"
                      min={1}
                      value={rowEnd}
                      onChange={(event) => setRowEnd(event.target.value)}
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="10"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  {select(
                    '特定のセル同士を掛け算するなど、参照元を細かく指定したい場合はこちらを利用します。',
                    'Use this mode to reference explicit cells (e.g., multiply column A and B cells).',
                  )}
                </p>
                {cellReferences.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    {select(
                      '入力セルが未設定です。「セルを追加」または「選択セルを入力に追加」を押してください。',
                      'No input cells configured yet. Use "Add a cell" or "Add selection as inputs".',
                    )}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {cellReferences.map((reference, index) => (
                      <div
                        key={reference.id}
                        className="flex flex-wrap items-end gap-3 rounded border border-slate-200 p-3"
                      >
                        <div className="flex flex-1 flex-wrap gap-3">
                          <label className="block text-xs font-semibold text-slate-700">
                            {select('行番号', 'Row number')}
                            <input
                              type="number"
                              min={1}
                              value={reference.row}
                              onChange={(event) => handleChangeCellReferenceRow(reference.id, event.target.value)}
                              className="mt-1 w-32 rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                              placeholder={String(index + 1)}
                            />
                          </label>
                          <label className="block text-xs font-semibold text-slate-700">
                            {select('列', 'Column')}
                            <select
                              value={reference.columnKey}
                              onChange={(event) =>
                                handleChangeCellReferenceColumn(reference.id, event.target.value)
                              }
                              className="mt-1 min-w-[8rem] rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            >
                              {columns.length === 0 && <option value="">{select('列がありません', 'No columns')}</option>}
                              {columns.map((column) => (
                                <option key={column} value={column}>
                                  {column}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <button
                          type="button"
                          className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          onClick={() => handleRemoveCellReference(reference.id)}
                        >
                          {select('削除', 'Remove')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    onClick={handleAddCellReference}
                    disabled={!columns.length}
                  >
                    {select('セルを追加', 'Add a cell')}
                  </button>
                  <button
                    type="button"
                    className="rounded border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                    onClick={handleImportSelectionAsInputs}
                    disabled={!selectionRange || !columns.length}
                  >
                    {select('選択セルを入力に追加', 'Add selection as inputs')}
                  </button>
                  <button
                    type="button"
                    className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    onClick={handleClearCellReferences}
                    disabled={!cellReferences.length}
                  >
                    {select('入力セルをクリア', 'Clear input cells')}
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  {select(
                    '入力セルを追加した後は、もう一度結果を書き込むセルを選択してから「選択セルに適用」を押してください。',
                    'After adding input cells, reselect the destination cells before applying the function.',
                  )}
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
                onClick={handleApplyFunction}
                disabled={!hasSelection}
                data-testid="apply-macro-button"
              >
                {select('選択セルに適用', 'Apply to selection')}
              </button>
              <button
                type="button"
                className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={handleClearFunction}
              >
                {select('関数をクリア', 'Clear function')}
              </button>
            </div>
          </div>
        </div>
      </div>
      {(statusText || errorText) && (
        <p
          className={`mt-4 text-sm ${errorText ? 'text-red-600' : 'text-emerald-600'}`}
          role={errorText ? 'alert' : 'status'}
        >
          {errorText ?? statusText}
        </p>
      )}
    </section>
  )
}
