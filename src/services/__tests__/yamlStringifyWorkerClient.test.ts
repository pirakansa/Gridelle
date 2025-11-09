// File Header: Tests for the YAML stringify worker client helper.
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

vi.mock('../workbookService', () => ({
  stringifyWorkbook: vi.fn((sheets: unknown[]) => JSON.stringify({ sheets })),
}))

import { stringifyWorkbook } from '../workbookService'
import { stringifyWorkbookAsync } from '../yamlStringifyWorkerClient'

type MockResponse = {
  id: number
  status: 'success' | 'error'
  yaml?: string
  message?: string
}

class MockWorker {
  public onmessage: ((_event: MessageEvent<MockResponse>) => void) | null = null
  public onerror: ((_event: ErrorEvent) => void) | null = null
  protected readonly messageListeners = new Set<(_event: MessageEvent<MockResponse>) => void>()
  protected readonly errorListeners = new Set<(_event: ErrorEvent) => void>()
  public terminated = false

  postMessage(data: { id: number; sheets: unknown[] }) {
    queueMicrotask(() => {
      const response: MockResponse = {
        id: data.id,
        status: 'success',
        yaml: JSON.stringify({ sheets: data.sheets }),
      }
      const event = { data: response } as MessageEvent<MockResponse>
      this.onmessage?.(event)
      this.messageListeners.forEach((listener) => listener(event))
    })
  }

  addEventListener(type: string, listener: unknown) {
    if (type === 'message') {
      const typedListener = listener as (_event: MessageEvent<MockResponse>) => void
      this.messageListeners.add(typedListener)
      return
    }
    if (type === 'error') {
      const typedListener = listener as (_event: ErrorEvent) => void
      this.errorListeners.add(typedListener)
    }
  }

  removeEventListener(type: string, listener: unknown) {
    if (type === 'message') {
      const typedListener = listener as (_event: MessageEvent<MockResponse>) => void
      this.messageListeners.delete(typedListener)
      return
    }
    if (type === 'error') {
      const typedListener = listener as (_event: ErrorEvent) => void
      this.errorListeners.delete(typedListener)
    }
  }

  terminate() {
    this.terminated = true
  }
}

type TableSheetMock = {
  name: string
  rows: Array<Record<string, string>>
}

const ORIGINAL_WORKER = globalThis.Worker
const stringifySpy = stringifyWorkbook as unknown as ReturnType<typeof vi.fn>

describe('stringifyWorkbookAsync', () => {
  beforeEach(() => {
    stringifySpy.mockClear()
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

  it('falls back to direct stringify when workers are unavailable', async () => {
    delete (globalThis as { Worker?: typeof Worker }).Worker
  const sheet = { name: 'Sheet', rows: [] } as TableSheetMock
  const result = await stringifyWorkbookAsync([sheet])
    expect(stringifySpy).toHaveBeenCalledTimes(1)
  expect(result).toBe(JSON.stringify({ sheets: [sheet] }))
  })

  it('uses a worker when available', async () => {
    Object.defineProperty(globalThis, 'Worker', {
      configurable: true,
      writable: true,
      value: class {} as unknown as typeof Worker,
    })

    const mock = new MockWorker()
    const hooks = {
      onStringifyStart: vi.fn(),
      onStringifySuccess: vi.fn(),
      onStringifyError: vi.fn(),
    }

  const sheets = [{ name: 'Sheet', rows: [{ column_1: 'value' }] } as TableSheetMock]

    const result = await stringifyWorkbookAsync(sheets, {
      workerFactory: () => mock as unknown as Worker,
      ...hooks,
    })

    expect(stringifySpy).not.toHaveBeenCalled()
    expect(result).toBe(JSON.stringify({ sheets }))
    expect(mock.terminated).toBe(true)
    expect(hooks.onStringifyStart).toHaveBeenCalledTimes(1)
    expect(hooks.onStringifySuccess).toHaveBeenCalledTimes(1)
    expect(hooks.onStringifyError).not.toHaveBeenCalled()
  })

  it('rejects when the worker reports an error', async () => {
    Object.defineProperty(globalThis, 'Worker', {
      configurable: true,
      writable: true,
      value: class {} as unknown as typeof Worker,
    })

    class ErrorWorker extends MockWorker {
      override postMessage(data: { id: number; sheets: unknown[] }) {
        queueMicrotask(() => {
          const errorResponse: MockResponse = {
            id: data.id,
            status: 'error',
            message: 'Stringify failure',
          }
          const event = { data: errorResponse } as MessageEvent<MockResponse>
          this.onmessage?.(event)
          this.messageListeners.forEach((listener) => listener(event))
        })
      }
    }

    const errorWorker = new ErrorWorker()
    const hooks = {
      onStringifyStart: vi.fn(),
      onStringifySuccess: vi.fn(),
      onStringifyError: vi.fn(),
    }

    await expect(
  stringifyWorkbookAsync([{ name: 'Sheet', rows: [] } as TableSheetMock], {
        workerFactory: () => errorWorker as unknown as Worker,
        ...hooks,
      })
    ).rejects.toThrow('Stringify failure')
    expect(errorWorker.terminated).toBe(true)
    expect(hooks.onStringifyStart).toHaveBeenCalledTimes(1)
    expect(hooks.onStringifySuccess).not.toHaveBeenCalled()
    expect(hooks.onStringifyError).toHaveBeenCalledTimes(1)
  })
})
