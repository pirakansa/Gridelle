// File Header: Provides lifecycle-safe request identity tracking for async UI workflows.
import React from 'react'

type LatestRequestController = {
  start: () => number
  isLatest: (_requestId: number) => boolean
  invalidate: () => void
}

// Function Header: Tracks the latest async request and invalidates requests when the owner unmounts.
export function useLatestRequest(): LatestRequestController {
  const activeRequestIdRef = React.useRef(0)
  const mountedRef = React.useRef(true)

  React.useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      activeRequestIdRef.current += 1
    }
  }, [])

  const start = React.useCallback((): number => {
    activeRequestIdRef.current += 1
    return activeRequestIdRef.current
  }, [])

  const isLatest = React.useCallback(
    (requestId: number): boolean => mountedRef.current && activeRequestIdRef.current === requestId,
    [],
  )

  const invalidate = React.useCallback((): void => {
    activeRequestIdRef.current += 1
  }, [])

  return React.useMemo(() => ({ start, isLatest, invalidate }), [invalidate, isLatest, start])
}
