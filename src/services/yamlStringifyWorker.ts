/// <reference lib="webworker" />
/* eslint-env worker */
/* global DedicatedWorkerGlobalScope */
// File Header: Dedicated worker that serializes sheet data to YAML off the main thread.
import { stringifyWorkbook, type TableSheet } from './workbookService'

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope

type StringifyRequestMessage = {
  id: number
  sheets: TableSheet[]
}

type SuccessMessage = {
  id: number
  status: 'success'
  yaml: string
}

type ErrorMessage = {
  id: number
  status: 'error'
  message: string
}

// Function Header: Converts workbook sheets into YAML and returns the result.
function handleStringifyRequest(event: MessageEvent<StringifyRequestMessage>): void {
  const { id, sheets } = event.data
  try {
    const yaml = stringifyWorkbook(sheets)
    const response: SuccessMessage = { id, status: 'success', yaml }
    ctx.postMessage(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const response: ErrorMessage = { id, status: 'error', message }
    ctx.postMessage(response)
  }
}

ctx.addEventListener('message', handleStringifyRequest)

export {}
