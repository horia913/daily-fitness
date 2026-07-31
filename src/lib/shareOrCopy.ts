/**
 * Web Share API with clipboard fallback — never a silent no-op.
 */

export type SharePayload = {
  title: string
  text?: string
  url?: string
}

export type ShareResult =
  | { ok: true; method: 'share' | 'clipboard' }
  | { ok: false; reason: string }

function buildClipboardText(payload: SharePayload): string {
  const parts = [payload.title]
  if (payload.text?.trim()) parts.push(payload.text.trim())
  if (payload.url?.trim()) parts.push(payload.url.trim())
  return parts.join('\n')
}

/**
 * Try `navigator.share`; on unavailable / cancel-after-failure, copy to clipboard.
 * User-cancel of the share sheet returns `{ ok: false }` without clipboard (intentional).
 */
export async function shareOrCopy(payload: SharePayload): Promise<ShareResult> {
  const url = payload.url ?? (typeof window !== 'undefined' ? window.location.href : undefined)
  const shareData: ShareData = {
    title: payload.title,
    text: payload.text,
    url,
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const can =
        typeof navigator.canShare !== 'function' || navigator.canShare(shareData)
      if (can) {
        await navigator.share(shareData)
        return { ok: true, method: 'share' }
      }
    } catch (err) {
      // AbortError = user dismissed share sheet — don't force clipboard
      if (err instanceof DOMException && err.name === 'AbortError') {
        return { ok: false, reason: 'cancelled' }
      }
      // Fall through to clipboard
    }
  }

  const text = buildClipboardText({ ...payload, url })
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return { ok: true, method: 'clipboard' }
    }
  } catch {
    // fall through
  }

  return { ok: false, reason: 'clipboard_unavailable' }
}
