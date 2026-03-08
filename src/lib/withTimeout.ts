/**
 * Wraps a promise with a timeout. If the promise doesn't settle within
 * the given milliseconds, the returned promise rejects with a timeout error.
 * The original promise continues running but its result is ignored.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label?: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout: ${label || 'operation'} took longer than ${ms}ms`));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
