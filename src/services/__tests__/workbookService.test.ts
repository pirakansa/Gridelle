// File Header: Tests for workbook parsing and stringification helpers.
import { describe, expect, it } from 'vitest'

import { parseWorkbook, stringifyWorkbook } from '../workbookService'

describe('parseWorkbook', () => {
  it('honors meta-specified row keys when reading sheets', () => {
    const yaml = `
- name: Items Sheet
  meta:
    layout: row-major
    rowKey: items
  items:
    - column_a: a1
      column_b: b1
`
    const sheets = parseWorkbook(yaml)
    expect(sheets[0]?.meta?.rowKey).toBe('items')
    expect(sheets[0]?.meta?.layout).toBe('row-major')
    expect(sheets[0]?.rows[0]?.column_a?.value).toBe('a1')
    expect(sheets[0]?.rows[0]?.column_b?.value).toBe('b1')
  })

  it('detects items arrays without meta and records the alias', () => {
    const yaml = `
- name: Implicit Items
  items:
    - foo: bar
`
    const sheets = parseWorkbook(yaml)
    expect(sheets[0]?.meta?.rowKey).toBe('items')
    expect(sheets[0]?.rows[0]?.foo?.value).toBe('bar')
  })
})

describe('stringifyWorkbook', () => {
  it('emits custom row keys and preserves sheet meta', () => {
    const yaml = stringifyWorkbook([
      {
        name: 'Custom Output',
        rows: [
          {
            alpha: { value: 'x' },
          },
        ],
        meta: {
          rowKey: 'items',
          layout: 'row-major',
        },
      },
    ])

    expect(yaml).toContain('items:')
    expect(yaml).toContain('rowKey: items')
    expect(yaml).toContain('layout: row-major')
    expect(yaml).not.toContain('rows:')
  })
})
