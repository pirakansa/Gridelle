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
import { useI18n } from '../../../utils/i18n'

type MessagePreset =
  | 'unauthenticatedStatus'
  | 'guestStatus'
  | 'authErrorStatus'
  | 'authErrorMessage'
  | 'oauthFailureMessage'
  | 'guestFailureMessage'
  | 'tokenFailureMessage'
  | 'logoutFailureMessage'
  | 'logoutSuccessStatus'
  | 'clearStorageStatus'
  | 'guestLoginSuccess'
  | 'githubLoginSuccess'

const MESSAGE_PRESETS: Record<MessagePreset, { readonly ja: string; readonly en: string }> = {
  unauthenticatedStatus: {
    ja: '未ログインです。GitHub またはゲストでログインしてください。',
    en: 'You are not signed in. Sign in with GitHub or continue as a guest.',
  },
  guestStatus: {
    ja: 'ゲストユーザーとしてログインしています。利用できない機能がある場合があります。',
    en: 'You are signed in as a guest. Some features may be unavailable.',
  },
  authErrorStatus: {
    ja: '認証状態の取得で問題が発生しました。',
    en: 'There was a problem retrieving your authentication status.',
  },
  authErrorMessage: {
    ja: '認証状態の確認に失敗しました。ページを再読み込みしてください。',
    en: 'Failed to verify authentication. Please reload the page and try again.',
  },
  oauthFailureMessage: {
    ja: 'ログインに失敗しました。時間を置いて再度お試しください。',
    en: 'Sign-in failed. Please try again later.',
  },
  guestFailureMessage: {
    ja: 'ゲストログインに失敗しました。時間を置いて再度お試しください。',
    en: 'Guest sign-in failed. Please try again later.',
  },
  tokenFailureMessage: {
    ja: 'トークンでのログインに失敗しました。入力内容を確認してください。',
    en: 'Token sign-in failed. Check the value and try again.',
  },
  logoutFailureMessage: {
    ja: 'ログアウトに失敗しました。ブラウザを再読み込みしてください。',
    en: 'Failed to sign out. Please reload the browser and try again.',
  },
  logoutSuccessStatus: {
    ja: 'ログアウトしました。GitHub またはゲストでログインしてください。',
    en: 'Signed out. Sign in with GitHub or continue as a guest.',
  },
  clearStorageStatus: {
    ja: '保存済みのセッションとキャッシュを削除しました。',
    en: 'Cleared saved sessions and cache.',
  },
  guestLoginSuccess: {
    ja: 'ゲストログインに成功しました。トップページへ遷移します。',
    en: 'Guest sign-in succeeded. Redirecting to the top page.',
  },
  githubLoginSuccess: {
    ja: 'GitHub ログインに成功しました。トップページへ遷移します。',
    en: 'GitHub sign-in succeeded. Redirecting to the top page.',
  },
}

type MessageDescriptor =
  | { readonly kind: 'preset'; readonly preset: MessagePreset }
  | { readonly kind: 'text'; readonly ja: string; readonly en: string }

interface OptionTextVariants {
  readonly label: { readonly ja: string; readonly en: string }
  readonly description?: { readonly ja: string; readonly en: string }
}

function resolveMessage(
  descriptor: MessageDescriptor,
  select: ReturnType<typeof useI18n>['select'],
): string {
  if (descriptor.kind === 'preset') {
    const preset = MESSAGE_PRESETS[descriptor.preset]
    return select(preset.ja, preset.en)
  }

  return select(descriptor.ja, descriptor.en)
}

function describeLoginOption(option: AuthLoginOption): OptionTextVariants {
  if (option.mode === 'github') {
    return {
      label: { ja: 'GitHub でログイン', en: 'Sign in with GitHub' },
      description: {
        ja: 'GitHub OAuth を使用してログインします。',
        en: 'Use GitHub OAuth to sign in.',
      },
    }
  }

  if (option.mode === 'guest') {
    return {
      label: { ja: 'ゲストでログイン', en: 'Continue as guest' },
      description: {
        ja: '機能が制限されたゲストモードで利用します。',
        en: 'Use guest mode with limited functionality.',
      },
    }
  }

  return {
    label: { ja: option.label, en: option.label },
    description: option.description
      ? { ja: option.description, en: option.description }
      : undefined,
  }
}

function createLoginSuccessDescriptor(
  option: AuthLoginOption,
  variants?: OptionTextVariants,
): MessageDescriptor {
  if (option.mode === 'guest') {
    return { kind: 'preset', preset: 'guestLoginSuccess' }
  }

  if (option.mode === 'github') {
    return { kind: 'preset', preset: 'githubLoginSuccess' }
  }

  const label = variants?.label ?? { ja: option.label, en: option.label }
  return {
    kind: 'text',
    ja: `${label.ja} に成功しました。トップページへ遷移します。`,
    en: `${label.en} succeeded. Redirecting to the top page.`,
  }
}

function createFailureDescriptor(option: AuthLoginOption): MessageDescriptor {
  if (option.type === 'guest') {
    return { kind: 'preset', preset: 'guestFailureMessage' }
  }

  if (option.type === 'token') {
    return { kind: 'preset', preset: 'tokenFailureMessage' }
  }

  return { kind: 'preset', preset: 'oauthFailureMessage' }
}

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

