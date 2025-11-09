import { describe, expect, it } from 'vitest'
import { applyCellFunctions, listRegisteredFunctions, resolveFunctionRange } from '../cellFunctionEngine'
import { createCell, type TableRow } from '../../../../services/workbookService'

describe('applyCellFunctions', () => {
  it('evaluates sum functions across the specified column', () => {
    const rows: TableRow[] = [
      { metric: createCell('2') },
      { metric: createCell('3') },
      {
        metric: {
          value: '',
          func: { name: 'sum', args: { key: 'metric' } },
        },
      },
    ]

    const evaluated = applyCellFunctions(rows, ['metric'])

    expect(evaluated[2]?.metric?.value).toBe('5')
  })

  it('limits sum evaluation to the provided row range', () => {
    const rows: TableRow[] = [
      { metric: createCell('1') },
      { metric: createCell('2') },
      { metric: createCell('4') },
      {
        metric: {
          value: '',
          func: {
            name: 'sum',
            args: {
              key: 'metric',
              rows: { start: 2, end: 3 },
            },
          },
        },
      },
    ]

    const evaluated = applyCellFunctions(rows, ['metric'])

    expect(evaluated[3]?.metric?.value).toBe('6')
  })

  it('lists registered functions with metadata', () => {
    const functions = listRegisteredFunctions()
    const sumEntry = functions.find((entry) => entry.id === 'sum')
    expect(sumEntry).toBeTruthy()
    expect(sumEntry?.source).toBe('builtin')
  })

  it('resolves function ranges from arguments', () => {
    const context = {
      rows: [{ col: createCell('1') }, { col: createCell('2') }],
      columns: ['col'],
      rowIndex: 0,
      columnKey: 'col',
      getCellValue: () => '',
    }
    const range = resolveFunctionRange({ key: 'col', rows: { start: 2 } }, context)
    expect(range.targetColumn).toBe('col')
    expect(range.rowIndexes).toEqual([1])
  })
})
