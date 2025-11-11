// File Header: Supplies helpers to construct Octokit clients authenticated with GitHub access tokens.
import { Octokit } from '@octokit/rest'
import { getStoredProviderToken } from './auth'

const DEFAULT_USER_AGENT = 'GridelleApp/0.2.0'

/**
 * Constructs an Octokit client using the provided or stored GitHub access token.
 * @param {string | undefined} token Optional token override.
 * @returns {Octokit} Authenticated Octokit instance.
 * @throws {Error} When neither parameter nor stored token is available.
 */
export function createOctokitClient(token?: string): Octokit {
  const authToken = token ?? getStoredProviderToken('github')

  if (!authToken) {
    throw new Error('GitHub access token is not available. Please log in again.')
  }

  return new Octokit({
    auth: authToken,
    userAgent: DEFAULT_USER_AGENT,
  })
}

export { DEFAULT_USER_AGENT as octokitUserAgent }
