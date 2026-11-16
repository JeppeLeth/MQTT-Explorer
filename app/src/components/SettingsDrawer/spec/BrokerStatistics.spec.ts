import 'mocha'
import { expect } from 'chai'
import { formatStatistic } from '../BrokerStatistics'

describe('formatStatistic', () => {
  it('formats message counts with unambiguous compact suffixes', () => {
    expect(formatStatistic(14_200_000_000)).to.eq('14.2B')
    expect(formatStatistic(760_000_000)).to.eq('760M')
    expect(formatStatistic(16_300)).to.eq('16.3K')
    expect(formatStatistic(42)).to.eq('42')
  })

  it('formats memory as bytes', () => {
    expect(formatStatistic(4_100_000_000, 'bytes')).to.eq('4.1 GB')
    expect(formatStatistic(512, 'bytes')).to.eq('512 B')
    expect(formatStatistic(1_500_000, 'bytes')).to.eq('1.5 MB')
  })
})
