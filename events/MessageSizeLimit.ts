/**
 * Maximum payload size the backend forwards to the UI. Larger payloads are truncated.
 */
export const MAX_MESSAGE_SIZE_UNLIMITED = -1
export const MAX_MESSAGE_SIZE_DEFAULT = 20_000
export const MAX_MESSAGE_SIZE_OPTIONS = [20_000, 100_000, 1_000_000, 5_000_000, MAX_MESSAGE_SIZE_UNLIMITED]

/** Upper bound used to size buffers when the limit is "unlimited" */
const LARGEST_LIMITED_SIZE = 5_000_000

export function isValidMaxMessageSize(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    (value === MAX_MESSAGE_SIZE_UNLIMITED || value >= MAX_MESSAGE_SIZE_DEFAULT)
  )
}

export function truncatePayload<T extends { length: number; subarray(start: number, end: number): T }>(
  payload: T,
  maxMessageSize: number
): T {
  if (maxMessageSize === MAX_MESSAGE_SIZE_UNLIMITED || payload.length <= maxMessageSize) {
    return payload
  }
  return payload.subarray(0, maxMessageSize)
}

/**
 * Per-topic message history budget in bytes: large enough to keep the current and the previous message
 * (needed for the diff view), but never smaller than the historic 20 kB.
 */
export function messageHistoryCapacityFor(maxMessageSize: number): number {
  const limit = maxMessageSize === MAX_MESSAGE_SIZE_UNLIMITED ? LARGEST_LIMITED_SIZE : maxMessageSize
  return Math.max(MAX_MESSAGE_SIZE_DEFAULT, 2 * limit)
}

export function formatMessageSize(size: number): string {
  if (size === MAX_MESSAGE_SIZE_UNLIMITED) {
    return 'Unlimited'
  }
  if (size >= 1_000_000) {
    return `${size / 1_000_000} MB`
  }
  if (size >= 1_000) {
    return `${size / 1_000} kB`
  }
  return `${size} bytes`
}
