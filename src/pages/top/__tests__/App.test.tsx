/// <reference types="vitest" />
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import App from '../App'

describe('App', () => {
  it('初期表示でサンプルYAMLをテーブルにレンダリングする', () => {
    render(<App />)
    expect(screen.getByDisplayValue('テーブル編集')).toBeInTheDocument()
    expect(screen.getByDisplayValue('YAML Export')).toBeInTheDocument()
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

    expect(await screen.findByDisplayValue('新規カード')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Carol')).toBeInTheDocument()
  })

  it('セルを編集するとYAMLテキストにも反映される', async () => {
    const user = userEvent.setup()
    render(<App />)

    const targetCell = screen.getByTestId('cell-0-feature') as HTMLInputElement
    await user.clear(targetCell)
    await user.type(targetCell, 'API Design')

    const textarea = screen.getByTestId('yaml-textarea') as HTMLTextAreaElement
    expect(textarea.value).toContain('API Design')
  })
})
