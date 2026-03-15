import { useState, useEffect, useCallback, useRef } from 'react'
import { getSession } from '../api.js'

export function usePolling(sessionId, intervalMs = 4000) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(!!sessionId)
  const [error, setError] = useState(null)
  const [consecutiveFailures, setConsecutiveFailures] = useState(0)
  const failureCount = useRef(0)

  const fetchSession = useCallback(async () => {
    if (!sessionId) return
    try {
      const data = await getSession(sessionId)
      setSession(data)
      setError(null)
      failureCount.current = 0
      setConsecutiveFailures(0)
    } catch (err) {
      failureCount.current += 1
      setConsecutiveFailures(failureCount.current)
      setError(err.message)
    }
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) {
      setSession(null)
      setLoading(false)
      setError(null)
      setConsecutiveFailures(0)
      failureCount.current = 0
      return
    }

    setLoading(true)
    fetchSession().finally(() => setLoading(false))

    const interval = setInterval(fetchSession, intervalMs)
    return () => clearInterval(interval)
  }, [sessionId, intervalMs, fetchSession])

  return { session, loading, error, consecutiveFailures, refresh: fetchSession }
}
