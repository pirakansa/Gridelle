// File Header: Client helper for delegating YAML parsing to a background worker.
import { parseWorkbook, type TableSheet } from './workbookService'

let workerUrl: URL | null = null

function getWorker(): Worker {
  if (!workerUrl) {
    workerUrl = new URL('./yamlParserWorker.ts', import.meta.url)
  }
  return new Worker(workerUrl, { type: 'module' })
}

// Function Header: Parses a workbook string using a Web Worker when available.
export function parseWorkbookAsync(source: string): Promise<TableSheet[]> {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return Promise.resolve(parseWorkbook(source))
  }

  let worker: Worker
  try {
    worker = getWorker()
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

    const handleMessage = (event: MessageEvent<{ id: number; status: string; sheets?: TableSheet[]; message?: string }>) => {
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
