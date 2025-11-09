// File Header: Provides TSV-based serialization helpers for clipboard transfers.

// Function Header: Converts a matrix of cell values into a TSV string with quote escaping.
export const serializeClipboardMatrix = (matrix: string[][]): string => {
  return matrix
    .map((row) => row.map((value) => escapeCellValue(value ?? '')).join('\t'))
    .join('\n')
}

// Function Header: Parses TSV clipboard text (with quoted fields) into a value matrix.
export const parseClipboardText = (text: string): string[][] => {
  if (!text.length) {
    return []
  }

  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ''
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]

    if (inQuotes) {
      if (char === '"') {
        const nextChar = text[index + 1]
        if (nextChar === '"') {
          currentCell += '"'
          index += 1
        } else {
          inQuotes = false
        }
      } else {
        currentCell += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }

    if (char === '\t') {
      currentRow.push(currentCell)
      currentCell = ''
      continue
    }

    if (char === '\n') {
      currentRow.push(currentCell)
      rows.push(currentRow)
      currentRow = []
      currentCell = ''
      continue
    }

    if (char === '\r') {
      const nextChar = text[index + 1]
      currentRow.push(currentCell)
      rows.push(currentRow)
      currentRow = []
      currentCell = ''
      if (nextChar === '\n') {
        index += 1
      }
      continue
    }

    currentCell += char
  }

  currentRow.push(currentCell)
  rows.push(currentRow)

  if (text.endsWith('\n') || text.endsWith('\r')) {
    const lastRow = rows[rows.length - 1]
    if (lastRow.length === 1 && lastRow[0] === '') {
      rows.pop()
    }
  }

  return rows
}

const escapeCellValue = (rawValue: string): string => {
  const value = rawValue ?? ''
  const requiresQuotes = /["\t\n\r]/.test(value)
  const escaped = value.replace(/"/g, '""')
  return requiresQuotes ? `"${escaped}"` : escaped
}
