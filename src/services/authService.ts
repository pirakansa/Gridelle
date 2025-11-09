// File Header: Provides Firebase initialization and GitHub token storage helpers for authentication-aware pages.
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app'
import { Auth, GithubAuthProvider, getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyDD6chKQlwE6ihHGc1v3NCZeMjxCQhg0pw',
  authDomain: 'pprj-355914.firebaseapp.com',
} as const

const GITHUB_TOKEN_STORAGE_KEY = 'gridelle/githubAccessToken'
const LOGIN_MODE_STORAGE_KEY = 'gridelle/loginMode'

export type LoginMode = 'guest' | 'github'

let firebaseApp: FirebaseApp | undefined
let authInstance: Auth | undefined
let githubProvider: GithubAuthProvider | undefined

/**
 * Ensures a single Firebase app instance is available.
 * @returns {FirebaseApp} Initialized Firebase app.
 */
export function getFirebaseApp(): FirebaseApp {
  if (firebaseApp) {
    return firebaseApp
  }

  firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  return firebaseApp
}

/**
 * Lazily acquires the Firebase Auth instance configured for locale-aware messages.
 * @returns {Auth} Firebase authentication instance.
 */
export function getFirebaseAuth(): Auth {
  if (authInstance) {
    return authInstance
  }

  authInstance = getAuth(getFirebaseApp())
  authInstance.useDeviceLanguage()
  return authInstance
}

/**
 * Provides a singleton GitHub auth provider with the required repo scope.
 * @returns {GithubAuthProvider} Configured GitHub provider.
 */
export function getGithubAuthProvider(): GithubAuthProvider {
  if (githubProvider) {
    return githubProvider
  }

  githubProvider = new GithubAuthProvider()
  githubProvider.addScope('repo')
  githubProvider.setCustomParameters({ allow_signup: 'false' })
  return githubProvider
}

/**
 * Persists the GitHub access token for Octokit usage.
 * @param {string | null} token Access token issued by GitHub.
 */
export function setStoredGithubToken(token: string | null): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }

  if (!token) {
    window.localStorage.removeItem(GITHUB_TOKEN_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, token)
}

/**
 * Retrieves the stored GitHub access token if present.
 * @returns {string | null} Stored access token.
 */
export function getStoredGithubToken(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null
  }

  return window.localStorage.getItem(GITHUB_TOKEN_STORAGE_KEY)
}

/**
 * Clears the persisted GitHub access token from storage.
 */
export function clearStoredGithubToken(): void {
  setStoredGithubToken(null)
}

/**
 * Persists the current login mode for client-side feature toggles.
 * @param {LoginMode | null} mode Login mode identifier.
 */
export function setLoginMode(mode: LoginMode | null): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }

  if (!mode) {
    window.localStorage.removeItem(LOGIN_MODE_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(LOGIN_MODE_STORAGE_KEY, mode)
}

/**
 * Reads the current login mode from storage.
 * @returns {LoginMode | null} Stored login mode value.
 */
export function getLoginMode(): LoginMode | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null
  }

  const mode = window.localStorage.getItem(LOGIN_MODE_STORAGE_KEY)

  if (mode === 'guest' || mode === 'github') {
    return mode
  }

  return null
}

export {
  firebaseConfig as authFirebaseConfig,
  GITHUB_TOKEN_STORAGE_KEY,
  LOGIN_MODE_STORAGE_KEY,
}
