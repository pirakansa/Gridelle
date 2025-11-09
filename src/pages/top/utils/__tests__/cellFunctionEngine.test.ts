import { describe, expect, it } from 'vitest'
import { applyCellFunctions } from '../cellFunctionEngine'
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
})
