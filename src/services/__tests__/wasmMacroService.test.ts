import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import path from 'path'
import fs from 'fs/promises'
import { loadWasmMacroModule, getLoadedWasmModules } from '../wasmMacroService'
import { applyCellFunctions, listRegisteredFunctions } from '../../pages/top/utils/cellFunctionEngine'
import type { TableRow } from '../workbookService'

const ORIGINAL_FETCH = global.fetch

describe('wasmMacroService', () => {
  afterEach(() => {
    global.fetch = ORIGINAL_FETCH
  })

  it('loads a WASM module and registers exported functions', async () => {
    const wasmPath = path.resolve(__dirname, '../../../public/macros/sample_macros.wasm')
    const bytes = await fs.readFile(wasmPath)
    global.fetch = vi.fn(async () => new Response(bytes.slice(0)))

    await loadWasmMacroModule({ moduleId: 'test-sample', url: '/macros/sample_macros.wasm' })

    const functions = listRegisteredFunctions()
    expect(functions.some((fn) => fn.id === 'wasm:test-sample.sumRange')).toBe(true)
    const modules = getLoadedWasmModules()
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

    await loadWasmMacroModule({ moduleId: 'styled', url: '/macros/styled.wasm' })
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

    const evaluated = applyCellFunctions(rows, ['metric'])

    expect(wasmFn).toHaveBeenCalled()
    expect(wasmFn.mock.calls[0]?.[2]).toBeGreaterThan(0)
    expect(evaluated[2]?.metric?.value).toBe('10')
    expect(evaluated[2]?.metric?.bgColor).toBe('#ff0000')
  })
})
