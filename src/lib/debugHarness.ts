type RequestStats = {
  total: number
  byKind: Record<string, number>
  lastAt: number
}

const REDACTED = '[redacted]'

const getEnvFlag = () =>
  process.env.NEXT_PUBLIC_DEBUG_HARNESS === 'true' ||
  process.env.DEBUG_HARNESS === 'true'

const getRouteKey = () => {
  if (typeof window === 'undefined') return 'server'
  return window.location?.pathname || 'unknown'
}

const getGlobalStats = (): Record<string, RequestStats> => {
  const g = globalThis as typeof globalThis & {
    __debugRequestStats?: Record<string, RequestStats>
  }
  if (!g.__debugRequestStats) {
    g.__debugRequestStats = {}
  }
  return g.__debugRequestStats
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const shouldRedactKey = (key: string) => {
  const lowered = key.toLowerCase()
  return (
    lowered.includes('token') ||
    lowered === 'authorization' ||
    lowered === 'cookie' ||
    lowered === 'apikey' ||
    lowered === 'api_key' ||
    lowered === 'x-api-key'
  )
}

const redactValue = (value: unknown) => {
  if (typeof value === 'string' && value.length === 0) return value
  return REDACTED
}

const redactObject = (
  input: unknown,
  depth = 0,
  seen = new WeakSet<object>()
): unknown => {
  if (depth > 6) return '[redacted-depth]'
  if (!input || typeof input !== 'object') return input
  if (seen.has(input as object)) return '[redacted-circular]'
  seen.add(input as object)

  if (Array.isArray(input)) {
    return input.map((item) => redactObject(item, depth + 1, seen))
  }

  if (isPlainObject(input)) {
    const output: Record<string, unknown> = {}
    Object.entries(input).forEach(([key, value]) => {
      output[key] = shouldRedactKey(key) ? redactValue(value) : redactObject(value, depth + 1, seen)
    })
    return output
  }

  return '[redacted-unsupported]'
}

export const isDebugHarnessEnabled = () => getEnvFlag()

export const debugLog = (label: string, payload?: unknown) => {
  if (!isDebugHarnessEnabled()) return
  // eslint-disable-next-line no-console
  console.log(`[DebugHarness] ${label}`, payload ?? {})
}

export const recordRequestCount = (kind: string, route?: string) => {
  if (!isDebugHarnessEnabled()) return
  const statsByRoute = getGlobalStats()
  const routeKey = route ?? getRouteKey()
  const stats = statsByRoute[routeKey] ?? {
    total: 0,
    byKind: {},
    lastAt: 0,
  }

  stats.total += 1
  stats.byKind[kind] = (stats.byKind[kind] ?? 0) + 1
  stats.lastAt = Date.now()
  statsByRoute[routeKey] = stats

  debugLog('RequestCount', { route: routeKey, kind, counts: stats })
}

export const sanitizeHeaders = (headers?: HeadersInit) => {
  if (!headers) return undefined
  const normalized: Record<string, string> = {}

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      normalized[key] = shouldRedactKey(key) ? REDACTED : value
    })
    return normalized
  }

  if (Array.isArray(headers)) {
    headers.forEach(([key, value]) => {
      normalized[key] = shouldRedactKey(key) ? REDACTED : value
    })
    return normalized
  }

  Object.entries(headers).forEach(([key, value]) => {
    normalized[key] = shouldRedactKey(key) ? REDACTED : String(value)
  })
  return normalized
}

export const sanitizeBody = (body?: BodyInit | null) => {
  if (!body) return undefined
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body)
      return redactObject(parsed)
    } catch {
      return body.slice(0, 500)
    }
  }

  if (body instanceof FormData) {
    return '[FormData]'
  }

  if (body instanceof URLSearchParams) {
    return redactObject(Object.fromEntries(body.entries()))
  }

  if (body instanceof Blob) {
    return `[Blob:${body.type || 'unknown'}]`
  }

  return '[Body]'
}

export const logApiRequest = (url: string, init?: RequestInit) => {
  if (!isDebugHarnessEnabled()) return
  debugLog('ApiRequest', {
    route: getRouteKey(),
    url,
    method: init?.method || 'GET',
    headers: sanitizeHeaders(init?.headers),
    body: sanitizeBody(init?.body ?? null),
  })
  recordRequestCount('api')
}

export const logApiResponse = (url: string, status: number, durationMs: number) => {
  if (!isDebugHarnessEnabled()) return
  debugLog('ApiResponse', {
    route: getRouteKey(),
    url,
    status,
    durationMs,
  })
}

export const logAuthEvent = (event: string, details?: Record<string, unknown>) => {
  if (!isDebugHarnessEnabled()) return
  const redacted = redactObject(details ?? {})
  debugLog('AuthEvent', {
    event,
    ...(isPlainObject(redacted) ? redacted : {}),
  })
}
