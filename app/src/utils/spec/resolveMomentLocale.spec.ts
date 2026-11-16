import 'mocha'
import { expect } from 'chai'
import { resolveMomentLocale } from '../resolveMomentLocale'

describe('resolveMomentLocale', () => {
  const available = ['en', 'en-gb', 'de', 'de-at', 'zh-cn']

  it('maps browser locales onto moment locale ids', () => {
    expect(resolveMomentLocale('en-US', available)).to.eq('en')
    expect(resolveMomentLocale('en-GB', available)).to.eq('en-gb')
    expect(resolveMomentLocale('de-CH', available)).to.eq('de')
    expect(resolveMomentLocale('zh_CN', available)).to.eq('zh-cn')
  })

  it('keeps valid ids and falls back to en', () => {
    expect(resolveMomentLocale('de-at', available)).to.eq('de-at')
    expect(resolveMomentLocale('xx-YY', available)).to.eq('en')
    expect(resolveMomentLocale(undefined, available)).to.eq('en')
  })
})
