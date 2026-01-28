import { supabase } from '@/lib/supabase'
import { debugLog, logApiRequest, logApiResponse, logAuthEvent } from '@/lib/debugHarness'

type FetchOptions = RequestInit & {
  maxRetries?: number
  onSessionExpired?: () => Promise<void> | void
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
type SummaryResult = {
  status: number
  headers: Record<string, string>
  json: unknown
}

const inflightSummaryRequests = new Map<string, Promise<SummaryResult>>()

const hashBody = (body?: BodyInit | null) => {
  if (!body) return 'none'
  if (typeof body === 'string') return body
  if (body instanceof URLSearchParams) return body.toString()
  if (body instanceof FormData) return '[formdata]'
  if (body instanceof Blob) return `[blob:${body.type || 'unknown'}]`
  return '[body]'
}

const serializeHeaders = (headers: Headers) => {
  const result: Record<string, string> = {}
  headers.forEach((value, key) => {
    result[key] = value
  })
  return result
}

const summaryToResponse = (summary: SummaryResult) => {
  return new Response(JSON.stringify(summary.json), {
    status: summary.status,
    headers: {
      'content-type': 'application/json',
      ...summary.headers,
    },
  })
}

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
  const method = requestInit?.method || 'GET'
  const bodyHash = hashBody(requestInit?.body ?? null)
  const dedupeKey = `${method}:${url}:${bodyHash}`
  const shouldDedupe =
    method.toUpperCase() === 'GET' && url.includes('/api/client/workouts/summary')

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

  if (shouldDedupe) {
    const existing = inflightSummaryRequests.get(dedupeKey)
    if (existing) {
      debugLog('ApiDeduped', { key: dedupeKey, url, method })
      const summary = await existing
      return summaryToResponse(summary)
    }

    const summaryPromise = (async () => {
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
            await supabase.auth.refreshSession()
            continue
          }

          if (onSessionExpired) {
            await onSessionExpired()
          } else {
            await defaultSessionExpired()
          }
          throw new Error('Session expired')
        }

        const json = await response.json()
        return {
          status: response.status,
          headers: serializeHeaders(response.headers),
          json,
        }
      }
    })()

    inflightSummaryRequests.set(dedupeKey, summaryPromise)
    debugLog('ApiFetched', { key: dedupeKey, url, method })
    summaryPromise.finally(() => {
      inflightSummaryRequests.delete(dedupeKey)
    })
    const summary = await summaryPromise
    return summaryToResponse(summary)
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
        await supabase.auth.refreshSession()
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
