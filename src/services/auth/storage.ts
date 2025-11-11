// File Header: Implements persistent storage helpers for authentication data.
import type { LoginMode } from './types'

export const PROVIDER_TOKEN_STORAGE_KEY = 'gridelle/auth/providerTokens'
export const LEGACY_GITHUB_TOKEN_STORAGE_KEY = 'gridelle/githubAccessToken'
export const LOGIN_MODE_STORAGE_KEY = 'gridelle/loginMode'

type ProviderTokenMap = Record<string, string>

/**
 * Function Header: Safely parses the provider token map from localStorage.
 * @returns {ProviderTokenMap} Stored provider token mapping.
 */
function readProviderTokens(): ProviderTokenMap {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {}
  }

  const raw = window.localStorage.getItem(PROVIDER_TOKEN_STORAGE_KEY)
  if (!raw) {
    return migrateLegacyGithubToken({})
  }

  try {
    const parsed = JSON.parse(raw) as ProviderTokenMap
    return migrateLegacyGithubToken(parsed ?? {})
  } catch (error) {
    console.error('Failed to parse stored provider tokens. Resetting cache.', error)
    return migrateLegacyGithubToken({})
  }
}

/**
 * Function Header: Persists the provider token map back to localStorage.
 * @param {ProviderTokenMap} tokens Provider token mapping to persist.
 */
function writeProviderTokens(tokens: ProviderTokenMap): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }

  const entries = Object.entries(tokens).filter(([, token]) => Boolean(token))
  const serialisable = Object.fromEntries(entries)
  window.localStorage.setItem(PROVIDER_TOKEN_STORAGE_KEY, JSON.stringify(serialisable))

  if (window.localStorage.getItem(LEGACY_GITHUB_TOKEN_STORAGE_KEY)) {
    window.localStorage.removeItem(LEGACY_GITHUB_TOKEN_STORAGE_KEY)
  }
}

/**
 * Function Header: Migrates legacy GitHub token storage into the new provider token map.
 * @param {ProviderTokenMap} current Existing token map.
 * @returns {ProviderTokenMap} Updated token map with migration applied.
 */
function migrateLegacyGithubToken(current: ProviderTokenMap): ProviderTokenMap {
  if (typeof window === 'undefined' || !window.localStorage) {
    return current
  }

  if (!current.github) {
    const legacy = window.localStorage.getItem(LEGACY_GITHUB_TOKEN_STORAGE_KEY)
    if (legacy) {
      return { ...current, github: legacy }
    }
  }

  return current
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
