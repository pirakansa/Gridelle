// File Header: Verifies redirects respect root and nested deployment base paths.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { redirectToLogin, redirectToTop } from '../navigation'

describe('navigation base paths', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it.each(['/', '/Gridelle/', '/tools/Gridelle/'])('keeps redirects under %s', (base) => {
    const replace = vi.fn()
    vi.stubEnv('BASE_URL', base)
    vi.stubGlobal('window', { location: { replace } })

    redirectToTop()
    redirectToLogin()

    expect(replace.mock.calls).toEqual([[`${base}top.html`], [`${base}login.html`]])
  })
})
