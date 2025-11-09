import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  GithubRepositoryAccessError,
  parseGithubRepositoryUrl,
  verifyRepositoryCollaborator,
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
})
