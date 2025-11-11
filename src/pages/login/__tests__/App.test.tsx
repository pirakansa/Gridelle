import { vi } from 'vitest'

vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-api-key')
vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'test.firebaseapp.com')

type Spy = ReturnType<typeof vi.fn>

type AuthListeners = {
  onChange?: (_user: unknown) => void
  onError?: (_error: Error) => void
}

declare global {
  var __firebaseAppMocks: {
    mockApps: unknown[]
    initializeAppMock: Spy
    getAppsMock: Spy
    getAppMock: Spy
  }
  var __firebaseAuthMocks: {
    authListeners: AuthListeners
    unsubscribeMock: Spy
    signInWithPopupMock: Spy
    signInAnonymouslyMock: Spy
    signOutMock: Spy
    credentialFromResultMock: Spy
    getAuthMock: Spy
    onAuthStateChangedMock: Spy
    authInstance: { useDeviceLanguage: Spy }
  }
}

vi.mock('firebase/app', () => {
  const mockApps: unknown[] = []
  const initializeAppMock = vi.fn(() => {
    const app = { name: 'mock-app' }
    mockApps[0] = app
    return app
  })
  const getAppsMock = vi.fn(() => mockApps.filter(Boolean))
  const getAppMock = vi.fn(() => (mockApps[0] ?? initializeAppMock()))

  globalThis.__firebaseAppMocks = {
    mockApps,
    initializeAppMock,
    getAppsMock,
    getAppMock,
  }

  return {
    initializeApp: initializeAppMock,
    getApps: getAppsMock,
    getApp: getAppMock,
  }
})

vi.mock('firebase/auth', () => {
  const authListeners: AuthListeners = {}
  const unsubscribeMock = vi.fn()
  const signInWithPopupMock = vi.fn()
  const signInAnonymouslyMock = vi.fn()
  const signOutMock = vi.fn()
  const credentialFromResultMock = vi.fn()
  const authInstance = { id: 'auth', useDeviceLanguage: vi.fn() }
  const getAuthMock = vi.fn(() => authInstance)
  const onAuthStateChangedMock = vi.fn((_auth, onChange, onError) => {
    authListeners.onChange = onChange as AuthListeners['onChange']
    authListeners.onError = onError as AuthListeners['onError']
    return unsubscribeMock
  })

  globalThis.__firebaseAuthMocks = {
    authListeners,
    unsubscribeMock,
    signInWithPopupMock,
    signInAnonymouslyMock,
    signOutMock,
    credentialFromResultMock,
    getAuthMock,
    onAuthStateChangedMock,
    authInstance,
  }

  return {
    GithubAuthProvider: class {
      addScope = vi.fn()
      setCustomParameters = vi.fn()
      static credentialFromResult = credentialFromResultMock
    },
    getAuth: getAuthMock,
    onAuthStateChanged: onAuthStateChangedMock,
    signInAnonymously: signInAnonymouslyMock,
    signInWithPopup: signInWithPopupMock,
    signOut: signOutMock,
    __listeners: authListeners,
    __credentialFromResult: credentialFromResultMock,
  }
})

vi.mock('../../../utils/navigation', () => ({
  redirectToTop: vi.fn(),
}))

import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from 'vitest'
import type { User } from 'firebase/auth'
import { PROVIDER_TOKEN_STORAGE_KEY, resetAuthClient } from '../../../services/auth'
import { redirectToTop } from '../../../utils/navigation'
import App from '../App'
import { LocaleProvider } from '../../../utils/i18n'

const appMocks = globalThis.__firebaseAppMocks
const authMocks = globalThis.__firebaseAuthMocks
const redirectToTopMock = vi.mocked(redirectToTop)

function emitAuthState(user: Partial<User> | null): void {
  act(() => {
    authMocks.authListeners.onChange?.(user as User | null)
  })
}

function emitAuthError(error: Error): void {
  act(() => {
    authMocks.authListeners.onError?.(error)
  })
}

