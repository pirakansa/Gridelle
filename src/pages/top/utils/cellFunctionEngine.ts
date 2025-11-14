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

export type ResolvedCellTarget = {
  rowIndex: number
  columnKey: string
}

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

type EvaluationCacheEntry = {
  value: string
  styles?: CellStyleDirectives
}

type EvaluationEnv = {
  rows: TableRow[]
  columns: string[]
  cache: Map<string, EvaluationCacheEntry>
  stack: Set<string>
}

const normalizeColorDirective = (value: unknown): string | null | undefined => {
  if (value === undefined) {
    return undefined
  }
  if (value === null) {
    return null
  }
  const stringified = typeof value === 'string' ? value : String(value)
  const trimmed = stringified.trim()
  return trimmed.length ? trimmed : null
}

const normalizeFunctionOutput = (output: CellFunctionResult, fallbackValue: string): EvaluationCacheEntry => {
  if (output === null || output === undefined) {
    return { value: '' }
  }

  if (typeof output === 'string') {
    return { value: output }
  }

  if (typeof output === 'number') {
    return { value: String(output) }
  }

  if (typeof output === 'object') {
    const hasValueProp = Object.prototype.hasOwnProperty.call(output, 'value')
    const valueCandidate = hasValueProp ? (output as { value?: string | number | null }).value : undefined
    let normalizedValue = fallbackValue
    if (valueCandidate === null || valueCandidate === undefined) {
      normalizedValue = ''
    } else if (typeof valueCandidate === 'string') {
      normalizedValue = valueCandidate
    } else {
      normalizedValue = String(valueCandidate)
    }

    const stylesCandidate = (output as { styles?: CellStyleDirectives }).styles
    const normalizedStyles =
      stylesCandidate && typeof stylesCandidate === 'object'
        ? {
            ...(Object.prototype.hasOwnProperty.call(stylesCandidate, 'color')
              ? { color: normalizeColorDirective(stylesCandidate.color) }
              : {}),
            ...(Object.prototype.hasOwnProperty.call(stylesCandidate, 'bgColor')
              ? { bgColor: normalizeColorDirective(stylesCandidate.bgColor) }
              : {}),
          }
        : undefined

    return {
      value: hasValueProp ? normalizedValue : fallbackValue,
      ...(normalizedStyles && Object.keys(normalizedStyles).length ? { styles: normalizedStyles } : {}),
    }
  }

  return { value: fallbackValue }
}

const createCellValueResolver = (env: EvaluationEnv) => {
  const resolve = (rowIndex: number, columnKey: string): string => {
    if (rowIndex < 0 || rowIndex >= env.rows.length) {
      return ''
    }
    const cacheKey = `${rowIndex}:${columnKey}`
    const cached = env.cache.get(cacheKey)
    if (cached) {
      return cached.value
    }
    const row = env.rows[rowIndex]
    const cell = row?.[columnKey]
    const fallbackValue = cell?.value ?? ''
    if (!cell || !cell.func) {
      const baseEntry: EvaluationCacheEntry = { value: fallbackValue }
      env.cache.set(cacheKey, baseEntry)
      return fallbackValue
    }

    if (env.stack.has(cacheKey)) {
      console.warn(`セル関数の循環参照を検出しました: row=${rowIndex + 1}, column=${columnKey}`)
      env.cache.set(cacheKey, { value: '' })
      return ''
    }

    const handler = getCellFunctionHandler(cell.func.name)
    if (!handler) {
      console.warn(`未対応のセル関数です: ${cell.func.name}`)
      env.cache.set(cacheKey, { value: '' })
      return ''
    }

    env.stack.add(cacheKey)
    let entry: EvaluationCacheEntry = { value: '' }
    try {
      const output = handler(cell.func.args, {
        rows: env.rows,
        columns: env.columns,
        rowIndex,
        columnKey,
        getCellValue: resolve,
      })
      entry = normalizeFunctionOutput(output, fallbackValue)
    } catch (error) {
      console.error(`セル関数「${cell.func.name}」の評価に失敗しました。`, error)
      entry = { value: '' }
    }
    env.stack.delete(cacheKey)
    env.cache.set(cacheKey, entry)
    return entry.value
  }
  return resolve
}

// Function Header: Applies registered cell functions to produce display-ready rows.
export function applyCellFunctions(rows: TableRow[], columns: string[]): TableRow[] {
  if (!rows.length) {
    return rows
  }

  const cache = new Map<string, EvaluationCacheEntry>()
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
      const cacheKey = `${rowIndex}:${columnKey}`
      const computedEntry = cache.get(cacheKey)
      if (!nextRow) {
        nextRow = { ...row }
      }
      const nextCell = { ...cell, value: computedValue }
      if (computedEntry?.styles) {
        if (Object.prototype.hasOwnProperty.call(computedEntry.styles, 'color')) {
          if (computedEntry.styles.color === null) {
            delete nextCell.color
          } else if (typeof computedEntry.styles.color === 'string') {
            nextCell.color = computedEntry.styles.color
          }
        }
        if (Object.prototype.hasOwnProperty.call(computedEntry.styles, 'bgColor')) {
          if (computedEntry.styles.bgColor === null) {
            delete nextCell.bgColor
          } else if (typeof computedEntry.styles.bgColor === 'string') {
            nextCell.bgColor = computedEntry.styles.bgColor
          }
        }
      }
      nextRow[columnKey] = nextCell
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
  if (typeof candidate === 'number' || typeof candidate === 'string') {
    const index = parseRowIndex(candidate, totalRows)
    return index === null ? null : [index]
  }

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

const parseColumnIndex = (value: unknown, totalColumns: number): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const normalized = Math.round(value) - 1
    return normalized >= 0 && normalized < totalColumns ? normalized : null
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isNaN(parsed)) {
      return null
    }
    const normalized = Math.round(parsed) - 1
    return normalized >= 0 && normalized < totalColumns ? normalized : null
  }
  return null
}

