// File Header: Evaluates YAML-defined cell functions and provides a registry for macro handlers.
import { deriveColumns, type TableRow, type TableSheet } from '../../../services/workbookService'

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

export type ResolvedCellTarget = {
  rowIndex: number
  columnKey: string
  sheetName?: string
}

export type RegisteredFunctionMeta = {
  id: string
  label: string
  description?: string
  source: 'builtin' | 'wasm'
  moduleId?: string
  exportName?: string
  order?: number
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
  order?: number
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
    order: options?.order,
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
    .sort((a, b) => {
      const orderA = typeof a.order === 'number' ? a.order : Number.POSITIVE_INFINITY
      const orderB = typeof b.order === 'number' ? b.order : Number.POSITIVE_INFINITY
      if (orderA !== orderB) {
        return orderA - orderB
      }
      return a.label.localeCompare(b.label, 'ja')
    })

type EvaluationCacheEntry = {
  value: string
  styles?: CellStyleDirectives
}

type SheetEvaluationState = {
  name: string
  rows: TableRow[]
  columns: string[]
  cache: Map<string, EvaluationCacheEntry>
}

type WorkbookResolver = {
  getCellValue: (_rowIndex: number, _columnKey: string, _options?: { sheetName?: string }) => string
  resolveColumnKey: (_columnIndex: number, _sheetName?: string) => string | undefined
}

const buildSheetStateMap = (
  rows: TableRow[],
  columns: string[],
  workbook: TableSheet[] | undefined,
  activeSheetName: string,
): Map<string, SheetEvaluationState> => {
  const states = new Map<string, SheetEvaluationState>()
  workbook?.forEach((sheet) => {
    states.set(sheet.name, {
      name: sheet.name,
      rows: sheet.rows,
      columns: deriveColumns(sheet.rows),
      cache: new Map<string, EvaluationCacheEntry>(),
    })
  })
  const activeState = states.get(activeSheetName)
  if (activeState) {
    activeState.rows = rows
    activeState.columns = columns
  } else {
    states.set(activeSheetName, {
      name: activeSheetName,
      rows,
      columns,
      cache: new Map<string, EvaluationCacheEntry>(),
    })
  }
  return states
}

const createWorkbookResolver = (
  sheetStates: Map<string, SheetEvaluationState>,
  defaultSheetName: string,
): WorkbookResolver => {
  const stack = new Set<string>()
  const getSheetState = (sheetName?: string): SheetEvaluationState | undefined =>
    sheetStates.get(sheetName ?? defaultSheetName)

  const resolveColumnKey = (columnIndex: number, sheetName?: string): string | undefined => {
    const sheet = getSheetState(sheetName)
    if (!sheet) {
      return undefined
    }
    if (columnIndex < 0 || columnIndex >= sheet.columns.length) {
      return undefined
    }
    return sheet.columns[columnIndex]
  }

  const getCellValue = (rowIndex: number, columnKey: string, options?: { sheetName?: string }): string => {
    const targetSheetName = options?.sheetName ?? defaultSheetName
    const sheet = getSheetState(targetSheetName)
    if (!sheet) {
      return ''
    }
    const cacheKey = `${rowIndex}:${columnKey}`
    const cached = sheet.cache.get(cacheKey)
    if (cached) {
      return cached.value
    }
    if (rowIndex < 0 || rowIndex >= sheet.rows.length) {
      const entry: EvaluationCacheEntry = { value: '' }
      sheet.cache.set(cacheKey, entry)
      return ''
    }
    const row = sheet.rows[rowIndex]
    const cell = row?.[columnKey]
    const fallbackValue = cell?.value ?? ''
    if (!cell || !cell.func) {
      const entry: EvaluationCacheEntry = { value: fallbackValue }
      sheet.cache.set(cacheKey, entry)
      return fallbackValue
    }
    const stackKey = `${targetSheetName}:${cacheKey}`
    if (stack.has(stackKey)) {
      console.warn(
        `セル関数の循環参照を検出しました: sheet=${targetSheetName}, row=${rowIndex + 1}, column=${columnKey}`,
      )
      sheet.cache.set(cacheKey, { value: '' })
      return ''
    }
    const handler = getCellFunctionHandler(cell.func.name)
    if (!handler) {
      console.warn(`未対応のセル関数です: ${cell.func.name}`)
      sheet.cache.set(cacheKey, { value: '' })
      return ''
    }
    stack.add(stackKey)
    let entry: EvaluationCacheEntry = { value: '' }
    try {
      const output = handler(cell.func.args, {
        rows: sheet.rows,
        columns: sheet.columns,
        rowIndex,
        columnKey,
        sheetName: targetSheetName,
        getCellValue: (nextRowIndex, nextColumnKey, nextOptions) =>
          getCellValue(nextRowIndex, nextColumnKey, {
            sheetName: nextOptions?.sheetName ?? targetSheetName,
          }),
        resolveColumnKey: (columnIndex, requestedSheet) =>
          resolveColumnKey(columnIndex, requestedSheet ?? targetSheetName),
      })
      entry = normalizeFunctionOutput(output, fallbackValue)
    } catch (error) {
      console.error(`セル関数「${cell.func.name}」の評価に失敗しました。`, error)
      entry = { value: '' }
    }
    stack.delete(stackKey)
    sheet.cache.set(cacheKey, entry)
    return entry.value
  }

  return {
    getCellValue,
    resolveColumnKey,
  }
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

type ApplyCellFunctionOptions = {
  workbook?: TableSheet[]
  sheetName?: string
}

// Function Header: Applies registered cell functions to produce display-ready rows.
export function applyCellFunctions(rows: TableRow[], columns: string[], options?: ApplyCellFunctionOptions): TableRow[] {
  if (!rows.length) {
    return rows
  }

  const activeSheetName = options?.sheetName ?? 'Sheet 1'
  const sheetStates = buildSheetStateMap(rows, columns, options?.workbook, activeSheetName)
  const resolver = createWorkbookResolver(sheetStates, activeSheetName)
  const activeSheetState = sheetStates.get(activeSheetName)
  if (!activeSheetState) {
    return rows
  }

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
      const computedValue = resolver.getCellValue(rowIndex, columnKey, { sheetName: activeSheetName })
      const cacheKey = `${rowIndex}:${columnKey}`
      const computedEntry = activeSheetState.cache.get(cacheKey)
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

const parseRowIndex = (value: unknown, totalRows?: number): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const normalized = Math.round(value) - 1
    if (normalized < 0) {
      return null
    }
    if (typeof totalRows === 'number' && normalized >= totalRows) {
      return null
    }
    return normalized
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isNaN(parsed)) {
      return null
    }
    const normalized = Math.round(parsed) - 1
    if (normalized < 0) {
      return null
    }
    if (typeof totalRows === 'number' && normalized >= totalRows) {
      return null
    }
    return normalized
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

const parseColumnIndex = (value: unknown, totalColumns?: number): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const normalized = Math.round(value) - 1
    if (normalized < 0) {
      return null
    }
    if (typeof totalColumns === 'number' && normalized >= totalColumns) {
      return null
    }
    return normalized
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isNaN(parsed)) {
      return null
    }
    const normalized = Math.round(parsed) - 1
    if (normalized < 0) {
      return null
    }
    if (typeof totalColumns === 'number' && normalized >= totalColumns) {
      return null
    }
    return normalized
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
    const sheetCandidate =
      typeof record.sheet === 'string'
        ? record.sheet.trim()
        : typeof record.sheetName === 'string'
          ? record.sheetName.trim()
          : ''
    const sheetName = sheetCandidate.length ? sheetCandidate : undefined
    const rowIndex = parseRowIndex(record.row ?? record.r ?? record.rowIndex, sheetName ? undefined : totalRows)
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
      targets.push({
        rowIndex,
        columnKey: keyCandidate,
        ...(sheetName ? { sheetName } : {}),
      })
      return
    }
    const columnIndex =
      parseColumnIndex(record.column ?? record.col ?? record.columnIndex, sheetName ? undefined : totalColumns) ?? null
    if (columnIndex === null) {
      return
    }
    const columnKey =
      sheetName && context.resolveColumnKey
        ? context.resolveColumnKey(columnIndex, sheetName)
        : context.columns[columnIndex]
    if (columnKey) {
      targets.push({
        rowIndex,
        columnKey,
        ...(sheetName ? { sheetName } : {}),
      })
    }
  })
  if (!targets.length) {
    return null
  }
  const unique = new Map<string, ResolvedCellTarget>()
  targets.forEach((target) => {
    const sheetKey = target.sheetName ?? context.sheetName ?? '__current__'
    unique.set(`${sheetKey}:${target.rowIndex}:${target.columnKey}`, target)
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
    const sheetKey = target.sheetName ?? context.sheetName ?? '__current__'
    unique.set(`${sheetKey}:${target.rowIndex}:${target.columnKey}`, target)
  })
  return Array.from(unique.values())
}