/**
 * Function Header: React hook that orchestrates authentication flows for the login page UI.
 * @returns {LoginControllerState} Aggregated controller state and event handlers.
 */
export function useLoginController(): LoginControllerState {
  const { select } = useI18n()
  const authClient = React.useMemo(() => getAuthClient(), [])
  const appVersion = React.useMemo<string>(() => import.meta.env.VITE_APP_VERSION ?? '0.0.0', [])
  const baseLoginOptions = React.useMemo<readonly AuthLoginOption[]>(() => {
    const options = authClient.getLoginOptions()
    return [...options].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
  }, [authClient])

  const localizedLoginOptions = React.useMemo(() => {
    const variantsById = new Map<string, OptionTextVariants>()
    const localized = baseLoginOptions.map((option) => {
      const variants = describeLoginOption(option)
      variantsById.set(option.id, variants)

      return {
        ...option,
        label: select(variants.label.ja, variants.label.en),
        description: variants.description
          ? select(variants.description.ja, variants.description.en)
          : option.description,
      }
    })

    return { list: localized, variantsById }
  }, [baseLoginOptions, select])

  const loginOptions = localizedLoginOptions.list
  const optionVariantsById = localizedLoginOptions.variantsById

  const [statusDescriptor, setStatusDescriptor] = React.useState<MessageDescriptor>({
    kind: 'preset',
    preset: 'unauthenticatedStatus',
  })
  const [errorDescriptor, setErrorDescriptor] = React.useState<MessageDescriptor | null>(null)
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
    setStatusDescriptor({ kind: 'preset', preset: 'unauthenticatedStatus' })
  }, [])

  React.useEffect(() => {
    const unsubscribe = authClient.subscribeAuthState({
      onAuthenticated: (session) => {
        setIsBusy(false)
        setErrorDescriptor(null)
        updateFromSession(session)

        if (session.loginMode === 'guest') {
          setStatusDescriptor({ kind: 'preset', preset: 'guestStatus' })
          return
        }

        const fallbackNameJa = session.user.displayName ?? 'GitHub ユーザー'
        const fallbackNameEn = session.user.displayName ?? 'GitHub user'
        setStatusDescriptor({
          kind: 'text',
          ja: `${fallbackNameJa} してログインしています。`,
          en: `Signed in as ${fallbackNameEn}.`,
        })
      },
      onSignedOut: () => {
        resetToLoggedOut()
      },
      onError: (listenerError) => {
        console.error('認証状態の監視でエラーが発生しました', listenerError)
        setStatusDescriptor({ kind: 'preset', preset: 'authErrorStatus' })
        setErrorDescriptor({ kind: 'preset', preset: 'authErrorMessage' })
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
      const optionVariants = optionVariantsById.get(option.id)

      setIsBusy(true)
      setErrorDescriptor(null)

      try {
        if (option.type === 'guest') {
          const session = await authClient.loginAsGuest()
          clearAllStoredProviderTokens()
          updateFromSession({ ...session, accessToken: null })
          setStatusDescriptor(createLoginSuccessDescriptor(option, optionVariants))
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
          setStatusDescriptor(createLoginSuccessDescriptor(option, optionVariants))
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
        setStatusDescriptor(createLoginSuccessDescriptor(option, optionVariants))
        redirectToTop()
      } catch (error) {
        console.error('ログイン処理でエラーが発生しました', error)
        setErrorDescriptor(createFailureDescriptor(option))
      } finally {
        setIsBusy(false)
      }
    },
    [authClient, loginOptions, optionVariantsById, updateFromSession],
  )

  const handleLogout = React.useCallback(async () => {
    setIsBusy(true)
    setErrorDescriptor(null)

    try {
      await authClient.logout()
      resetToLoggedOut()
      setStatusDescriptor({ kind: 'preset', preset: 'logoutSuccessStatus' })
    } catch (error) {
      console.error('ログアウト処理でエラーが発生しました', error)
      setErrorDescriptor({ kind: 'preset', preset: 'logoutFailureMessage' })
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
    setStatusDescriptor({ kind: 'preset', preset: 'clearStorageStatus' })
    setErrorDescriptor(null)
  }, [])

  const handleNavigateTop = React.useCallback(() => {
    redirectToTop()
  }, [])

  const loginModeLabel = React.useMemo(() => {
    if (details.loginMode === 'github') {
      return select('GitHub OAuth', 'GitHub OAuth')
    }
    if (details.loginMode === 'guest') {
      return select('ゲスト', 'Guest')
    }
    return select('未設定', 'Unset')
  }, [details.loginMode, select])
  const githubToken = details.accessTokens.github ?? null
  const canUseOctokit = details.loginMode === 'github' && Boolean(githubToken)
  const isLoggedIn = details.loginMode !== null

  const statusMessage = React.useMemo(
    () => resolveMessage(statusDescriptor, select),
    [select, statusDescriptor],
  )
  const errorMessage = React.useMemo(
    () => (errorDescriptor ? resolveMessage(errorDescriptor, select) : null),
    [errorDescriptor, select],
  )

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
