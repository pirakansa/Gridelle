// File Header: Helper utilities for translating between YAML strings and table row data.
import { dump, load } from 'js-yaml'

export type TableRow = Record<string, string>

export type TableSheet = {
  name: string
  rows: TableRow[]
}

// Function Header: Parses a YAML string into an array of sheets containing table rows.
export function parseYamlWorkbook(source: string): TableSheet[] {
  const trimmed = source.trim()
  if (!trimmed) {
    return []
  }

  const parsed = load(trimmed)
  if (!Array.isArray(parsed)) {
    throw new Error('YAMLのルート要素は配列である必要があります。')
  }

  const looksLikeLegacyRows = parsed.every((entry) => {
    if (!entry || typeof entry !== 'object') {
      return false
    }
    const candidate = entry as Record<string, unknown>
    return !('rows' in candidate) && !('name' in candidate)
  })

  if (looksLikeLegacyRows) {
    return [
      {
        name: 'Sheet 1',
        rows: parsed.map((entry, index) => normalizeRow(entry, index)),
      },
    ]
  }

  return parsed.map((entry, index) => normalizeSheet(entry, index))
}

// Function Header: Serializes workbook sheets back into a YAML string.
export function stringifyYamlWorkbook(sheets: TableSheet[]): string {
  if (!sheets.length) {
    return '[]\n'
  }

  const normalizedSheets = sheets.map((sheet, index) => {
    const name = sheet.name.trim() ? sheet.name : `Sheet ${index + 1}`
    return {
      name,
      rows: sheet.rows.map((row, rowIndex) => normalizeRow(row, rowIndex)),
    }
  })

  const yamlText = dump(normalizedSheets, {
    lineWidth: 120,
    noRefs: true,
    skipInvalid: true,
    sortKeys: false,
  })

  return yamlText.endsWith('\n') ? yamlText : `${yamlText}\n`
}

// Function Header: Derives the ordered list of columns from the given rows.
export function deriveColumns(rows: TableRow[]): string[] {
  const columnSet = new Set<string>()
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => columnSet.add(key))
  })
  return Array.from(columnSet)
}

function normalizeSheet(entry: unknown, index: number): TableSheet {
  if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
    const record = entry as Record<string, unknown>
    const nameRaw = record.name
    const rowsRaw = record.rows
    const name = typeof nameRaw === 'string' && nameRaw.trim().length > 0 ? nameRaw : `Sheet ${
      index + 1
    }`
    const rowsSource = Array.isArray(rowsRaw) ? rowsRaw : []
    const rows = rowsSource.map((rowEntry, rowIndex) => normalizeRow(rowEntry, rowIndex))
    return { name, rows }
  }

  if (Array.isArray(entry)) {
    return {
      name: `Sheet ${index + 1}`,
      rows: entry.map((rowEntry, rowIndex) => normalizeRow(rowEntry, rowIndex)),
    }
  }

  return {
    name: `Sheet ${index + 1}`,
    rows: [normalizeRow(entry, 0)],
  }
}

function normalizeRow(entry: unknown, index: number): TableRow {
  if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
    const normalized: TableRow = {}
    Object.entries(entry as Record<string, unknown>).forEach(([key, value]) => {
      normalized[key] = stringifyValue(value)
    })
    return normalized
  }

  return { [`value_${index + 1}`]: stringifyValue(entry) }
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }

  return String(value)
}
