import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  GithubRepositoryAccessError,
  parseGithubRepositoryUrl,
  verifyRepositoryCollaborator,
  listRepositoryBranches,
  fetchRepositoryTree,
} from '../githubRepositoryAccessService'
import { createOctokitClient } from '../octokitService'

vi.mock('../octokitService', () => ({
  createOctokitClient: vi.fn(),
}))

describe('githubRepositoryAccessService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('parses owner and repository from URL', () => {
    expect(parseGithubRepositoryUrl('https://github.com/gridelle/app')).toEqual({
      owner: 'gridelle',
      repository: 'app',
    })
  })

  it('throws error for invalid host', () => {
    expect(() => parseGithubRepositoryUrl('https://example.com/owner/repo')).toThrow(
      GithubRepositoryAccessError,
    )
  })

  it('verifies collaborator access with octokit', async () => {
    const octokit = {
      rest: {
        users: {
          getAuthenticated: vi.fn().mockResolvedValue({ data: { login: 'octocat' } }),
        },
        repos: {
          checkCollaborator: vi.fn().mockResolvedValue({ status: 204 }),
        },
      },
    }

    vi.mocked(createOctokitClient).mockReturnValue(octokit as never)

    const result = await verifyRepositoryCollaborator('https://github.com/gridelle/app')

    expect(octokit.rest.users.getAuthenticated).toHaveBeenCalledTimes(1)
    expect(octokit.rest.repos.checkCollaborator).toHaveBeenCalledWith({
      owner: 'gridelle',
      repo: 'app',
      username: 'octocat',
    })
    expect(result).toEqual({
      repository: { owner: 'gridelle', repository: 'app' },
      username: 'octocat',
    })
  })

  it('throws custom error when collaborator check fails with 404', async () => {
    const octokit = {
      rest: {
        users: {
          getAuthenticated: vi.fn().mockResolvedValue({ data: { login: 'octocat' } }),
        },
        repos: {
          checkCollaborator: vi.fn().mockRejectedValue({ status: 404 }),
        },
      },
    }

    vi.mocked(createOctokitClient).mockReturnValue(octokit as never)

    await expect(verifyRepositoryCollaborator('https://github.com/gridelle/app')).rejects.toMatchObject({
      code: 'not-a-collaborator',
    })
  })

  it('lists repository branches', async () => {
    const octokit = {
      rest: {
        repos: {
          listBranches: vi.fn().mockResolvedValue({
            data: [
              { name: 'main', commit: { sha: 'sha-main' } },
              { name: 'develop', commit: { sha: 'sha-develop' } },
            ],
          }),
        },
      },
    }

    vi.mocked(createOctokitClient).mockReturnValue(octokit as never)

    const branches = await listRepositoryBranches({ owner: 'gridelle', repository: 'app' })

    expect(octokit.rest.repos.listBranches).toHaveBeenCalledWith({
      owner: 'gridelle',
      repo: 'app',
      per_page: 100,
    })
    expect(branches).toEqual([
      { name: 'main', commitSha: 'sha-main' },
      { name: 'develop', commitSha: 'sha-develop' },
    ])
  })

  it('fetches repository tree for a branch', async () => {
    const octokit = {
      rest: {
        repos: {
          getBranch: vi.fn().mockResolvedValue({
            data: { commit: { sha: 'sha-main' } },
          }),
        },
        git: {
          getTree: vi.fn().mockResolvedValue({
            data: {
              tree: [
                { path: 'docs/spec.yaml', type: 'blob', sha: 'sha-1' },
                { path: 'src', type: 'tree', sha: 'sha-2' },
              ],
            },
          }),
        },
      },
    }

    vi.mocked(createOctokitClient).mockReturnValue(octokit as never)

    const tree = await fetchRepositoryTree({ owner: 'gridelle', repository: 'app' }, 'main')

    expect(octokit.rest.repos.getBranch).toHaveBeenCalledWith({
      owner: 'gridelle',
      repo: 'app',
      branch: 'main',
    })
    expect(octokit.rest.git.getTree).toHaveBeenCalledWith({
      owner: 'gridelle',
      repo: 'app',
      tree_sha: 'sha-main',
      recursive: 'true',
    })
    expect(tree).toEqual([
      { path: 'docs/spec.yaml', type: 'blob', sha: 'sha-1' },
      { path: 'src', type: 'tree', sha: 'sha-2' },
    ])
  })
})
