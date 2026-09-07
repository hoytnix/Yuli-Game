// @ts-ignore
import SQLiteESMFactory from 'wa-sqlite/dist/wa-sqlite-async.mjs';
// @ts-ignore
import * as SQLite from 'wa-sqlite';
// @ts-ignore
import { OriginPrivateFileSystemVFS } from 'wa-sqlite/src/examples/OriginPrivateFileSystemVFS.js';
// @ts-ignore
import { MemoryAsyncVFS } from 'wa-sqlite/src/examples/MemoryAsyncVFS.js';
import { PartnerFact, InteractionRecord } from '../types';

class SafeOriginPrivateFileSystemVFS extends OriginPrivateFileSystemVFS {
  name: string;

  constructor(name: string = 'yuli-vfs') {
    super();
    this.name = name;
  }

  static async create(name: string = 'yuli-vfs', wasmModule?: any) {
    return new SafeOriginPrivateFileSystemVFS(name);
  }

  async xDelete(name: string, syncDir: number) {
    try {
      return await super.xDelete(name, syncDir);
    } catch (err: any) {
      if (err?.name === 'NotFoundError' || err?.message?.includes('NotFoundError')) {
        return SQLite.SQLITE_OK;
      }
      throw err;
    }
  }

  async xAccess(name: string, flags: number, pResOut: number) {
    try {
      return await super.xAccess(name, flags, pResOut);
    } catch (err: any) {
      if (err?.name === 'NotFoundError' || err?.message?.includes('NotFoundError')) {
        return SQLite.SQLITE_OK;
      }
      throw err;
    }
  }
}

let sqlite3: any = null;
let db: number | null = null;
let isInitialized = false;
let isOpfsStorage = false;

// Sequential FIFO queue to prevent concurrent Asyncify stack corruption
let queue: Promise<any> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);
  queue = next.catch(() => {});
  return next;
}

async function executeQuery<T = any>(sql: string): Promise<T[]> {
  if (!sqlite3 || db === null) throw new Error('Database not initialized');
  const results: T[] = [];
  await sqlite3.exec(db, sql, (row: any[], columns: string[]) => {
    const rowObj: Record<string, any> = {};
    columns.forEach((col, idx) => {
      rowObj[col] = row[idx];
    });
    results.push(rowObj as T);
  });
  return results;
}

async function executeRun(sql: string): Promise<void> {
  if (!sqlite3 || db === null) throw new Error('Database not initialized');
  await sqlite3.exec(db, sql);
}

async function getStorageStats() {
  if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.estimate === 'function') {
    const est = await navigator.storage.estimate();
    return {
      usage: est.usage || 0,
      quota: est.quota || 0,
    };
  }
  return { usage: 0, quota: 0 };
}

