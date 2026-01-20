import { openSync } from '@op-engineering/op-sqlite';

const DATABASE_NAME = 'turso_op_v6.db';

export interface Todo {
  id: number;
  text: string;
  completed: number;
}

// Single Connection: Handles both UI (Writes) and Sync (Replication)
// We MUST use openSync for writes to be tracked!
const db = openSync({
  name: DATABASE_NAME,
  url: process.env.EXPO_PUBLIC_TURSO_URL!,
  authToken: process.env.EXPO_PUBLIC_TURSO_AUTH_TOKEN!,
});

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
  } catch (error) {
    console.error('[db] Sync failed:', error);
  }
};

export const getDb = () => db;
