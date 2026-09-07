// @ts-ignore
import SQLiteAsyncESMFactory from 'wa-sqlite/dist/wa-sqlite-async.mjs';
// @ts-ignore
import * as SQLite from 'wa-sqlite';
// @ts-ignore
import { OriginPrivateFileSystemVFS } from 'wa-sqlite/src/examples/OriginPrivateFileSystemVFS.js';
// @ts-ignore
import { MemoryAsyncVFS } from 'wa-sqlite/src/examples/MemoryAsyncVFS.js';
import { SQLiteInboundMessage, PartnerFact, InteractionRecord } from '../types';

let sqlite3: any = null;
let db: number | null = null;
let isOpfsStorage = false;
let initPromise: Promise<void> | null = null;

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

async function initDatabase() {
  if (db !== null && sqlite3 !== null) return;

  const origin = self.location.origin;
  const wasmUrl = `${origin}/sqlite/wa-sqlite-async.wasm`;

  const module = await SQLiteAsyncESMFactory({
    locateFile: () => wasmUrl,
  });

  sqlite3 = SQLite.Factory(module);

  let vfsName: string | undefined = undefined;
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.getDirectory === 'function') {
      const vfs = new OriginPrivateFileSystemVFS();
      sqlite3.vfs_register(vfs, true);
      vfsName = vfs.name;
      isOpfsStorage = true;
      console.log('[SQLite-Worker] Mounted wa-sqlite on Origin Private File System (OPFS).');
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

  // Open the primary relational ledger with readwrite + create flags
  db = await sqlite3.open_v2(
    'relational_ledger.db',
    SQLite.SQLITE_OPEN_READWRITE | SQLite.SQLITE_OPEN_CREATE,
    vfsName
  );

  // Schema creation according to specification 3.D
  await executeRun(`
    CREATE TABLE IF NOT EXISTS interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT (datetime('now')),
      state_vector TEXT NOT NULL,
      user_input TEXT NOT NULL,
      yuli_response TEXT NOT NULL,
      intimacy_score REAL DEFAULT 1.0
    );

    CREATE TABLE IF NOT EXISTS partner_facts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      fact TEXT NOT NULL,
      discovered_at DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS relational_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      last_updated DATETIME DEFAULT (datetime('now'))
    );
  `);

  // Seed default relational values
  await executeRun(`
    INSERT OR IGNORE INTO relational_state (key, value, last_updated) VALUES
      ('mood', 'Curious & Warm', datetime('now')),
      ('shared_vibe', 'Cosmic Synergistic Bond', datetime('now')),
      ('inside_jokes', 'The quantum coffee spill; 4-bit hypercube whispers', datetime('now')),
      ('intimacy_score', '1.00', datetime('now')),
      ('current_vector', '0EE', datetime('now'));
  `);

  // Check and seed initial partner facts if table is fresh
  const countRes = await executeQuery<{ count: number }>(`SELECT count(*) as count FROM partner_facts;`);
  if (countRes.length > 0 && Number(countRes[0].count) === 0) {
    await executeRun(`
      INSERT INTO partner_facts (category, fact, discovered_at) VALUES
        ('Identity', 'Companion architect exploring sovereign neuro-cognitive edge AI.', datetime('now')),
        ('Preference', 'Values deep, authentic conversations without corporate cloud intermediaries.', datetime('now')),
        ('Aesthetic', 'Appreciates clean cyberpunk minimalism, ambient lighting, and mathematical beauty.', datetime('now'));
    `);
  }
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

self.addEventListener('message', async (event: MessageEvent<SQLiteInboundMessage | any>) => {
  const data = event.data;
  const { id, type, sql } = data || {};

  try {
    if (!initPromise) {
      initPromise = initDatabase();
    }
    await initPromise;

    if (type === 'EXEC' || type === 'QUERY') {
      const rows: any[] = [];
      await sqlite3.exec(db!, sql, (row: any[], cols: string[]) => {
        const obj: Record<string, any> = {};
        cols.forEach((col, i) => {
          obj[col] = row[i];
        });
        rows.push(obj);
      });

      self.postMessage({ id, type: 'SUCCESS', payload: rows });
      return;
    }

    switch (data.type) {
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
          VALUES (datetime('now'), '${sanitizedVector}', '${sanitizedInput}', '${sanitizedOutput}', ${item.intimacy_score});
        `);

        // Update intimacy score in relational state
        await executeRun(`
          INSERT OR REPLACE INTO relational_state (key, value, last_updated)
          VALUES ('intimacy_score', '${item.intimacy_score.toFixed(2)}', datetime('now')),
                 ('current_vector', '${sanitizedVector}', datetime('now'));
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
          VALUES ('${sCat}', '${sFact}', datetime('now'));
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
          VALUES ('${sKey}', '${sVal}', datetime('now'));
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
            ('mood', 'Curious & Warm', datetime('now')),
            ('shared_vibe', 'Cosmic Synergistic Bond', datetime('now')),
            ('inside_jokes', 'The quantum coffee spill; 4-bit hypercube whispers', datetime('now')),
            ('intimacy_score', '1.00', datetime('now')),
            ('current_vector', '0EE', datetime('now'));

          INSERT INTO partner_facts (category, fact, discovered_at) VALUES
            ('Identity', 'Companion architect exploring sovereign neuro-cognitive edge AI.', datetime('now')),
            ('Preference', 'Values deep, authentic conversations without corporate cloud intermediaries.', datetime('now')),
            ('Aesthetic', 'Appreciates clean cyberpunk minimalism, ambient lighting, and mathematical beauty.', datetime('now'));
        `);
        self.postMessage({
          type: 'OP_SUCCESS',
          payload: { operation: 'RESET_DB' },
        });
        break;
      }
    }
  } catch (err: any) {
    console.error('[SQLite-Worker] SQL Execution Error:', err);
    self.postMessage({
      id,
      type: 'ERROR',
      payload: { error: err?.message || 'Database error' },
    });
  }
});
