// File Header: Encapsulates login page behavior and Firebase authentication flows for reuse.
import React from 'react'
import {
  GithubAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import {
  clearStoredGithubToken,
  deriveLoginMode,
  getFirebaseAuth,
  getGithubAuthProvider,
  getLoginMode,
  getStoredGithubToken,
  setLoginMode,
  setStoredGithubToken,
  type LoginMode,
} from '../../../services/authService'
import { redirectToTop } from '../../../utils/navigation'

const UNAUTHENTICATED_STATUS = '未ログインです。GitHub またはゲストでログインしてください。'
const GUEST_STATUS = 'ゲストユーザーとしてログインしています。利用できない機能がある場合があります。'
const AUTH_ERROR_STATUS = '認証状態の取得で問題が発生しました。'
const AUTH_ERROR_MESSAGE = '認証状態の確認に失敗しました。ページを再読み込みしてください。'
const LOGIN_FAILURE_MESSAGE = 'ログインに失敗しました。時間を置いて再度お試しください。'
const GUEST_FAILURE_MESSAGE = 'ゲストログインに失敗しました。時間を置いて再度お試しください。'
const LOGOUT_FAILURE_MESSAGE = 'ログアウトに失敗しました。ブラウザを再読み込みしてください。'
const LOGOUT_SUCCESS_STATUS = 'ログアウトしました。GitHub またはゲストでログインしてください。'

/**
 * Masks a GitHub access token for safe UI presentation.
 * @param {string} token Raw GitHub access token.
 * @returns {string} Masked token string.
 */
function maskGithubToken(token: string): string {
  if (token.length <= 8) {
    return `${token.slice(0, 4)}...`
  }

  return `${token.slice(0, 4)}...${token.slice(-4)}`
}

interface LoginDetailsState {
  readonly user: User | null
  readonly loginMode: LoginMode | null
  readonly accessToken: string | null
}

interface LoginControllerState {
  readonly statusMessage: string
  readonly errorMessage: string | null
  readonly detailsText: string
  readonly loginMode: LoginMode | null
  readonly loginModeLabel: string
  readonly canUseOctokit: boolean
  readonly isBusy: boolean
  readonly isLoggedIn: boolean
  readonly handleGithubLogin: () => Promise<void>
  readonly handleGuestLogin: () => Promise<void>
  readonly handleLogout: () => Promise<void>
  readonly handleNavigateTop: () => void
}

/**
 * React hook that orchestrates Firebase authentication flows for the login page UI.
 * @returns {LoginControllerState} Aggregated controller state and event handlers.
 */
export function useLoginController(): LoginControllerState {
  const auth = React.useMemo(() => getFirebaseAuth(), [])
  const providerRef = React.useMemo<GithubAuthProvider>(() => getGithubAuthProvider(), [])

  const [statusMessage, setStatusMessage] = React.useState<string>(UNAUTHENTICATED_STATUS)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [isBusy, setIsBusy] = React.useState<boolean>(false)
  const [details, setDetails] = React.useState<LoginDetailsState>(() => ({
    user: null,
    loginMode: getLoginMode(),
    accessToken: getStoredGithubToken(),
  }))

  const resetToLoggedOut = React.useCallback(() => {
    clearStoredGithubToken()
    setLoginMode(null)
    setDetails({ user: null, loginMode: null, accessToken: null })
    setStatusMessage(UNAUTHENTICATED_STATUS)
  }, [])

  const buildDetailsText = React.useCallback(
    (state: LoginDetailsState): string => {
      if (!state.user) {
        return UNAUTHENTICATED_STATUS
      }

      const lines = [
        `UID: ${state.user.uid}`,
        `表示名: ${state.user.displayName ?? '未設定'}`,
        `メール: ${state.user.email ?? '未設定'}`,
        `アイコン: ${state.user.photoURL ?? '未設定'}`,
        `ログイン種別: ${state.loginMode === 'guest' ? 'ゲスト' : state.loginMode === 'github' ? 'GitHub OAuth' : '未設定'}`,
        `アクセストークン: ${state.loginMode === 'github' && state.accessToken ? maskGithubToken(state.accessToken) : '未取得 (Octokit 使用不可)'}`,
      ]

      return lines.join('\n')
    },
    [],
  )

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setIsBusy(false)
        setErrorMessage(null)

        if (!currentUser) {
          resetToLoggedOut()
          return
        }

        const mode = deriveLoginMode(currentUser)
        setLoginMode(mode)

        if (mode === 'guest') {
          clearStoredGithubToken()
          setDetails({ user: currentUser, loginMode: 'guest', accessToken: null })
          setStatusMessage(GUEST_STATUS)
          return
        }

        const storedToken = getStoredGithubToken()
        setDetails({ user: currentUser, loginMode: 'github', accessToken: storedToken })
        setStatusMessage(`${currentUser.displayName ?? 'GitHub ユーザー'} としてログインしています。`)
      },
      (listenerError) => {
        console.error('認証状態の監視でエラーが発生しました', listenerError)
        setStatusMessage(AUTH_ERROR_STATUS)
        setErrorMessage(AUTH_ERROR_MESSAGE)
        setIsBusy(false)
      },
    )

    return () => {
      unsubscribe()
    }
  }, [auth, resetToLoggedOut])

  const handleGithubLogin = React.useCallback(async () => {
    setIsBusy(true)
    setErrorMessage(null)

    try {
      const result = await signInWithPopup(auth, providerRef)
      const credential = GithubAuthProvider.credentialFromResult(result)
      const token = credential?.accessToken ?? null

      if (!token) {
        throw new Error('GitHub access token is undefined.')
      }

      setStoredGithubToken(token)
      setLoginMode('github')
      setDetails({
        user: result.user,
        loginMode: 'github',
        accessToken: token,
      })
      setStatusMessage('GitHub ログインに成功しました。トップページへ遷移します。')
      redirectToTop()
    } catch (error) {
      console.error('GitHub ログインに失敗しました', error)
      setErrorMessage(LOGIN_FAILURE_MESSAGE)
    } finally {
      setIsBusy(false)
    }
  }, [auth, providerRef])

  const handleGuestLogin = React.useCallback(async () => {
    setIsBusy(true)
    setErrorMessage(null)

    try {
      const result = await signInAnonymously(auth)
      clearStoredGithubToken()
      setLoginMode('guest')
      setDetails({ user: result.user ?? null, loginMode: 'guest', accessToken: null })
      setStatusMessage('ゲストログインに成功しました。トップページへ遷移します。')
      redirectToTop()
    } catch (error) {
      console.error('ゲストログインに失敗しました', error)
      setErrorMessage(GUEST_FAILURE_MESSAGE)
    } finally {
      setIsBusy(false)
    }
  }, [auth])

  const handleLogout = React.useCallback(async () => {
    setIsBusy(true)
    setErrorMessage(null)

    try {
      await signOut(auth)
      resetToLoggedOut()
      setStatusMessage(LOGOUT_SUCCESS_STATUS)
    } catch (error) {
      console.error('ログアウト処理でエラーが発生しました', error)
      setErrorMessage(LOGOUT_FAILURE_MESSAGE)
    } finally {
      setIsBusy(false)
    }
  }, [auth, resetToLoggedOut])

  const handleNavigateTop = React.useCallback(() => {
    redirectToTop()
  }, [])

  const detailsText = React.useMemo(() => buildDetailsText(details), [details, buildDetailsText])
  const loginModeLabel = details.loginMode === 'github' ? 'GitHub OAuth' : details.loginMode === 'guest' ? 'ゲスト' : '未設定'
  const canUseOctokit = details.loginMode === 'github' && Boolean(details.accessToken)
  const isLoggedIn = details.loginMode !== null

  return {
    statusMessage,
    errorMessage,
    detailsText,
    loginMode: details.loginMode,
    loginModeLabel,
    canUseOctokit,
    isBusy,
    isLoggedIn,
    handleGithubLogin,
    handleGuestLogin,
    handleLogout,
    handleNavigateTop,
  }
}
