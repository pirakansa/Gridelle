// File Header: Retrieves branch level metadata and repository tree structures from GitHub.
import { createOctokitClient } from '../octokitService'
import { GithubRepositoryAccessError, extractStatusCode } from './errors'
import type { GithubRepositoryCoordinates, RepositoryBranch, RepositoryTreeEntry } from './types'

// Function Header: Retrieves the available branches for the given repository.
export const listRepositoryBranches = async ({
  owner,
  repository,
}: GithubRepositoryCoordinates): Promise<RepositoryBranch[]> => {
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
    const status = extractStatusCode(error)

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
export const fetchRepositoryTree = async (
  { owner, repository }: GithubRepositoryCoordinates,
  branchName: string,
): Promise<RepositoryTreeEntry[]> => {
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
    const status = extractStatusCode(error)

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
