// File Header: Provides parsing logic for GitHub repository, blob, and pull request URLs.
import { GithubRepositoryAccessError } from './errors'
import type {
  GithubBlobCoordinates,
  GithubRepositoryCoordinates,
  PullRequestCoordinates,
  RepositoryBranch,
} from './types'
import { listRepositoryBranches } from './repositoryBranches'

const GITHUB_HOST_PATTERN = /^(?:www\.)?github\.com$/i
const OWNER_REPO_PATTERN = /^[A-Za-z0-9_.-]+$/
const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/i

type BlobUrlCandidate = {
  ref: string
  filePath: string
}

// Function Header: Generates candidate branch refs and file paths from blob URL segments.
const buildBlobUrlCandidates = (segments: string[]): BlobUrlCandidate[] => {
  const candidates: BlobUrlCandidate[] = []

  for (let index = 1; index < segments.length; index += 1) {
    const ref = segments.slice(0, index).join('/')
    const filePath = segments.slice(index).join('/')

    if (ref && filePath) {
      candidates.push({ ref, filePath })
    }
  }

  return candidates
}

// Function Header: Parses a GitHub repository URL and returns owner/repository coordinates.
export const parseGithubRepositoryUrl = (rawUrl: string): GithubRepositoryCoordinates => {
  let parsed: URL

  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new GithubRepositoryAccessError(
      'GitHubリポジトリのURLが正しくありません。 https://github.com/owner/repository の形式で入力してください。',
      'invalid-url',
      'The GitHub repository URL is invalid. Use the format https://github.com/owner/repository.',
    )
  }

  if (!GITHUB_HOST_PATTERN.test(parsed.hostname)) {
    throw new GithubRepositoryAccessError(
      'GitHubリポジトリURLのホスト名が無効です。 https://github.com/owner/repository の形式で入力してください。',
      'invalid-url',
      'The GitHub repository URL host is invalid. Use the format https://github.com/owner/repository.',
    )
  }

  const segments = parsed.pathname.split('/').filter(Boolean)

  if (segments.length < 2) {
    throw new GithubRepositoryAccessError(
      'GitHubリポジトリURLから所有者とリポジトリ名を判別できません。 https://github.com/owner/repository の形式で入力してください。',
      'missing-owner-or-repo',
      'Unable to determine the owner and repository from the URL. Use the format https://github.com/owner/repository.',
    )
  }

  const owner = segments[0]
  const repository = segments[1].replace(/\.git$/, '')

  if (!OWNER_REPO_PATTERN.test(owner)) {
    throw new GithubRepositoryAccessError(
      'GitHubの所有者（ユーザーまたは組織）名が無効です。',
      'invalid-owner',
      'The GitHub owner (user or organization) name is invalid.',
    )
  }

  if (!OWNER_REPO_PATTERN.test(repository)) {
    throw new GithubRepositoryAccessError(
      'GitHubのリポジトリ名が無効です。',
      'invalid-repo',
      'The GitHub repository name is invalid.',
    )
  }

  return {
    owner,
    repository,
  }
}

// Function Header: Selects the most plausible branch candidate based on repository branches.
const resolveBlobReference = async (
  owner: string,
  repository: string,
  candidates: BlobUrlCandidate[],
): Promise<BlobUrlCandidate> => {
  let branches: RepositoryBranch[]

  try {
    branches = await listRepositoryBranches({ owner, repository })
  } catch (error: unknown) {
    if (error instanceof GithubRepositoryAccessError) {
      throw error
    }

    throw new GithubRepositoryAccessError(
      'Blob URLからブランチ一覧を取得できませんでした。時間を置いて再度お試しください。',
      'branch-fetch-failed',
      'Unable to fetch branches from the blob URL. Please try again later.',
    )
  }

  const branchNames = new Set(branches.map((branch) => branch.name))
  const matchingCandidates = candidates.filter((candidate) => branchNames.has(candidate.ref))

  if (!matchingCandidates.length) {
    throw new GithubRepositoryAccessError(
      'Blob URLからブランチ名を判別できませんでした。ブランチ名とファイルパスを確認してください。',
      'invalid-blob-url',
      'Unable to determine the branch name from the blob URL. Check the branch name and file path.',
    )
  }

  return matchingCandidates.reduce((previous, current) =>
    current.ref.length > previous.ref.length ? current : previous,
  )
}