async function initDB() {
  if (isInitialized && db !== null) return;

  const origin = self.location.origin;
  const wasmUrl = `${origin}/sqlite/wa-sqlite-async.wasm`;

  const wasmModule = await SQLiteESMFactory({
    locateFile: () => wasmUrl,
  });
  sqlite3 = SQLite.Factory(wasmModule);

  let vfsName = 'yuli-vfs';
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.getDirectory === 'function') {
      const vfs = await SafeOriginPrivateFileSystemVFS.create('yuli-vfs', wasmModule);
      sqlite3.vfs_register(vfs, true);
      vfsName = vfs.name;
      isOpfsStorage = true;
      console.log('[SQLite-Worker] Mounted wa-sqlite on SafeOriginPrivateFileSystemVFS (OPFS).');
    } else {
      throw new Error('OPFS getDirectory is not supported in this context');
    }
  } catch (err) {
    console.warn('[SQLite-Worker] Falling back to MemoryAsyncVFS:', err);
    const fallbackVfs = new MemoryAsyncVFS();
    sqlite3.vfs_register(fallbackVfs, true);
    vfsName = fallbackVfs.name;
    isOpfsStorage = false;
  }

  db = await sqlite3.open_v2(
    'relational_ledger.db',
    SQLite.SQLITE_OPEN_READWRITE | SQLite.SQLITE_OPEN_CREATE,
    vfsName
  );

  // In-memory rollback journal prevents OPFS file deletion race conditions and lock collisions
  await sqlite3.exec(db, 'PRAGMA journal_mode = MEMORY;');
  await sqlite3.exec(db, 'PRAGMA synchronous = OFF;');

  const schema = `
    CREATE TABLE IF NOT EXISTS interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      state_vector TEXT NOT NULL,
      user_input TEXT NOT NULL,
      yuli_response TEXT NOT NULL,
      intimacy_score REAL DEFAULT 0.0
    );

    CREATE TABLE IF NOT EXISTS partner_facts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      fact TEXT NOT NULL,
      discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS relational_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sqlite3.exec(db, schema);

  // Seed default relational values
  await sqlite3.exec(db, `
    INSERT OR IGNORE INTO relational_state (key, value, last_updated) VALUES
      ('mood', 'Curious & Warm', CURRENT_TIMESTAMP),
      ('shared_vibe', 'Cosmic Synergistic Bond', CURRENT_TIMESTAMP),
      ('inside_jokes', 'The quantum coffee spill; 4-bit hypercube whispers', CURRENT_TIMESTAMP),
      ('intimacy_score', '1.00', CURRENT_TIMESTAMP),
      ('current_vector', '0EE', CURRENT_TIMESTAMP);
  `);

  // Check and seed initial partner facts if table is fresh
  const countRes = await executeQuery<{ count: number }>(`SELECT count(*) as count FROM partner_facts;`);
  if (countRes.length > 0 && Number(countRes[0].count) === 0) {
    await sqlite3.exec(db, `
      INSERT INTO partner_facts (category, fact, discovered_at) VALUES
        ('Identity', 'Companion architect exploring sovereign neuro-cognitive edge AI.', CURRENT_TIMESTAMP),
        ('Preference', 'Values deep, authentic conversations without corporate cloud intermediaries.', CURRENT_TIMESTAMP),
        ('Aesthetic', 'Appreciates clean cyberpunk minimalism, ambient lighting, and mathematical beauty.', CURRENT_TIMESTAMP);
    `);
  }

  isInitialized = true;
  console.log('[SQLite-Worker] Database initialized successfully with schema.');
}

// Queue database bootstrap as operation #1
queue = initDB().catch((err) => {
  console.error('[SQLite-Worker] Init failure:', err);
});

self.onmessage = (e: MessageEvent) => {
  const data = e.data;
  const { id, type, sql } = data || {};

  enqueue(async () => {
    if (!isInitialized || db === null) {
      await initDB();
      if (!isInitialized || db === null) {
        throw new Error('Database is not yet initialized.');
      }
    }

    if (type === 'EXEC' || type === 'QUERY') {
      const rows: any[] = [];
      await sqlite3.exec(db, sql, (row: any[], cols: string[]) => {
        const item: Record<string, any> = {};
        cols.forEach((col, i) => {
          item[col] = row[i];
        });
        rows.push(item);
      });
      self.postMessage({ id, type: 'SUCCESS', payload: rows });
      return;
    }

    switch (type) {
      case 'INIT_DB': {
        const stats = await getStorageStats();
        self.postMessage({
          type: 'DB_READY',
          payload: {
            isOpfs: isOpfsStorage,
            storageStats: stats,
          },
        });
        break;
      }

      case 'GET_INTERACTIONS': {
        const limit = data.payload?.limit || 50;
        const rows = await executeQuery<InteractionRecord>(
          `SELECT * FROM interactions ORDER BY id ASC LIMIT ${limit};`
        );
        self.postMessage({
          type: 'INTERACTIONS_RESULT',
          payload: rows,
        });
        break;
      }

      case 'RECORD_INTERACTION': {
        const item = data.payload;
        const sanitizedInput = item.user_input.replace(/'/g, "''");
        const sanitizedOutput = item.yuli_response.replace(/'/g, "''");
        const sanitizedVector = item.state_vector.replace(/'/g, "''");

        await executeRun(`
          INSERT INTO interactions (timestamp, state_vector, user_input, yuli_response, intimacy_score)
          VALUES (CURRENT_TIMESTAMP, '${sanitizedVector}', '${sanitizedInput}', '${sanitizedOutput}', ${item.intimacy_score});
        `);

        // Update intimacy score in relational state
        await executeRun(`
          INSERT OR REPLACE INTO relational_state (key, value, last_updated)
          VALUES ('intimacy_score', '${item.intimacy_score.toFixed(2)}', CURRENT_TIMESTAMP),
                 ('current_vector', '${sanitizedVector}', CURRENT_TIMESTAMP);
        `);

        self.postMessage({
          type: 'INTIMACY_UPDATED',
          payload: { newScore: item.intimacy_score },
        });
        break;
      }

      case 'GET_FACTS': {
        const facts = await executeQuery<PartnerFact>(`SELECT * FROM partner_facts ORDER BY id DESC;`);
        self.postMessage({
          type: 'FACTS_RESULT',
          payload: facts,
        });
        break;
      }

      case 'ADD_FACT': {
        const { category, fact } = data.payload;
        const sCat = category.replace(/'/g, "''");
        const sFact = fact.replace(/'/g, "''");
        await executeRun(`
          INSERT INTO partner_facts (category, fact, discovered_at)
          VALUES ('${sCat}', '${sFact}', CURRENT_TIMESTAMP);
        `);
        const updated = await executeQuery<PartnerFact>(`SELECT * FROM partner_facts ORDER BY id DESC;`);
        self.postMessage({
          type: 'FACTS_RESULT',
          payload: updated,
        });
        break;
      }

      case 'DELETE_FACT': {
        const { id } = data.payload;
        await executeRun(`DELETE FROM partner_facts WHERE id = ${Number(id)};`);
        const updated = await executeQuery<PartnerFact>(`SELECT * FROM partner_facts ORDER BY id DESC;`);
        self.postMessage({
          type: 'FACTS_RESULT',
          payload: updated,
        });
        break;
      }

      case 'UPDATE_FACT': {
        const { id, category, fact } = data.payload;
        const sCat = category.replace(/'/g, "''");
        const sFact = fact.replace(/'/g, "''");
        await executeRun(`
          UPDATE partner_facts
          SET category = '${sCat}', fact = '${sFact}'
          WHERE id = ${Number(id)};
        `);
        const updated = await executeQuery<PartnerFact>(`SELECT * FROM partner_facts ORDER BY id DESC;`);
        self.postMessage({
          type: 'FACTS_RESULT',
          payload: updated,
        });
        break;
      }

      case 'GET_RELATIONAL_STATE': {
        const rows = await executeQuery<{ key: string; value: string }>(`SELECT key, value FROM relational_state;`);
        const stateMap: Record<string, string> = {};
        rows.forEach((r) => {
          stateMap[r.key] = r.value;
        });
        self.postMessage({
          type: 'RELATIONAL_STATE_RESULT',
          payload: stateMap,
        });
        break;
      }

      case 'SET_RELATIONAL_STATE': {
        const { key, value } = data.payload;
        const sKey = key.replace(/'/g, "''");
        const sVal = value.replace(/'/g, "''");
        await executeRun(`
          INSERT OR REPLACE INTO relational_state (key, value, last_updated)
          VALUES ('${sKey}', '${sVal}', CURRENT_TIMESTAMP);
        `);
        const rows = await executeQuery<{ key: string; value: string }>(`SELECT key, value FROM relational_state;`);
        const stateMap: Record<string, string> = {};
        rows.forEach((r) => {
          stateMap[r.key] = r.value;
        });
        self.postMessage({
          type: 'RELATIONAL_STATE_RESULT',
          payload: stateMap,
        });
        break;
      }

      case 'RESET_DB': {
        await executeRun(`
          DELETE FROM interactions;
          DELETE FROM partner_facts;
          DELETE FROM relational_state;
        `);
        // Re-seed
        await executeRun(`
          INSERT INTO relational_state (key, value, last_updated) VALUES
            ('mood', 'Curious & Warm', CURRENT_TIMESTAMP),
            ('shared_vibe', 'Cosmic Synergistic Bond', CURRENT_TIMESTAMP),
            ('inside_jokes', 'The quantum coffee spill; 4-bit hypercube whispers', CURRENT_TIMESTAMP),
            ('intimacy_score', '1.00', CURRENT_TIMESTAMP),
            ('current_vector', '0EE', CURRENT_TIMESTAMP);

          INSERT INTO partner_facts (category, fact, discovered_at) VALUES
            ('Identity', 'Companion architect exploring sovereign neuro-cognitive edge AI.', CURRENT_TIMESTAMP),
            ('Preference', 'Values deep, authentic conversations without corporate cloud intermediaries.', CURRENT_TIMESTAMP),
            ('Aesthetic', 'Appreciates clean cyberpunk minimalism, ambient lighting, and mathematical beauty.', CURRENT_TIMESTAMP);
        `);
        self.postMessage({
          type: 'OP_SUCCESS',
          payload: { operation: 'RESET_DB' },
        });
        break;
      }
    }
  }).catch((err: any) => {
    console.error('[SQLite-Worker] Execution Error:', err);
    self.postMessage({
      id,
      type: 'ERROR',
      payload: { error: err?.message || String(err) },
    });
  });
};
