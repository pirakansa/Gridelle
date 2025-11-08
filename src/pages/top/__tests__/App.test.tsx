/// <reference types="vitest" />
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from '../App'

const writeTextMock = vi.fn(async (_text: string) => undefined)

beforeEach(() => {
  writeTextMock.mockClear()
  const clipboard = { writeText: writeTextMock }
  Object.defineProperty(globalThis.navigator, 'clipboard', {
    value: clipboard,
    configurable: true,
  })
  Object.defineProperty(window.navigator, 'clipboard', {
    value: clipboard,
    configurable: true,
  })
})

describe('App', () => {
  it('初期表示でサンプルYAMLをテーブルにレンダリングする', () => {
    render(<App />)
    expect(screen.getByTestId('cell-display-0-feature')).toHaveTextContent('テーブル編集')
    expect(screen.getByTestId('cell-display-1-feature')).toHaveTextContent('YAML Export')
  })

  it('各行に行番号を表示する', () => {
    render(<App />)
    const rowNumbers = Array.from({ length: 5 }, (_, index) =>
      screen.getByTestId(`row-number-${index}`).textContent,
    )
    expect(rowNumbers).toEqual(['1', '2', '3', '4', '5'])
  })

  it('YAML入力を反映するとテーブル内容が更新される', async () => {
    const user = userEvent.setup()
    render(<App />)

    const textarea = screen.getByTestId('yaml-textarea') as HTMLTextAreaElement
    await user.clear(textarea)
    await user.type(
      textarea,
      '- feature: 新規カード{enter}  owner: Carol{enter}  status: DONE{enter}  effort: 2{enter}',
    )

    await user.click(screen.getByRole('button', { name: 'YAMLを反映' }))

    expect(await screen.findByTestId('cell-display-0-feature')).toHaveTextContent('新規カード')
    expect(screen.getByTestId('cell-display-0-owner')).toHaveTextContent('Carol')
  })

  it('セルを編集するとYAMLテキストにも反映される', async () => {
    render(<App />)

    const editableBox = screen.getByTestId('cell-box-0-feature')
    fireEvent.doubleClick(editableBox)
    const targetCell = (await screen.findByTestId('cell-0-feature')) as HTMLInputElement
    fireEvent.change(targetCell, { target: { value: 'API Design' } })

    const textarea = screen.getByTestId('yaml-textarea') as HTMLTextAreaElement
    await waitFor(() => {
      expect(textarea.value).toContain('API Design')
    })
  })

  it('列の並べ替えができる', async () => {
    const user = userEvent.setup()
    render(<App />)

    const beforeTitles = screen.getAllByTestId('column-title').map((node) => node.textContent)
    expect(beforeTitles).toEqual(['feature', 'owner', 'status', 'effort'])

    await user.click(screen.getByRole('button', { name: 'owner列を左へ移動' }))

    const afterTitles = screen.getAllByTestId('column-title').map((node) => node.textContent)
    expect(afterTitles).toEqual(['owner', 'feature', 'status', 'effort'])
  })

  it('セルの値をコピーできる', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('copy-0-feature'))

    expect(await screen.findByText('セルの値をコピーしました。')).toBeInTheDocument()
  })

  it('ドラッグ操作で複数セルを選択できる', async () => {
    render(<App />)
    const firstCell = screen.getByTestId('cell-box-0-feature')
    const targetCell = screen.getByTestId('cell-box-1-owner')

    fireEvent.click(firstCell)
    fireEvent.click(targetCell, { shiftKey: true })

    const summary = await screen.findByText(/4セル選択中/)
    expect(summary.textContent).toContain('4セル')
  })

  it('貼り付けで複数セルに値を反映できる', async () => {
    render(<App />)
    const shell = screen.getByTestId('interactive-table-shell')
    shell.focus()
    const pasteEvent = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent
    const clipboardData = {
      getData: vi.fn().mockReturnValue('feature\towner\nAPI\tDana'),
    }
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: clipboardData,
    })
    Object.defineProperty(pasteEvent, 'preventDefault', {
      value: vi.fn(),
    })

    fireEvent(shell, pasteEvent)

    await waitFor(() => {
      expect(screen.getByTestId('cell-display-1-feature')).toHaveTextContent('API')
      expect(screen.getByTestId('cell-display-1-owner')).toHaveTextContent('Dana')
    })
  })

  it('選択範囲に一括入力できる', async () => {
    const user = userEvent.setup()
    render(<App />)

    fireEvent.click(screen.getByTestId('cell-box-0-feature'))
    fireEvent.click(screen.getByTestId('cell-box-1-effort'), { shiftKey: true })

    const bulkInput = screen.getByTestId('bulk-input') as HTMLInputElement
    await user.clear(bulkInput)
    await user.type(bulkInput, 'DONE')
    await user.click(screen.getByTestId('bulk-apply'))

    expect(screen.getByTestId('cell-display-0-feature')).toHaveTextContent('DONE')
    expect(screen.getByTestId('cell-display-1-effort')).toHaveTextContent('DONE')
  })

  it('フィルハンドルで下方向に値をコピーできる', () => {
    render(<App />)

    fireEvent.click(screen.getByTestId('cell-box-0-feature'))
    const handle = screen.getByTestId('fill-handle')
    const targetCell = screen.getByTestId('cell-box-1-feature')

    fireEvent.pointerDown(handle)
    fireEvent.pointerEnter(targetCell)
    fireEvent.pointerUp(window)

    expect(screen.getByTestId('cell-display-1-feature')).toHaveTextContent('テーブル編集')
  })
})
