// File Header: Validates GitHub repository URLs and checks collaborator access via Octokit.
import { createOctokitClient } from './octokitService'

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
  | 'branch-fetch-failed'
  | 'tree-fetch-failed'
  | 'file-fetch-failed'
  | 'file-update-failed'
  | 'invalid-blob-url'
  | 'invalid-pull-request-url'
  | 'pull-request-fetch-failed'
  | 'unknown'

export type RepositoryBranch = {
  name: string
  commitSha: string
}

export type RepositoryTreeEntry = {
  path: string
  type: 'blob' | 'tree'
  sha: string
}

export type GithubBlobCoordinates = GithubRepositoryCoordinates & {
  ref: string
  filePath: string
}

export type RepositoryFileUpdateParams = {
  repository: GithubRepositoryCoordinates
  branch: string
  filePath: string
  content: string
  commitMessage: string
}

const decodeBase64Payload = (payload: string): string => {
  const cleaned = payload.replace(/\s+/g, '')

  if (typeof globalThis.atob === 'function') {
    try {
      const binary = globalThis.atob(cleaned)
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
      const decoder = new TextDecoder()
      return decoder.decode(bytes)
    } catch {
      throw new GithubRepositoryAccessError(
        '取得したファイルのデコードに失敗しました。',
        'file-fetch-failed',
        'Failed to decode the fetched file.',
      )
    }
  }

  const bufferLike = (globalThis as {
    Buffer?: { from: (_input: string, _encoding: string) => { toString: (_encoding: string) => string } }
  }).Buffer

  if (bufferLike) {
    try {
      return bufferLike.from(cleaned, 'base64').toString('utf-8')
    } catch {
      throw new GithubRepositoryAccessError(
        '取得したファイルのデコードに失敗しました。',
        'file-fetch-failed',
        'Failed to decode the fetched file.',
      )
    }
  }

  throw new GithubRepositoryAccessError(
    'ファイル内容を解読できませんでした。別の環境で再度お試しください。',
    'file-fetch-failed',
    'Unable to decode the file content. Please try again in a different environment.',
  )
}

const encodeBase64Payload = (content: string): string => {
  if (typeof globalThis.btoa === 'function') {
    try {
      const encoder = new TextEncoder()
      const bytes = encoder.encode(content)
      let binary = ''
      bytes.forEach((byte) => {
        binary += String.fromCharCode(byte)
      })
      return globalThis.btoa(binary)
    } catch {
      throw new GithubRepositoryAccessError(
        'ファイル内容のエンコードに失敗しました。',
        'file-update-failed',
        'Failed to encode the file content.',
      )
    }
  }

  const bufferLike = (globalThis as {
    Buffer?: { from: (_input: string, _encoding: string) => { toString: (_encoding: string) => string } }
  }).Buffer

  if (bufferLike) {
    try {
      return bufferLike.from(content, 'utf-8').toString('base64')
    } catch {
      throw new GithubRepositoryAccessError(
        'ファイル内容のエンコードに失敗しました。',
        'file-update-failed',
        'Failed to encode the file content.',
      )
    }
  }

  throw new GithubRepositoryAccessError(
    'ファイル内容をエンコードできませんでした。別の環境で再度お試しください。',
    'file-update-failed',
    'Unable to encode the file content. Please try again in a different environment.',
  )
}

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

