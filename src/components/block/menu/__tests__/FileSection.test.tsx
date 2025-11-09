import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import FileSection from '../FileSection'

describe('FileSection', () => {
  it('renders YAML button and hides GitHub controls when not logged in', () => {
    render(<FileSection onYamlInputClick={vi.fn()} loginMode={null} />)

    expect(screen.getByTestId('open-yaml-panel')).toBeInTheDocument()
    expect(screen.queryByTestId('github-file-actions')).not.toBeInTheDocument()
  })

  it('shows GitHub button and invokes handler for GitHub login', () => {
    const onGithubActionsClick = vi.fn()
    render(
      <FileSection
        onYamlInputClick={vi.fn()}
        loginMode="github"
        onGithubActionsClick={onGithubActionsClick}
      />,
    )

    const githubButton = screen.getByTestId('github-file-actions')
    expect(githubButton).toBeInTheDocument()
    expect(githubButton).not.toBeDisabled()

    fireEvent.click(githubButton)
    expect(onGithubActionsClick).toHaveBeenCalledTimes(1)
  })
})
