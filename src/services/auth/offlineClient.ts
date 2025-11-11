// File Header: Supplies an authentication client that skips external providers for offline usage.
import type {
  AuthClient,
  AuthLoginOption,
  AuthSession,
  AuthStateChangeCallbacks,
  AuthUser,
  LoginMode,
} from './types'
import {
  clearAllStoredProviderTokens,
  clearStoredProviderToken,
  getLoginMode,
  getStoredProviderToken,
  setLoginMode,
  setStoredProviderToken,
} from './storage'

const OFFLINE_GUEST_USER: AuthUser = {
  id: 'offline-guest',
  displayName: 'Offline Guest',
  email: null,
  isAnonymous: true,
  providerIds: ['offline'],
}

const OFFLINE_GITHUB_USER: AuthUser = {
  id: 'offline-github',
  displayName: 'GitHub Token User',
  email: null,
  isAnonymous: false,
  providerIds: ['github'],
}

function createGuestSession(): AuthSession {
  return {
    user: OFFLINE_GUEST_USER,
    loginMode: 'guest',
    providerId: 'offline',
    accessToken: null,
  }
}

function createGithubTokenSession(token: string): AuthSession {
  return {
    user: OFFLINE_GITHUB_USER,
    loginMode: 'github',
    providerId: 'github',
    accessToken: token,
  }
}

const OFFLINE_LOGIN_OPTIONS: readonly AuthLoginOption[] = [
  {
    id: 'offline-guest',
    label: 'Offline Guest Login',
    description: '認証不要モードで利用します。',
    type: 'guest',
    mode: 'guest',
    providerId: 'offline',
    priority: 0,
  },
  {
    id: 'offline-github-token',
    label: 'GitHub Personal Access Token Login',
    description: 'PAT を入力して GitHub 連携を有効化します。',
    type: 'token',
    mode: 'github',
    providerId: 'github',
    priority: 1,
    requiresToken: true,
  },
]

type OfflineListener = AuthStateChangeCallbacks

class OfflineAuthClient implements AuthClient {
  private currentSession: AuthSession | null = this.restoreSessionFromStorage()
  private readonly listeners = new Set<OfflineListener>()

  subscribeAuthState(callbacks: AuthStateChangeCallbacks): () => void {
    this.listeners.add(callbacks)

    queueMicrotask(() => {
      if (this.currentSession) {
        callbacks.onAuthenticated(this.currentSession)
      } else {
        callbacks.onSignedOut()
      }
    })

    return () => {
      this.listeners.delete(callbacks)
    }
  }

  private persistSession(mode: LoginMode | null, token: string | null): void {
    setLoginMode(mode)
    if (!token) {
      if (mode === 'guest') {
        clearAllStoredProviderTokens()
      } else {
        clearStoredProviderToken('github')
      }
    } else {
      setStoredProviderToken('github', token)
    }
  }

  private restoreSessionFromStorage(): AuthSession | null {
    const mode = getLoginMode()
    if (mode === 'guest') {
      return createGuestSession()
    }
    if (mode === 'github') {
      const token = getStoredProviderToken('github')
      if (!token) {
        return null
      }
      return createGithubTokenSession(token)
    }
    return null
  }

  private notifyAuthenticated(): void {
    if (!this.currentSession) {
      return
    }
    for (const listener of this.listeners) {
      listener.onAuthenticated(this.currentSession)
    }
  }

  private notifySignedOut(): void {
    for (const listener of this.listeners) {
      listener.onSignedOut()
    }
  }

  async loginWithProvider(providerId: string): Promise<AuthSession> {
    if (providerId !== 'offline') {
      throw new Error(`Provider ${providerId} is not available in offline mode.`)
    }
    return this.loginAsGuest()
  }

  async loginWithToken(providerId: string, token: string): Promise<AuthSession> {
    if (providerId !== 'github') {
      throw new Error(`Token login is not supported for provider ${providerId}.`)
    }
    if (!token) {
      throw new Error('Token value is required.')
    }
    this.currentSession = createGithubTokenSession(token)
    this.persistSession('github', token)
    this.notifyAuthenticated()
    return this.currentSession
  }

  async loginAsGuest(): Promise<AuthSession> {
    this.currentSession = createGuestSession()
    this.persistSession('guest', null)
    this.notifyAuthenticated()
    return this.currentSession
  }

  async logout(): Promise<void> {
    this.currentSession = null
    this.persistSession(null, null)
    this.notifySignedOut()
  }

  getLoginOptions(): readonly AuthLoginOption[] {
    return OFFLINE_LOGIN_OPTIONS
  }
}

/**
 * Function Header: Constructs an offline-friendly authentication client instance.
 * @returns {AuthClient} Authentication client for intranet use.
 */
export function createOfflineAuthClient(): AuthClient {
  return new OfflineAuthClient()
}
