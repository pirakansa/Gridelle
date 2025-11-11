import type { ComponentType } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { LocaleProvider } from '../../../utils/i18n'
import { resetAuthClient } from '../../../services/auth'

vi.mock('../../../utils/navigation', () => ({
  redirectToTop: vi.fn(),
}))

import { redirectToTop } from '../../../utils/navigation'

let OfflineApp: ComponentType

const redirectToTopMock = vi.mocked(redirectToTop)

describe('pages/login/App.offline', () => {
  beforeAll(async () => {
    vi.stubEnv('VITE_LOGIN_APP', 'offline')
    OfflineApp = (await import('../App.offline')).default
  })

  afterAll(() => {
    vi.unstubAllEnvs()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    resetAuthClient()
  })

  const renderOfflineApp = (): void => {
    render(
      <LocaleProvider>
        <OfflineApp />
      </LocaleProvider>,
    )
  }

  it('認証不要モードボタンでトップページに遷移できる', async () => {
    renderOfflineApp()

    expect(
      screen.getByText('社内ネットワークでは認証不要で Gridelle を利用できます。GitHub 連携を行う場合は PAT を入力してください。'),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '認証不要モードで利用' }))

    await waitFor(() => {
      expect(redirectToTopMock).toHaveBeenCalled()
    })
  })

  it('GitHub トークンを入力すると GitHub モードでログインできる', async () => {
    renderOfflineApp()

    const tokenInput = screen.getByPlaceholderText('GitHub パーソナルアクセストークンを入力')

    await userEvent.type(tokenInput, 'ghp_exampleToken123')
    await userEvent.click(screen.getByRole('button', { name: 'GitHub トークンでログイン' }))

    await waitFor(() => {
      expect(redirectToTopMock).toHaveBeenCalled()
    })
  })
})
