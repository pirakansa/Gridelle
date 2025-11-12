import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  GithubRepositoryAccessError,
  parseGithubRepositoryUrl,
  parseGithubBlobUrl,
  verifyRepositoryCollaborator,
  listRepositoryBranches,
  fetchRepositoryTree,
  fetchRepositoryFileContent,
  fetchFileFromBlobUrl,
  commitRepositoryFileUpdate,
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

  it('fetches repository file content', async () => {
    const base64 = Buffer.from('yaml: 42\n', 'utf-8').toString('base64')
    const octokit = {
      rest: {
        repos: {
          getContent: vi.fn().mockResolvedValue({
            data: {
              type: 'file',
              content: base64,
              encoding: 'base64',
            },
          }),
        },
      },
    }

    vi.mocked(createOctokitClient).mockReturnValue(octokit as never)

    const content = await fetchRepositoryFileContent({ owner: 'gridelle', repository: 'app' }, 'main', 'table.yaml')

    expect(octokit.rest.repos.getContent).toHaveBeenCalledWith({
      owner: 'gridelle',
      repo: 'app',
      path: 'table.yaml',
      ref: 'main',
    })
    expect(content).toBe('yaml: 42\n')
  })

  it('throws error when repository file is missing', async () => {
    const octokit = {
      rest: {
        repos: {
          getContent: vi.fn().mockRejectedValue({ status: 404 }),
        },
      },
    }

    vi.mocked(createOctokitClient).mockReturnValue(octokit as never)

    await expect(
      fetchRepositoryFileContent({ owner: 'gridelle', repository: 'app' }, 'main', 'table.yaml'),
    ).rejects.toMatchObject({ code: 'file-fetch-failed' })
  })

  it('parses blob url into coordinates', async () => {
    const octokit = {
      rest: {
        repos: {
          listBranches: vi.fn().mockResolvedValue({
            data: [
              { name: 'main', commit: { sha: 'sha-main' } },
              { name: 'feature/macro', commit: { sha: 'sha-feature' } },
            ],
          }),
        },
      },
    }

    vi.mocked(createOctokitClient).mockReturnValue(octokit as never)

    await expect(
      parseGithubBlobUrl('https://github.com/gridelle/app/blob/main/config/table.yaml'),
    ).resolves.toEqual({
      owner: 'gridelle',
      repository: 'app',
      ref: 'main',
      filePath: 'config/table.yaml',
    })

    expect(octokit.rest.repos.listBranches).toHaveBeenCalledWith({
      owner: 'gridelle',
      repo: 'app',
      per_page: 100,
    })
  })

  it('parses blob url when branch name contains a slash', async () => {
    const octokit = {
      rest: {
        repos: {
          listBranches: vi.fn().mockResolvedValue({
            data: [
              { name: 'feature/macro', commit: { sha: 'sha-feature' } },
              { name: 'main', commit: { sha: 'sha-main' } },
            ],
          }),
        },
      },
    }

    vi.mocked(createOctokitClient).mockReturnValue(octokit as never)

    await expect(
      parseGithubBlobUrl('https://github.com/gridelle/app/blob/feature/macro/table.yaml'),
    ).resolves.toEqual({
      owner: 'gridelle',
      repository: 'app',
      ref: 'feature/macro',
      filePath: 'table.yaml',
    })
  })

  it('fetches file content from blob url', async () => {
    const base64 = Buffer.from('yaml: 24\n', 'utf-8').toString('base64')
    const octokit = {
      rest: {
        repos: {
          listBranches: vi.fn().mockResolvedValue({
            data: [{ name: 'main', commit: { sha: 'sha-main' } }],
          }),
          getContent: vi.fn().mockResolvedValue({
            data: {
              type: 'file',
              content: base64,
              encoding: 'base64',
            },
          }),
        },
      },
    }

    vi.mocked(createOctokitClient).mockReturnValue(octokit as never)

    const result = await fetchFileFromBlobUrl('https://github.com/gridelle/app/blob/main/config/table.yaml')

    expect(result).toEqual({
      content: 'yaml: 24\n',
      coordinates: {
        owner: 'gridelle',
        repository: 'app',
        ref: 'main',
        filePath: 'config/table.yaml',
      },
    })
  })

  it('fetches file content from blob url with branch containing a slash', async () => {
    const base64 = Buffer.from('yaml: 48\n', 'utf-8').toString('base64')
    const octokit = {
      rest: {
        repos: {
          listBranches: vi.fn().mockResolvedValue({
            data: [
              { name: 'feature/macro', commit: { sha: 'sha-feature' } },
              { name: 'main', commit: { sha: 'sha-main' } },
            ],
          }),
          getContent: vi.fn().mockResolvedValue({
            data: {
              type: 'file',
              content: base64,
              encoding: 'base64',
            },
          }),
        },
      },
    }

    vi.mocked(createOctokitClient).mockReturnValue(octokit as never)

    const result = await fetchFileFromBlobUrl('https://github.com/gridelle/app/blob/feature/macro/docs/table.yaml')

    expect(result).toEqual({
      content: 'yaml: 48\n',
      coordinates: {
        owner: 'gridelle',
        repository: 'app',
        ref: 'feature/macro',
        filePath: 'docs/table.yaml',
      },
    })
  })

  it('commits repository file updates with base64 content', async () => {
    const octokit = {
      rest: {
        repos: {
          getContent: vi.fn().mockResolvedValue({
            data: {
              type: 'file',
              sha: 'sha-old',
            },
          }),
          createOrUpdateFileContents: vi.fn().mockResolvedValue({ status: 201 }),
        },
      },
    }

    vi.mocked(createOctokitClient).mockReturnValue(octokit as never)

    await expect(
      commitRepositoryFileUpdate({
        repository: { owner: 'gridelle', repository: 'app' },
        branch: 'main',
        filePath: 'table.yaml',
        content: 'key: value\n',
        commitMessage: 'Update',
      }),
    ).resolves.toBeUndefined()

    expect(octokit.rest.repos.getContent).toHaveBeenCalledWith({
      owner: 'gridelle',
      repo: 'app',
      path: 'table.yaml',
      ref: 'main',
    })
    expect(octokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
      owner: 'gridelle',
      repo: 'app',
      path: 'table.yaml',
      branch: 'main',
      message: 'Update',
      content: Buffer.from('key: value\n', 'utf-8').toString('base64'),
      sha: 'sha-old',
    })
  })

  it('throws when file update fails with unauthorized error', async () => {
    const octokit = {
      rest: {
        repos: {
          getContent: vi.fn().mockResolvedValue({
            data: {
              type: 'file',
              sha: 'sha-old',
            },
          }),
          createOrUpdateFileContents: vi.fn().mockRejectedValue({ status: 401 }),
        },
      },
    }

    vi.mocked(createOctokitClient).mockReturnValue(octokit as never)

    await expect(
      commitRepositoryFileUpdate({
        repository: { owner: 'gridelle', repository: 'app' },
        branch: 'main',
        filePath: 'table.yaml',
        content: 'key: value\n',
        commitMessage: 'Update',
      }),
    ).rejects.toMatchObject({ code: 'unauthorized' })
  })
})
