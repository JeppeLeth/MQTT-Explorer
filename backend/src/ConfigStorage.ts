import fs from 'fs-extra'
import path from 'path'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { Rpc } from '../../events/EventSystem/Rpc'
import { storageClearEvent, storageLoadEvent, storageStoreEvent } from '../../events/StorageEvents'

type StorageData = Record<string, unknown>

/**
 * Persists renderer state (settings, connections, chart layout) as a JSON file.
 *
 * The on-disk format is a flat JSON object keyed by store id, identical to what lowdb@1 wrote,
 * so settings files from older versions keep working.
 */
export default class ConfigStorage {
  private file: string

  private rpc: Rpc

  private database?: Promise<Low<StorageData>>

  constructor(file: string, rpc: Rpc) {
    this.file = file
    this.rpc = rpc
  }

  private getDb(): Promise<Low<StorageData>> {
    // Memoize the promise so concurrent first requests share a single database instance
    if (!this.database) {
      this.database = (async () => {
        // Ensure that Settings dir exists
        await fs.mkdirp(path.dirname(this.file))
        const db = new Low<StorageData>(new JSONFile<StorageData>(this.file), {})
        await db.read()
        if (!db.data || typeof db.data !== 'object') {
          db.data = {}
        }
        return db
      })()
      this.database.catch(() => {
        // Allow a retry on the next request, e.g. after a corrupt file has been fixed
        this.database = undefined
      })
    }

    return this.database
  }

  public async init() {
    this.rpc.on(storageStoreEvent, async event => {
      const db = await this.getDb()
      db.data[event.store] = event.data
      await db.write()
    })

    this.rpc.on(storageLoadEvent, async event => {
      const db = await this.getDb()
      return {
        data: db.data[event.store],
        store: event.store,
      }
    })

    this.rpc.on(storageClearEvent, async () => {
      const db = await this.getDb()
      db.data = {}
      await db.write()
    })
  }
}
