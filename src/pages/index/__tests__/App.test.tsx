// File Header: Verifies the landing page links to login within the deployment path.
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { LocaleProvider } from '../../../utils/i18n'

describe('landing page base paths', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllEnvs()
  })

  it.each(['/', '/Gridelle/', '/tools/Gridelle/'])('links to login under %s', (base) => {
    vi.stubEnv('BASE_URL', base)
    render(<LocaleProvider><App /></LocaleProvider>)

    expect(screen.getByRole('link')).toHaveAttribute('href', `${base}login.html`)
  })
})