describe('pages/login/App', () => {
  beforeEach(() => {
    appMocks.mockApps.length = 0
    localStorage.clear()
    sessionStorage.clear()
    vi.clearAllMocks()
    resetAuthClient()
    authMocks.credentialFromResultMock.mockReturnValue({ accessToken: 'abcd1234efgh5678' })
    authMocks.signInWithPopupMock.mockResolvedValue({
      user: {
        uid: 'github-user',
        displayName: 'Octocat',
        email: 'octo@example.com',
        photoURL: 'https://example.com/octo.png',
        isAnonymous: false,
      } as User,
    })
    authMocks.signInAnonymouslyMock.mockResolvedValue({
      user: {
        uid: 'guest-user',
        isAnonymous: true,
      } as User,
    })
    authMocks.signOutMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    localStorage.clear()
  })

  const renderWithLocale = (): void => {
    render(
      <LocaleProvider>
        <App />
      </LocaleProvider>,
    )
  }

  it('言語切り替えボタンで英語表示に切り替えられる', async () => {
    renderWithLocale()
    const toggle = screen.getByRole('button', { name: 'UIを英語表示に切り替える' })

    await userEvent.click(toggle)

    expect(await screen.findByRole('heading', { name: 'Gridelle Login' })).toBeInTheDocument()
    expect(
      screen.getByText('Sign in with GitHub or continue as a guest to use Gridelle.', {
        selector: 'p',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Switch UI to Japanese' })).toBeInTheDocument()
  })

  it('未ログイン時にサインインボタンを表示する', async () => {
    renderWithLocale()
    emitAuthState(null)

    expect(await screen.findByRole('button', { name: 'GitHub でログイン' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ゲストでログイン' })).toBeInTheDocument()
    expect(
      screen.getByText('未ログインです。GitHub またはゲストでログインしてください。', {
        selector: 'p',
      }),
    ).toBeInTheDocument()
  })

  it('GitHub 認証済みユーザーでも個人情報を表示しない', async () => {
    localStorage.setItem('gridelle/githubAccessToken', 'abcd1234efgh5678')

    renderWithLocale()
    emitAuthState({
      uid: 'github-user',
      displayName: 'Octocat',
      email: 'octo@example.com',
      photoURL: 'https://example.com/octo.png',
      isAnonymous: false,
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'トップページに進む' })).toBeInTheDocument()
    })

    const card = await screen.findByTestId('login-card')
    expect(card).toHaveAttribute('data-login-mode', 'github')
    expect(card).toHaveAttribute('data-can-octokit', 'true')
    expect(screen.getByText('GitHub連携機能を利用できます。')).toBeInTheDocument()
    expect(screen.queryByText(/UID:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/アクセストークン:/)).not.toBeInTheDocument()
    expect(screen.getByTestId('app-version')).toHaveTextContent(import.meta.env.VITE_APP_VERSION)
  })

  it('ゲストログイン状態を表示する', async () => {
    renderWithLocale()
    emitAuthState({ uid: 'guest-user', isAnonymous: true })

    const card = await screen.findByTestId('login-card')
    expect(card).toHaveAttribute('data-login-mode', 'guest')
    expect(card).toHaveAttribute('data-can-octokit', 'false')
  expect(screen.getByText('GitHub連携機能を利用するには GitHub でログインしてください。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'トップページに進む' })).toBeInTheDocument()
    expect(screen.getByTestId('app-version')).toHaveTextContent(import.meta.env.VITE_APP_VERSION)
  })

  it('GitHub ログインに成功するとトークンを保存しトップへ遷移する', async () => {
    const user = userEvent.setup()
    renderWithLocale()
    emitAuthState(null)

    await user.click(await screen.findByRole('button', { name: 'GitHub でログイン' }))

    await waitFor(() => {
      expect(authMocks.signInWithPopupMock).toHaveBeenCalledTimes(1)
    })
    const storedTokensRaw = localStorage.getItem(PROVIDER_TOKEN_STORAGE_KEY)
    expect(storedTokensRaw).not.toBeNull()
    const storedTokens = storedTokensRaw ? JSON.parse(storedTokensRaw) : {}
    expect(storedTokens.github).toBe('abcd1234efgh5678')
    expect(redirectToTopMock).toHaveBeenCalledTimes(1)
  })

  it('GitHub ログインが失敗した場合にエラーを表示する', async () => {
    authMocks.signInWithPopupMock.mockRejectedValueOnce(new Error('popup closed'))
    authMocks.credentialFromResultMock.mockReturnValueOnce(null)
    const user = userEvent.setup()

    renderWithLocale()
    emitAuthState(null)

    await user.click(await screen.findByRole('button', { name: 'GitHub でログイン' }))

    await waitFor(() => {
      expect(authMocks.signInWithPopupMock).toHaveBeenCalledTimes(1)
    })
    expect(
      await screen.findByText('ログインに失敗しました。時間を置いて再度お試しください。'),
    ).toBeInTheDocument()
    expect(redirectToTopMock).not.toHaveBeenCalled()
  })

  it('ゲストログインに成功するとトップへ遷移する', async () => {
    const user = userEvent.setup()
    renderWithLocale()
    emitAuthState(null)

    await user.click(await screen.findByRole('button', { name: 'ゲストでログイン' }))

    await waitFor(() => {
      expect(authMocks.signInAnonymouslyMock).toHaveBeenCalledTimes(1)
    })
    expect(redirectToTopMock).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('gridelle/githubAccessToken')).toBeNull()
    expect(localStorage.getItem('gridelle/loginMode')).toBe('guest')
  })

  it('ログアウト処理でストレージを削除する', async () => {
    localStorage.setItem('gridelle/githubAccessToken', 'abcd1234efgh5678')
    localStorage.setItem('gridelle:tableYaml', 'cached-table')
    localStorage.setItem('gridelle:yamlBuffer', 'cached-buffer')
    sessionStorage.setItem('gridelle:sessionDraft', 'draft')
    const user = userEvent.setup()
    renderWithLocale()
    emitAuthState({
      uid: 'github-user',
      displayName: 'Octocat',
      email: 'octo@example.com',
      photoURL: 'https://example.com/octo.png',
      isAnonymous: false,
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'トップページに進む' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'ログアウト' }))

    await waitFor(() => {
      expect(authMocks.signOutMock).toHaveBeenCalledTimes(1)
    })
    expect(localStorage.getItem('gridelle/githubAccessToken')).toBeNull()
    expect(localStorage.getItem('gridelle/loginMode')).toBeNull()
    expect(localStorage.getItem('gridelle:tableYaml')).toBeNull()
    expect(localStorage.getItem('gridelle:yamlBuffer')).toBeNull()
    expect(sessionStorage.getItem('gridelle:sessionDraft')).toBeNull()
    expect(
      screen.getByText('ログアウトしました。GitHub またはゲストでログインしてください。'),
    ).toBeInTheDocument()
  })

  it('セッション・キャッシュ削除ボタンでストレージを削除する', async () => {
    localStorage.setItem('gridelle:tableYaml', 'cached-table')
    localStorage.setItem('gridelle:yamlBuffer', 'cached-buffer')
    localStorage.setItem('gridelle/loginMode', 'guest')
    sessionStorage.setItem('gridelle:sessionDraft', 'draft')

    const user = userEvent.setup()
    renderWithLocale()
    emitAuthState(null)

    await screen.findByRole('button', { name: 'GitHub でログイン' })

    const clearButton = screen.getByTestId('clear-storage-button')
    expect(clearButton).toBeInTheDocument()

    await user.click(clearButton)

    expect(localStorage.getItem('gridelle:tableYaml')).toBeNull()
    expect(localStorage.getItem('gridelle:yamlBuffer')).toBeNull()
    expect(localStorage.getItem('gridelle/loginMode')).toBeNull()
    expect(sessionStorage.getItem('gridelle:sessionDraft')).toBeNull()
    expect(screen.getByText('保存済みのセッションとキャッシュを削除しました。')).toBeInTheDocument()
  })

  it('認証状態の監視でエラーが発生した場合にメッセージを表示する', async () => {
    render(<App />)
    emitAuthError(new Error('network'))

    expect(await screen.findByText('認証状態の取得で問題が発生しました。')).toBeInTheDocument()
    expect(
      screen.getByText('認証状態の確認に失敗しました。ページを再読み込みしてください。'),
    ).toBeInTheDocument()
  })
})
