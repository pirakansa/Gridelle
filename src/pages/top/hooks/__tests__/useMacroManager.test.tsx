// File Header: Tests React lifecycle ownership for the WASM macro runtime.
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { WasmMacroRuntime } from '../../../../services/wasmMacroService'
import { useMacroManager } from '../useMacroManager'

describe('useMacroManager', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('disposes its WASM runtime when the hook unmounts', () => {
    const disposeSpy = vi.spyOn(WasmMacroRuntime.prototype, 'dispose')
    const { unmount } = renderHook(() => useMacroManager())

    unmount()

    expect(disposeSpy).toHaveBeenCalledTimes(1)
  })
})
