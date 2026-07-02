export const GALLERY_NAME_MAX_LENGTH = 100

/**
 * Sanitize a user-supplied gallery name before it is stored or displayed.
 * Strips HTML/script-significant characters and control characters, collapses
 * whitespace, and enforces the max length. React escapes JSX output, but this
 * guards against tampered clients bypassing the UI maxLength and keeps stored
 * data clean for non-React consumers (PDF export, etc.).
 */
export function sanitizeGalleryName(name: string): string {
  return (
    name
      .replace(/[<>"'&]/g, '')
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, GALLERY_NAME_MAX_LENGTH)
  )
}

/**
 * Ensure a navigation target stays inside the app. Rejects absolute URLs,
 * protocol-relative URLs, and backslash tricks so a tampered value can never
 * become an open redirect. Returns the fallback when the path is not a safe
 * same-origin relative path.
 */
export function safeInternalPath(path: string, fallback = '/works'): string {
  if (typeof path !== 'string') return fallback
  // Must be a root-relative path and must not start a protocol-relative URL
  if (!path.startsWith('/') || path.startsWith('//')) return fallback
  // Reject backslashes and control characters used to smuggle other origins
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000-\u001F\u007F]/.test(path)) return fallback
  return path
}
