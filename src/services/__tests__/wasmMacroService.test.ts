import { afterEach, describe, expect, it, vi } from 'vitest'
import path from 'path'
import fs from 'fs/promises'
import { loadWasmMacroModule, getLoadedWasmModules } from '../wasmMacroService'
import { listRegisteredFunctions } from '../../pages/top/utils/cellFunctionEngine'

const ORIGINAL_FETCH = global.fetch

describe('wasmMacroService', () => {
  afterEach(() => {
    global.fetch = ORIGINAL_FETCH
  })

  it('loads a WASM module and registers exported functions', async () => {
    const wasmPath = path.resolve(__dirname, '../../../public/macros/sample_sum.wasm')
    const bytes = await fs.readFile(wasmPath)
    global.fetch = vi.fn(async () => new Response(bytes.slice(0)))

    await loadWasmMacroModule({ moduleId: 'test-sample', url: '/macros/sample_sum.wasm' })

    const functions = listRegisteredFunctions()
    expect(functions.some((fn) => fn.id === 'wasm:test-sample.sumRange')).toBe(true)
    const modules = getLoadedWasmModules()
    expect(modules.some((module) => module.id === 'test-sample')).toBe(true)
  })
})
