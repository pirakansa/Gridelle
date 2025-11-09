import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import GithubIntegrationPanel from '../GithubIntegrationPanel'

describe('GithubIntegrationPanel', () => {
  it('renders repository url input with description', () => {
    render(<GithubIntegrationPanel />)

    expect(screen.getByTestId('github-integration-panel')).toBeInTheDocument()
    expect(screen.getByLabelText('対象リポジトリURL')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('https://github.com/owner/repository')).toBeInTheDocument()
  })

  it('submits trimmed repository url when provided', () => {
    const handleSubmit = vi.fn()
    render(<GithubIntegrationPanel onRepositoryUrlSubmit={handleSubmit} />)

    const input = screen.getByTestId('repository-url-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: '  https://github.com/example/repo  ' } })

    const form = screen.getByTestId('repository-url-form')
    fireEvent.submit(form)

    expect(handleSubmit).toHaveBeenCalledWith('https://github.com/example/repo')
  })
})
