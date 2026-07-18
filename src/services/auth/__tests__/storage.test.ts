// File Header: Tests session-scoped authentication token storage and legacy migration.
import { beforeEach, describe, expect, it } from 'vitest'

import {
  LEGACY_GITHUB_TOKEN_STORAGE_KEY,
  PROVIDER_TOKEN_STORAGE_KEY,
  clearAllStoredProviderTokens,
  getStoredProviderToken,
  getStoredProviderTokens,
  setStoredProviderToken,
} from '../storage'

describe('provider token storage', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('stores provider tokens only for the current tab session', () => {
    setStoredProviderToken('github', 'session-token')

    expect(getStoredProviderToken('github')).toBe('session-token')
    expect(sessionStorage.getItem(PROVIDER_TOKEN_STORAGE_KEY)).toBe(
      JSON.stringify({ github: 'session-token' }),
    )
    expect(localStorage.getItem(PROVIDER_TOKEN_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(LEGACY_GITHUB_TOKEN_STORAGE_KEY)).toBeNull()
  })

  it('migrates provider maps from localStorage and removes the persistent copy', () => {
    localStorage.setItem(PROVIDER_TOKEN_STORAGE_KEY, JSON.stringify({ github: 'migrated-token' }))

    expect(getStoredProviderTokens()).toEqual({ github: 'migrated-token' })
    expect(sessionStorage.getItem(PROVIDER_TOKEN_STORAGE_KEY)).toBe(
      JSON.stringify({ github: 'migrated-token' }),
    )
    expect(localStorage.getItem(PROVIDER_TOKEN_STORAGE_KEY)).toBeNull()
  })

  it('migrates the legacy GitHub token key and removes it', () => {
    localStorage.setItem(LEGACY_GITHUB_TOKEN_STORAGE_KEY, 'legacy-token')

    expect(getStoredProviderToken('github')).toBe('legacy-token')
    expect(sessionStorage.getItem(PROVIDER_TOKEN_STORAGE_KEY)).toBe(
      JSON.stringify({ github: 'legacy-token' }),
    )
    expect(localStorage.getItem(LEGACY_GITHUB_TOKEN_STORAGE_KEY)).toBeNull()
  })

  it('removes all session-scoped provider tokens', () => {
    setStoredProviderToken('github', 'session-token')

    clearAllStoredProviderTokens()

    expect(getStoredProviderTokens()).toEqual({})
    expect(sessionStorage.getItem(PROVIDER_TOKEN_STORAGE_KEY)).toBeNull()
  })
})
