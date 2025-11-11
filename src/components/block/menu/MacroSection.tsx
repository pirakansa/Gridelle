// File Header: Ribbon section for loading WASM macros and applying them to selected cells.
import React from 'react'
import type { CellFunctionConfig } from '../../../services/workbookService'
import type { RegisteredFunctionMeta } from '../../../pages/top/utils/cellFunctionEngine'
import type { LoadedWasmModule } from '../../../services/wasmMacroService'
import { useI18n } from '../../../utils/i18n'

type MacroSectionProps = {
  columns: string[]
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

// Function Header: Renders controls for importing WASM modules and applying functions to selected cells.
export default function MacroSection({
  columns,
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
  const [status, setStatus] = React.useState<LocalizedMessage | null>(null)
  const [error, setError] = React.useState<LocalizedMessage | null>(null)
  const [isLoading, setLoading] = React.useState<boolean>(false)

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
              '関数を適用するセルを先に選択してください。対象列や行範囲を指定してマクロを設定できます。',
              'Select the cells first, then configure the target column and optional row range for the macro.',
            )}
          </p>
          <div className="mt-4 grid gap-4">
            <label className="block text-xs font-semibold text-slate-700">
              {select('利用可能な関数', 'Available functions')}
              <select
                value={selectedFunctionId}
                onChange={(event) => setSelectedFunctionId(event.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                data-testid="macro-function-select"
              >
                {availableFunctions.length === 0 && (
                  <option value="">
                    {select('関数が登録されていません', 'No functions registered')}
                  </option>
                )}
                {availableFunctions.map((fn) => (
                  <option key={fn.id} value={fn.id}>
                    {fn.label}
                  </option>
                ))}
              </select>
            </label>
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
            <div className="grid grid-cols-2 gap-3">
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
