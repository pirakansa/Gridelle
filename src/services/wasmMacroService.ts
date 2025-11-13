// File Header: Loads user-provided WASM modules and registers them as spreadsheet macros.
import {
  registerCellFunction,
  resolveFunctionTargets,
  type CellFunctionArgs,
  type CellFunctionContext,
  type CellFunctionResult,
  type CellStyleDirectives,
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
const STYLE_STRUCT_BYTES = 16
const STYLE_FLAG_TEXT = 1
const STYLE_FLAG_BG = 2

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
  (args: CellFunctionArgs, context: CellFunctionContext): CellFunctionResult => {
    const targets = resolveFunctionTargets(args, context)
    const scopedTargets = targets.filter(
      (target) => !(target.rowIndex === context.rowIndex && target.columnKey === context.columnKey),
    )
    const effectiveTargets = scopedTargets.length ? scopedTargets : targets
    if (!effectiveTargets.length) {
      return ''
    }

    const valuesByteLength = effectiveTargets.length * BYTES_PER_F64
    const totalBytes = valuesByteLength + STYLE_STRUCT_BYTES
    ensureMemoryCapacity(memory, totalBytes)

    const bufferView = new Float64Array(memory.buffer, 0, effectiveTargets.length)
    effectiveTargets.forEach(({ rowIndex, columnKey }, offset) => {
      const raw = Number(context.getCellValue(rowIndex, columnKey))
      bufferView[offset] = Number.isFinite(raw) ? raw : 0
    })

    const styleView = new DataView(memory.buffer, valuesByteLength, STYLE_STRUCT_BYTES)
    for (let offset = 0; offset < STYLE_STRUCT_BYTES; offset += 4) {
      styleView.setInt32(offset, 0, true)
    }

    const acceptsStyles = fn.length >= 3
    const result = acceptsStyles ? fn(0, effectiveTargets.length, valuesByteLength) : fn(0, effectiveTargets.length)
    if (typeof result !== 'number' || Number.isNaN(result)) {
      return ''
    }
    if (!acceptsStyles) {
      return result
    }
    const styles = extractStyles(styleView)
    if (!styles) {
      return result
    }
    return {
      value: result,
      styles,
    }
  }

const extractStyles = (view: DataView): CellStyleDirectives | undefined => {
  const flags = view.getInt32(0, true)
  if (!flags) {
    return undefined
  }
  const directives: CellStyleDirectives = {}
  if (flags & STYLE_FLAG_TEXT) {
    const packed = view.getInt32(4, true)
    if (packed < 0) {
      directives.color = null
    } else {
      const formatted = formatRgbColor(packed)
      if (formatted) {
        directives.color = formatted
      }
    }
  }
  if (flags & STYLE_FLAG_BG) {
    const packed = view.getInt32(8, true)
    if (packed < 0) {
      directives.bgColor = null
    } else {
      const formatted = formatRgbColor(packed)
      if (formatted) {
        directives.bgColor = formatted
      }
    }
  }
  return Object.keys(directives).length ? directives : undefined
}

const formatRgbColor = (value: number): string | undefined => {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffff) {
    return undefined
  }
  return `#${value.toString(16).padStart(6, '0')}`
}
