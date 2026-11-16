import 'mocha'
import { expect } from 'chai'
import moment from 'moment'
import { timeWithMillisecondsFormat } from '../DateFormatter'

// Registers the German locale (side effect only, the module has no type declarations)
require('moment/locale/de')

describe('timeWithMillisecondsFormat', () => {
  const date = new Date(2026, 10, 16, 21, 52, 8, 681)

  it('puts milliseconds before the AM/PM marker', () => {
    const m = moment(date).locale('en')
    expect(m.format(timeWithMillisecondsFormat(m.localeData()))).to.eq('9:52:08.681 PM')
  })

  it('works for 24h locales', () => {
    const m = moment(date).locale('de')
    expect(m.format(timeWithMillisecondsFormat(m.localeData()))).to.eq('21:52:08.681')
  })
})
