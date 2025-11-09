// File Header: React hook exposing WASM macro loading status and registered functions.
import React from 'react'
import {
  listRegisteredFunctions,
  type RegisteredFunctionMeta,
} from '../utils/cellFunctionEngine'
import {
  getLoadedWasmModules,
  loadWasmMacroModule,
  type LoadedWasmModule,
} from '../../../services/wasmMacroService'

type LoadParams = {
  moduleId: string
  url: string
}

// Function Header: Provides macro metadata and exposes a loader for WASM modules.
export const useMacroManager = () => {
  const [registeredFunctions, setRegisteredFunctions] = React.useState<RegisteredFunctionMeta[]>(() =>
    listRegisteredFunctions(),
  )
  const [loadedModules, setLoadedModules] = React.useState<LoadedWasmModule[]>(() =>
    getLoadedWasmModules(),
  )

  const refresh = React.useCallback(() => {
    setRegisteredFunctions(listRegisteredFunctions())
    setLoadedModules(getLoadedWasmModules())
  }, [])

  const loadModule = React.useCallback(
    async ({ moduleId, url }: LoadParams): Promise<void> => {
      await loadWasmMacroModule({ moduleId, url })
      refresh()
    },
    [refresh],
  )

  return {
    registeredFunctions,
    loadedModules,
    loadWasmModule: loadModule,
  }
}

export type MacroManager = ReturnType<typeof useMacroManager>
