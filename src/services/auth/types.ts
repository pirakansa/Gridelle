// File Header: Declares shared authentication interfaces and data structures.
export type LoginMode = 'guest' | 'github' | (string & {})

export interface AuthUser {
  readonly id: string
  readonly displayName: string | null
  readonly email: string | null
  readonly isAnonymous: boolean
  readonly providerIds: readonly string[]
}

export interface AuthSession {
  readonly user: AuthUser
  readonly loginMode: LoginMode
  readonly providerId: string | null
  readonly accessToken: string | null
}

export interface AuthStateChangeCallbacks {
  readonly onAuthenticated: (_session: AuthSession) => void
  readonly onSignedOut: () => void
  readonly onError?: (_error: unknown) => void
}

export type AuthLoginOptionKind = 'oauth' | 'token' | 'guest' | (string & {})

export interface AuthLoginOption {
  readonly id: string
  readonly label: string
  readonly description?: string
  readonly type: AuthLoginOptionKind
  readonly mode: LoginMode
  readonly providerId: string | null
  readonly priority?: number
  readonly requiresToken?: boolean
}

export interface AuthClient {
  subscribeAuthState(_callbacks: AuthStateChangeCallbacks): () => void
  loginWithProvider(_providerId: string): Promise<AuthSession>
  loginAsGuest(): Promise<AuthSession>
  logout(): Promise<void>
  getLoginOptions(): readonly AuthLoginOption[]
  loginWithToken?(_providerId: string, _token: string): Promise<AuthSession>
}

export type AuthClientFactory = () => AuthClient
