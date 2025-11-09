import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import GithubIntegrationPanel from '../GithubIntegrationPanel'
import {
  verifyRepositoryCollaborator,
  GithubRepositoryAccessError,
  listRepositoryBranches,
  fetchRepositoryTree,
} from '../../../services/githubRepositoryAccessService'

vi.mock('../../../services/githubRepositoryAccessService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../services/githubRepositoryAccessService')>()
  return {
    ...actual,
    verifyRepositoryCollaborator: vi.fn(),
    listRepositoryBranches: vi.fn(),
    fetchRepositoryTree: vi.fn(),
  }
})

describe('GithubIntegrationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders repository url input with description', () => {
    render(<GithubIntegrationPanel />)

    expect(screen.getByTestId('github-integration-panel')).toBeInTheDocument()
    expect(screen.getByLabelText('対象リポジトリURL')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('https://github.com/owner/repository')).toBeInTheDocument()
  })

  it('verifies repository access and reports success', async () => {
    const handleSubmit = vi.fn()
    const handleConfirmed = vi.fn()
    const handleBranchSelected = vi.fn()
    const handleFileSelected = vi.fn()
    const verifyMock = vi.mocked(verifyRepositoryCollaborator)
    const listBranchesMock = vi.mocked(listRepositoryBranches)
    const fetchTreeMock = vi.mocked(fetchRepositoryTree)

    verifyMock.mockResolvedValue({
      repository: { owner: 'example', repository: 'repo' },
      username: 'octocat',
    })
    listBranchesMock.mockResolvedValue([
      { name: 'main', commitSha: 'sha-main' },
      { name: 'develop', commitSha: 'sha-develop' },
    ])
    fetchTreeMock.mockResolvedValue([
      { path: 'docs/spec.yaml', sha: 'sha-1', type: 'blob' },
      { path: 'src/app.yaml', sha: 'sha-2', type: 'blob' },
      { path: 'src', sha: 'sha-dir', type: 'tree' },
    ])

    render(
      <GithubIntegrationPanel
        onRepositoryUrlSubmit={handleSubmit}
        onRepositoryAccessConfirmed={handleConfirmed}
        onBranchSelected={handleBranchSelected}
        onFileSelected={handleFileSelected}
      />,
    )

    fireEvent.change(screen.getByTestId('repository-url-input'), {
      target: { value: 'https://github.com/example/repo' },
    })

    fireEvent.submit(screen.getByTestId('repository-url-form'))

    expect(verifyMock).toHaveBeenCalledWith('https://github.com/example/repo')

    await screen.findByTestId('repository-url-success')
    expect(listBranchesMock).toHaveBeenCalledWith({ owner: 'example', repository: 'repo' })

    const branchSelect = await screen.findByTestId('repository-branch-select')
    expect(branchSelect).toHaveValue('main')
    expect(handleBranchSelected).toHaveBeenCalledWith('main')

    await screen.findByTestId('repository-file-tree')
    expect(fetchTreeMock).toHaveBeenCalledWith({ owner: 'example', repository: 'repo' }, 'main')
    const fileButtons = screen.getAllByTestId('repository-tree-item')
    expect(fileButtons).toHaveLength(2)

    expect(handleSubmit).toHaveBeenCalledWith('https://github.com/example/repo')
    expect(handleConfirmed).toHaveBeenCalledWith({
      repository: { owner: 'example', repository: 'repo' },
      username: 'octocat',
    })
    fireEvent.click(fileButtons[0])
    expect(handleFileSelected).toHaveBeenCalledWith('docs/spec.yaml')
  })

  it('shows error message when verification fails', async () => {
    const verifyMock = vi.mocked(verifyRepositoryCollaborator)

    verifyMock.mockRejectedValue(
      new GithubRepositoryAccessError('権限エラーが発生しました。', 'not-a-collaborator'),
    )

    render(<GithubIntegrationPanel />)

    fireEvent.change(screen.getByTestId('repository-url-input'), {
      target: { value: 'https://github.com/example/repo' },
    })

    fireEvent.submit(screen.getByTestId('repository-url-form'))

    await screen.findByTestId('repository-url-error')
    expect(screen.getByTestId('repository-url-error')).toHaveTextContent('権限エラーが発生しました。')
  })

  it('shows branch error when retrieval fails', async () => {
    const verifyMock = vi.mocked(verifyRepositoryCollaborator)
    const listBranchesMock = vi.mocked(listRepositoryBranches)

    verifyMock.mockResolvedValue({
      repository: { owner: 'example', repository: 'repo' },
      username: 'octocat',
    })

    listBranchesMock.mockRejectedValue(
      new GithubRepositoryAccessError('ブランチの取得に失敗しました。', 'branch-fetch-failed'),
    )

    render(<GithubIntegrationPanel />)

    fireEvent.change(screen.getByTestId('repository-url-input'), {
      target: { value: 'https://github.com/example/repo' },
    })

    fireEvent.submit(screen.getByTestId('repository-url-form'))

    await screen.findByTestId('repository-branch-error')
    expect(screen.getByTestId('repository-branch-error')).toHaveTextContent('ブランチの取得に失敗しました。')
  })
})
