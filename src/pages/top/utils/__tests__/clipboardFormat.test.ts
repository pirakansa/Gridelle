import { describe, it, expect } from 'vitest'
import { parseClipboardText, serializeClipboardMatrix } from '../clipboardFormat'

describe('clipboardFormat', () => {
  it('シリアライズ時にタブや改行をエスケープする', () => {
    const matrix = [['Line1\nLine2', 'Tab\tValue', 'Quote "here"']]
    const text = serializeClipboardMatrix(matrix)

    expect(text).toBe('"Line1\nLine2"\t"Tab\tValue"\t"Quote ""here"""')
  })

  it('パース時に引用符付きセルの改行を保持する', () => {
    const text = '"Line1\nLine2"\tvalue\nnext\trow'
    const result = parseClipboardText(text)

    expect(result).toEqual([
      ['Line1\nLine2', 'value'],
      ['next', 'row'],
    ])
  })
})
