/// <reference types="vitest" />
import React from 'react'
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../utils/navigation', () => ({
  redirectToLogin: vi.fn(),
  redirectToTop: vi.fn(),
}))

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

  it('ヘルプタブでバージョン情報を確認できる', () => {
    render(<App />)
    fireEvent.click(screen.getByTestId('menu-tab-help'))
    expect(screen.getByTestId('app-version')).toHaveTextContent(import.meta.env.VITE_APP_VERSION)
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

  it('編集モード中にテキストエリアをクリックしても編集が継続する', async () => {
    const user = userEvent.setup()
    render(<App />)

    const editableBox = screen.getByTestId('cell-box-0-feature')
    fireEvent.doubleClick(editableBox)
    const editor = (await screen.findByTestId('cell-0-feature')) as HTMLTextAreaElement

    await user.click(editor)

    expect(screen.getByTestId('cell-0-feature')).toBeInTheDocument()
    expect(editor).toHaveFocus()
  })

  it('列の並べ替えができる', async () => {
    const user = userEvent.setup()
    render(<App />)

    const beforeTitles = screen.getAllByTestId('column-title').map((node) => node.textContent)
    expect(beforeTitles).toEqual(['feature', 'owner', 'status', 'effort'])

    await user.click(screen.getByTestId('menu-tab-structure'))
    await user.click(screen.getByTestId('column-select-1'))

    const moveLeftButton = await screen.findByTestId('move-selected-columns-left')
    expect(moveLeftButton).toBeEnabled()
    await user.click(moveLeftButton)

    const afterTitles = screen.getAllByTestId('column-title').map((node) => node.textContent)
    expect(afterTitles).toEqual(['owner', 'feature', 'status', 'effort'])
  })

  it('列を追加すると自動採番された列が連続して追加される', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('menu-tab-structure'))

    await user.click(screen.getByRole('button', { name: '列を追加' }))

    await waitFor(() => {
      const titles = screen.getAllByTestId('column-title').map((node) => node.textContent)
      expect(titles).toContain('column_5')
    })

    expect(await screen.findByTestId('cell-display-0-column_5')).toHaveTextContent('')

    await user.click(screen.getByRole('button', { name: '列を追加' }))

    await waitFor(() => {
      const titles = screen.getAllByTestId('column-title').map((node) => node.textContent)
      expect(titles).toContain('column_6')
    })

    expect(await screen.findByTestId('cell-display-0-column_6')).toHaveTextContent('')
  })

  it('選択行の下に行を追加できる', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('menu-tab-structure'))

    const rowButton = within(screen.getByTestId('row-number-0')).getByRole('button', {
      name: '行1を選択',
    })
    await user.click(rowButton)

    const insertRowButton = screen.getByTestId('insert-row-below-selection')
    expect(insertRowButton).toBeEnabled()

    await user.click(insertRowButton)

    await waitFor(() => {
      expect(screen.getAllByTestId(/row-number-/)).toHaveLength(6)
    })

    const insertedRowCell = await screen.findByTestId('cell-display-1-feature')
    expect(insertedRowCell).toHaveTextContent('')
  })

  it('選択列の右に列を追加できる', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('menu-tab-structure'))

    await user.click(screen.getByTestId('column-select-0'))

    const insertColumnButton = screen.getByTestId('insert-column-right-of-selection')
    expect(insertColumnButton).toBeEnabled()

    await user.click(insertColumnButton)

    await waitFor(() => {
      const titles = screen.getAllByTestId('column-title').map((node) => node.textContent)
      expect(titles).toEqual(['feature', 'column_5', 'owner', 'status', 'effort'])
    })

    const insertedColumnCell = await screen.findByTestId('cell-display-0-column_5')
    expect(insertedColumnCell).toHaveTextContent('')
  })

  it('列ヘッダーのボタンで列全体を選択できる', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('column-select-1'))

    await waitFor(() => {
      expect(screen.getByTestId('cell-box-0-owner')).toHaveAttribute('data-selected', 'true')
      expect(screen.getByTestId('cell-box-1-owner')).toHaveAttribute('data-selected', 'true')
    })
  })

  it('選択列を左へ移動できる', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('menu-tab-structure'))
    await user.click(screen.getByTestId('column-select-2'))

    const moveLeftButton = screen.getByTestId('move-selected-columns-left')
    expect(moveLeftButton).toBeEnabled()

    await user.click(moveLeftButton)

    await waitFor(() => {
      const titles = screen.getAllByTestId('column-title').map((node) => node.textContent)
      expect(titles).toEqual(['feature', 'status', 'owner', 'effort'])
    })

    expect(screen.getByTestId('cell-box-0-status')).toHaveAttribute('data-selected', 'true')
  })

  it('選択列を右へ移動できる', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('menu-tab-structure'))
    await user.click(screen.getByTestId('column-select-0'))

    const moveRightButton = screen.getByTestId('move-selected-columns-right')
    expect(moveRightButton).toBeEnabled()

    await user.click(moveRightButton)

    await waitFor(() => {
      const titles = screen.getAllByTestId('column-title').map((node) => node.textContent)
      expect(titles).toEqual(['owner', 'feature', 'status', 'effort'])
    })

    expect(screen.getByTestId('cell-box-0-feature')).toHaveAttribute('data-selected', 'true')
  })

  it('複数列を移動しても選択範囲が拡張されない', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('menu-tab-structure'))

    await user.click(screen.getByTestId('column-select-1'))
    fireEvent.click(screen.getByTestId('column-select-2'), { shiftKey: true })

    const moveRightButton = screen.getByTestId('move-selected-columns-right')
    expect(moveRightButton).toBeEnabled()

    await user.click(moveRightButton)

    await waitFor(() => {
      expect(screen.getByTestId('cell-box-0-owner')).toHaveAttribute('data-selected', 'true')
      expect(screen.getByTestId('cell-box-0-status')).toHaveAttribute('data-selected', 'true')
      expect(screen.getByTestId('cell-box-0-feature')).not.toHaveAttribute('data-selected')
      expect(screen.getByTestId('cell-box-0-effort')).not.toHaveAttribute('data-selected')
    })
  })

  it('選択行を下へ移動できる', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('menu-tab-structure'))

    const firstRowButton = within(screen.getByTestId('row-number-0')).getByRole('button', {
      name: '行1を選択',
    })
    await user.click(firstRowButton)

    const moveDownButton = screen.getByTestId('move-selected-rows-down')
    expect(moveDownButton).toBeEnabled()

    await user.click(moveDownButton)

    await waitFor(() => {
      expect(screen.getByTestId('cell-display-0-feature')).toHaveTextContent('YAML Export')
      expect(screen.getByTestId('cell-display-1-feature')).toHaveTextContent('テーブル編集')
    })

    expect(screen.getByTestId('cell-box-1-feature')).toHaveAttribute('data-selected', 'true')
  })

  it('選択行を上へ移動できる', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('menu-tab-structure'))

    const secondRowButton = within(screen.getByTestId('row-number-1')).getByRole('button', {
      name: '行2を選択',
    })
    await user.click(secondRowButton)

    const moveUpButton = screen.getByTestId('move-selected-rows-up')
    expect(moveUpButton).toBeEnabled()

    await user.click(moveUpButton)

    await waitFor(() => {
      expect(screen.getByTestId('cell-display-0-feature')).toHaveTextContent('YAML Export')
      expect(screen.getByTestId('cell-display-1-feature')).toHaveTextContent('テーブル編集')
    })

    expect(screen.getByTestId('cell-box-0-feature')).toHaveAttribute('data-selected', 'true')
  })

  it('複数行を移動しても選択範囲が拡張されない', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('menu-tab-structure'))

    const secondRowButton = within(screen.getByTestId('row-number-1')).getByRole('button', {
      name: '行2を選択',
    })
    await user.click(secondRowButton)

    const thirdRowButton = within(screen.getByTestId('row-number-2')).getByRole('button', {
      name: '行3を選択',
    })
    fireEvent.click(thirdRowButton, { shiftKey: true })

    const moveUpButton = screen.getByTestId('move-selected-rows-up')
    expect(moveUpButton).toBeEnabled()

    await user.click(moveUpButton)

    await waitFor(() => {
      expect(screen.getByTestId('cell-box-0-feature')).toHaveAttribute('data-selected', 'true')
      expect(screen.getByTestId('cell-box-1-feature')).toHaveAttribute('data-selected', 'true')
      expect(screen.getByTestId('cell-box-2-feature')).not.toHaveAttribute('data-selected')
    })
  })

  it('すべての列を削除するとテーブルが空状態になる', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('menu-tab-structure'))

    await user.click(screen.getByTestId('column-select-0'))
    fireEvent.click(screen.getByTestId('column-select-3'), { shiftKey: true })

    const deleteColumnsButton = screen.getByTestId('delete-selected-columns')
    expect(deleteColumnsButton).toBeEnabled()

    await user.click(deleteColumnsButton)

    expect(await screen.findByText('すべての列を削除しました。')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryAllByTestId('column-title')).toHaveLength(0)
    })

    expect(await screen.findByText('表示するデータがありません。')).toBeInTheDocument()
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
    fireEvent.click(screen.getByTestId('menu-tab-selection'))
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

  it('複数行セルを貼り付けてもセル内の改行を保持する', async () => {
    render(<App />)
    fireEvent.click(screen.getByTestId('cell-box-0-feature'))
    const shell = screen.getByTestId('interactive-table-shell')
    shell.focus()
    const pasteEvent = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent
    const clipboardData = {
      getData: vi.fn().mockReturnValue('"Line1\nLine2"'),
    }
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: clipboardData,
    })
    Object.defineProperty(pasteEvent, 'preventDefault', {
      value: vi.fn(),
    })

    fireEvent(shell, pasteEvent)

    await waitFor(() => {
      expect(screen.getByTestId('cell-display-0-feature').textContent).toBe('Line1\nLine2')
    })
  })

  it('セル編集中に複数行をペーストしても範囲展開されない', async () => {
    render(<App />)

    const editableBox = screen.getByTestId('cell-box-0-feature')
    fireEvent.doubleClick(editableBox)
    const editor = (await screen.findByTestId('cell-0-feature')) as HTMLTextAreaElement

    fireEvent.change(editor, { target: { value: '' } })
    const pasteEvent = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent
    const clipboardData = {
      getData: vi.fn().mockReturnValue('Line1\nLine2'),
    }
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: clipboardData,
    })

    fireEvent(editor, pasteEvent)
    fireEvent.change(editor, { target: { value: 'Line1\nLine2' } })
    fireEvent.blur(editor)

    expect(clipboardData.getData).not.toHaveBeenCalled()

    await waitFor(() => {
      expect(screen.getByTestId('cell-display-0-feature').textContent).toBe('Line1\nLine2')
      expect(screen.getByTestId('cell-display-1-feature')).toHaveTextContent('YAML Export')
    })
  })

  it('DELキーで選択セルの内容を削除できる', async () => {
    render(<App />)

    fireEvent.click(screen.getByTestId('cell-box-0-feature'))
    const shell = screen.getByTestId('interactive-table-shell')
    shell.focus()

    fireEvent.keyDown(shell, { key: 'Delete', code: 'Delete' })

    await waitFor(() => {
      expect(screen.getByTestId('cell-display-0-feature').textContent).toBe('')
    })
    expect(await screen.findByText('選択セルの内容を削除しました。')).toBeInTheDocument()
  })

  it('カーソルキーで選択セルを移動できる', async () => {
    render(<App />)

    fireEvent.click(screen.getByTestId('cell-box-0-feature'))
    const shell = screen.getByTestId('interactive-table-shell')
    shell.focus()

    fireEvent.keyDown(shell, { key: 'ArrowDown', code: 'ArrowDown' })
    await waitFor(() => {
      expect(screen.getByTestId('cell-box-1-feature')).toHaveAttribute('data-selected', 'true')
    })
    expect(screen.getByTestId('cell-box-0-feature')).not.toHaveAttribute('data-selected')

    fireEvent.keyDown(shell, { key: 'ArrowRight', code: 'ArrowRight' })
    await waitFor(() => {
      expect(screen.getByTestId('cell-box-1-owner')).toHaveAttribute('data-selected', 'true')
    })
  })

  it('Shift+カーソルキーで選択範囲を拡張できる', async () => {
    render(<App />)

    fireEvent.click(screen.getByTestId('cell-box-0-feature'))
    const shell = screen.getByTestId('interactive-table-shell')
    shell.focus()

    fireEvent.keyDown(shell, { key: 'ArrowDown', code: 'ArrowDown' })
    fireEvent.keyDown(shell, { key: 'ArrowDown', code: 'ArrowDown', shiftKey: true })

    await waitFor(() => {
      expect(screen.getByTestId('cell-box-1-feature')).toHaveAttribute('data-selected', 'true')
      expect(screen.getByTestId('cell-box-2-feature')).toHaveAttribute('data-selected', 'true')
    })
  })

  it('選択範囲に一括入力できる', async () => {
    const user = userEvent.setup()
    render(<App />)

    fireEvent.click(screen.getByTestId('cell-box-0-feature'))
    fireEvent.click(screen.getByTestId('cell-box-1-effort'), { shiftKey: true })

    await user.click(screen.getByTestId('menu-tab-selection'))
    const bulkInput = screen.getByTestId('bulk-input') as HTMLInputElement
    await user.clear(bulkInput)
    await user.type(bulkInput, 'DONE')
    await user.click(screen.getByTestId('bulk-apply'))

    expect(screen.getByTestId('cell-display-0-feature')).toHaveTextContent('DONE')
    expect(screen.getByTestId('cell-display-1-effort')).toHaveTextContent('DONE')
  })

  it('一括入力で改行区切りの値を行ごとに反映できる', async () => {
    const user = userEvent.setup()
    render(<App />)

    fireEvent.click(screen.getByTestId('cell-box-0-feature'))
    fireEvent.click(screen.getByTestId('cell-box-2-feature'), { shiftKey: true })

    await user.click(screen.getByTestId('menu-tab-selection'))
    const bulkInput = screen.getByTestId('bulk-input') as HTMLInputElement
    fireEvent.change(bulkInput, { target: { value: 'First\nSecond\nThird' } })
    await user.click(screen.getByTestId('bulk-apply'))

    await waitFor(() => {
      expect(screen.getByTestId('cell-display-0-feature')).toHaveTextContent('First')
      expect(screen.getByTestId('cell-display-1-feature')).toHaveTextContent('Second')
      expect(screen.getByTestId('cell-display-2-feature')).toHaveTextContent('Third')
    })
  })

  it('フィルハンドルで下方向に値をコピーできる', async () => {
    render(<App />)

    fireEvent.click(screen.getByTestId('cell-box-0-feature'))
    const handle = screen.getByTestId('fill-handle')
    const targetCell = screen.getByTestId('cell-box-1-feature')

    await act(async () => {
      fireEvent.pointerDown(handle)
    })

    await act(async () => {
      fireEvent.pointerEnter(targetCell)
    })

    await act(async () => {
      fireEvent.pointerUp(window)
    })

    await waitFor(() => {
      expect(screen.getByTestId('cell-display-1-feature')).toHaveTextContent('テーブル編集')
    })
  })

  it('行番号をクリックすると行全体が選択される', () => {
    render(<App />)
    fireEvent.click(screen.getByTestId('menu-tab-selection'))
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

    await user.click(screen.getByTestId('sheet-tab-1'))

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
    await waitFor(() => {
      expect(screen.getByTestId('sheet-tab-2')).toBeInTheDocument()
    })
    const newSheetTab = screen.getByTestId('sheet-tab-2')
    expect(newSheetTab).toHaveTextContent('Sheet 3')
    expect(newSheetTab).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByText('表示するデータがありません。')).toBeInTheDocument()
  })
})
