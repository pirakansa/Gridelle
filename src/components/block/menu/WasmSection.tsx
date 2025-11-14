// File Header: Ribbon section dedicated to managing WASM macro modules.
import React from 'react'
import type { LoadedWasmModule } from '../../../services/wasmMacroService'
import { useI18n } from '../../../utils/i18n'

type WasmSectionProps = {
  loadedModules: LoadedWasmModule[]
  onLoadModule: (_params: { moduleId: string; url: string }) => Promise<void>
}

const SAMPLE_MODULE_ID = 'macros'
const SAMPLE_URL = '/macros/sample_macros.wasm'

type LocalizedMessage = {
  readonly ja: string
  readonly en: string
}

function createMessage(ja: string, en: string): LocalizedMessage {
  return { ja, en }
}

// Function Header: Provides UI for loading and listing WASM macro modules.
export default function WasmSection({ loadedModules, onLoadModule }: WasmSectionProps): React.ReactElement {
  const { select } = useI18n()
  const [moduleId, setModuleId] = React.useState<string>(SAMPLE_MODULE_ID)
  const [wasmUrl, setWasmUrl] = React.useState<string>(SAMPLE_URL)
  const [status, setStatus] = React.useState<LocalizedMessage | null>(null)
  const [error, setError] = React.useState<LocalizedMessage | null>(null)
  const [isLoading, setLoading] = React.useState<boolean>(false)

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

  const statusText = status ? select(status.ja, status.en) : null
  const errorText = error ? select(error.ja, error.en) : null

  return (
    <section aria-label={select('WASMモジュール管理', 'Manage WASM modules')} className="space-y-4">
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
              placeholder="macros"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            {select('WASMファイルURL', 'WASM file URL')}
            <input
              type="text"
              value={wasmUrl}
              onChange={(event) => setWasmUrl(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="/macros/sample_macros.wasm"
            />
          </label>
          <button
            type="button"
            className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            onClick={handleLoadModule}
            disabled={isLoading}
            data-testid="load-wasm-button"
          >
            {isLoading ? select('読み込み中…', 'Loading…') : select('WASMを読み込む', 'Load WASM')}
          </button>
        </div>
        <div className="mt-4 border-t border-slate-100 pt-3">
          <h4 className="text-xs font-semibold text-slate-700">
            {select('読み込み済みモジュール', 'Loaded modules')}
          </h4>
          {loadedModules.length === 0 ? (
            <p className="text-sm text-slate-500">
              {select('読み込まれたWASMモジュールはありません。', 'No WASM modules have been loaded yet.')}
            </p>
          ) : (
            <ul className="space-y-1 text-sm text-slate-600" data-testid="loaded-wasm-list">
              {loadedModules.map((module) => (
                <li key={module.id}>
                  <span className="font-semibold text-slate-800">{module.id}</span> ({module.exports.join(', ')})
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {(statusText || errorText) && (
        <p
          className={`text-sm ${errorText ? 'text-red-600' : 'text-emerald-600'}`}
          role={errorText ? 'alert' : 'status'}
        >
          {errorText ?? statusText}
        </p>
      )}
    </section>
  )
}
