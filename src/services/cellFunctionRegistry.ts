// File Header: Defines the shared registry contract for spreadsheet cell functions.
import type { TableRow } from './workbookService'

export type CellFunctionArgs = Record<string, unknown> | undefined

export type CellFunctionContext = {
  rows: TableRow[]
  columns: string[]
  rowIndex: number
  columnKey: string
  sheetName: string
  getCellValue: (_rowIndex: number, _columnKey: string, _options?: { sheetName?: string }) => string
  resolveColumnKey?: (_columnIndex: number, _sheetName?: string) => string | undefined
}

export type CellStyleDirectives = {
  color?: string | null
  bgColor?: string | null
}

export type CellFunctionResult =
  | string
  | number
  | null
  | undefined
  | {
      value?: string | number | null
      styles?: CellStyleDirectives
    }

export type CellFunctionHandler = (_args: CellFunctionArgs, _context: CellFunctionContext) => CellFunctionResult

export type RegisteredFunctionMeta = {
  id: string
  label: string
  description?: string
  source: 'builtin' | 'wasm'
  moduleId?: string
  exportName?: string
}

export type RegisterCellFunctionOptions = {
  label?: string
  description?: string
  source?: RegisteredFunctionMeta['source']
  moduleId?: string
  exportName?: string
}

type RegistryRecord = {
  handler: CellFunctionHandler
  meta: RegisteredFunctionMeta
}

// Function Header: Normalizes function identifiers for case-insensitive lookup.
const normalizeFunctionName = (name: string): string => name.trim().toLowerCase()

// Function Header: Owns cell function handlers and their display metadata.
export class CellFunctionRegistry {
  private readonly records = new Map<string, RegistryRecord>()

  // Function Header: Registers or replaces a cell function handler.
  register(
    name: string,
    handler: CellFunctionHandler,
    options?: RegisterCellFunctionOptions,
  ): RegisteredFunctionMeta {
    const normalized = normalizeFunctionName(name)
    if (!normalized) {
      throw new Error('セル関数名が空です。')
    }
    const meta: RegisteredFunctionMeta = {
      id: name,
      label: options?.label ?? name,
      description: options?.description ?? '',
      source: options?.source ?? 'builtin',
      moduleId: options?.moduleId,
      exportName: options?.exportName,
    }
    this.records.set(normalized, { handler, meta })
    return meta
  }

  // Function Header: Removes a registered cell function by identifier.
  unregister(name: string): void {
    this.records.delete(normalizeFunctionName(name))
  }

  // Function Header: Finds a registered handler by identifier.
  getHandler(name: string): CellFunctionHandler | undefined {
    if (!name.trim()) {
      return undefined
    }
    return this.records.get(normalizeFunctionName(name))?.handler
  }

  // Function Header: Lists registered function metadata in display order.
  list(): RegisteredFunctionMeta[] {
    return Array.from(this.records.values())
      .map((record) => record.meta)
      .sort((left, right) => left.label.localeCompare(right.label, 'ja'))
  }
}

export const defaultCellFunctionRegistry = new CellFunctionRegistry()
