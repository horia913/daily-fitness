/**
 * Performance Utilities for Server-Timing Header Support
 * 
 * Usage:
 * ```typescript
 * const perf = new PerfCollector('endpoint-name')
 * const data = await perf.time('query-name', () => supabase.from('table').select())
 * // ... more queries
 * return NextResponse.json(data, {
 *   headers: perf.getHeaders()
 * })
 * ```
 * 
 * View timings in browser DevTools > Network tab > select request > Timing tab
 */

interface TimingEntry {
  name: string
  dur: number
  desc?: string
}

const PERF_ENABLED = process.env.NODE_ENV === 'development' || process.env.PERF_DEBUG === 'true'

/**
 * Collects timing data for Server-Timing header
 * Works on both local and Vercel deployments
 */
export class PerfCollector {
  private timings: TimingEntry[] = []
  private startTime: number
  private endpoint: string
  private queryCount = 0

  constructor(endpoint: string) {
    this.endpoint = endpoint
    this.startTime = performance.now()
  }

  /**
   * Time an async operation and record it
   */
  async time<T>(name: string, fn: () => Promise<T>, desc?: string): Promise<T> {
    const start = performance.now()
    const result = await fn()
    const dur = performance.now() - start
    
    this.timings.push({ name, dur, desc })
    this.queryCount++
    
    if (PERF_ENABLED) {
      console.log(`[PERF] ${this.endpoint} | ${name}: ${dur.toFixed(1)}ms`)
    }
    
    return result
  }

  /**
   * Time a sync operation and record it
   */
  timeSync<T>(name: string, fn: () => T, desc?: string): T {
    const start = performance.now()
    const result = fn()
    const dur = performance.now() - start
    
    this.timings.push({ name, dur, desc })
    
    if (PERF_ENABLED) {
      console.log(`[PERF] ${this.endpoint} | ${name}: ${dur.toFixed(1)}ms`)
    }
    
    return result
  }

  /**
   * Mark a checkpoint without timing an operation
   */
  mark(name: string, desc?: string): void {
    const dur = performance.now() - this.startTime
    this.timings.push({ name, dur, desc })
    
    if (PERF_ENABLED) {
      console.log(`[PERF] ${this.endpoint} | ${name}: ${dur.toFixed(1)}ms (checkpoint)`)
    }
  }

  /**
   * Get total elapsed time since collector was created
   */
  getTotalTime(): number {
    return performance.now() - this.startTime
  }

  /**
   * Get the number of timed operations
   */
  getQueryCount(): number {
    return this.queryCount
  }

  /**
   * Generate Server-Timing header value
   * Format: "name;dur=123.4;desc=description, name2;dur=56.7"
   */
  getServerTimingHeader(): string {
    // Add total time as first entry
    const total: TimingEntry = {
      name: 'total',
      dur: this.getTotalTime(),
      desc: `${this.queryCount} queries`
    }
    
    const allTimings = [total, ...this.timings]
    
    return allTimings.map(t => {
      let entry = `${t.name};dur=${t.dur.toFixed(1)}`
      if (t.desc) {
        // Escape quotes in description
        entry += `;desc="${t.desc.replace(/"/g, '\\"')}"`
      }
      return entry
    }).join(', ')
  }

  /**
   * Get headers object to spread into Response
   */
  getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Server-Timing': this.getServerTimingHeader()
    }
    
    // Add custom headers for easier debugging
    if (PERF_ENABLED) {
      headers['X-Query-Count'] = String(this.queryCount)
      headers['X-Total-Time'] = `${this.getTotalTime().toFixed(1)}ms`
    }
    
    return headers
  }

  /**
   * Log a summary to console
   */
  logSummary(): void {
    const totalTime = this.getTotalTime()
    
    console.log(`\n[PERF SUMMARY] ${this.endpoint}`)
    console.log(`  Total Time: ${totalTime.toFixed(1)}ms`)
    console.log(`  Query Count: ${this.queryCount}`)
    
    if (this.timings.length > 0) {
      console.log('  Breakdown:')
      this.timings.forEach(t => {
        const pct = ((t.dur / totalTime) * 100).toFixed(0)
        console.log(`    - ${t.name}: ${t.dur.toFixed(1)}ms (${pct}%)`)
      })
    }
    
    // Warn if over budget
    if (this.queryCount > 3) {
      console.warn(`  ⚠️ WARNING: ${this.queryCount} queries exceeds budget of 3`)
    }
    if (totalTime > 800) {
      console.warn(`  ⚠️ WARNING: ${totalTime.toFixed(0)}ms exceeds budget of 800ms`)
    }
    
    console.log('')
  }
}

/**
 * Quick timing wrapper for one-off measurements
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const start = performance.now()
  const result = await fn()
  const durationMs = performance.now() - start
  
  if (PERF_ENABLED) {
    console.log(`[PERF] ${name}: ${durationMs.toFixed(1)}ms`)
  }
  
  return { result, durationMs }
}

/**
 * Warn if query count exceeds budget (for development only)
 */
export function warnIfExceedsBudget(
  endpoint: string,
  queryCount: number,
  budget: number = 3
): void {
  if (PERF_ENABLED && queryCount > budget) {
    console.warn(
      `⚠️ PERF WARNING: ${endpoint} made ${queryCount} DB calls (budget: ${budget})`
    )
  }
}
