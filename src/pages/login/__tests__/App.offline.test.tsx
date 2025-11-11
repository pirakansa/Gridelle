import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../utils/navigation', () => ({
  redirectToTop: vi.fn(),
}))

import { redirectToTop } from '../../../utils/navigation'
import OfflineApp from '../App.offline'
import { LocaleProvider } from '../../../utils/i18n'

const redirectToTopMock = vi.mocked(redirectToTop)

describe('pages/login/App.offline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('認証不要メッセージを表示しトップ画面へ遷移できる', async () => {
    render(
      <LocaleProvider>
        <OfflineApp />
      </LocaleProvider>,
    )

    expect(
      screen.getByText('この環境では認証は不要です。そのまま Gridelle を利用できます。'),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Gridelle を起動' }))

    expect(redirectToTopMock).toHaveBeenCalledTimes(1)
  })
})
