// File Header: Retrieves metadata for GitHub pull requests and their associated files.
import { createOctokitClient } from '../octokitService'
import { GithubRepositoryAccessError, extractStatusCode } from './errors'
import { parseGithubPullRequestUrl } from './urlParsers'
import type { PullRequestDetails } from './types'

// Function Header: Retrieves pull request metadata and changed files for selection workflows.
export const fetchPullRequestDetails = async (pullRequestUrl: string): Promise<PullRequestDetails> => {
  const coordinates = parseGithubPullRequestUrl(pullRequestUrl)
  const octokit = createOctokitClient()

  let pullRequest: Awaited<ReturnType<typeof octokit.rest.pulls.get>>['data']

  try {
    const { data } = await octokit.rest.pulls.get({
      owner: coordinates.owner,
      repo: coordinates.repository,
      pull_number: coordinates.pullNumber,
    })
    pullRequest = data
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
      'Pull Request の情報を取得できませんでした。URLとアクセス権限を確認してください。',
      'pull-request-fetch-failed',
      'Unable to fetch the pull request details. Check the URL and your permissions.',
    )
  }

  const headRepoOwner = pullRequest.head?.repo?.owner?.login
  const headRepoName = pullRequest.head?.repo?.name
  const headRef = pullRequest.head?.ref

  if (!headRepoOwner || !headRepoName || !headRef) {
    throw new GithubRepositoryAccessError(
      'Pull Request のヘッド情報を取得できませんでした。時間を置いて再度お試しください。',
      'pull-request-fetch-failed',
      'Unable to fetch the pull request head information. Please try again later.',
    )
  }

  let filesResponse: Awaited<ReturnType<typeof octokit.rest.pulls.listFiles>>['data'] = []

  try {
    const { data } = await octokit.rest.pulls.listFiles({
      owner: coordinates.owner,
      repo: coordinates.repository,
      pull_number: coordinates.pullNumber,
      per_page: 100,
    })
    filesResponse = data
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
      'Pull Request の変更ファイルを取得できませんでした。時間を置いて再度お試しください。',
      'pull-request-fetch-failed',
      'Unable to fetch the pull request file list. Please try again later.',
    )
  }

  const files = filesResponse
    .filter((file) => typeof file.filename === 'string')
    .map((file) => ({
      path: file.filename as string,
      sha: typeof file.sha === 'string' ? file.sha : null,
      status: typeof file.status === 'string' ? file.status : 'modified',
    }))

  return {
    coordinates,
    head: {
      repository: {
        owner: headRepoOwner,
        repository: headRepoName,
      },
      ref: headRef,
    },
    files,
  }
}
