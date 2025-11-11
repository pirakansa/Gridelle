// File Header: Supplies an authentication client that skips external providers for offline usage.
import type {
  AuthClient,
  AuthLoginOption,
  AuthSession,
  AuthStateChangeCallbacks,
  AuthUser,
} from './types'

const OFFLINE_USER: AuthUser = {
  id: 'offline-user',
  displayName: 'Offline User',
  email: null,
  isAnonymous: true,
  providerIds: ['offline'],
}

const OFFLINE_SESSION: AuthSession = {
  user: OFFLINE_USER,
  loginMode: 'guest',
  providerId: 'offline',
  accessToken: null,
}

const OFFLINE_LOGIN_OPTIONS: readonly AuthLoginOption[] = [
  {
    id: 'offline-mode',
    label: '認証不要モードで利用',
    description: '社内ネットワーク向けの簡易ログインです。',
    type: 'guest',
    mode: 'guest',
    providerId: 'offline',
    priority: 0,
  },
]

class OfflineAuthClient implements AuthClient {
  private currentSession: AuthSession = OFFLINE_SESSION

  subscribeAuthState(callbacks: AuthStateChangeCallbacks): () => void {
    let active = true
    queueMicrotask(() => {
      if (!active) {
        return
      }
      callbacks.onAuthenticated(this.currentSession)
    })
    return () => {
      active = false
    }
  }

  async loginWithProvider(): Promise<AuthSession> {
    return this.currentSession
  }

  async loginAsGuest(): Promise<AuthSession> {
    return this.currentSession
  }

  async logout(): Promise<void> {
    this.currentSession = OFFLINE_SESSION
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
