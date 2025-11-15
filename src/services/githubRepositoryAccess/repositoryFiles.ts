// File Header: Manages file level operations within GitHub repositories.
import { createOctokitClient } from '../octokitService'
import { GithubRepositoryAccessError, extractStatusCode } from './errors'
import { decodeBase64Payload, encodeBase64Payload } from './encoding'
import { parseGithubBlobUrl } from './urlParsers'
import type { GithubBlobCoordinates, GithubRepositoryCoordinates, RepositoryFileUpdateParams } from './types'

// Function Header: Downloads the specified file from a repository branch and returns its decoded content.
export const fetchRepositoryFileContent = async (
  { owner, repository }: GithubRepositoryCoordinates,
  branchName: string,
  filePath: string,
): Promise<string> => {
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
export const fetchFileFromBlobUrl = async (
  blobUrl: string,
): Promise<{ content: string; coordinates: GithubBlobCoordinates }> => {
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
export const commitRepositoryFileUpdate = async ({
  repository,
  branch,
  filePath,
  content,
  commitMessage,
}: RepositoryFileUpdateParams): Promise<void> => {
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
    const status = extractStatusCode(error)

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
    const status = extractStatusCode(error)

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
