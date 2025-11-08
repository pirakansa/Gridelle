// File Header: Shared type definitions used across spreadsheet-related hooks.
import type { TableRow } from '../../utils/yamlTable'

export type Notice = { text: string; tone: 'error' | 'success' }

export type CellPosition = { rowIndex: number; columnIndex: number }

export type SelectionRange = {
  startRow: number
  endRow: number
  startCol: number
  endCol: number
}

export type UpdateRows = (_rows: TableRow[]) => void
