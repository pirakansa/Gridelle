// File Header: Encapsulates login page behavior and authentication flows for reuse.
import React from 'react'
import {
  clearAllStoredProviderTokens,
  clearStoredProviderToken,
  getAuthClient,
  getLoginMode,
  getStoredProviderToken,
  getStoredProviderTokens,
  setLoginMode,
  setStoredProviderToken,
  type AuthLoginOption,
  type AuthSession,
  type AuthUser,
  type LoginMode,
} from '../../../services/auth'
import { redirectToTop } from '../../../utils/navigation'
import { clearAppStorage } from '../../../utils/storageCleanup'

const UNAUTHENTICATED_STATUS = '未ログインです。GitHub またはゲストでログインしてください。'
const GUEST_STATUS = 'ゲストユーザーとしてログインしています。利用できない機能がある場合があります。'
const AUTH_ERROR_STATUS = '認証状態の取得で問題が発生しました。'
const AUTH_ERROR_MESSAGE = '認証状態の確認に失敗しました。ページを再読み込みしてください。'
const OAUTH_FAILURE_MESSAGE = 'ログインに失敗しました。時間を置いて再度お試しください。'
const GUEST_FAILURE_MESSAGE = 'ゲストログインに失敗しました。時間を置いて再度お試しください。'
const TOKEN_FAILURE_MESSAGE = 'トークンでのログインに失敗しました。入力内容を確認してください。'
const LOGOUT_FAILURE_MESSAGE = 'ログアウトに失敗しました。ブラウザを再読み込みしてください。'
const LOGOUT_SUCCESS_STATUS = 'ログアウトしました。GitHub またはゲストでログインしてください。'
const CLEAR_STORAGE_STATUS = '保存済みのセッションとキャッシュを削除しました。'

interface LoginDetailsState {
  readonly user: AuthUser | null
  readonly loginMode: LoginMode | null
  readonly providerId: string | null
  readonly accessTokens: Record<string, string | null>
}

interface LoginControllerState {
  readonly statusMessage: string
  readonly errorMessage: string | null
  readonly loginMode: LoginMode | null
  readonly loginModeLabel: string
  readonly canUseOctokit: boolean
  readonly isBusy: boolean
  readonly isLoggedIn: boolean
  readonly loginOptions: readonly AuthLoginOption[]
  readonly handleLoginOption: (_optionId: string, _tokenOverride?: string) => Promise<void>
  readonly handleLogout: () => Promise<void>
  readonly handleClearStorage: () => void
  readonly handleNavigateTop: () => void
  readonly appVersion: string
}

function getSuccessStatus(option: AuthLoginOption): string {
  if (option.mode === 'guest') {
    return 'ゲストログインに成功しました。トップページへ遷移します。'
  }

  if (option.mode === 'github') {
    return 'GitHub ログインに成功しました。トップページへ遷移します。'
  }

  return `${option.label} に成功しました。トップページへ遷移します。`
}

function getFailureMessage(option: AuthLoginOption): string {
  if (option.type === 'guest') {
    return GUEST_FAILURE_MESSAGE
  }

  if (option.type === 'token') {
    return TOKEN_FAILURE_MESSAGE
  }

  return OAUTH_FAILURE_MESSAGE
}

/**
 * Function Header: React hook that orchestrates authentication flows for the login page UI.
 * @returns {LoginControllerState} Aggregated controller state and event handlers.
 */