// Function Header: Parses a GitHub repository URL and returns owner/repository coordinates.
export function parseGithubRepositoryUrl(rawUrl: string): GithubRepositoryCoordinates {
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

// Function Header: Parses a GitHub blob URL to identify repository coordinates, ref, and file path.
export async function parseGithubBlobUrl(rawUrl: string): Promise<GithubBlobCoordinates> {
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

  const resolved = matchingCandidates.reduce((previous, current) =>
    current.ref.length > previous.ref.length ? current : previous,
  )

  return {
    owner,
    repository,
    ref: resolved.ref,
    filePath: resolved.filePath,
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
    const status = typeof error === 'object' && error && 'status' in error ? (error as { status?: number }).status : null

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

// Function Header: Retrieves the available branches for the given repository.
export async function listRepositoryBranches({
  owner,
  repository,
}: GithubRepositoryCoordinates): Promise<RepositoryBranch[]> {
  const octokit = createOctokitClient()

  try {
    const { data } = await octokit.rest.repos.listBranches({
      owner,
      repo: repository,
      per_page: 100,
    })

    return data
      .filter((branch) => Boolean(branch?.name) && Boolean(branch?.commit?.sha))
      .map((branch) => ({
        name: branch.name,
        commitSha: branch.commit.sha,
      }))
  } catch (error: unknown) {
    const status = typeof error === 'object' && error && 'status' in error ? (error as { status?: number }).status : null

    if (status === 401 || status === 403) {
      throw new GithubRepositoryAccessError(
        'GitHubへのアクセス権限が確認できませんでした。再度ログインし直してください。',
        'unauthorized',
        'Unable to confirm GitHub access permissions. Please sign in again.',
      )
    }

    throw new GithubRepositoryAccessError(
      'リポジトリのブランチ一覧を取得できませんでした。時間を置いて再度お試しください。',
      'branch-fetch-failed',
      'Failed to retrieve the repository branches. Please try again later.',
    )
  }
}

// Function Header: Loads the repository tree for a specific branch.
export async function fetchRepositoryTree(
  { owner, repository }: GithubRepositoryCoordinates,
  branchName: string,
): Promise<RepositoryTreeEntry[]> {
  const octokit = createOctokitClient()

  try {
    const branch = await octokit.rest.repos.getBranch({
      owner,
      repo: repository,
      branch: branchName,
    })

    const treeSha = branch.data.commit.sha

    const { data } = await octokit.rest.git.getTree({
      owner,
      repo: repository,
      tree_sha: treeSha,
      recursive: 'true',
    })

    return (data.tree ?? [])
      .filter((item) => (item.type === 'blob' || item.type === 'tree') && item.path && item.sha)
      .map((item) => ({
        path: item.path as string,
        type: (item.type === 'tree' ? 'tree' : 'blob') as 'tree' | 'blob',
        sha: item.sha as string,
      }))
      .sort((left, right) => left.path.localeCompare(right.path))
  } catch (error: unknown) {
    const status = typeof error === 'object' && error && 'status' in error ? (error as { status?: number }).status : null

    if (status === 401 || status === 403) {
      throw new GithubRepositoryAccessError(
        'GitHubへのアクセス権限が確認できませんでした。再度ログインし直してください。',
        'unauthorized',
        'Unable to confirm GitHub access permissions. Please sign in again.',
      )
    }

    if (status === 404) {
      throw new GithubRepositoryAccessError(
        '指定したブランチまたはファイルツリーが見つかりません。ブランチ名を確認してください。',
        'tree-fetch-failed',
        'The specified branch or file tree was not found. Verify the branch name.',
      )
    }

    throw new GithubRepositoryAccessError(
      'リポジトリのファイルツリー取得で予期せぬエラーが発生しました。時間を置いて再度お試しください。',
      'tree-fetch-failed',
      'An unexpected error occurred while fetching the repository tree. Please try again later.',
    )
  }
}

// Function Header: Downloads the specified file from a repository branch and returns its decoded content.
export async function fetchRepositoryFileContent(
  { owner, repository }: GithubRepositoryCoordinates,
  branchName: string,
  filePath: string,
): Promise<string> {
  const octokit = createOctokitClient()

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo: repository,
      path: filePath,
      ref: branchName,
    })

    if (Array.isArray(data)) {
      throw new GithubRepositoryAccessError(
        '指定したパスがディレクトリとして扱われました。ファイルを選択してください。',
        'file-fetch-failed',
        'The specified path is a directory. Please choose a file instead.',
      )
    }

    if (data.type !== 'file' || typeof data.content !== 'string') {
      throw new GithubRepositoryAccessError(
        '選択したファイルの内容を取得できませんでした。',
        'file-fetch-failed',
        'Unable to retrieve the contents of the selected file.',
      )
    }

    if (data.encoding !== 'base64') {
      throw new GithubRepositoryAccessError(
        '取得したファイルのエンコード形式が想定外です。',
        'file-fetch-failed',
        'The downloaded file used an unexpected encoding.',
      )
    }

    return decodeBase64Payload(data.content)
  } catch (error: unknown) {
    if (error instanceof GithubRepositoryAccessError) {
      throw error
    }

    const status = typeof error === 'object' && error && 'status' in error ? (error as { status?: number }).status : null

    if (status === 401 || status === 403) {
      throw new GithubRepositoryAccessError(
        'GitHubの認証に失敗しました。再度ログインし直してください。',
        'unauthorized',
        'GitHub authentication failed. Please sign in again.',
      )
    }

    if (status === 404) {
      throw new GithubRepositoryAccessError(
        '選択したファイルが見つかりませんでした。ブランチとファイルパスを確認してください。',
        'file-fetch-failed',
        'The selected file could not be found. Check the branch and file path.',
      )
    }

    throw new GithubRepositoryAccessError(
      'GitHubファイルの取得に失敗しました。時間を置いて再度お試しください。',
      'file-fetch-failed',
      'Failed to fetch the GitHub file. Please try again later.',
    )
  }
}

