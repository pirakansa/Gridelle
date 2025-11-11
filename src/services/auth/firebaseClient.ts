// File Header: Supplies a Firebase-backed implementation of the authentication client abstraction.
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app'
import {
  Auth,
  GithubAuthProvider,
  type Unsubscribe,
  type User,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { getAuthFirebaseConfig } from './environment'
import type {
  AuthClient,
  AuthLoginOption,
  AuthSession,
  AuthStateChangeCallbacks,
  AuthUser,
  LoginMode,
} from './types'

let firebaseApp: FirebaseApp | undefined
let authInstance: Auth | undefined
let githubProvider: GithubAuthProvider | undefined

/**
 * Function Header: Lazily creates or retrieves the Firebase app instance.
 * @returns {FirebaseApp} Firebase application reference.
 */
function ensureFirebaseApp(): FirebaseApp {
  if (firebaseApp) {
    return firebaseApp
  }

  const config = getAuthFirebaseConfig()
  firebaseApp = getApps().length > 0 ? getApp() : initializeApp(config)
  return firebaseApp
}

/**
 * Function Header: Provides a cached Firebase authentication instance.
 * @returns {Auth} Firebase authentication instance.
 */
function ensureFirebaseAuth(): Auth {
  if (authInstance) {
    return authInstance
  }

  authInstance = getAuth(ensureFirebaseApp())
  authInstance.useDeviceLanguage()
  return authInstance
}

/**
 * Function Header: Creates a GitHub OAuth provider configured for Gridelle.
 * @returns {GithubAuthProvider} Firebase GitHub provider instance.
 */
function ensureGithubProvider(): GithubAuthProvider {
  if (githubProvider) {
    return githubProvider
  }

  githubProvider = new GithubAuthProvider()
  githubProvider.addScope('repo')
  githubProvider.setCustomParameters({ allow_signup: 'false' })
  return githubProvider
}

/**
 * Function Header: Calculates the login mode from a Firebase user record.
 * @param {User} user Firebase user information.
 * @returns {LoginMode} Derived login mode identifier.
 */
function determineFirebaseLoginMode(user: User): LoginMode {
  if (user.isAnonymous) {
    return 'guest'
  }

  const providerIds = user.providerData?.map((provider) => provider?.providerId ?? '').filter(Boolean) ?? []
  if (providerIds.includes('github.com')) {
    return 'github'
  }

  return 'github'
}

/**
 * Function Header: Normalises a Firebase user into the shared auth user representation.
 * @param {User} user Firebase user information.
 * @returns {AuthUser} Normalised user object.
 */
function mapFirebaseUser(user: User): AuthUser {
  return {
    id: user.uid,
    displayName: user.displayName ?? null,
    email: user.email ?? null,
    isAnonymous: Boolean(user.isAnonymous),
    providerIds:
      user.providerData?.map((provider) => provider?.providerId ?? '').filter((id): id is string => Boolean(id)) ?? [],
  }
}

/**
 * Function Header: Builds an AuthSession from the Firebase context and derived information.
 * @param {User} user Firebase user record.
 * @param {LoginMode | null} explicitMode Optional override for the login mode.
 * @param {string | null} accessToken OAuth access token when available.
 * @param {string | null} providerId Provider identifier used for login.
 * @returns {AuthSession} Structured authentication session details.
 */
function createSession(
  user: User,
  explicitMode: LoginMode | null,
  accessToken: string | null,
  providerId: string | null,
): AuthSession {
  const loginMode = explicitMode ?? determineFirebaseLoginMode(user)
  return {
    user: mapFirebaseUser(user),
    loginMode,
    providerId,
    accessToken,
  }
}

const LOGIN_OPTIONS: readonly AuthLoginOption[] = [
  {
    id: 'github-oauth',
    label: 'GitHub でログイン',
    description: 'GitHub OAuth を使用してログインします。',
    type: 'oauth',
    mode: 'github',
    providerId: 'github',
    priority: 0,
    requiresToken: true,
  },
  {
    id: 'guest-login',
    label: 'ゲストでログイン',
    description: '機能が制限されたゲストモードで利用します。',
    type: 'guest',
    mode: 'guest',
    providerId: 'guest',
    priority: 1,
  },
]

class FirebaseAuthClient implements AuthClient {
  private readonly auth: Auth

  constructor() {
    this.auth = ensureFirebaseAuth()
  }

  /**
   * Function Header: Registers auth state listeners and forwards state transitions.
   * @param {AuthStateChangeCallbacks} callbacks Observer callbacks.
   * @returns {Unsubscribe} Detach handler for the listener.
   */
  subscribeAuthState(callbacks: AuthStateChangeCallbacks): Unsubscribe {
    return onAuthStateChanged(
      this.auth,
      (user) => {
        if (!user) {
          callbacks.onSignedOut()
          return
        }

        callbacks.onAuthenticated(createSession(user, null, null, null))
      },
      (error) => {
        callbacks.onError?.(error)
      },
    )
  }

  /**
   * Function Header: Performs a provider based login and returns the resulting session.
   * @param {string} providerId Provider identifier.
   * @returns {Promise<AuthSession>} Authentication session after login.
   */
  async loginWithProvider(providerId: string): Promise<AuthSession> {
    if (providerId !== 'github') {
      throw new Error(`Unsupported provider: ${providerId}`)
    }

    const result = await signInWithPopup(this.auth, ensureGithubProvider())
    if (!result.user) {
      throw new Error('Authentication result does not contain a user object.')
    }

    const credential = GithubAuthProvider.credentialFromResult(result)
    const accessToken = credential?.accessToken ?? null

    return createSession(result.user, 'github', accessToken, providerId)
  }

  /**
   * Function Header: Signs the visitor in anonymously and returns the session.
   * @returns {Promise<AuthSession>} Authentication session after guest login.
   */
  async loginAsGuest(): Promise<AuthSession> {
    const result = await signInAnonymously(this.auth)
    if (!result.user) {
      throw new Error('Anonymous login result does not contain a user object.')
    }

    return createSession(result.user, 'guest', null, 'guest')
  }

  /**
   * Function Header: Signs out the active Firebase session.
   */
  async logout(): Promise<void> {
    await signOut(this.auth)
  }

  /**
   * Function Header: Lists the login options supported by the Firebase adapter.
   * @returns {readonly AuthLoginOption[]} Available login option descriptors.
   */
  getLoginOptions(): readonly AuthLoginOption[] {
    return LOGIN_OPTIONS
  }
}

/**
 * Function Header: Constructs a Firebase authentication client instance.
 * @returns {AuthClient} Firebase-backed authentication client.
 */
export function createFirebaseAuthClient(): AuthClient {
  return new FirebaseAuthClient()
}

/**
 * Function Header: Clears cached Firebase instances to simplify testing overrides.
 */
export function resetFirebaseClientCache(): void {
  firebaseApp = undefined
  authInstance = undefined
  githubProvider = undefined
}
