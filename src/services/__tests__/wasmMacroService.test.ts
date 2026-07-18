import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import path from 'path'
import fs from 'fs/promises'
import { WasmMacroRuntime } from '../wasmMacroService'
import {
  applyCellFunctions,
  createCellFunctionRegistry,
  resolveFunctionTargets,
} from '../../pages/top/utils/cellFunctionEngine'
import type { TableRow } from '../workbookService'

const ORIGINAL_FETCH = global.fetch

describe('wasmMacroService', () => {
  let runtime: WasmMacroRuntime
  let registry: ReturnType<typeof createCellFunctionRegistry>

  beforeEach(() => {
    registry = createCellFunctionRegistry()
    runtime = new WasmMacroRuntime({
      registerFunction: registry.register.bind(registry),
      unregisterFunction: registry.unregister.bind(registry),
      resolveTargets: resolveFunctionTargets,
    })
  })

  afterEach(() => {
    runtime.dispose()
    global.fetch = ORIGINAL_FETCH
    vi.restoreAllMocks()
  })

  it('loads a WASM module and registers exported functions', async () => {
    const wasmPath = path.resolve(__dirname, '../../../public/macros/sample_macros.wasm')
    const bytes = await fs.readFile(wasmPath)
    global.fetch = vi.fn(async () => new Response(bytes.slice(0)))

    await runtime.load({ moduleId: 'test-sample', url: '/macros/sample_macros.wasm' })

    const functions = registry.list()
    expect(functions.some((fn) => fn.id === 'wasm:test-sample.sumRange')).toBe(true)
    const modules = runtime.getLoadedModules()
    expect(modules.some((module) => module.id === 'test-sample')).toBe(true)
  })
  it('passes style buffers to WASM exports that expect the third argument', async () => {
    const bytes = new Uint8Array([0x00]).buffer
    global.fetch = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => bytes,
    })) as unknown as typeof fetch

    const memory = new WebAssembly.Memory({ initial: 1 })
    const wasmFn = vi.fn((ptr: number, len: number, stylePtr: number) => {
      const view = new DataView(memory.buffer, stylePtr, 16)
      view.setInt32(0, 0b10, true) // background color flag
      view.setInt32(8, 0xff0000, true)
      return 10
    })

    const mockInstance = {
      exports: {
        memory,
        styledRange: wasmFn,
      },
    }

    const instantiateSpy = vi.spyOn(WebAssembly, 'instantiate')
    ;(instantiateSpy as unknown as Mock).mockResolvedValue({
      instance: mockInstance as unknown as WebAssembly.Instance,
      module: {} as WebAssembly.Module,
    })

    await runtime.load({ moduleId: 'styled', url: '/macros/styled.wasm' })
    instantiateSpy.mockRestore()

    const rows: TableRow[] = [
      { metric: { value: '4' } },
      { metric: { value: '6' } },
      {
        metric: {
          value: '',
          func: {
            name: 'wasm:styled.styledRange',
          },
        },
      },
    ]

    const evaluated = applyCellFunctions(rows, ['metric'], { registry })

    expect(wasmFn).toHaveBeenCalled()
    expect(wasmFn.mock.calls[0]?.[2]).toBeGreaterThan(0)
    expect(evaluated[2]?.metric?.value).toBe('10')
    expect(evaluated[2]?.metric?.bgColor).toBe('#ff0000')
  })

  it('removes obsolete exports when a module identifier is reloaded', async () => {
    const bytes = new Uint8Array([0x00]).buffer
    global.fetch = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => bytes,
    })) as unknown as typeof fetch

    const firstInstance = {
      exports: {
        memory: new WebAssembly.Memory({ initial: 1 }),
        oldExport: vi.fn(() => 1),
      },
    }
    const secondInstance = {
      exports: {
        memory: new WebAssembly.Memory({ initial: 1 }),
        newExport: vi.fn(() => 2),
      },
    }
    const instantiateSpy = vi.spyOn(WebAssembly, 'instantiate')
    ;(instantiateSpy as unknown as Mock)
      .mockResolvedValueOnce({ instance: firstInstance, module: {} as WebAssembly.Module })
      .mockResolvedValueOnce({ instance: secondInstance, module: {} as WebAssembly.Module })

    await runtime.load({ moduleId: 'replaceable', url: '/macros/first.wasm' })
    await runtime.load({ moduleId: 'replaceable', url: '/macros/second.wasm' })

    const functions = registry.list()
    expect(functions.some((fn) => fn.id === 'wasm:replaceable.oldExport')).toBe(false)
    expect(functions.some((fn) => fn.id === 'wasm:replaceable.newExport')).toBe(true)
    expect(runtime.getLoadedModules()).toEqual([
      {
        id: 'replaceable',
        url: '/macros/second.wasm',
        exports: ['newExport'],
      },
    ])
  })
})