// Function Header: Parses a GitHub blob URL to identify repository coordinates, ref, and file path.
export const parseGithubBlobUrl = async (rawUrl: string): Promise<GithubBlobCoordinates> => {
  let parsed: URL

  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new GithubRepositoryAccessError(
      'GitHubのBlob URLが正しくありません。 https://github.com/owner/repository/blob/branch/path の形式で入力してください。',
      'invalid-blob-url',
      'The GitHub blob URL is invalid. Use the format https://github.com/owner/repository/blob/branch/path.',
    )
  }

  if (!GITHUB_HOST_PATTERN.test(parsed.hostname)) {
    throw new GithubRepositoryAccessError(
      'GitHubのBlob URLのホスト名が無効です。 https://github.com/owner/repository/blob/branch/path の形式で入力してください。',
      'invalid-blob-url',
      'The GitHub blob URL host is invalid. Use the format https://github.com/owner/repository/blob/branch/path.',
    )
  }

  const segments = parsed.pathname.split('/').filter(Boolean)

  if (segments.length < 5 || segments[2] !== 'blob') {
    throw new GithubRepositoryAccessError(
      'Blob URLからブランチとファイルパスを判別できません。 https://github.com/owner/repository/blob/branch/path の形式で入力してください。',
      'invalid-blob-url',
      'Unable to determine the branch and file path from the blob URL. Use the format https://github.com/owner/repository/blob/branch/path.',
    )
  }

  const [owner, repository, , ...rest] = segments

  if (!OWNER_REPO_PATTERN.test(owner) || !OWNER_REPO_PATTERN.test(repository)) {
    throw new GithubRepositoryAccessError(
      'Blob URLに含まれる所有者またはリポジトリ名が無効です。',
      'invalid-blob-url',
      'The owner or repository name in the blob URL is invalid.',
    )
  }

  if (rest.length < 2) {
    throw new GithubRepositoryAccessError(
      'Blob URLにブランチまたはファイルパスが含まれていません。',
      'invalid-blob-url',
      'The blob URL is missing the branch or file path.',
    )
  }

  const candidates = buildBlobUrlCandidates(rest)

  if (!candidates.length) {
    throw new GithubRepositoryAccessError(
      'Blob URLにブランチまたはファイルパスが含まれていません。',
      'invalid-blob-url',
      'The blob URL is missing the branch or file path.',
    )
  }

  const commitCandidate = candidates.find((candidate) => COMMIT_SHA_PATTERN.test(candidate.ref))

  if (commitCandidate) {
    return {
      owner,
      repository,
      ref: commitCandidate.ref,
      filePath: commitCandidate.filePath,
    }
  }

  if (rest.length === 2) {
    const [singleCandidate] = candidates

    return {
      owner,
      repository,
      ref: singleCandidate.ref,
      filePath: singleCandidate.filePath,
    }
  }

  const resolved = await resolveBlobReference(owner, repository, candidates)

  return {
    owner,
    repository,
    ref: resolved.ref,
    filePath: resolved.filePath,
  }
}

// Function Header: Parses a GitHub pull request URL and returns repository coordinates with pull number.
export const parseGithubPullRequestUrl = (rawUrl: string): PullRequestCoordinates => {
  let parsed: URL

  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new GithubRepositoryAccessError(
      'Pull Request の URL が正しくありません。 https://github.com/owner/repository/pull/123 の形式で入力してください。',
      'invalid-pull-request-url',
      'The pull request URL is invalid. Use the format https://github.com/owner/repository/pull/123.',
    )
  }

  if (!GITHUB_HOST_PATTERN.test(parsed.hostname)) {
    throw new GithubRepositoryAccessError(
      'Pull Request URL のホスト名が無効です。 https://github.com/owner/repository/pull/123 の形式で入力してください。',
      'invalid-pull-request-url',
      'The pull request URL host is invalid. Use the format https://github.com/owner/repository/pull/123.',
    )
  }

  const segments = parsed.pathname.split('/').filter(Boolean)

  if (segments.length < 4) {
    throw new GithubRepositoryAccessError(
      'Pull Request URL から番号を判別できません。 https://github.com/owner/repository/pull/123 の形式で入力してください。',
      'invalid-pull-request-url',
      'Unable to determine the pull request number from the URL. Use the format https://github.com/owner/repository/pull/123.',
    )
  }

  const pullIndex = segments.findIndex((segment) => segment === 'pull' || segment === 'pulls')

  if (pullIndex < 2 || pullIndex + 1 >= segments.length) {
    throw new GithubRepositoryAccessError(
      'Pull Request URL から番号を判別できません。 https://github.com/owner/repository/pull/123 の形式で入力してください。',
      'invalid-pull-request-url',
      'Unable to determine the pull request number from the URL. Use the format https://github.com/owner/repository/pull/123.',
    )
  }

  const pullNumberSegment = segments[pullIndex + 1]
  const pullNumber = Number.parseInt(pullNumberSegment, 10)

  if (!Number.isFinite(pullNumber)) {
    throw new GithubRepositoryAccessError(
      'Pull Request 番号が数値として認識できません。',
      'invalid-pull-request-url',
      'The pull request number is not a valid number.',
    )
  }

  const owner = segments[0]
  const repository = segments[1].replace(/\.git$/, '')

  if (!OWNER_REPO_PATTERN.test(owner) || !OWNER_REPO_PATTERN.test(repository)) {
    throw new GithubRepositoryAccessError(
      'Pull Request URL に含まれる所有者またはリポジトリ名が無効です。',
      'invalid-pull-request-url',
      'The owner or repository in the pull request URL is invalid.',
    )
  }

  return {
    owner,
    repository,
    pullNumber,
  }
}