export function useLoginController(): LoginControllerState {
  const authClient = React.useMemo(() => getAuthClient(), [])
  const appVersion = React.useMemo<string>(() => import.meta.env.VITE_APP_VERSION ?? '0.0.0', [])
  const loginOptions = React.useMemo<readonly AuthLoginOption[]>(() => {
    const options = authClient.getLoginOptions()
    return [...options].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
  }, [authClient])

  const [statusMessage, setStatusMessage] = React.useState<string>(UNAUTHENTICATED_STATUS)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [isBusy, setIsBusy] = React.useState<boolean>(false)
  const [details, setDetails] = React.useState<LoginDetailsState>(() => ({
    user: null,
    loginMode: getLoginMode(),
    providerId: null,
    accessTokens: getStoredProviderTokens(),
  }))

  const updateFromSession = React.useCallback((session: AuthSession) => {
    const providerKey = session.providerId ?? session.loginMode ?? null
    const persistedToken = providerKey
      ? session.accessToken ?? getStoredProviderToken(providerKey)
      : null

    setLoginMode(session.loginMode)

    if (session.loginMode === 'guest') {
      clearAllStoredProviderTokens()
      setDetails({
        user: session.user,
        loginMode: session.loginMode,
        providerId: session.providerId,
        accessTokens: {},
      })
      return
    }

    if (providerKey) {
      if (persistedToken) {
        setStoredProviderToken(providerKey, persistedToken)
      } else {
        clearStoredProviderToken(providerKey)
      }
    }

    setDetails((prev) => {
      if (!providerKey) {
        return {
          user: session.user,
          loginMode: session.loginMode,
          providerId: session.providerId,
          accessTokens: prev.accessTokens,
        }
      }

      const nextTokens = { ...prev.accessTokens }
      if (persistedToken) {
        nextTokens[providerKey] = persistedToken
      } else {
        delete nextTokens[providerKey]
      }

      return {
        user: session.user,
        loginMode: session.loginMode,
        providerId: session.providerId,
        accessTokens: nextTokens,
      }
    })
  }, [])

  const resetToLoggedOut = React.useCallback(() => {
    clearAppStorage()
    setDetails({ user: null, loginMode: null, providerId: null, accessTokens: {} })
    setStatusMessage(UNAUTHENTICATED_STATUS)
  }, [])

  React.useEffect(() => {
    const unsubscribe = authClient.subscribeAuthState({
      onAuthenticated: (session) => {
        setIsBusy(false)
        setErrorMessage(null)
        updateFromSession(session)

        if (session.loginMode === 'guest') {
          setStatusMessage(GUEST_STATUS)
          return
        }

        setStatusMessage(`${session.user.displayName ?? 'GitHub ユーザー'} してログインしています。`)
      },
      onSignedOut: () => {
        resetToLoggedOut()
      },
      onError: (listenerError) => {
        console.error('認証状態の監視でエラーが発生しました', listenerError)
        setStatusMessage(AUTH_ERROR_STATUS)
        setErrorMessage(AUTH_ERROR_MESSAGE)
        setIsBusy(false)
      },
    })

    return () => {
      unsubscribe()
    }
  }, [authClient, resetToLoggedOut, updateFromSession])

  const handleLoginOption = React.useCallback(
    async (optionId: string, tokenOverride?: string) => {
      const option = loginOptions.find((item) => item.id === optionId)
      if (!option) {
        throw new Error(`Unknown login option: ${optionId}`)
      }

      setIsBusy(true)
      setErrorMessage(null)

      try {
        if (option.type === 'guest') {
          const session = await authClient.loginAsGuest()
          clearAllStoredProviderTokens()
          updateFromSession({ ...session, accessToken: null })
          setStatusMessage(getSuccessStatus(option))
          redirectToTop()
          return
        }

        if (option.type === 'token') {
          const providerKey = option.providerId ?? option.mode
          const token = tokenOverride ?? ''
          if (!authClient.loginWithToken) {
            throw new Error('Token based login is not supported by the active auth client.')
          }
          if (!providerKey) {
            throw new Error('Token login requires a provider identifier.')
          }
          if (!token) {
            throw new Error('Token login requires a token value.')
          }

          const session = await authClient.loginWithToken(providerKey, token)
          updateFromSession({ ...session, accessToken: token })
          setStatusMessage(getSuccessStatus(option))
          redirectToTop()
          return
        }

        const providerKey = option.providerId ?? option.mode
        if (!providerKey) {
          throw new Error('Provider login requires a provider identifier.')
        }

        const session = await authClient.loginWithProvider(providerKey)
        if (option.requiresToken && !session.accessToken) {
          throw new Error('Provider login did not return the required access token.')
        }

        updateFromSession(session)
        setStatusMessage(getSuccessStatus(option))
        redirectToTop()
      } catch (error) {
        console.error('ログイン処理でエラーが発生しました', error)
        setErrorMessage(getFailureMessage(option))
      } finally {
        setIsBusy(false)
      }
    },
    [authClient, loginOptions, updateFromSession],
  )

  const handleLogout = React.useCallback(async () => {
    setIsBusy(true)
    setErrorMessage(null)

    try {
      await authClient.logout()
      resetToLoggedOut()
      setStatusMessage(LOGOUT_SUCCESS_STATUS)
    } catch (error) {
      console.error('ログアウト処理でエラーが発生しました', error)
      setErrorMessage(LOGOUT_FAILURE_MESSAGE)
    } finally {
      setIsBusy(false)
    }
  }, [authClient, resetToLoggedOut])

  const handleClearStorage = React.useCallback(() => {
    clearAppStorage()
    setDetails((prev) => ({
      user: prev.user,
      loginMode: prev.loginMode,
      providerId: prev.providerId,
      accessTokens: {},
    }))
    setStatusMessage(CLEAR_STORAGE_STATUS)
    setErrorMessage(null)
  }, [])

  const handleNavigateTop = React.useCallback(() => {
    redirectToTop()
  }, [])

  const loginModeLabel =
    details.loginMode === 'github' ? 'GitHub OAuth' : details.loginMode === 'guest' ? 'ゲスト' : '未設定'
  const githubToken = details.accessTokens.github ?? null
  const canUseOctokit = details.loginMode === 'github' && Boolean(githubToken)
  const isLoggedIn = details.loginMode !== null

  return {
    statusMessage,
    errorMessage,
    loginMode: details.loginMode,
    loginModeLabel,
    canUseOctokit,
    isBusy,
    isLoggedIn,
    loginOptions,
    handleLoginOption,
    handleLogout,
    handleClearStorage,
    handleNavigateTop,
    appVersion,
  }
}
