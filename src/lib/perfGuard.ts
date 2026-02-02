/**
 * Performance Regression Guards
 * 
 * Development-only warnings to prevent performance regressions.
 * These help ensure we don't accidentally add back N+1 queries
 * or exceed our query budgets.
 */

// ============================================================================
// Query Budgets per Endpoint
// ============================================================================

const QUERY_BUDGETS: Record<string, number> = {
  // Critical endpoints - must be minimal queries
  '/api/client/workouts/summary': 2,      // Target: 1 RPC call
  '/api/client/workouts/summary-v2': 2,   // Optimized version
  '/api/coach/pickup/next-workout': 2,    // Target: 1 RPC call
  '/api/coach/pickup/next-workout-v2': 2, // Optimized version
  
  // Per-action endpoints - slightly higher budget
  '/api/log-set': 5,
  '/api/complete-workout': 5,
  '/api/program-workouts/start-from-progress': 6,
  
  // Default for unspecified endpoints
  'default': 3
}

// ============================================================================
// Time Budgets per Endpoint (milliseconds)
// ============================================================================

const TIME_BUDGETS: Record<string, number> = {
  // Critical endpoints - must be fast
  '/api/client/workouts/summary': 800,
  '/api/client/workouts/summary-v2': 500,
  '/api/coach/pickup/next-workout': 800,
  '/api/coach/pickup/next-workout-v2': 500,
  
  // Per-action endpoints - can be slower
  '/api/log-set': 500,
  '/api/complete-workout': 1000,
  
  // Default
  'default': 800
}

// ============================================================================
// Guard Functions
// ============================================================================

const GUARDS_ENABLED = process.env.NODE_ENV === 'development' || process.env.PERF_DEBUG === 'true'

/**
 * Warn if query count exceeds budget
 */
export function warnIfExceedsQueryBudget(
  endpoint: string,
  queryCount: number
): void {
  if (!GUARDS_ENABLED) return
  
  const budget = QUERY_BUDGETS[endpoint] || QUERY_BUDGETS['default']
  
  if (queryCount > budget) {
    console.warn(
      `⚠️ PERF REGRESSION: ${endpoint} made ${queryCount} DB calls (budget: ${budget})\n` +
      `   Consider using a single RPC or batched query.`
    )
  }
}

/**
 * Warn if response time exceeds budget
 */
export function warnIfExceedsTimeBudget(
  endpoint: string,
  timeMs: number
): void {
  if (!GUARDS_ENABLED) return
  
  const budget = TIME_BUDGETS[endpoint] || TIME_BUDGETS['default']
  
  if (timeMs > budget) {
    console.warn(
      `⚠️ PERF REGRESSION: ${endpoint} took ${timeMs.toFixed(0)}ms (budget: ${budget}ms)\n` +
      `   Consider optimizing queries or adding caching.`
    )
  }
}

/**
 * Combined guard - checks both query count and time
 */
export function performanceGuard(
  endpoint: string,
  queryCount: number,
  timeMs: number
): { withinBudget: boolean; warnings: string[] } {
  const warnings: string[] = []
  
  const queryBudget = QUERY_BUDGETS[endpoint] || QUERY_BUDGETS['default']
  const timeBudget = TIME_BUDGETS[endpoint] || TIME_BUDGETS['default']
  
  if (queryCount > queryBudget) {
    warnings.push(`Query count ${queryCount} exceeds budget ${queryBudget}`)
  }
  
  if (timeMs > timeBudget) {
    warnings.push(`Response time ${timeMs.toFixed(0)}ms exceeds budget ${timeBudget}ms`)
  }
  
  if (GUARDS_ENABLED && warnings.length > 0) {
    console.warn(
      `⚠️ PERF REGRESSION: ${endpoint}\n` +
      warnings.map(w => `   - ${w}`).join('\n')
    )
  }
  
  return {
    withinBudget: warnings.length === 0,
    warnings
  }
}

/**
 * Log performance metrics in a structured format
 * Useful for monitoring in production
 */
export function logPerformanceMetrics(
  endpoint: string,
  metrics: {
    queryCount: number
    totalTimeMs: number
    rpcTimeMs?: number
    cacheHit?: boolean
  }
): void {
  const queryBudget = QUERY_BUDGETS[endpoint] || QUERY_BUDGETS['default']
  const timeBudget = TIME_BUDGETS[endpoint] || TIME_BUDGETS['default']
  
  const log = {
    endpoint,
    queryCount: metrics.queryCount,
    queryBudget,
    queryOverBudget: metrics.queryCount > queryBudget,
    totalTimeMs: Math.round(metrics.totalTimeMs),
    timeBudget,
    timeOverBudget: metrics.totalTimeMs > timeBudget,
    rpcTimeMs: metrics.rpcTimeMs ? Math.round(metrics.rpcTimeMs) : undefined,
    cacheHit: metrics.cacheHit,
    timestamp: new Date().toISOString()
  }
  
  if (GUARDS_ENABLED) {
    console.log('[PERF METRICS]', JSON.stringify(log))
  }
}

// ============================================================================
// Middleware Helper
// ============================================================================

/**
 * Creates a performance tracking wrapper for API routes
 * 
 * Usage:
 * ```typescript
 * export const GET = withPerfTracking('/api/my-route', async (request) => {
 *   // ... your handler logic
 *   return NextResponse.json(data)
 * })
 * ```
 */
export function withPerfTracking<T extends (...args: any[]) => Promise<Response>>(
  endpoint: string,
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    const start = performance.now()
    const response = await handler(...args)
    const timeMs = performance.now() - start
    
    // Check time budget
    warnIfExceedsTimeBudget(endpoint, timeMs)
    
    return response
  }) as T
}
