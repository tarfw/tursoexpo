import { openSync } from '@op-engineering/op-sqlite';

const DATABASE_NAME = 'turso_op_v2.db';

export interface Todo {
  id: number;
  text: string;
  completed: number;
}

const db = openSync({
  name: DATABASE_NAME,
  url: process.env.EXPO_PUBLIC_TURSO_URL!,
  authToken: process.env.EXPO_PUBLIC_TURSO_AUTH_TOKEN!,
});

export const initDatabase = async () => {
  try {
    console.log('[db] Initializing database...');
    db.execute('PRAGMA journal_mode = WAL;');
    console.log('[db] WAL mode set.');

    db.execute(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        completed INTEGER DEFAULT 0
      );
    `);
    console.log('[db] Table "todos" created (or existed).');
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
    db.sync();
    console.log('Sync successful.');
    notifyDatabaseChange();
  } catch (error) {
    console.error('Sync failed:', error);
  }
};

export const getDb = () => db;
