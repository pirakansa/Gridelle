// File Header: Tests for the YAML worker client helper.
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

vi.mock('../workbookService', () => ({
  parseWorkbook: vi.fn((source: string) => [
    {
      name: 'Mock Sheet',
      rows: [[`parsed:${source}`]],
      columns: [],
    },
  ]),
}))

import { parseWorkbook } from '../workbookService'
import { parseWorkbookAsync } from '../yamlWorkerClient'

type MockResponse = {
  id: number
  status: 'success' | 'error'
  sheets?: unknown
  message?: string
}

type MessageListener = (_event: MessageEvent<MockResponse>) => void
type ErrorListener = (_event: ErrorEvent) => void

class MockWorker {
  public onmessage: ((_event: MessageEvent<MockResponse>) => void) | null = null
  public onerror: ((_event: ErrorEvent) => void) | null = null
  private readonly messageListeners = new Set<MessageListener>()
  protected readonly errorListeners = new Set<ErrorListener>()
  public terminated = false

  postMessage(data: { id: number; yaml: string }) {
    queueMicrotask(() => {
      const response: MockResponse = {
        id: data.id,
        status: 'success',
        sheets: [
          {
            name: 'Worker Sheet',
            rows: [[data.yaml]],
            columns: [],
          },
        ],
      }
      const event = { data: response } as MessageEvent<MockResponse>
      this.onmessage?.(event)
      this.messageListeners.forEach((listener) => listener(event))
    })
  }

  addEventListener(type: string, listener: unknown) {
    if (type === 'message') {
      const typedListener = listener as MessageListener
      this.messageListeners.add(typedListener)
      return
    }
    if (type === 'error') {
      const typedListener = listener as ErrorListener
      this.errorListeners.add(typedListener)
    }
  }

  removeEventListener(type: string, listener: unknown) {
    if (type === 'message') {
      const typedListener = listener as MessageListener
      this.messageListeners.delete(typedListener)
      return
    }
    if (type === 'error') {
      const typedListener = listener as ErrorListener
      this.errorListeners.delete(typedListener)
    }
  }

  terminate() {
    this.terminated = true
  }
}

const ORIGINAL_WORKER = globalThis.Worker
const workbookSpy = parseWorkbook as unknown as ReturnType<typeof vi.fn>

describe('parseWorkbookAsync', () => {
  beforeEach(() => {
    workbookSpy.mockClear()
  })

  afterEach(() => {
    if (ORIGINAL_WORKER) {
      Object.defineProperty(globalThis, 'Worker', {
        configurable: true,
        writable: true,
        value: ORIGINAL_WORKER,
      })
    } else {
      delete (globalThis as { Worker?: typeof Worker }).Worker
    }
  })

  it('falls back to direct parsing when workers are unavailable', async () => {
    delete (globalThis as { Worker?: typeof Worker }).Worker
    const result = await parseWorkbookAsync('fallback')
    expect(workbookSpy).toHaveBeenCalledWith('fallback')
    expect(result[0]?.rows?.[0]?.[0]).toBe('parsed:fallback')
  })

  it('uses a worker when available', async () => {
    Object.defineProperty(globalThis, 'Worker', {
      configurable: true,
      writable: true,
      value: class {} as unknown as typeof Worker,
    })

    const mock = new MockWorker()
    const result = await parseWorkbookAsync('worker-source', {
      workerFactory: () => mock as unknown as Worker,
    })

    expect(workbookSpy).not.toHaveBeenCalled()
    expect(result[0]?.rows?.[0]?.[0]).toBe('worker-source')
    expect(mock.terminated).toBe(true)
  })

  it('rejects when the worker posts an error status', async () => {
    Object.defineProperty(globalThis, 'Worker', {
      configurable: true,
      writable: true,
      value: class {} as unknown as typeof Worker,
    })

    class ErrorWorker extends MockWorker {
      override postMessage(_data: { id: number; yaml: string }) {
        queueMicrotask(() => {
          const errorEvent = new ErrorEvent('message', {
            message: 'Worker parse error',
          })
          this.onerror?.(errorEvent)
          this.errorListeners.forEach((listener) => listener(errorEvent))
        })
      }
    }

    const errorWorker = new ErrorWorker()

    await expect(
      parseWorkbookAsync('error-source', {
        workerFactory: () => errorWorker as unknown as Worker,
      })
    ).rejects.toThrow('Worker parse error')
    expect(errorWorker.terminated).toBe(true)
  })
})
