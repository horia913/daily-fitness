/**
 * In-flight + short-TTL promise dedupe for React StrictMode double-effects
 * (and any remount that re-fires the same load within TTL).
 */

type CacheEntry<T> = {
  inflight: Promise<T> | null;
  resolved: { at: number; value: T } | null;
};

const namespaces = new Map<string, Map<string, CacheEntry<unknown>>>();

function bucket(ns: string): Map<string, CacheEntry<unknown>> {
  let m = namespaces.get(ns);
  if (!m) {
    m = new Map();
    namespaces.set(ns, m);
  }
  return m;
}

/**
 * Share one promise per (namespace, key). After resolve, serve the value for `ttlMs`.
 */
export function dedupeAsync<T>(
  namespace: string,
  key: string,
  factory: () => Promise<T>,
  ttlMs = 2500,
): Promise<T> {
  const map = bucket(namespace);
  const existing = map.get(key) as CacheEntry<T> | undefined;
  if (existing?.resolved && Date.now() - existing.resolved.at < ttlMs) {
    return Promise.resolve(existing.resolved.value);
  }
  if (existing?.inflight) return existing.inflight;

  const entry: CacheEntry<T> = {
    inflight: null,
    resolved: existing?.resolved ?? null,
  };
  const promise = factory()
    .then((value) => {
      entry.resolved = { at: Date.now(), value };
      return value;
    })
    .finally(() => {
      entry.inflight = null;
    });
  entry.inflight = promise;
  map.set(key, entry as CacheEntry<unknown>);
  return promise;
}
