// File Header: Declares shared type definitions for GitHub repository access workflows.
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

export type PullRequestCoordinates = GithubRepositoryCoordinates & {
  pullNumber: number
}

export type PullRequestChangedFile = {
  path: string
  sha: string | null
  status: string
}

export type PullRequestDetails = {
  coordinates: PullRequestCoordinates
  head: {
    repository: GithubRepositoryCoordinates
    ref: string
  }
  files: PullRequestChangedFile[]
}

export type RepositoryFileUpdateParams = {
  repository: GithubRepositoryCoordinates
  branch: string
  filePath: string
  content: string
  commitMessage: string
}
