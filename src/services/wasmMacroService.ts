// File Header: Loads user-provided WASM modules and registers them as spreadsheet macros.
import {
  registerCellFunction,
  resolveFunctionRange,
  type CellFunctionArgs,
  type CellFunctionContext,
} from '../pages/top/utils/cellFunctionEngine'

export type LoadedWasmModule = {
  id: string
  url: string
  exports: string[]
}

type WasmExport = {
  name: string
  fn: (..._args: number[]) => number
}

const wasmModules = new Map<string, LoadedWasmModule>()

const BYTES_PER_F64 = 8
const WASM_PAGE_BYTES = 65536

export const getLoadedWasmModules = (): LoadedWasmModule[] => Array.from(wasmModules.values())

type LoadParams = {
  moduleId: string
  url: string
}

// Function Header: Fetches and instantiates a WASM module, registering exported functions as macros.
export async function loadWasmMacroModule({ moduleId, url }: LoadParams): Promise<LoadedWasmModule> {
  const normalizedId = moduleId.trim()
  if (!normalizedId) {
    throw new Error('モジュールIDを入力してください。')
  }
  const normalizedUrl = url.trim()
  if (!normalizedUrl) {
    throw new Error('WASMファイルのURLを入力してください。')
  }
  if (typeof fetch === 'undefined') {
    throw new Error('この環境ではWASMを読み込めません。')
  }
  const response = await fetch(normalizedUrl)
  if (!response.ok) {
    throw new Error(`WASMファイルの取得に失敗しました (${response.status})`)
  }
  const bytes = await response.arrayBuffer()

  let instance: WebAssembly.Instance
  try {
    const result = await WebAssembly.instantiate(bytes, {})
    instance = result instanceof WebAssembly.Instance ? result : result.instance
  } catch (error) {
    throw new Error(`WASMの初期化に失敗しました: ${(error as Error).message}`)
  }

  const memory = extractMemory(instance)
  const callableExports = extractFunctionExports(instance)

  if (!callableExports.length) {
    throw new Error('呼び出し可能なエクスポートが見つかりませんでした。')
  }

  callableExports.forEach(({ name, fn }) => {
    const macroId = `wasm:${normalizedId}.${name}`
    registerCellFunction(macroId, createWasmHandler(fn, memory), {
      label: `${normalizedId}.${name}`,
      description: 'WASMモジュールで定義されたマクロ関数',
      source: 'wasm',
      moduleId: normalizedId,
      exportName: name,
    })
  })

  const summary: LoadedWasmModule = {
    id: normalizedId,
    url: normalizedUrl,
    exports: callableExports.map((entry) => entry.name),
  }
  wasmModules.set(normalizedId, summary)
  return summary
}

const extractMemory = (instance: WebAssembly.Instance): WebAssembly.Memory => {
  const memory = instance.exports.memory
  if (!(memory instanceof WebAssembly.Memory)) {
    throw new Error('WASMモジュールは memory を export する必要があります。')
  }
  return memory
}

const extractFunctionExports = (instance: WebAssembly.Instance): WasmExport[] =>
  Object.entries(instance.exports)
    .filter((entry): entry is [string, (..._args: number[]) => number] => typeof entry[1] === 'function')
    .map(([name, fn]) => ({ name, fn }))

const ensureMemoryCapacity = (memory: WebAssembly.Memory, requiredBytes: number): void => {
  if (memory.buffer.byteLength >= requiredBytes) {
    return
  }
  const delta = requiredBytes - memory.buffer.byteLength
  const additionalPages = Math.ceil(delta / WASM_PAGE_BYTES)
  memory.grow(additionalPages)
}

const createWasmHandler =
  (fn: (..._args: number[]) => number, memory: WebAssembly.Memory) =>
  (args: CellFunctionArgs, context: CellFunctionContext): number | string => {
    const { targetColumn, rowIndexes } = resolveFunctionRange(args, context)
    const scopedIndexes = rowIndexes.filter(
      (rowIndex) => !(rowIndex === context.rowIndex && targetColumn === context.columnKey),
    )
    const targetIndexes = scopedIndexes.length ? scopedIndexes : rowIndexes
    if (!targetIndexes.length) {
      return ''
    }

    const requiredBytes = targetIndexes.length * BYTES_PER_F64
    ensureMemoryCapacity(memory, requiredBytes)
    const bufferView = new Float64Array(memory.buffer, 0, targetIndexes.length)
    targetIndexes.forEach((rowIndex, offset) => {
      const raw = Number(context.getCellValue(rowIndex, targetColumn))
      bufferView[offset] = Number.isFinite(raw) ? raw : 0
    })

    const result = fn(0, targetIndexes.length)
    if (typeof result !== 'number' || Number.isNaN(result)) {
      return ''
    }
    return result
  }
