/**
 * Maps a stored locale such as the browser's "en-US" onto one of moment's locale ids
 * ("en", "en-gb", ...), so the select always shows a valid option.
 */
export function resolveMomentLocale(requested: string | undefined, available: Array<string>): string {
  const fallback = available.includes('en') ? 'en' : available[0]
  if (!requested) {
    return fallback
  }
  const normalized = requested.toLowerCase().replace('_', '-')
  if (available.includes(normalized)) {
    return normalized
  }
  const language = normalized.split('-')[0]
  return available.includes(language) ? language : fallback
}
