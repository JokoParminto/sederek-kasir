/**
 * Offline sync queue.
 * - Android native: backed by SQLite (offlineDb) — persists across app restarts
 * - Web / dev server: backed by IndexedDB
 */
import { Capacitor } from '@capacitor/core'
import apiClient from '@/services/api/client'

const isNative = Capacitor.isNativePlatform()

export interface QueueEntry {
  id: string
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  endpoint: string
  payload: any
  createdAt: number
  retries: number
}

// ── IndexedDB backend (web) ───────────────────────────────────────────────────

const IDB_NAME    = 'sederek-offline'
const IDB_VERSION = 1
const IDB_STORE   = 'sync_queue'

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION)
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

function genId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}` }

const idbQueue = {
  async push(method: QueueEntry['method'], endpoint: string, payload: any): Promise<QueueEntry> {
    const db = await openIDB()
    const entry: QueueEntry = { id: genId(), method, endpoint, payload, createdAt: Date.now(), retries: 0 }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).add(entry)
      tx.oncomplete = () => resolve(entry)
      tx.onerror    = () => reject(tx.error)
    })
  },

  async getAll(): Promise<QueueEntry[]> {
    const db = await openIDB()
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).getAll()
      req.onsuccess = () => resolve((req.result as QueueEntry[]).sort((a, b) => a.createdAt - b.createdAt))
      req.onerror   = () => reject(req.error)
    })
  },

  async remove(id: string): Promise<void> {
    const db = await openIDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror    = () => reject(tx.error)
    })
  },

  async count(): Promise<number> {
    const db = await openIDB()
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).count()
      req.onsuccess = () => resolve(req.result)
      req.onerror   = () => reject(req.error)
    })
  },

  async incrRetry(id: string, entry: QueueEntry): Promise<void> {
    const db = await openIDB()
    return new Promise((resolve) => {
      const tx    = db.transaction(IDB_STORE, 'readwrite')
      const store = tx.objectStore(IDB_STORE)
      const req   = store.get(id)
      req.onsuccess = () => {
        const item = req.result as QueueEntry
        if (item) { item.retries = (item.retries || 0) + 1; store.put(item) }
      }
      tx.oncomplete = () => resolve()
    })
  },
}

// ── SQLite backend (native) ───────────────────────────────────────────────────

async function getSqliteQueue() {
  const { offlineDb } = await import('@/services/offline-db.service')
  return offlineDb.queue
}

const sqliteQueue = {
  async push(method: QueueEntry['method'], endpoint: string, payload: any): Promise<QueueEntry> {
    const q   = await getSqliteQueue()
    const row = await q.push(method, endpoint, payload)
    return { id: row.id, method: row.method as QueueEntry['method'], endpoint: row.endpoint, payload: JSON.parse(row.payload), createdAt: row.created_at, retries: row.retries }
  },

  async getAll(): Promise<QueueEntry[]> {
    const q    = await getSqliteQueue()
    const rows = await q.getAll()
    return rows.map(r => ({ id: r.id, method: r.method as QueueEntry['method'], endpoint: r.endpoint, payload: JSON.parse(r.payload), createdAt: r.created_at, retries: r.retries }))
  },

  async remove(id: string): Promise<void> {
    const q = await getSqliteQueue()
    await q.remove(id)
  },

  async count(): Promise<number> {
    const q = await getSqliteQueue()
    return q.count()
  },

  async incrRetry(id: string): Promise<void> {
    const q = await getSqliteQueue()
    await q.incrRetry(id)
  },
}

// ── Unified queue ─────────────────────────────────────────────────────────────

const backend = isNative ? sqliteQueue : idbQueue

async function push(method: QueueEntry['method'], endpoint: string, payload: any): Promise<QueueEntry> {
  return backend.push(method, endpoint, payload)
}

async function getAll(): Promise<QueueEntry[]> {
  return backend.getAll()
}

async function remove(id: string): Promise<void> {
  return backend.remove(id)
}

async function count(): Promise<number> {
  return backend.count()
}

async function flush(): Promise<{ succeeded: number; failed: number }> {
  const entries = await getAll()
  let succeeded = 0
  let failed    = 0

  for (const entry of entries) {
    try {
      await apiClient.request({ method: entry.method, url: entry.endpoint, data: entry.payload })
      await remove(entry.id)
      succeeded++
    } catch {
      if (isNative) {
        await (backend as typeof sqliteQueue).incrRetry(entry.id)
      } else {
        await (backend as typeof idbQueue).incrRetry(entry.id, entry)
      }
      failed++
    }
  }

  return { succeeded, failed }
}

export const offlineQueue = { push, getAll, remove, count, flush }
