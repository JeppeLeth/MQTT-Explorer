import 'mocha'
import { expect } from 'chai'
import { describeError } from '../describeError'

describe('describeError', () => {
  it('uses the message of errors instead of rendering "{}"', () => {
    expect(JSON.stringify(new Error('Connection refused'))).to.eq('{}')
    expect(describeError(new Error('Connection refused'))).to.eq('Connection refused')
    expect(describeError({ name: 'Error', message: 'serialized' })).to.eq('serialized')
  })

  it('keeps strings and stringifies other values', () => {
    expect(describeError('No file selected')).to.eq('No file selected')
    expect(describeError({ code: 5 })).to.eq('{"code":5}')
    expect(describeError(undefined)).to.eq('undefined')
  })
})
