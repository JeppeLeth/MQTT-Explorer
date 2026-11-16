import 'mocha'
import { expect } from 'chai'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import ConfigStorage from '../ConfigStorage'
import { Rpc } from '../../../events/EventSystem/Rpc'
import { EventBusInterface } from '../../../events/EventSystem/EventBusInterface'
import { storageClearEvent, storageLoadEvent, storageStoreEvent } from '../../../events/StorageEvents'

class InMemoryEventBus implements EventBusInterface {
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
    // Deliver asynchronously, like the IPC / socket.io buses do
    setImmediate(() => [...(this.listeners.get(event.topic) ?? [])].forEach(cb => cb(msg)))
  }
}

describe('ConfigStorage', () => {
  let dir: string
  let file: string
  let rpc: Rpc

  beforeEach(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mqtt-explorer-config-'))
    file = path.join(dir, 'nested', 'settings.json')
    rpc = new Rpc(new InMemoryEventBus())
    await new ConfigStorage(file, rpc).init()
  })

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('returns undefined for unknown stores and creates the settings directory', async () => {
    const result = await rpc.call(storageLoadEvent, { store: 'Settings' })
    expect(result.store).to.eq('Settings')
    expect(result.data).to.eq(undefined)
    expect(fs.existsSync(path.dirname(file))).to.eq(true)
  })

  it('persists stores to disk as a flat JSON object', async () => {
    await rpc.call(storageStoreEvent, { store: 'Settings', data: { autoExpandLimit: 3 } })
    await rpc.call(storageStoreEvent, { store: 'ConnectionManager_connections', data: { a: { host: 'x' } } })

    const result = await rpc.call(storageLoadEvent, { store: 'Settings' })
    expect(result.data).to.deep.eq({ autoExpandLimit: 3 })

    const onDisk = JSON.parse(fs.readFileSync(file, 'utf8'))
    expect(onDisk).to.deep.eq({
      Settings: { autoExpandLimit: 3 },
      ConnectionManager_connections: { a: { host: 'x' } },
    })
  })

  it('reads settings files written by previous versions', async () => {
    const legacyFile = path.join(dir, 'legacy.json')
    // lowdb@1 wrote pretty-printed JSON with the store id as top-level key
    fs.writeFileSync(legacyFile, JSON.stringify({ Settings: { theme: 'dark' } }, null, 2))
    const legacyRpc = new Rpc(new InMemoryEventBus())
    await new ConfigStorage(legacyFile, legacyRpc).init()

    const result = await legacyRpc.call(storageLoadEvent, { store: 'Settings' })
    expect(result.data).to.deep.eq({ theme: 'dark' })
  })

  it('clears all stores', async () => {
    await rpc.call(storageStoreEvent, { store: 'Settings', data: { a: 1 } })
    await rpc.call(storageClearEvent, undefined)

    const result = await rpc.call(storageLoadEvent, { store: 'Settings' })
    expect(result.data).to.eq(undefined)
    expect(JSON.parse(fs.readFileSync(file, 'utf8'))).to.deep.eq({})
  })
})