// Function Header: Downloads a file referenced by a GitHub blob URL and returns decoded content with coordinates.
export async function fetchFileFromBlobUrl(blobUrl: string): Promise<{
  content: string
  coordinates: GithubBlobCoordinates
}> {
  const coordinates = await parseGithubBlobUrl(blobUrl)
  const content = await fetchRepositoryFileContent(
    { owner: coordinates.owner, repository: coordinates.repository },
    coordinates.ref,
    coordinates.filePath,
  )

  return {
    content,
    coordinates,
  }
}

// Function Header: Updates a repository file by committing the provided YAML via Octokit.
export async function commitRepositoryFileUpdate({
  repository,
  branch,
  filePath,
  content,
  commitMessage,
}: RepositoryFileUpdateParams): Promise<void> {
  const octokit = createOctokitClient()
  let existingSha: string | undefined

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: repository.owner,
      repo: repository.repository,
      path: filePath,
      ref: branch,
    })

    if (!Array.isArray(data) && data.type === 'file' && typeof data.sha === 'string') {
      existingSha = data.sha
    }
  } catch (error: unknown) {
    const status = typeof error === 'object' && error && 'status' in error ? (error as { status?: number }).status : null

    if (status === 401 || status === 403) {
      throw new GithubRepositoryAccessError(
        'GitHubの認証に失敗しました。再度ログインし直してください。',
        'unauthorized',
        'GitHub authentication failed. Please sign in again.',
      )
    }

    if (status !== 404) {
      throw new GithubRepositoryAccessError(
        'GitHubファイルの更新準備に失敗しました。時間を置いて再度お試しください。',
        'file-update-failed',
        'Failed to prepare the GitHub file for updating. Please try again later.',
      )
    }
  }

  try {
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: repository.owner,
      repo: repository.repository,
      path: filePath,
      branch,
      message: commitMessage,
      content: encodeBase64Payload(content),
      sha: existingSha,
    })
  } catch (error: unknown) {
    const status = typeof error === 'object' && error && 'status' in error ? (error as { status?: number }).status : null

    if (status === 401 || status === 403) {
      throw new GithubRepositoryAccessError(
        'GitHubの認証に失敗しました。再度ログインし直してください。',
        'unauthorized',
        'GitHub authentication failed. Please sign in again.',
      )
    }

    throw new GithubRepositoryAccessError(
      'GitHubファイルの更新に失敗しました。時間を置いて再度お試しください。',
      'file-update-failed',
      'Failed to update the GitHub file. Please try again later.',
    )
  }
}
