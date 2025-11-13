// File Header: Helpers summarizing cell function configurations for UI displays.
import type { CellFunctionConfig } from '../../../services/workbookService'

// Function Header: Converts a cell function config into a concise human-readable summary.
export function summarizeCellFunction(func: CellFunctionConfig | undefined): string {
  if (!func) {
    return ''
  }
  const argsSummary = formatFunctionArgs(func.args)
  return argsSummary ? `${func.name}(${argsSummary})` : func.name
}

function formatFunctionArgs(args: Record<string, unknown> | undefined): string {
  if (!args) {
    return ''
  }
  return Object.entries(args)
    .map(([key, value]) => `${key}=${stringifyFunctionArg(value)}`)
    .join(', ')
}

function stringifyFunctionArg(value: unknown): string {
  if (value === null) {
    return 'null'
  }
  if (value === undefined) {
    return 'undefined'
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return '[object]'
    }
  }
  return String(value)
}

