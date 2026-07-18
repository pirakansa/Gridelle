// File Header: React hook exposing WASM macro loading status and registered functions.
import React from 'react'
import {
  createCellFunctionRegistry,
  resolveFunctionTargets,
  type RegisteredFunctionMeta,
} from '../utils/cellFunctionEngine'
import {
  WasmMacroRuntime,
  type LoadedWasmModule,
} from '../../../services/wasmMacroService'

type LoadParams = {
  moduleId: string
  url: string
}

// Function Header: Provides macro metadata and exposes a loader for WASM modules.
export const useMacroManager = () => {
  const registryRef = React.useRef<ReturnType<typeof createCellFunctionRegistry> | null>(null)
  if (!registryRef.current) {
    registryRef.current = createCellFunctionRegistry()
  }
  const registry = registryRef.current
  const runtimeRef = React.useRef<WasmMacroRuntime | null>(null)
  if (!runtimeRef.current) {
    runtimeRef.current = new WasmMacroRuntime({
      registerFunction: registry.register.bind(registry),
      unregisterFunction: registry.unregister.bind(registry),
      resolveTargets: resolveFunctionTargets,
    })
  }
  const runtime = runtimeRef.current
  const [registeredFunctions, setRegisteredFunctions] = React.useState<RegisteredFunctionMeta[]>(() =>
    registry.list(),
  )
  const [loadedModules, setLoadedModules] = React.useState<LoadedWasmModule[]>([])

  const refresh = React.useCallback(() => {
    setRegisteredFunctions(registry.list())
    setLoadedModules(runtime.getLoadedModules())
  }, [registry, runtime])

  React.useEffect(
    () => () => {
      runtime.dispose()
    },
    [runtime],
  )

  const loadModule = React.useCallback(
    async ({ moduleId, url }: LoadParams): Promise<void> => {
      await runtime.load({ moduleId, url })
      refresh()
    },
    [refresh, runtime],
  )

  return {
    registeredFunctions,
    loadedModules,
    loadWasmModule: loadModule,
    registry,
  }
}

export type MacroManager = ReturnType<typeof useMacroManager>
