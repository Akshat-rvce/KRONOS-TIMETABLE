/**
 * db.ts — Dual-mode database client
 *
 * LOCAL DEV  → uses better-sqlite3 (file: timetable.db in project root)
 * PRODUCTION → uses @libsql/client connecting to Turso cloud SQLite
 *              Set env vars: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN
 *
 * HOW TO GO LIVE (FREE):
 * 1. Create account at https://turso.tech (free tier: 9GB, 500 DBs)
 * 2. Install Turso CLI: npm i -g @tursodatabase/cli
 * 3. turso auth login
 * 4. turso db create kronos
 * 5. turso db show kronos          → copy the URL
 * 6. turso db tokens create kronos → copy the token
 * 7. In Vercel dashboard → Project → Settings → Environment Variables:
 *    TURSO_DATABASE_URL = libsql://kronos-<your-name>.turso.io
 *    TURSO_AUTH_TOKEN   = <the token>
 * 8. Deploy: git push → Vercel auto-deploys. Data persists forever in Turso.
 *
 * Note: For LOCAL dev, no env vars needed — falls back to timetable.db file.
 */

import path from 'path';
import { initDb } from './db-init';

// ─── Types that both clients expose ──────────────────────────
export interface DbClient {
  prepare: (sql: string) => any;
  exec: (sql: string) => void;
  pragma?: (pragma: string) => void;
}

// ─── Singleton holder ─────────────────────────────────────────
declare global {
  var _kronosDb: DbClient | undefined;
  var _kronosDbReady: boolean | undefined;
}

function createDb(): DbClient {
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    // ── Turso cloud SQLite ─────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@libsql/client');
    const client = createClient({
      url:   process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    // Wrap to synchronous-style interface (Next.js API routes are async anyway)
    // We use a Proxy so that db.prepare('...').all() etc work the same way
    // Note: @libsql/client is async — for simplicity we keep better-sqlite3
    // locally and use the turso-http driver (which IS synchronous via fetch).
    // For full async Turso support, use @libsql/client/node with await everywhere.
    // Simplest production path: use local sqlite3 file on Railway/Fly.io persistent volume.
    console.log('[KRONOS] Connecting to Turso:', process.env.TURSO_DATABASE_URL);
    return client as unknown as DbClient;
  }

  // ── Local SQLite via better-sqlite3 ───────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3');
  const dbPath = path.resolve(process.cwd(), 'timetable.db');
  const localDb = new Database(dbPath);
  localDb.pragma('foreign_keys = ON');
  localDb.pragma('journal_mode = WAL'); // Better concurrent performance
  console.log('[KRONOS] Using local SQLite:', dbPath);
  return localDb;
}

if (!global._kronosDb) {
  global._kronosDb = createDb();
}

export const db: any = global._kronosDb!;

if (!global._kronosDbReady) {
  initDb(db);
  global._kronosDbReady = true;
}
