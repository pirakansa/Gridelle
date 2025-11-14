import { describe, expect, it } from 'vitest'
import {
  applyCellFunctions,
  listRegisteredFunctions,
  registerCellFunction,
  resolveFunctionTargets,
} from '../cellFunctionEngine'
import { createCell, type TableRow, type TableSheet } from '../../../../services/workbookService'

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
    const columns = ['col', 'another', 'th']
    const context = {
      rows: [{ col: createCell('1') }, { col: createCell('2') }],
      columns,
      rowIndex: 0,
      columnKey: 'col',
      sheetName: 'Sheet 1',
      getCellValue: () => '',
      resolveColumnKey: (index: number) => columns[index],
    }
    const targets = resolveFunctionTargets({ axis: 'row', columns: { start: 2, end: 3 }, rows: 2 }, context)
    expect(targets).toEqual([
      { rowIndex: 1, columnKey: 'another' },
      { rowIndex: 1, columnKey: 'th' },
    ])
  })

  it('resolves explicit cell references from args.cells', () => {
    const columns = ['A', 'B']
    const context = {
      rows: [
        { A: createCell('1'), B: createCell('') },
        { A: createCell('2'), B: createCell('') },
        { A: createCell(''), B: createCell('3') },
      ],
      columns,
      rowIndex: 0,
      columnKey: 'A',
      sheetName: 'Sheet 1',
      getCellValue: () => '',
      resolveColumnKey: (index: number) => columns[index],
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

  it('attaches sheet metadata when explicit cells specify a sheet', () => {
    const columns = ['A']
    const context = {
      rows: [{ A: createCell('1') }],
      columns,
      rowIndex: 0,
      columnKey: 'A',
      sheetName: 'Sheet 1',
      getCellValue: () => '',
      resolveColumnKey: (index: number) => columns[index],
    }
    const targets = resolveFunctionTargets(
      {
        cells: [{ row: 1, key: 'A', sheet: 'Sheet 2' }],
      },
      context,
    )
    expect(targets).toEqual([{ rowIndex: 0, columnKey: 'A', sheetName: 'Sheet 2' }])
  })

  it('evaluates macros that reference cells on other sheets', () => {
    const analysisRows: TableRow[] = [
      {
        input: createCell('3'),
        result: {
          value: '',
          func: {
            name: 'sum',
            args: {
              cells: [
                { row: 1, key: 'input' },
                { row: 1, key: 'input', sheet: 'Data' },
              ],
            },
          },
        },
      },
    ]
    const workbook: TableSheet[] = [
      { name: 'Analysis', rows: analysisRows },
      { name: 'Data', rows: [{ input: createCell('7') }] },
    ]
    const evaluated = applyCellFunctions(analysisRows, ['input', 'result'], {
      workbook,
      sheetName: 'Analysis',
    })
    expect(evaluated[0]?.result?.value).toBe('10')
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
