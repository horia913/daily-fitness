import { supabase } from '@/lib/supabase'
import { logApiRequest, logApiResponse, logAuthEvent } from '@/lib/debugHarness'

type FetchOptions = RequestInit & {
  maxRetries?: number
  onSessionExpired?: () => Promise<void> | void
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const defaultSessionExpired = async () => {
  try {
    await supabase.auth.signOut()
  } catch {
    // ignore sign out errors
  }
  if (typeof window !== 'undefined') {
    window.location.href = '/'
  }
}

export const fetchApi = async (
  input: RequestInfo | URL,
  init: FetchOptions = {}
) => {
  const { maxRetries = 2, onSessionExpired, ...requestInit } = init
  let authRetryUsed = false
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url

  const doFetch = async () => {
    let attempt = 0
    while (true) {
      try {
        return await fetch(input, {
          ...requestInit,
          credentials: 'include',
        })
      } catch (error) {
        if (attempt < maxRetries) {
          const delay = 200 * Math.pow(2, attempt)
          attempt += 1
          await sleep(delay)
          continue
        }
        throw error
      }
    }
  }

  while (true) {
    const start = Date.now()
    if (url.includes('/api/')) {
      logApiRequest(url, requestInit)
    }

    const response = await doFetch()

    if (url.includes('/api/')) {
      logApiResponse(url, response.status, Date.now() - start)
    }

    if (response.status === 401 || response.status === 403) {
      if (!authRetryUsed) {
        authRetryUsed = true
        logAuthEvent('refresh_attempt', { source: 'fetchApi', url })
        await Promise.race([
          supabase.auth.refreshSession(),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('refresh_timeout')), 3000)
          ),
        ]).catch(() => { /* proceed without refresh */ })
        continue
      }

      if (onSessionExpired) {
        await onSessionExpired()
      } else {
        await defaultSessionExpired()
      }
      throw new Error('Session expired')
    }

    return response.clone()
  }
}
