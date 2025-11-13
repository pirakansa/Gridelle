// File Header: Evaluates YAML-defined cell functions and provides a registry for macro handlers.
import type { TableRow } from '../../../services/workbookService'

export type CellFunctionArgs = Record<string, unknown> | undefined

export type CellFunctionContext = {
  rows: TableRow[]
  columns: string[]
  rowIndex: number
  columnKey: string
  getCellValue: (_rowIndex: number, _columnKey: string) => string
}

export type CellFunctionHandler = (
  _args: CellFunctionArgs,
  _context: CellFunctionContext,
) => string | number | null | undefined

export type RegisteredFunctionMeta = {
  id: string
  label: string
  description?: string
  source: 'builtin' | 'wasm'
  moduleId?: string
  exportName?: string
}

type RegistryRecord = {
  handler: CellFunctionHandler
  meta: RegisteredFunctionMeta
}

const registry: Map<string, RegistryRecord> = new Map()

const normalizeFunctionName = (name: string): string => name.trim().toLowerCase()

type RegisterOptions = {
  label?: string
  description?: string
  source?: RegisteredFunctionMeta['source']
  moduleId?: string
  exportName?: string
}

export function registerCellFunction(
  name: string,
  handler: CellFunctionHandler,
  options?: RegisterOptions,
): RegisteredFunctionMeta {
  const normalized = normalizeFunctionName(name)
  if (!normalized) {
    throw new Error('セル関数名が空です。')
  }
  const recordMeta: RegisteredFunctionMeta = {
    id: name,
    label: options?.label ?? name,
    description: options?.description ?? '',
    source: options?.source ?? 'builtin',
    moduleId: options?.moduleId,
    exportName: options?.exportName,
  }
  registry.set(normalized, {
    handler,
    meta: recordMeta,
  })
  return recordMeta
}

const getCellFunctionRecord = (name: string): RegistryRecord | undefined => {
  if (!name.trim()) {
    return undefined
  }
  return registry.get(normalizeFunctionName(name))
}

const getCellFunctionHandler = (name: string): CellFunctionHandler | undefined =>
  getCellFunctionRecord(name)?.handler

export const listRegisteredFunctions = (): RegisteredFunctionMeta[] =>
  Array.from(registry.values())
    .map((record) => record.meta)
    .sort((a, b) => a.label.localeCompare(b.label, 'ja'))

type EvaluationEnv = {
  rows: TableRow[]
  columns: string[]
  cache: Map<string, string>
  stack: Set<string>
}

const createCellValueResolver = (env: EvaluationEnv) => {
  const resolve = (rowIndex: number, columnKey: string): string => {
    if (rowIndex < 0 || rowIndex >= env.rows.length) {
      return ''
    }
    const cacheKey = `${rowIndex}:${columnKey}`
    if (env.cache.has(cacheKey)) {
      return env.cache.get(cacheKey) ?? ''
    }
    const row = env.rows[rowIndex]
    const cell = row?.[columnKey]
    if (!cell) {
      env.cache.set(cacheKey, '')
      return ''
    }
    if (!cell.func) {
      const baseValue = cell.value ?? ''
      env.cache.set(cacheKey, baseValue)
      return baseValue
    }

    if (env.stack.has(cacheKey)) {
      console.warn(`セル関数の循環参照を検出しました: row=${rowIndex + 1}, column=${columnKey}`)
      env.cache.set(cacheKey, '')
      return ''
    }

    const handler = getCellFunctionHandler(cell.func.name)
    if (!handler) {
      console.warn(`未対応のセル関数です: ${cell.func.name}`)
      env.cache.set(cacheKey, '')
      return ''
    }

    env.stack.add(cacheKey)
    let result = ''
    try {
      const output = handler(cell.func.args, {
        rows: env.rows,
        columns: env.columns,
        rowIndex,
        columnKey,
        getCellValue: resolve,
      })
      if (output === null || output === undefined) {
        result = ''
      } else if (typeof output === 'string') {
        result = output
      } else {
        result = String(output)
      }
    } catch (error) {
      console.error(`セル関数「${cell.func.name}」の評価に失敗しました。`, error)
      result = ''
    }
    env.stack.delete(cacheKey)
    env.cache.set(cacheKey, result)
    return result
  }
  return resolve
}

