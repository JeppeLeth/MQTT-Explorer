/**
 * Human readable text for anything passed to `showError`.
 * `JSON.stringify(new Error('x'))` is "{}" because message and stack are not enumerable.
 */
export function describeError(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }
  if (value instanceof Error) {
    return value.message || value.name
  }
  if (value && typeof value === 'object' && typeof (value as any).message === 'string') {
    return (value as any).message
  }
  try {
    const json = JSON.stringify(value)
    return json === undefined ? String(value) : json
  } catch {
    return String(value)
  }
}
