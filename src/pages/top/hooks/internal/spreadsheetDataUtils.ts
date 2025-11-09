import { cloneRow, deriveColumns, type TableRow, type TableSheet } from '../../../../services/workbookService'

export type SheetState = TableSheet & {
  columnOrder: string[]
}

export function createSheetState(sheets: TableSheet[]): SheetState[] {
  const safeSheets = sheets.length
    ? sheets
    : [
        {
          name: 'Sheet 1',
          rows: [],
        },
      ]

  return safeSheets.map((sheet) => {
    const rows = sheet.rows.map((row) => cloneRow(row))
    return {
      name: sheet.name,
      rows,
      columnOrder: deriveColumns(rows),
    }
  })
}

export function stripSheetState(sheet: SheetState): TableSheet {
  return { name: sheet.name, rows: sheet.rows.map((row) => cloneRow(row)) }
}

export function syncColumnOrder(currentOrder: string[], derivedColumns: string[]): string[] {
  const filtered = currentOrder.filter((column) => derivedColumns.includes(column))
  const appended = derivedColumns.filter((column) => !filtered.includes(column))
  return [...filtered, ...appended]
}

export function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false
  }
  return a.every((value, index) => value === b[index])
}

export function generateSheetName(sheets: SheetState[]): string {
  const existing = new Set(sheets.map((sheet) => sheet.name))
  let index = sheets.length + 1
  let candidate = `Sheet ${index}`
  while (existing.has(candidate)) {
    index += 1
    candidate = `Sheet ${index}`
  }
  return candidate
}

export function generateNextColumnKey(existing: string[]): string {
  const baseName = 'column'
  let index = existing.length + 1
  let candidate = `${baseName}_${index}`
  const taken = new Set(existing)
  while (taken.has(candidate)) {
    index += 1
    candidate = `${baseName}_${index}`
  }
  return candidate
}

export function cloneRows(rows: TableRow[]): TableRow[] {
  return rows.map((row) => cloneRow(row))
}
