// File Header: Implements session-scoped storage helpers for authentication data.
import type { LoginMode } from './types'

export const PROVIDER_TOKEN_STORAGE_KEY = 'gridelle/auth/providerTokens'
export const LEGACY_GITHUB_TOKEN_STORAGE_KEY = 'gridelle/githubAccessToken'
export const LOGIN_MODE_STORAGE_KEY = 'gridelle/loginMode'

type ProviderTokenMap = Record<string, string>

// Function Header: Returns browser storage when it is available without surfacing privacy-mode failures.
function getBrowserStorage(kind: 'localStorage' | 'sessionStorage'): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window[kind]
  } catch (error) {
    console.error(`Failed to access ${kind}.`, error)
    return null
  }
}

// Function Header: Parses and filters a provider token map from a storage payload.
function parseProviderTokens(raw: string | null): ProviderTokenMap {
  if (!raw) {
    return {}
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0,
      ),
    )
  } catch (error) {
    console.error('Failed to parse stored provider tokens. Resetting cache.', error)
    return {}
  }
}

// Function Header: Removes provider token keys left by localStorage-based releases.
function removeLegacyLocalTokens(localStorageRef: Storage | null): void {
  if (!localStorageRef) {
    return
  }

  try {
    localStorageRef.removeItem(PROVIDER_TOKEN_STORAGE_KEY)
    localStorageRef.removeItem(LEGACY_GITHUB_TOKEN_STORAGE_KEY)
  } catch (error) {
    console.error('Failed to remove legacy provider tokens.', error)
  }
}

/**
 * Function Header: Reads session tokens and migrates tokens from legacy localStorage keys.
 * @returns {ProviderTokenMap} Stored provider token mapping.
 */
function readProviderTokens(): ProviderTokenMap {
  const sessionStorageRef = getBrowserStorage('sessionStorage')
  const localStorageRef = getBrowserStorage('localStorage')
  const sessionTokens = parseProviderTokens(sessionStorageRef?.getItem(PROVIDER_TOKEN_STORAGE_KEY) ?? null)
  const localTokens = parseProviderTokens(localStorageRef?.getItem(PROVIDER_TOKEN_STORAGE_KEY) ?? null)
  const legacyGithubToken = localStorageRef?.getItem(LEGACY_GITHUB_TOKEN_STORAGE_KEY) ?? null
  const migratedTokens = {
    ...(legacyGithubToken ? { github: legacyGithubToken } : {}),
    ...localTokens,
    ...sessionTokens,
  }

  if ((Object.keys(localTokens).length > 0 || legacyGithubToken) && sessionStorageRef) {
    sessionStorageRef.setItem(PROVIDER_TOKEN_STORAGE_KEY, JSON.stringify(migratedTokens))
  }
  removeLegacyLocalTokens(localStorageRef)
  return migratedTokens
}

/**
 * Function Header: Persists the provider token map for the current browser tab session.
 * @param {ProviderTokenMap} tokens Provider token mapping to persist.
 */
function writeProviderTokens(tokens: ProviderTokenMap): void {
  const sessionStorageRef = getBrowserStorage('sessionStorage')
  const localStorageRef = getBrowserStorage('localStorage')
  const entries = Object.entries(tokens).filter(([, token]) => Boolean(token))
  const serialisable = Object.fromEntries(entries)
  if (sessionStorageRef) {
    if (entries.length > 0) {
      sessionStorageRef.setItem(PROVIDER_TOKEN_STORAGE_KEY, JSON.stringify(serialisable))
    } else {
      sessionStorageRef.removeItem(PROVIDER_TOKEN_STORAGE_KEY)
    }
  }
  removeLegacyLocalTokens(localStorageRef)
}

/**
 * Function Header: Retrieves the stored token for a specific authentication provider.
 * @param {string} providerId Provider identifier.
 * @returns {string | null} Stored token if available.
 */
export function getStoredProviderToken(providerId: string): string | null {
  const tokens = readProviderTokens()
  return tokens[providerId] ?? null
}

/**
 * Function Header: Reads all stored provider tokens.
 * @returns {ProviderTokenMap} Complete provider token mapping.
 */
export function getStoredProviderTokens(): ProviderTokenMap {
  return readProviderTokens()
}

/**
 * Function Header: Persists or removes a token for the provided authentication provider.
 * @param {string} providerId Provider identifier.
 * @param {string | null} token Provider access token.
 */
export function setStoredProviderToken(providerId: string, token: string | null): void {
  const tokens = readProviderTokens()
  if (!token) {
    delete tokens[providerId]
    writeProviderTokens(tokens)
    return
  }

  writeProviderTokens({ ...tokens, [providerId]: token })
}

/**
 * Function Header: Removes the stored token for a provider.
 * @param {string} providerId Provider identifier.
 */
export function clearStoredProviderToken(providerId: string): void {
  setStoredProviderToken(providerId, null)
}

/**
 * Function Header: Removes all stored provider tokens.
 */
export function clearAllStoredProviderTokens(): void {
  writeProviderTokens({})
}

/**
 * Function Header: Saves the current login mode.
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
 * Function Header: Retrieves the stored login mode if available.
 * @returns {LoginMode | null} Login mode value from storage.
 */
export function getLoginMode(): LoginMode | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null
  }

  const mode = window.localStorage.getItem(LOGIN_MODE_STORAGE_KEY)
  return mode ? (mode as LoginMode) : null
}