const sumFunctionHandler: CellFunctionHandler = (args, context) => {
  const targets = resolveFunctionTargets(args, context)
  const scopedTargets = targets.filter(
    (target) =>
      !(
        target.rowIndex === context.rowIndex &&
        target.columnKey === context.columnKey &&
        (target.sheetName ?? context.sheetName) === context.sheetName
      ),
  )
  const effectiveTargets = scopedTargets.length ? scopedTargets : targets
  if (!effectiveTargets.length) {
    return ''
  }
  let total = 0
  effectiveTargets.forEach(({ rowIndex, columnKey, sheetName }) => {
    const rawValue = context.getCellValue(rowIndex, columnKey, { sheetName })
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
  order: 1,
})

const multiplyFunctionHandler: CellFunctionHandler = (args, context) => {
  const targets = resolveFunctionTargets(args, context)
  const scopedTargets = targets.filter(
    (target) =>
      !(
        target.rowIndex === context.rowIndex &&
        target.columnKey === context.columnKey &&
        (target.sheetName ?? context.sheetName) === context.sheetName
      ),
  )
  const effectiveTargets = scopedTargets.length ? scopedTargets : targets
  if (!effectiveTargets.length) {
    return ''
  }
  let product = 1
  let hasNumeric = false
  effectiveTargets.forEach(({ rowIndex, columnKey, sheetName }) => {
    const rawValue = context.getCellValue(rowIndex, columnKey, { sheetName })
    const numericValue = Number(rawValue)
    if (!Number.isNaN(numericValue)) {
      product *= numericValue
      hasNumeric = true
    }
  })
  if (!hasNumeric) {
    return ''
  }
  return product.toString()
}

registerCellFunction('multiply', multiplyFunctionHandler, {
  label: 'BIF: multiply',
  source: 'builtin',
  description: '指定したセル範囲の値を掛け合わせます。',
  order: 2,
})

type ConditionalOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'includes'
  | 'contains'
  | 'empty'
  | 'not_empty'

const normalizeConditionalOperator = (value: unknown): ConditionalOperator => {
  if (typeof value !== 'string') {
    return 'eq'
  }
  const normalized = value.trim().toLowerCase()
  if (
    normalized === 'neq' ||
    normalized === 'ne' ||
    normalized === 'not' ||
    normalized === 'not_equal' ||
    normalized === 'not-equal'
  ) {
    return 'neq'
  }
  if (normalized === 'gt' || normalized === 'greater' || normalized === 'greater_than') {
    return 'gt'
  }
  if (normalized === 'gte' || normalized === 'ge' || normalized === 'greater_or_equal') {
    return 'gte'
  }
  if (normalized === 'lt' || normalized === 'less' || normalized === 'less_than') {
    return 'lt'
  }
  if (normalized === 'lte' || normalized === 'le' || normalized === 'less_or_equal') {
    return 'lte'
  }
  if (normalized === 'includes' || normalized === 'contains') {
    return 'includes'
  }
  if (normalized === 'empty' || normalized === 'is_empty') {
    return 'empty'
  }
  if (normalized === 'not_empty' || normalized === 'not-empty' || normalized === 'filled') {
    return 'not_empty'
  }
  if (normalized === 'contains') {
    return 'contains'
  }
  return 'eq'
}

const coerceNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0
  }
  return null
}

const stringValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value)
}

const gatherComparisonValues = (record: Record<string, unknown>): unknown[] => {
  const result: unknown[] = []
  const append = (candidate: unknown): void => {
    if (candidate !== undefined) {
      result.push(candidate)
    }
  }
  if (Array.isArray(record.values)) {
    record.values.forEach((entry) => append(entry))
  }
  append(record.value ?? record.target ?? record.equals ?? record.threshold)
  if (Array.isArray(record.targets)) {
    record.targets.forEach((entry) => append(entry))
  }
  if (result.length === 0) {
    append(record.matchValue)
  }
  return result
}

const evaluateConditionForValue = (
  actual: string,
  expectedValues: unknown[],
  operator: ConditionalOperator,
  options: { caseInsensitive: boolean },
): boolean => {
  const normalizedActual = options.caseInsensitive ? actual.toLowerCase() : actual
  switch (operator) {
    case 'empty':
      return actual.trim().length === 0
    case 'not_empty':
      return actual.trim().length > 0
    case 'eq':
    case 'neq': {
      if (!expectedValues.length) {
        return false
      }
      const comparator = (expected: unknown): boolean => {
        const expectedNumber = coerceNumber(expected)
        const actualNumber = coerceNumber(actual)
        if (expectedNumber !== null && actualNumber !== null) {
          return operator === 'eq' ? actualNumber === expectedNumber : actualNumber !== expectedNumber
        }
        const expectedString = options.caseInsensitive
          ? stringValue(expected).trim().toLowerCase()
          : stringValue(expected).trim()
        return operator === 'eq'
          ? normalizedActual === expectedString
          : normalizedActual !== expectedString
      }
      return operator === 'eq'
        ? expectedValues.some((expected) => comparator(expected))
        : expectedValues.every((expected) => comparator(expected))
    }
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      if (!expectedValues.length) {
        return false
      }
      const comparator = (expected: unknown): boolean => {
        const expectedNumber = coerceNumber(expected)
        const actualNumber = coerceNumber(actual)
        if (expectedNumber === null || actualNumber === null) {
          return false
        }
        if (operator === 'gt') {
          return actualNumber > expectedNumber
        }
        if (operator === 'gte') {
          return actualNumber >= expectedNumber
        }
        if (operator === 'lt') {
          return actualNumber < expectedNumber
        }
        return actualNumber <= expectedNumber
      }
      return expectedValues.some((expected) => comparator(expected))
    }
    case 'includes':
    case 'contains': {
      if (!expectedValues.length) {
        return false
      }
      return expectedValues.some((expected) => {
        const expectedString = options.caseInsensitive
          ? stringValue(expected).toLowerCase()
          : stringValue(expected)
        return normalizedActual.includes(expectedString)
      })
    }
    default:
      return false
  }
}

