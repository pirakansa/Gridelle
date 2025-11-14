import { describe, expect, it } from 'vitest'
import {
  applyCellFunctions,
  listRegisteredFunctions,
  registerCellFunction,
  resolveFunctionTargets,
} from '../cellFunctionEngine'
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

  it('evaluates multiply functions across the specified column', () => {
    const rows: TableRow[] = [
      { metric: createCell('2') },
      { metric: createCell('3') },
      {
        metric: {
          value: '',
          func: { name: 'multiply', args: { key: 'metric' } },
        },
      },
    ]

    const evaluated = applyCellFunctions(rows, ['metric'])

    expect(evaluated[2]?.metric?.value).toBe('6')
  })

  it('limits multiply evaluation to the provided row range', () => {
    const rows: TableRow[] = [
      { metric: createCell('1') },
      { metric: createCell('2') },
      { metric: createCell('4') },
      {
        metric: {
          value: '',
          func: {
            name: 'multiply',
            args: {
              key: 'metric',
              rows: { start: 2, end: 3 },
            },
          },
        },
      },
    ]

    const evaluated = applyCellFunctions(rows, ['metric'])

    expect(evaluated[3]?.metric?.value).toBe('8')
  })

  it('lists registered functions with metadata', () => {
    const functions = listRegisteredFunctions()
    const sumEntry = functions.find((entry) => entry.id === 'sum')
    expect(sumEntry).toBeTruthy()
    expect(sumEntry?.source).toBe('builtin')
    const multiplyEntry = functions.find((entry) => entry.id === 'multiply')
    expect(multiplyEntry).toBeTruthy()
    expect(multiplyEntry?.source).toBe('builtin')
  })

  it('resolves flexible targets including axis and column ranges', () => {
    const context = {
      rows: [{ col: createCell('1') }, { col: createCell('2') }],
      columns: ['col', 'another', 'th'],
      rowIndex: 0,
      columnKey: 'col',
      getCellValue: () => '',
    }
    const targets = resolveFunctionTargets({ axis: 'row', columns: { start: 2, end: 3 }, rows: 2 }, context)
    expect(targets).toEqual([
      { rowIndex: 1, columnKey: 'another' },
      { rowIndex: 1, columnKey: 'th' },
    ])
  })

  it('resolves explicit cell references from args.cells', () => {
    const context = {
      rows: [
        { A: createCell('1'), B: createCell('') },
        { A: createCell('2'), B: createCell('') },
        { A: createCell(''), B: createCell('3') },
      ],
      columns: ['A', 'B'],
      rowIndex: 0,
      columnKey: 'A',
      getCellValue: () => '',
    }
    const targets = resolveFunctionTargets(
      {
        cells: [
          { row: 1, key: 'A' },
          { row: 3, columnIndex: 2 },
          { row: 2, column: 'B' },
        ],
      },
      context,
    )
    expect(targets).toEqual([
      { rowIndex: 0, columnKey: 'A' },
      { rowIndex: 2, columnKey: 'B' },
      { rowIndex: 1, columnKey: 'B' },
    ])
  })

  it('applies style directives without overriding values when handlers return structured output', () => {
    const fnName = 'style-directive-test'
    registerCellFunction(fnName, () => ({
      styles: {
        bgColor: '#ff0000',
      },
    }))

    const rows: TableRow[] = [
      {
        A: {
          value: '42',
          func: {
            name: fnName,
          },
        },
      },
    ]

    const evaluated = applyCellFunctions(rows, ['A'])
    expect(evaluated[0]?.A?.value).toBe('42')
    expect(evaluated[0]?.A?.bgColor).toBe('#ff0000')
  })
})
