// File Header: Implements the domain-specific error class for repository access failures.
import type { GithubRepositoryAccessErrorCode } from './types'

// Function Header: Represents a typed error describing repository access verification failures.
export class GithubRepositoryAccessError extends Error {
  code: GithubRepositoryAccessErrorCode

  jaMessage: string

  enMessage: string

  constructor(message: string, code: GithubRepositoryAccessErrorCode, englishMessage?: string) {
    super(message)
    this.name = 'GithubRepositoryAccessError'
    this.code = code
    this.jaMessage = message
    this.enMessage = englishMessage ?? message
  }
}

// Function Header: Extracts an HTTP status code from Octokit style errors when available.
export const extractStatusCode = (error: unknown): number | null => {
  if (typeof error === 'object' && error && 'status' in error) {
    const status = (error as { status?: unknown }).status

    if (typeof status === 'number') {
      return status
    }

    if (typeof status === 'string') {
      const parsed = Number.parseInt(status, 10)
      return Number.isFinite(parsed) ? parsed : null
    }
  }

  return null
}
