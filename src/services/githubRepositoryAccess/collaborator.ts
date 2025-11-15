// File Header: Validates collaborator permissions against GitHub repositories.
import { createOctokitClient } from '../octokitService'
import { GithubRepositoryAccessError, extractStatusCode } from './errors'
import { parseGithubRepositoryUrl } from './urlParsers'
import type { CollaboratorVerificationResult } from './types'

// Function Header: Confirms that the authenticated user is a collaborator of the given repository.
export const verifyRepositoryCollaborator = async (
  repositoryUrl: string,
): Promise<CollaboratorVerificationResult> => {
  const coordinates = parseGithubRepositoryUrl(repositoryUrl)
  const octokit = createOctokitClient()

  let username: string

  try {
    const { data } = await octokit.rest.users.getAuthenticated()
    username = data.login
  } catch {
    throw new GithubRepositoryAccessError(
      'GitHubのユーザー情報を取得できませんでした。再度ログインし直してください。',
      'unauthorized',
      'Unable to fetch your GitHub profile. Please sign in again.',
    )
  }

  try {
    await octokit.rest.repos.checkCollaborator({
      owner: coordinates.owner,
      repo: coordinates.repository,
      username,
    })
  } catch (error: unknown) {
    const status = extractStatusCode(error)

    if (status === 401 || status === 403) {
      throw new GithubRepositoryAccessError(
        'GitHubの認証に失敗しました。再度ログインし直してください。',
        'unauthorized',
        'GitHub authentication failed. Please sign in again.',
      )
    }

    if (status === 404) {
      throw new GithubRepositoryAccessError(
        '対象リポジトリに対するコラボレーター権限がありません。リポジトリへの招待状況を確認してください。',
        'not-a-collaborator',
        'You do not have collaborator access to the repository. Check your invitation status.',
      )
    }

    throw new GithubRepositoryAccessError(
      'リポジトリの権限確認で予期せぬエラーが発生しました。時間を置いて再度お試しください。',
      'unknown',
      'An unexpected error occurred while verifying repository permissions. Please try again later.',
    )
  }

  return {
    repository: coordinates,
    username,
  }
}
