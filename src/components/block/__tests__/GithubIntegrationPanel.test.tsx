import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import GithubIntegrationPanel from '../GithubIntegrationPanel'
import {
  verifyRepositoryCollaborator,
  GithubRepositoryAccessError,
} from '../../../services/githubRepositoryAccessService'

vi.mock('../../../services/githubRepositoryAccessService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../services/githubRepositoryAccessService')>()
  return {
    ...actual,
    verifyRepositoryCollaborator: vi.fn(),
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
    const verifyMock = vi.mocked(verifyRepositoryCollaborator)

    verifyMock.mockResolvedValue({
      repository: { owner: 'example', repository: 'repo' },
      username: 'octocat',
    })

    render(
      <GithubIntegrationPanel
        onRepositoryUrlSubmit={handleSubmit}
        onRepositoryAccessConfirmed={handleConfirmed}
      />,
    )

    fireEvent.change(screen.getByTestId('repository-url-input'), {
      target: { value: 'https://github.com/example/repo' },
    })

    fireEvent.submit(screen.getByTestId('repository-url-form'))

    expect(verifyMock).toHaveBeenCalledWith('https://github.com/example/repo')

    await screen.findByTestId('repository-url-success')

    expect(handleSubmit).toHaveBeenCalledWith('https://github.com/example/repo')
    expect(handleConfirmed).toHaveBeenCalledWith({
      repository: { owner: 'example', repository: 'repo' },
      username: 'octocat',
    })
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
})
