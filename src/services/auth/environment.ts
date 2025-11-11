// File Header: Handles environment resolution and Firebase configuration caching.
import type { FirebaseOptions } from 'firebase/app'

let firebaseConfigCache: FirebaseOptions | null = null

/**
 * Function Header: Retrieves a required environment variable or throws if unset.
 * @param {string | undefined} value Environment variable value.
 * @param {string} key Environment variable key name.
 * @returns {string} Validated environment value.
 */
export function getRequiredEnv(value: string | undefined, key: string): string {
  if (!value) {
    throw new Error(`Environment variable ${key} is not configured.`)
  }

  return value
}

/**
 * Function Header: Resolves and caches Firebase configuration for authentication clients.
 * @returns {FirebaseOptions} Firebase configuration object.
 */
export function getAuthFirebaseConfig(): FirebaseOptions {
  if (!firebaseConfigCache) {
    firebaseConfigCache = {
      apiKey: getRequiredEnv(import.meta.env.VITE_FIREBASE_API_KEY, 'VITE_FIREBASE_API_KEY'),
      authDomain: getRequiredEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, 'VITE_FIREBASE_AUTH_DOMAIN'),
    }
  }

  return firebaseConfigCache
}

/**
 * Function Header: Resets the cached Firebase configuration to allow re-resolution.
 */
export function resetFirebaseConfigCache(): void {
  firebaseConfigCache = null
}
