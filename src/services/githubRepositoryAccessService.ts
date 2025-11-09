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
  | 'branch-fetch-failed'
  | 'tree-fetch-failed'
  | 'file-fetch-failed'
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

const decodeBase64Payload = (payload: string): string => {
  const cleaned = payload.replace(/\s+/g, '')

  if (typeof globalThis.atob === 'function') {
    try {
      const binary = globalThis.atob(cleaned)
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
      const decoder = new TextDecoder()
      return decoder.decode(bytes)
    } catch (error) {
      throw new GithubRepositoryAccessError(
        '取得したファイルのデコードに失敗しました。',
        'file-fetch-failed',
      )
    }
  }

  const bufferLike = (globalThis as {
    Buffer?: { from: (_input: string, _encoding: string) => { toString: (_encoding: string) => string } }
  }).Buffer

  if (bufferLike) {
    try {
      return bufferLike.from(cleaned, 'base64').toString('utf-8')
    } catch (error) {
      throw new GithubRepositoryAccessError(
        '取得したファイルのデコードに失敗しました。',
        'file-fetch-failed',
      )
    }
  }

  throw new GithubRepositoryAccessError(
    'ファイル内容を解読できませんでした。別の環境で再度お試しください。',
    'file-fetch-failed',
  )
}

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

// Function Header: Parses a GitHub blob URL to identify repository coordinates, ref, and file path.
export function parseGithubBlobUrl(rawUrl: string): GithubBlobCoordinates {
  let parsed: URL

  try {
    parsed = new URL(rawUrl)
  } catch (error) {
    throw new GithubRepositoryAccessError(
      'GitHubのBlob URLが正しくありません。 https://github.com/owner/repository/blob/branch/path の形式で入力してください。',
      'invalid-blob-url',
    )
  }

  if (!GITHUB_HOST_PATTERN.test(parsed.hostname)) {
    throw new GithubRepositoryAccessError(
      'GitHubのBlob URLのホスト名が無効です。 https://github.com/owner/repository/blob/branch/path の形式で入力してください。',
      'invalid-blob-url',
    )
  }

  const segments = parsed.pathname.split('/').filter(Boolean)

  if (segments.length < 5 || segments[2] !== 'blob') {
    throw new GithubRepositoryAccessError(
      'Blob URLからブランチとファイルパスを判別できません。 https://github.com/owner/repository/blob/branch/path の形式で入力してください。',
      'invalid-blob-url',
    )
  }

  const [owner, repository, _blobKeyword, ...rest] = segments
  const ref = rest.shift() ?? ''
  const filePath = rest.join('/')

  if (!OWNER_REPO_PATTERN.test(owner) || !OWNER_REPO_PATTERN.test(repository)) {
    throw new GithubRepositoryAccessError(
      'Blob URLに含まれる所有者またはリポジトリ名が無効です。',
      'invalid-blob-url',
    )
  }

  if (!ref || !filePath) {
    throw new GithubRepositoryAccessError(
      'Blob URLにブランチまたはファイルパスが含まれていません。',
      'invalid-blob-url',
    )
  }

  return {
    owner,
    repository,
    ref,
    filePath,
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
      )
    }

    throw new GithubRepositoryAccessError(
      'リポジトリのブランチ一覧を取得できませんでした。時間を置いて再度お試しください。',
      'branch-fetch-failed',
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
      )
    }

    if (status === 404) {
      throw new GithubRepositoryAccessError(
        '指定したブランチまたはファイルツリーが見つかりません。ブランチ名を確認してください。',
        'tree-fetch-failed',
      )
    }

    throw new GithubRepositoryAccessError(
      'リポジトリのファイルツリー取得で予期せぬエラーが発生しました。時間を置いて再度お試しください。',
      'tree-fetch-failed',
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
      )
    }

    if (data.type !== 'file' || typeof data.content !== 'string') {
      throw new GithubRepositoryAccessError(
        '選択したファイルの内容を取得できませんでした。',
        'file-fetch-failed',
      )
    }

    if (data.encoding !== 'base64') {
      throw new GithubRepositoryAccessError(
        '取得したファイルのエンコード形式が想定外です。',
        'file-fetch-failed',
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
      )
    }

    if (status === 404) {
      throw new GithubRepositoryAccessError(
        '選択したファイルが見つかりませんでした。ブランチとファイルパスを確認してください。',
        'file-fetch-failed',
      )
    }

    throw new GithubRepositoryAccessError(
      'GitHubファイルの取得に失敗しました。時間を置いて再度お試しください。',
      'file-fetch-failed',
    )
  }
}

// Function Header: Downloads a file referenced by a GitHub blob URL and returns decoded content with coordinates.
export async function fetchFileFromBlobUrl(blobUrl: string): Promise<{
  content: string
  coordinates: GithubBlobCoordinates
}> {
  const coordinates = parseGithubBlobUrl(blobUrl)
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