const readTargetValue = (
  target: ResolvedCellTarget,
  context: CellFunctionContext,
  rawSelfValue: string,
): string => {
  const resolvedSheet = target.sheetName ?? context.sheetName
  const isSelf =
    resolvedSheet === context.sheetName &&
    target.rowIndex === context.rowIndex &&
    target.columnKey === context.columnKey
  if (isSelf) {
    return rawSelfValue
  }
  return context.getCellValue(target.rowIndex, target.columnKey, {
    ...(target.sheetName ? { sheetName: target.sheetName } : {}),
  })
}

const conditionalFillFunctionHandler: CellFunctionHandler = (args, context) => {
  const record = (args ?? {}) as Record<string, unknown>
  const operator = normalizeConditionalOperator(record.operator)
  const caseInsensitive = Boolean(record.caseInsensitive ?? record.ignoreCase ?? false)
  const matchModeRaw =
    typeof record.mode === 'string'
      ? record.mode
      : typeof record.match === 'string'
        ? record.match
        : typeof record.require === 'string'
          ? record.require
          : ''
  const matchMode = matchModeRaw.trim().toLowerCase()
  const matchStrategy: 'any' | 'all' = matchMode === 'all' || matchMode === 'every' ? 'all' : 'any'
  const desiredColor = normalizeColorDirective(record.color) ?? '#fef3c7'
  const elseColorProvided = Object.prototype.hasOwnProperty.call(record, 'elseColor')
  const fallbackColor =
    record.elseColor === null
      ? null
      : typeof record.elseColor === 'undefined'
        ? undefined
        : normalizeColorDirective(record.elseColor)
  const comparisonValues = gatherComparisonValues(record)
  const rawSelfValue = context.rows[context.rowIndex]?.[context.columnKey]?.value ?? ''
  const hasTargetArgs =
    'cells' in record || 'rows' in record || 'columns' in record || 'axis' in record || 'key' in record || 'keys' in record
  const targets = hasTargetArgs ? resolveFunctionTargets(args, context) : []
  const scopedTargets = targets.filter(
    (target) =>
      !(
        (target.sheetName ?? context.sheetName) === context.sheetName &&
        target.rowIndex === context.rowIndex &&
        target.columnKey === context.columnKey
      ),
  )
  const effectiveTargets = scopedTargets.length ? scopedTargets : targets
  const valuesToInspect = effectiveTargets.length
    ? effectiveTargets.map((target) => readTargetValue(target, context, rawSelfValue))
    : [rawSelfValue]

  const evaluator = (value: string): boolean =>
    evaluateConditionForValue(value, comparisonValues, operator, { caseInsensitive })
  const matches =
    matchStrategy === 'all'
      ? valuesToInspect.length > 0 && valuesToInspect.every((value) => evaluator(value))
      : valuesToInspect.some((value) => evaluator(value))

  if (!matches && !elseColorProvided) {
    return ''
  }

  const styles: CellStyleDirectives = {}
  if (matches) {
    styles.bgColor = desiredColor
  } else if (elseColorProvided) {
    styles.bgColor = fallbackColor ?? null
  }
  return { styles }
}

registerCellFunction('color_if', conditionalFillFunctionHandler, {
  label: 'BIF: color_if',
  source: 'builtin',
  description: '条件に応じてセルの背景色を変更します。',
  order: 3,
})
