// File Header: Tests lifecycle invalidation for latest-request tracking.
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useLatestRequest } from '../useLatestRequest'

describe('useLatestRequest', () => {
  it('invalidates an active request when its owner unmounts', () => {
    const { result, unmount } = renderHook(() => useLatestRequest())
    let requestId = 0

    act(() => {
      requestId = result.current.start()
    })
    const isLatest = result.current.isLatest
    expect(isLatest(requestId)).toBe(true)

    unmount()

    expect(isLatest(requestId)).toBe(false)
  })
})