// Function Header: Applies registered cell functions to produce display-ready rows.
export function applyCellFunctions(rows: TableRow[], columns: string[]): TableRow[] {
  if (!rows.length) {
    return rows
  }

  const cache = new Map<string, string>()
  const stack = new Set<string>()
  const getCellValue = createCellValueResolver({ rows, columns, cache, stack })
  let didMutate = false

  const evaluatedRows = rows.map((row, rowIndex) => {
    let nextRow: TableRow | null = null
    Object.entries(row).forEach(([columnKey, cell]) => {
      if (!cell?.func) {
        if (nextRow) {
          nextRow[columnKey] = cell
        }
        return
      }
      const computedValue = getCellValue(rowIndex, columnKey)
      if (!nextRow) {
        nextRow = { ...row }
      }
      nextRow[columnKey] = {
        ...cell,
        value: computedValue,
      }
      didMutate = true
    })
    return nextRow ?? row
  })

  return didMutate ? evaluatedRows : rows
}

const parseRowIndex = (value: unknown, totalRows: number): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const normalized = Math.round(value) - 1
    return normalized >= 0 && normalized < totalRows ? normalized : null
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isNaN(parsed)) {
      return null
    }
    const normalized = Math.round(parsed) - 1
    return normalized >= 0 && normalized < totalRows ? normalized : null
  }
  return null
}

const resolveRowIndexes = (candidate: unknown, totalRows: number): number[] | null => {
  if (Array.isArray(candidate)) {
    const indexes = candidate
      .map((entry) => parseRowIndex(entry, totalRows))
      .filter((index): index is number => index !== null)
    if (!indexes.length) {
      return null
    }
    return Array.from(new Set(indexes))
  }

  if (candidate && typeof candidate === 'object') {
    const record = candidate as Record<string, unknown>
    const start = parseRowIndex(record.start, totalRows)
    const end = parseRowIndex(record.end, totalRows)
    if (start === null && end === null) {
      return null
    }
    const rangeStart = start ?? 0
    const rangeEnd = end ?? totalRows - 1
    if (rangeEnd < rangeStart) {
      return null
    }
    const indexes: number[] = []
    for (let index = rangeStart; index <= rangeEnd; index += 1) {
      indexes.push(index)
    }
    return indexes
  }

  return null
}

export const resolveFunctionRange = (
  args: CellFunctionArgs,
  context: CellFunctionContext,
): { targetColumn: string; rowIndexes: number[] } => {
  const record = (args ?? {}) as Record<string, unknown>
  const keyCandidate = typeof record.key === 'string' ? record.key.trim() : ''
  const targetColumn = keyCandidate || context.columnKey
  const totalRows = context.rows.length
  const indexes =
    (record.rows ? resolveRowIndexes(record.rows, totalRows) : null) ??
    Array.from({ length: totalRows }, (_, index) => index)
  return { targetColumn, rowIndexes: indexes }
}

const sumFunctionHandler: CellFunctionHandler = (args, context) => {
  const { targetColumn, rowIndexes } = resolveFunctionRange(args, context)
  const scopedIndexes = rowIndexes.filter(
    (rowIndex) => !(rowIndex === context.rowIndex && targetColumn === context.columnKey),
  )
  const targetIndexes = scopedIndexes.length ? scopedIndexes : rowIndexes

  let total = 0
  targetIndexes.forEach((rowIndex) => {
    const rawValue = context.getCellValue(rowIndex, targetColumn)
    const numericValue = Number(rawValue)
    if (!Number.isNaN(numericValue)) {
      total += numericValue
    }
  })
  return total.toString()
}

registerCellFunction('sum', sumFunctionHandler, {
  label: 'BIF: sum',
  source: 'builtin',
  description: '指定列の値を合計します。',
})
