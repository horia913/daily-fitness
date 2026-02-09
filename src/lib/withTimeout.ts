/**
 * Wraps a promise with a timeout. If the promise does not resolve within ms,
 * the returned promise rejects with an Error whose message is the given message (default 'timeout').
 * Use in catch: error.message === 'timeout' for user-friendly load error + Retry.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message = "timeout"
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    ),
  ]);
}
