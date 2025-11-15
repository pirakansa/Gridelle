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

type SheetEvaluationState = {
  name: string
  rows: TableRow[]
  columns: string[]
  cache: Map<string, EvaluationCacheEntry>
}

type SheetStateCollection = {
  states: Map<string, SheetEvaluationState>
  nameIndex: Map<string, string[]>
  activeSheetKey: string
  activeSheetName: string
}

type WorkbookResolver = {
  getCellValue: (_rowIndex: number, _columnKey: string, _options?: { sheetName?: string }) => string
  resolveColumnKey: (_columnIndex: number, _sheetName?: string) => string | undefined
}

const registerSheetIndex = (index: Map<string, string[]>, sheetName: string, key: string): void => {
  const existing = index.get(sheetName)
  if (existing) {
    existing.push(key)
    return
  }
  index.set(sheetName, [key])
}

const buildSheetStateMap = (
  rows: TableRow[],
  columns: string[],
  workbook: TableSheet[] | undefined,
  activeSheetName: string,
): SheetStateCollection => {
  const states = new Map<string, SheetEvaluationState>()
  const nameIndex = new Map<string, string[]>()
  let activeSheetKey: string | null = null

  workbook?.forEach((sheet, index) => {
    const key = `sheet-${index}`
    states.set(key, {
      name: sheet.name,
      rows: sheet.rows,
      columns: deriveColumns(sheet.rows),
      cache: new Map<string, EvaluationCacheEntry>(),
    })
    registerSheetIndex(nameIndex, sheet.name, key)
    if (!activeSheetKey && sheet.rows === rows) {
      activeSheetKey = key
    }
  })

  if (activeSheetKey) {
    const state = states.get(activeSheetKey)
    if (state) {
      state.rows = rows
      state.columns = columns
    }
  }

  if (!activeSheetKey) {
    const matchingKeys = nameIndex.get(activeSheetName)
    if (matchingKeys?.length) {
      activeSheetKey = matchingKeys[0]
      const state = states.get(activeSheetKey)
      if (state) {
        state.rows = rows
        state.columns = columns
      }
    }
  }

  if (!activeSheetKey) {
    const fallbackKey = `active-${activeSheetName}`
    states.set(fallbackKey, {
      name: activeSheetName,
      rows,
      columns,
      cache: new Map<string, EvaluationCacheEntry>(),
    })
    registerSheetIndex(nameIndex, activeSheetName, fallbackKey)
    activeSheetKey = fallbackKey
  } else if (!nameIndex.has(activeSheetName)) {
    registerSheetIndex(nameIndex, activeSheetName, activeSheetKey)
  }

  return {
    states,
    nameIndex,
    activeSheetKey,
    activeSheetName,
  }
}

const createWorkbookResolver = (sheetStates: SheetStateCollection): WorkbookResolver => {
  const { states, nameIndex, activeSheetKey, activeSheetName } = sheetStates
  const stack = new Set<string>()
  const getSheetState = (sheetName?: string): SheetEvaluationState | undefined => {
    const defaultState = states.get(activeSheetKey)
    if (!sheetName || sheetName === activeSheetName) {
      return defaultState
    }
    const candidates = nameIndex.get(sheetName)
    if (!candidates?.length) {
      return undefined
    }
    for (const key of candidates) {
      if (key === activeSheetKey) {
        continue
      }
      const candidate = states.get(key)
      if (candidate) {
        return candidate
      }
    }
    return defaultState
  }

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
    const targetSheetName = options?.sheetName ?? activeSheetName
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
  const resolver = createWorkbookResolver(sheetStates)
  const activeSheetState = sheetStates.states.get(sheetStates.activeSheetKey)
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
})
