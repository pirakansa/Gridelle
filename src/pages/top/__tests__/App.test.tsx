/// <reference types="vitest" />
import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
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
    expect(screen.getByTestId('sheet-name-input')).toHaveValue('バックログ')
  })

  it('設定メニューのヘッダーを表示する', () => {
    render(<App />)
    expect(screen.getByLabelText('Gridelleメニュー')).toBeInTheDocument()
  })

  it('各行に行番号を表示する', () => {
    render(<App />)
    const rowNumbers = Array.from({ length: 5 }, (_, index) =>
      within(screen.getByTestId(`row-number-${index}`)).getByRole('button', {
        name: `行${index + 1}を選択`,
      }).textContent,
    )
    expect(rowNumbers).toEqual(['1', '2', '3', '4', '5'])
  })

  it('メイン画面にYAML入力エリアを表示しない', () => {
    render(<App />)
    expect(screen.queryByTestId('yaml-textarea')).not.toBeInTheDocument()
  })

  it('メニューからYAML入力パネルを開閉できる', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'YAML入力 / プレビュー' }))
    expect(await screen.findByRole('dialog', { name: 'YAML入力 / プレビュー' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '閉じる' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'YAML入力 / プレビュー' })).not.toBeInTheDocument()
    })
  })

  it('YAML出力画面のトリガーを表示しない', () => {
    render(<App />)
    expect(screen.queryByRole('button', { name: 'YAML出力' })).not.toBeInTheDocument()
  })

  it('YAML入力を反映するとテーブル内容が更新される', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'YAML入力 / プレビュー' }))
    const textarea = (await screen.findByTestId('yaml-textarea')) as HTMLTextAreaElement
    await user.clear(textarea)
    await user.type(
      textarea,
      '- name: 新シート{enter}  rows:{enter}    - feature: 新規カード{enter}      owner: Carol{enter}      status: DONE{enter}      effort: 2{enter}',
    )

    await user.click(screen.getByRole('button', { name: 'YAMLを反映' }))

    expect(await screen.findByTestId('cell-display-0-feature')).toHaveTextContent('新規カード')
    expect(screen.getByTestId('cell-display-0-owner')).toHaveTextContent('Carol')
    expect(screen.getByTestId('sheet-name-input')).toHaveValue('新シート')
  })

  it('セルに複数行のテキストを入力できる', async () => {
    render(<App />)

    const editableBox = screen.getByTestId('cell-box-0-feature')
    fireEvent.doubleClick(editableBox)
    const targetCell = (await screen.findByTestId('cell-0-feature')) as HTMLTextAreaElement
    fireEvent.change(targetCell, { target: { value: 'Line1\nLine2' } })
    expect(targetCell.value).toBe('Line1\nLine2')
    fireEvent.keyDown(targetCell, { key: 'Enter', code: 'Enter' })

    await waitFor(() => {
      expect(screen.getByTestId('cell-display-0-feature').textContent).toBe('Line1\nLine2')
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

    const targetCell = screen.getByTestId('cell-box-0-feature')
    await user.click(targetCell)
    const shell = screen.getByTestId('interactive-table-shell')
    shell.focus()
    await user.keyboard('{Control>}c{/Control}')

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

  it('行番号をクリックすると行全体が選択される', () => {
    render(<App />)
    const rowButton = within(screen.getByTestId('row-number-2')).getByRole('button', {
      name: '行3を選択',
    })

    fireEvent.click(rowButton)

    const summary = screen.getByTestId('selection-summary')
    expect(summary.textContent).toContain('4セル選択中')
    expect(summary.textContent).toContain('R3〜3')
  })

  it('シートを切り替えると別データが表示される', async () => {
    const user = userEvent.setup()
    render(<App />)

  await user.selectOptions(screen.getByTestId('sheet-select'), '1')

    expect(screen.getByTestId('cell-display-0-feature')).toHaveTextContent('リリースノート作成')
    expect(screen.getByTestId('sheet-name-input')).toHaveValue('完了済み')
  })

  it('シート名を変更できる', async () => {
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByTestId('sheet-name-input') as HTMLInputElement
    await user.clear(input)
    await user.type(input, 'メインシート{enter}')

    expect(screen.getByTestId('sheet-name-input')).toHaveValue('メインシート')
    expect(await screen.findByText('シート名を「メインシート」に更新しました。')).toBeInTheDocument()
  })

  it('シートを追加すると空のシートが生成される', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('add-sheet-button'))

    const options = Array.from(
      (screen.getByTestId('sheet-select') as HTMLSelectElement).options,
    ).map((option) => option.textContent)
    expect(options).toContain('Sheet 3')

  await user.selectOptions(screen.getByTestId('sheet-select'), '2')
    expect(screen.getByText('表示するデータがありません。')).toBeInTheDocument()
  })
})
