// File Header: Client helper for delegating YAML parsing to a background worker.
import { parseWorkbook, type TableSheet } from './workbookService'

const workerScriptUrl = new URL('./yamlParserWorker.ts', import.meta.url)

type WorkerFactory = () => Worker

// Function Header: Creates a new YAML parser worker instance using module scripts.
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
  sheets?: TableSheet[]
  message?: string
}

type ParseOptions = {
  workerFactory?: WorkerFactory
}

// Function Header: Parses a workbook string using a Web Worker when available.
export function parseWorkbookAsync(source: string, options: ParseOptions = {}): Promise<TableSheet[]> {
  if (!isWorkerSupported()) {
    return Promise.resolve(parseWorkbook(source))
  }

  const createWorker = options.workerFactory ?? defaultWorkerFactory
  let worker: Worker
  try {
    worker = createWorker()
  } catch {
    return Promise.resolve(parseWorkbook(source))
  }

  return new Promise<TableSheet[]>((resolve, reject) => {
    const messageId = Date.now() + Math.random()

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
      if (payload.status === 'success' && payload.sheets) {
        cleanup()
        resolve(payload.sheets)
        return
      }
      if (payload.status === 'error') {
        cleanup()
        reject(new Error(payload.message ?? 'YAML parsing failed.'))
      }
    }

    const handleError = (error: ErrorEvent) => {
      cleanup()
      reject(error.error ?? new Error(error.message))
    }

    worker.addEventListener('message', handleMessage)
    worker.addEventListener('error', handleError)

    worker.postMessage({ id: messageId, yaml: source })
  })
}

export { isWorkerSupported, defaultWorkerFactory }
