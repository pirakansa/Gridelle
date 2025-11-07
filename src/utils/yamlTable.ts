// File Header: Helper utilities for translating between YAML strings and table row data.
import { dump, load } from 'js-yaml'

export type TableRow = Record<string, string>

// Function Header: Parses a YAML string into an array of table rows (records of string values).
export function parseYamlTable(source: string): TableRow[] {
  const trimmed = source.trim()
  if (!trimmed) {
    return []
  }

  const parsed = load(trimmed)
  if (!Array.isArray(parsed)) {
    throw new Error('YAMLのルート要素は配列である必要があります。')
  }

  return parsed.map((entry, index) => normalizeRow(entry, index))
}

// Function Header: Serializes table rows back into a YAML string.
export function stringifyYamlTable(rows: TableRow[]): string {
  if (!rows.length) {
    return '[]\n'
  }

  const normalizedRows = rows.map((row) => {
    const nextRow: TableRow = {}
    Object.entries(row).forEach(([key, value]) => {
      nextRow[key] = value ?? ''
    })
    return nextRow
  })

  const yamlText = dump(normalizedRows, {
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
