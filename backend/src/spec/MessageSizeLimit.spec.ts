import 'mocha'
import { expect } from 'chai'
import {
  MAX_MESSAGE_SIZE_DEFAULT,
  MAX_MESSAGE_SIZE_UNLIMITED,
  formatMessageSize,
  isValidMaxMessageSize,
  messageHistoryCapacityFor,
  truncatePayload,
} from '../../../events/MessageSizeLimit'

describe('MessageSizeLimit', () => {
  it('truncates payloads above the limit', () => {
    const payload = Buffer.alloc(30_000, 1)
    expect(truncatePayload(payload, MAX_MESSAGE_SIZE_DEFAULT).length).to.eq(20_000)
    expect(truncatePayload(payload, 100_000).length).to.eq(30_000)
    expect(truncatePayload(payload, MAX_MESSAGE_SIZE_UNLIMITED).length).to.eq(30_000)
  })

  it('only accepts the unlimited marker or limits of at least 20 kB', () => {
    expect(isValidMaxMessageSize(MAX_MESSAGE_SIZE_UNLIMITED)).to.eq(true)
    expect(isValidMaxMessageSize(1_000_000)).to.eq(true)
    expect(isValidMaxMessageSize(1_000)).to.eq(false)
    expect(isValidMaxMessageSize(20_000.5)).to.eq(false)
    expect(isValidMaxMessageSize('1000000')).to.eq(false)
  })

  it('keeps room for the previous message in the per-topic history', () => {
    expect(messageHistoryCapacityFor(MAX_MESSAGE_SIZE_DEFAULT)).to.eq(40_000)
    expect(messageHistoryCapacityFor(1_000_000)).to.eq(2_000_000)
    expect(messageHistoryCapacityFor(MAX_MESSAGE_SIZE_UNLIMITED)).to.eq(10_000_000)
  })

  it('formats sizes', () => {
    expect(formatMessageSize(20_000)).to.eq('20 kB')
    expect(formatMessageSize(5_000_000)).to.eq('5 MB')
    expect(formatMessageSize(MAX_MESSAGE_SIZE_UNLIMITED)).to.eq('Unlimited')
  })
})