const resolveColumnIndexes = (candidate: unknown, totalColumns: number): number[] | null => {
  if (typeof candidate === 'number' || typeof candidate === 'string') {
    const index = parseColumnIndex(candidate, totalColumns)
    return index === null ? null : [index]
  }

  if (Array.isArray(candidate)) {
    const indexes = candidate
      .map((entry) => parseColumnIndex(entry, totalColumns))
      .filter((index): index is number => index !== null)
    if (!indexes.length) {
      return null
    }
    return Array.from(new Set(indexes))
  }

  if (candidate && typeof candidate === 'object') {
    const record = candidate as Record<string, unknown>
    const start = parseColumnIndex(record.start, totalColumns)
    const end = parseColumnIndex(record.end, totalColumns)
    if (start === null && end === null) {
      return null
    }
    const rangeStart = start ?? 0
    const rangeEnd = end ?? totalColumns - 1
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

const resolveExplicitCells = (
  candidate: unknown,
  context: CellFunctionContext,
): ResolvedCellTarget[] | null => {
  if (!Array.isArray(candidate)) {
    return null
  }
  const totalRows = context.rows.length
  const totalColumns = context.columns.length
  const targets: ResolvedCellTarget[] = []
  candidate.forEach((entry) => {
    if (!entry || typeof entry !== 'object') {
      return
    }
    const record = entry as Record<string, unknown>
    const rowIndex = parseRowIndex(record.row ?? record.r ?? record.rowIndex, totalRows)
    if (rowIndex === null) {
      return
    }
    const keyCandidate =
      typeof record.key === 'string'
        ? record.key.trim()
        : typeof record.column === 'string'
          ? record.column.trim()
          : ''
    if (keyCandidate) {
      targets.push({ rowIndex, columnKey: keyCandidate })
      return
    }
    const columnIndex =
      parseColumnIndex(record.column ?? record.col ?? record.columnIndex, totalColumns) ?? null
    if (columnIndex === null) {
      return
    }
    const columnKey = context.columns[columnIndex]
    if (columnKey) {
      targets.push({ rowIndex, columnKey })
    }
  })
  if (!targets.length) {
    return null
  }
  const unique = new Map<string, ResolvedCellTarget>()
  targets.forEach((target) => {
    unique.set(`${target.rowIndex}:${target.columnKey}`, target)
  })
  return Array.from(unique.values())
}

export const resolveFunctionTargets = (args: CellFunctionArgs, context: CellFunctionContext): ResolvedCellTarget[] => {
  const record = (args ?? {}) as Record<string, unknown>
  const explicitCells = resolveExplicitCells(record.cells, context)
  if (explicitCells) {
    return explicitCells
  }

  const axis = record.axis === 'row' ? 'row' : 'column'
  const totalRows = context.rows.length
  const totalColumns = context.columns.length

  const keyCandidate = typeof record.key === 'string' ? record.key.trim() : ''
  const keysCandidate = Array.isArray(record.keys)
    ? (record.keys.map((entry) => (typeof entry === 'string' ? entry.trim() : '')).filter(
        (value) => value.length > 0,
      ) as string[])
    : []
  const columnRange = record.columns ? resolveColumnIndexes(record.columns, totalColumns) : null

  const targetColumns = (() => {
    const viaKeys = [...keysCandidate]
    if (keyCandidate) {
      viaKeys.unshift(keyCandidate)
    }
    if (viaKeys.length) {
      return Array.from(new Set(viaKeys))
    }
    if (columnRange && columnRange.length) {
      return columnRange
        .map((index) => context.columns[index])
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
    }
    if (axis === 'row') {
      return context.columns.length ? [...context.columns] : [context.columnKey]
    }
    return [context.columnKey]
  })()

  const rowIndexes =
    (record.rows ? resolveRowIndexes(record.rows, totalRows) : null) ??
    (axis === 'row'
      ? [context.rowIndex]
      : Array.from({ length: totalRows }, (_, index) => index))

  const targets: ResolvedCellTarget[] = []
  rowIndexes.forEach((rowIndex) => {
    targetColumns.forEach((columnKey) => {
      targets.push({ rowIndex, columnKey })
    })
  })

  if (!targets.length) {
    return []
  }

  const unique = new Map<string, ResolvedCellTarget>()
  targets.forEach((target) => {
    unique.set(`${target.rowIndex}:${target.columnKey}`, target)
  })
  return Array.from(unique.values())
}

const sumFunctionHandler: CellFunctionHandler = (args, context) => {
  const targets = resolveFunctionTargets(args, context)
  const scopedTargets = targets.filter(
    (target) => !(target.rowIndex === context.rowIndex && target.columnKey === context.columnKey),
  )
  const effectiveTargets = scopedTargets.length ? scopedTargets : targets
  if (!effectiveTargets.length) {
    return ''
  }
  let total = 0
  effectiveTargets.forEach(({ rowIndex, columnKey }) => {
    const rawValue = context.getCellValue(rowIndex, columnKey)
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
  description: '指定したセル範囲の値を合計します。',
})
