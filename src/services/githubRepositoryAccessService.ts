// File Header: Validates GitHub repository URLs and checks collaborator access via Octokit.
import { createOctokitClient } from './octokitService'

const GITHUB_HOST_PATTERN = /^(?:www\.)?github\.com$/i
const OWNER_REPO_PATTERN = /^[A-Za-z0-9_.-]+$/

export type GithubRepositoryCoordinates = {
  owner: string
  repository: string
}

export type CollaboratorVerificationResult = {
  repository: GithubRepositoryCoordinates
  username: string
}

export type GithubRepositoryAccessErrorCode =
  | 'invalid-url'
  | 'missing-owner-or-repo'
  | 'invalid-owner'
  | 'invalid-repo'
  | 'unauthorized'
  | 'not-a-collaborator'
  | 'unknown'

// Function Header: Represents a typed error describing repository access verification failures.
export class GithubRepositoryAccessError extends Error {
  code: GithubRepositoryAccessErrorCode

  constructor(message: string, code: GithubRepositoryAccessErrorCode) {
    super(message)
    this.name = 'GithubRepositoryAccessError'
    this.code = code
  }
}

// Function Header: Parses a GitHub repository URL and returns owner/repository coordinates.
export function parseGithubRepositoryUrl(rawUrl: string): GithubRepositoryCoordinates {
  let parsed: URL

  try {
    parsed = new URL(rawUrl)
  } catch (error) {
    throw new GithubRepositoryAccessError(
      'GitHubリポジトリのURLが正しくありません。 https://github.com/owner/repository の形式で入力してください。',
      'invalid-url',
    )
  }

  if (!GITHUB_HOST_PATTERN.test(parsed.hostname)) {
    throw new GithubRepositoryAccessError(
      'GitHubリポジトリURLのホスト名が無効です。 https://github.com/owner/repository の形式で入力してください。',
      'invalid-url',
    )
  }

  const segments = parsed.pathname.split('/').filter(Boolean)

  if (segments.length < 2) {
    throw new GithubRepositoryAccessError(
      'GitHubリポジトリURLから所有者とリポジトリ名を判別できません。 https://github.com/owner/repository の形式で入力してください。',
      'missing-owner-or-repo',
    )
  }

  const owner = segments[0]
  const repository = segments[1].replace(/\.git$/, '')

  if (!OWNER_REPO_PATTERN.test(owner)) {
    throw new GithubRepositoryAccessError(
      'GitHubの所有者（ユーザーまたは組織）名が無効です。',
      'invalid-owner',
    )
  }

  if (!OWNER_REPO_PATTERN.test(repository)) {
    throw new GithubRepositoryAccessError('GitHubのリポジトリ名が無効です。', 'invalid-repo')
  }

  return {
    owner,
    repository,
  }
}

// Function Header: Confirms that the authenticated user is a collaborator of the given repository.
export async function verifyRepositoryCollaborator(
  repositoryUrl: string,
): Promise<CollaboratorVerificationResult> {
  const coordinates = parseGithubRepositoryUrl(repositoryUrl)
  const octokit = createOctokitClient()

  let username: string

  try {
    const { data } = await octokit.rest.users.getAuthenticated()
    username = data.login
  } catch (error) {
    throw new GithubRepositoryAccessError(
      'GitHubのユーザー情報を取得できませんでした。再度ログインし直してください。',
      'unauthorized',
    )
  }

  try {
    await octokit.rest.repos.checkCollaborator({
      owner: coordinates.owner,
      repo: coordinates.repository,
      username,
    })
  } catch (error: unknown) {
    const status = typeof error === 'object' && error && 'status' in error ? (error as { status?: number }).status : null

    if (status === 401 || status === 403) {
      throw new GithubRepositoryAccessError(
        'GitHubの認証に失敗しました。再度ログインし直してください。',
        'unauthorized',
      )
    }

    if (status === 404) {
      throw new GithubRepositoryAccessError(
        '対象リポジトリに対するコラボレーター権限がありません。リポジトリへの招待状況を確認してください。',
        'not-a-collaborator',
      )
    }

    throw new GithubRepositoryAccessError(
      'リポジトリの権限確認で予期せぬエラーが発生しました。時間を置いて再度お試しください。',
      'unknown',
    )
  }

  return {
    repository: coordinates,
    username,
  }
}
