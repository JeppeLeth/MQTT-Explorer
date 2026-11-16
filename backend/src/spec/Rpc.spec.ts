import 'mocha'
import { expect } from 'chai'
import { Rpc } from '../../../events/EventSystem/Rpc'
import { EventBusInterface } from '../../../events/EventSystem/EventBusInterface'

/** Delivers messages asynchronously as JSON, like the IPC / socket.io buses */
class JsonEventBus implements EventBusInterface {
  private listeners = new Map<string, Set<(msg: any) => void>>()

  public subscribe(event: { topic: string }, callback: (msg: any) => void) {
    const set = this.listeners.get(event.topic) ?? new Set()
    set.add(callback)
    this.listeners.set(event.topic, set)
  }

  public unsubscribe(event: { topic: string }, callback: any) {
    this.listeners.get(event.topic)?.delete(callback)
  }

  public unsubscribeAll(event: { topic: string }) {
    this.listeners.delete(event.topic)
  }

  public emit(event: { topic: string }, msg: any) {
    const serialized = JSON.stringify(msg)
    setImmediate(() => [...(this.listeners.get(event.topic) ?? [])].forEach(cb => cb(JSON.parse(serialized))))
  }
}

describe('Rpc', () => {
  it('delivers handler errors with their message instead of an empty object', async () => {
    const rpc = new Rpc(new JsonEventBus())
    rpc.on({ topic: 'fail' }, async () => {
      throw new Error('file not found')
    })

    const error = await rpc.call({ topic: 'fail' }, undefined).catch(e => e)
    expect(error).to.be.instanceOf(Error)
    expect(error.message).to.eq('file not found')
  })

  it('passes non-Error rejections through unchanged', async () => {
    const rpc = new Rpc(new JsonEventBus())
    rpc.on({ topic: 'fail' }, async () => {
      // eslint-disable-next-line no-throw-literal
      throw 'No certificate selected'
    })

    const error = await rpc.call({ topic: 'fail' }, undefined).catch(e => e)
    expect(error).to.eq('No certificate selected')
  })

  it('respects the timeout passed by the caller', async () => {
    const rpc = new Rpc(new JsonEventBus())
    const started = Date.now()
    const error = await rpc.call({ topic: 'nobody-listens' }, undefined, 50).catch(e => e)
    expect(error.message).to.contain('within 50ms')
    expect(Date.now() - started).to.be.lessThan(1000)
  })

  it('resolves with the payload', async () => {
    const rpc = new Rpc(new JsonEventBus())
    rpc.on({ topic: 'add' }, async ({ a, b }: { a: number; b: number }) => a + b)
    expect(await rpc.call({ topic: 'add' }, { a: 1, b: 2 }, 1000)).to.eq(3)
  })
})
