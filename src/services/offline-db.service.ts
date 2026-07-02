/**
 * Unified offline storage.
 * - Native (Android): uses @capacitor-community/sqlite → actual SQLite file in app storage
 * - Web / dev: uses IndexedDB via the existing offlineQueue
 */
import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QueueRow {
  id: string
  method: string
  endpoint: string
  payload: string   // JSON string
  created_at: number
  retries: number
}

export interface CachedProduct {
  id: string
  data: string      // JSON string of full product
  updated_at: number
}

export interface CachedCustomer {
  id: string
  data: string      // JSON string of full customer
  updated_at: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DB_NAME  = 'sederek'
const isNative = Capacitor.isNativePlatform()

// ── SQLite (native) ───────────────────────────────────────────────────────────

const sqlite = new SQLiteConnection(CapacitorSQLite)
let _db: Awaited<ReturnType<typeof sqlite.createConnection>> | null = null

async function getDb() {
  if (_db) return _db

  const isConsistent = await sqlite.checkConnectionsConsistency()
  const isConn = (await sqlite.isConnection(DB_NAME, false)).result

  if (isConsistent.result && isConn) {
    _db = await sqlite.retrieveConnection(DB_NAME, false)
  } else {
    _db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false)
  }

  await _db.open()
  await _db.execute(`
    CREATE TABLE IF NOT EXISTS offline_queue (
      id         TEXT PRIMARY KEY,
      method     TEXT NOT NULL,
      endpoint   TEXT NOT NULL,
      payload    TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL,
      retries    INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS products_cache (
      id         TEXT PRIMARY KEY,
      data       TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers_cache (
      id         TEXT PRIMARY KEY,
      data       TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `)

  return _db
}

// ── Queue (SQLite impl) ───────────────────────────────────────────────────────

async function sqliteQueuePush(method: string, endpoint: string, payload: any): Promise<QueueRow> {
  const db = await getDb()
  const row: QueueRow = {
    id:         `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    method,
    endpoint,
    payload:    JSON.stringify(payload),
    created_at: Date.now(),
    retries:    0,
  }
  await db.run(
    `INSERT INTO offline_queue (id, method, endpoint, payload, created_at, retries) VALUES (?, ?, ?, ?, ?, ?)`,
    [row.id, row.method, row.endpoint, row.payload, row.created_at, row.retries]
  )
  return row
}

async function sqliteQueueGetAll(): Promise<QueueRow[]> {
  const db = await getDb()
  const res = await db.query('SELECT * FROM offline_queue ORDER BY created_at ASC')
  return (res.values ?? []) as QueueRow[]
}

async function sqliteQueueRemove(id: string): Promise<void> {
  const db = await getDb()
  await db.run('DELETE FROM offline_queue WHERE id = ?', [id])
}

async function sqliteQueueCount(): Promise<number> {
  const db = await getDb()
  const res = await db.query('SELECT COUNT(*) as n FROM offline_queue')
  return (res.values?.[0] as any)?.n ?? 0
}

async function sqliteQueueIncrRetry(id: string): Promise<void> {
  const db = await getDb()
  await db.run('UPDATE offline_queue SET retries = retries + 1 WHERE id = ?', [id])
}

// ── Products cache ────────────────────────────────────────────────────────────

async function cacheProducts(products: any[]): Promise<void> {
  if (!isNative) return
  const db = await getDb()
  const now = Date.now()
  // Clear first so deleted records don't linger
  await db.run('DELETE FROM products_cache')
  for (const p of products) {
    await db.run(
      `INSERT INTO products_cache (id, data, updated_at) VALUES (?, ?, ?)`,
      [p.id, JSON.stringify(p), now]
    )
  }
}

async function getCachedProducts(): Promise<any[]> {
  if (!isNative) return []
  const db = await getDb()
  const res = await db.query('SELECT data FROM products_cache ORDER BY updated_at DESC')
  return (res.values ?? []).map((r: any) => JSON.parse(r.data))
}

async function clearProductsCache(): Promise<void> {
  if (!isNative) return
  const db = await getDb()
  await db.run('DELETE FROM products_cache')
}

// ── Customers cache ───────────────────────────────────────────────────────────

async function cacheCustomers(customers: any[]): Promise<void> {
  if (!isNative) return
  const db = await getDb()
  const now = Date.now()
  // Clear first so deleted records don't linger
  await db.run('DELETE FROM customers_cache')
  for (const c of customers) {
    await db.run(
      `INSERT INTO customers_cache (id, data, updated_at) VALUES (?, ?, ?)`,
      [c.id, JSON.stringify(c), now]
    )
  }
}

async function getCachedCustomers(): Promise<any[]> {
  if (!isNative) return []
  const db = await getDb()
  const res = await db.query('SELECT data FROM customers_cache ORDER BY updated_at DESC')
  return (res.values ?? []).map((r: any) => JSON.parse(r.data))
}

// ── Public API ────────────────────────────────────────────────────────────────

export const offlineDb = {
  isNative,

  queue: {
    push:        sqliteQueuePush,
    getAll:      sqliteQueueGetAll,
    remove:      sqliteQueueRemove,
    count:       sqliteQueueCount,
    incrRetry:   sqliteQueueIncrRetry,
  },

  products: {
    cache:  cacheProducts,
    getAll: getCachedProducts,
    clear:  clearProductsCache,
  },

  customers: {
    cache:  cacheCustomers,
    getAll: getCachedCustomers,
  },
}
