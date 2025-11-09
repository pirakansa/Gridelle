/// <reference lib="webworker" />
// File Header: Dedicated worker that parses YAML workbook text off the main thread.
import { parseWorkbook } from './workbookService'

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope

type ParseRequestMessage = {
  id: number
  yaml: string
}

type SuccessMessage = {
  id: number
  status: 'success'
  sheets: ReturnType<typeof parseWorkbook>
}

type ErrorMessage = {
  id: number
  status: 'error'
  message: string
}

// Function Header: Handles parse requests and posts results back to the main thread.
function handleParseRequest(event: MessageEvent<ParseRequestMessage>): void {
  const { id, yaml } = event.data
  try {
    const sheets = parseWorkbook(yaml)
    const response: SuccessMessage = { id, status: 'success', sheets }
    ctx.postMessage(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const response: ErrorMessage = { id, status: 'error', message }
    ctx.postMessage(response)
  }
}

ctx.addEventListener('message', handleParseRequest)

export {}
