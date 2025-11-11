// File Header: Centralises login variant resolution using environment variables.
export const LOGIN_APP_DEFAULT_VARIANT = 'firebase'

/**
 * Function Header: Determines the login application variant configured for the build.
 * @returns {string} Variant identifier such as "firebase" or "offline".
 */
export function getConfiguredLoginVariant(): string {
  const raw = import.meta.env.VITE_LOGIN_APP?.trim()
  return raw && raw.length > 0 ? raw : LOGIN_APP_DEFAULT_VARIANT
}
