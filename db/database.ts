import { open, openSync, type DB } from '@op-engineering/op-sqlite';

const DATABASE_NAME = 'turso_op_v6.db';

export interface Todo {
  id: number;
  text: string;
  completed: number;
}

// Helper to safely delete the database
export const resetDatabase = () => {
  console.warn('[db] Resetting database...');
  try {
    // We try to open a local connection just to delete the file
    // This avoids issues where we might not have a valid 'db' instance if openSync failed
    const tempDb = open({ name: DATABASE_NAME });
    tempDb.delete();
    console.log('[db] Database deleted successfully.');
  } catch (e) {
    console.error('[db] Failed to delete database:', e);
  }
};

let db: DB;

try {
  // Single Connection: Handles both UI (Writes) and Sync (Replication)
  // We MUST use openSync for writes to be tracked!
  db = openSync({
    name: DATABASE_NAME,
    url: process.env.EXPO_PUBLIC_TURSO_URL!,
    authToken: process.env.EXPO_PUBLIC_TURSO_AUTH_TOKEN!,
  });
} catch (e: any) {
  console.error('[db] Failed to open database:', e);
  if (e.message && typeof e.message === 'string' && e.message.includes('wal_index')) {
    console.error('[db] Detected "wal_index" error. Attempting auto-recovery by resetting database...');
    resetDatabase();
    // Retry opening after reset
    try {
      db = openSync({
        name: DATABASE_NAME,
        url: process.env.EXPO_PUBLIC_TURSO_URL!,
        authToken: process.env.EXPO_PUBLIC_TURSO_AUTH_TOKEN!,
      });
      console.log('[db] Database recovered and opened successfully.');
    } catch (retryError) {
      console.error('[db] Critical: Failed to recover database after reset:', retryError);
      // Fallback: throw to ensure we don't return an undefined db if strict
      throw retryError;
    }
  } else {
    throw e;
  }
}

export const initDatabase = async () => {
  try {
    console.log('[db] Initializing database...');
    // Enable WAL for performance check
    db.execute('PRAGMA journal_mode = WAL;');
    console.log('[db] WAL mode set.');

    db.execute(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        completed INTEGER DEFAULT 0
      );
    `);
    console.log('[db] Table "todos" created.');
  } catch (e) {
    console.error('[db] Initialization failed:', e);
    throw e;
  }

  return db;
};

// Simple event emitter for changes
type Listener = () => void;
const listeners: Set<Listener> = new Set();

export const addDatabaseChangeListener = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const notifyDatabaseChange = () => {
  listeners.forEach(l => l());
};

export const syncDatabase = async () => {
  try {
    console.log('[db] Starting sync...');
    const start = performance.now();
    db.sync();
    console.log(`[db] Sync finished in ${performance.now() - start}ms`);
    notifyDatabaseChange();
  } catch (error: any) {
    console.error('[db] Sync failed:', error);
    if (error.message && typeof error.message === 'string' && error.message.includes('wal_index')) {
      console.warn('[db] Sync error indicates corruption (wal_index). Triggering manual reset...');
      resetDatabase();
      // Note: We might need to reload the app or re-init the DB object here.
      // For now, next time the app starts or a function calls openSync, it should work.
      // We could also try to re-open `db` here if we made it a let variable, but `db` is global module scope.
      // Ideally, notify user to restart.
    }
  }
};

export const getDb = () => db;
