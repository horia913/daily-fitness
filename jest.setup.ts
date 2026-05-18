import '@testing-library/jest-dom'

// Jest/jsdom may not define `fetch`; Supabase client wiring calls `getTrackedFetch()` at import time.
if (typeof globalThis.fetch !== 'function') {
  globalThis.fetch = jest.fn(() =>
    Promise.resolve(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
  ) as unknown as typeof fetch
}
