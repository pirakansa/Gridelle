// File Header: Provides the public authentication service facade with pluggable clients.
import type { AuthClient, AuthClientFactory, AuthUser, LoginMode } from './types'
import { createFirebaseAuthClient, resetFirebaseClientCache } from './firebaseClient'

let activeFactory: AuthClientFactory | null = null
let cachedClient: AuthClient | null = null

/**
 * Function Header: Returns the active authentication client, lazily creating it if needed.
 * @returns {AuthClient} Shared authentication client instance.
 */
export function getAuthClient(): AuthClient {
  if (!cachedClient) {
    const factory = activeFactory ?? createFirebaseAuthClient
    cachedClient = factory()
  }

  return cachedClient
}

/**
 * Function Header: Overrides the auth client factory to allow custom adapters.
 * @param {AuthClientFactory} factory Factory that builds an AuthClient implementation.
 */
export function configureAuthClient(factory: AuthClientFactory): void {
  activeFactory = factory
  resetAuthClient()
}

/**
 * Function Header: Clears the cached auth client so the next access reinitialises it.
 */
export function resetAuthClient(): void {
  cachedClient = null
  resetFirebaseClientCache()
}

/**
 * Function Header: Derives the login mode from a minimal auth user representation.
 * @param {Pick<AuthUser, 'isAnonymous'> | null} user Minimal user record.
 * @returns {LoginMode | null} Login mode identifier if determinable.
 */
export function deriveLoginMode(user: Pick<AuthUser, 'isAnonymous'> | null): LoginMode | null {
  if (!user) {
    return null
  }

  return user.isAnonymous ? 'guest' : 'github'
}

export * from './types'
export * from './storage'
export * from './environment'
