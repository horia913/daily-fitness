import { debugLog, isDebugHarnessEnabled, recordRequestCount } from '@/lib/debugHarness'

type QueryKind = 'rest' | 'auth' | 'api' | 'other'

type QueryLogEntry = {
  id: string
  kind: QueryKind
  method: string
  url: string
  status: number | 'error'
  durationMs: number
  screen: string
  callsite?: string
  at: number
}

type QueryStats = {
  total: number
  byKind: Record<QueryKind, number>
  lastAt: number
  lastIdleLogAt: number
}

const ONE_SECOND = 1000
const THIRTY_SECONDS = 30 * ONE_SECOND

const getGlobalStats = (): Record<string, QueryStats> => {
  const g = globalThis as typeof globalThis & { __supabaseQueryStats?: Record<string, QueryStats> }
  if (!g.__supabaseQueryStats) {
    g.__supabaseQueryStats = {}
  }
  return g.__supabaseQueryStats
}

const getScreenKey = () => {
  if (typeof window === 'undefined') return 'server'
  return window.location?.pathname || 'unknown'
}

const isSupabaseUrl = (url: string, supabaseUrl?: string) => {
  if (!supabaseUrl) return false
  return url.startsWith(supabaseUrl)
}

const getKind = (url: string): QueryKind => {
  if (url.includes('/rest/v1')) return 'rest'
  if (url.includes('/auth/v1')) return 'auth'
  if (url.includes('/api/')) return 'api'
  return 'other'
}

const getCallsite = () => {
  const stack = new Error().stack
  if (!stack) return undefined
  const lines = stack.split('\n').map((line) => line.trim())
  const candidate = lines.find(
    (line) =>
      !line.includes('supabaseQueryLogger') &&
      !line.includes('node:internal') &&
      !line.includes('internal/') &&
      line.startsWith('at ')
  )
  return candidate
}

const logIdleIfNeeded = (screenKey: string, stats: QueryStats) => {
  const now = Date.now()
  if (stats.lastAt && now - stats.lastAt > THIRTY_SECONDS) {
    if (now - stats.lastIdleLogAt > THIRTY_SECONDS) {
      stats.lastIdleLogAt = now
      if (isDebugHarnessEnabled()) {
        debugLog('SupabaseQueryIdle', {
          screen: screenKey,
          idleMs: now - stats.lastAt,
        })
      }
    }
  }
}

// Dev-only: track last URL per screen to detect repeated requests
const lastUrlByScreen: Record<string, { url: string; at: number }> = {}
const REPEAT_WINDOW_MS = 2000

const recordQuery = (entry: QueryLogEntry) => {
  const statsByScreen = getGlobalStats()
  const stats = statsByScreen[entry.screen] ?? {
    total: 0,
    byKind: { rest: 0, auth: 0, api: 0, other: 0 },
    lastAt: 0,
    lastIdleLogAt: 0,
  }

  logIdleIfNeeded(entry.screen, stats)

  stats.total += 1
  stats.byKind[entry.kind] += 1
  stats.lastAt = entry.at
  statsByScreen[entry.screen] = stats

  // Dev-only: print URL, duration, and whether same request repeated
  if (process.env.NODE_ENV !== 'production' && (entry.kind === 'rest' || entry.kind === 'api')) {
    const prev = lastUrlByScreen[entry.screen]
    const sameUrl = prev && prev.url === entry.url && entry.at - prev.at < REPEAT_WINDOW_MS
    lastUrlByScreen[entry.screen] = { url: entry.url, at: entry.at }
    const shortUrl = entry.url.length > 80 ? entry.url.slice(0, 77) + '...' : entry.url
    console.log(`[TrackedFetch] ${entry.screen} ${entry.durationMs}ms ${sameUrl ? '(REPEAT) ' : ''}${entry.method} ${shortUrl}`)
  }

  if (isDebugHarnessEnabled()) {
    recordRequestCount(entry.kind, entry.screen)
    debugLog('SupabaseQuery', {
      id: entry.id,
      kind: entry.kind,
      method: entry.method,
      status: entry.status,
      durationMs: entry.durationMs,
      screen: entry.screen,
      callsite: entry.callsite,
      counts: stats,
      url: entry.url,
    })
  }
}

export const getTrackedFetch = () => {
  const baseFetch = globalThis.fetch.bind(globalThis)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url

    const isSupabase = isSupabaseUrl(url, supabaseUrl)
    const kind = getKind(url)
    const shouldLog = isSupabase || kind === 'api'
    const screen = getScreenKey()
    const method =
      init?.method ||
      (typeof input !== 'string' && !(input instanceof URL) ? input.method : 'GET')
    const start = Date.now()

    try {
      const response = await baseFetch(input, init)
      if (shouldLog) {
        recordQuery({
          id: `${start}-${Math.random().toString(36).slice(2)}`,
          kind,
          method,
          url,
          status: response.status,
          durationMs: Date.now() - start,
          screen,
          callsite: getCallsite(),
          at: Date.now(),
        })
      }
      return response
    } catch (error) {
      if (shouldLog) {
        recordQuery({
          id: `${start}-${Math.random().toString(36).slice(2)}`,
          kind,
          method,
          url,
          status: 'error',
          durationMs: Date.now() - start,
          screen,
          callsite: getCallsite(),
          at: Date.now(),
        })
      }
      throw error
    }
  }
}

export const getQueryStats = () => getGlobalStats()
