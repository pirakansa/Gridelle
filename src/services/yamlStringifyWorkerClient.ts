// File Header: Client helper delegating YAML serialization to a background worker.
import { stringifyWorkbook, type TableSheet } from './workbookService'

const workerScriptUrl = new URL('./yamlStringifyWorker.ts', import.meta.url)

type WorkerFactory = () => Worker

// Function Header: Creates a new YAML stringify worker instance using module scripts.
function defaultWorkerFactory(): Worker {
  return new Worker(workerScriptUrl, { type: 'module' })
}

// Function Header: Detects whether the current environment supports Web Workers.
function isWorkerSupported(): boolean {
  return typeof window !== 'undefined' && typeof Worker !== 'undefined'
}

type WorkerResponse = {
  id: number
  status: 'success' | 'error'
  yaml?: string
  message?: string
}

type StringifyOptions = {
  workerFactory?: WorkerFactory
  onStringifyStart?: () => void
  onStringifySuccess?: () => void
  onStringifyError?: (_error: Error) => void
}

// Function Header: Serializes workbook sheets using a Web Worker when available.
export function stringifyWorkbookAsync(sheets: TableSheet[], options: StringifyOptions = {}): Promise<string> {
  if (!isWorkerSupported()) {
    return Promise.resolve(stringifyWorkbook(sheets))
  }

  const createWorker = options.workerFactory ?? defaultWorkerFactory
  let worker: Worker
  try {
    worker = createWorker()
  } catch {
    return Promise.resolve(stringifyWorkbook(sheets))
  }

  return new Promise<string>((resolve, reject) => {
    const messageId = Date.now() + Math.random()
    options.onStringifyStart?.()

    const cleanup = () => {
      worker.removeEventListener('message', handleMessage)
      worker.removeEventListener('error', handleError)
      worker.terminate()
    }

    const handleMessage = (event: MessageEvent<WorkerResponse>) => {
      const payload = event.data
      if (!payload || payload.id !== messageId) {
        return
      }
      if (payload.status === 'success' && typeof payload.yaml === 'string') {
        cleanup()
        options.onStringifySuccess?.()
        resolve(payload.yaml)
        return
      }
      if (payload.status === 'error') {
        cleanup()
        const failure = new Error(payload.message ?? 'YAML stringify failed.')
        options.onStringifyError?.(failure)
        reject(failure)
      }
    }

    const handleError = (error: ErrorEvent) => {
      cleanup()
      const failure = error.error ?? new Error(error.message)
      options.onStringifyError?.(failure)
      reject(failure)
    }

    worker.addEventListener('message', handleMessage)
    worker.addEventListener('error', handleError)

    worker.postMessage({ id: messageId, sheets })
  })
}

export { isWorkerSupported, defaultWorkerFactory }