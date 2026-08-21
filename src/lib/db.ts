import path from 'path';

export interface RunResult {
  lastInsertRowid: number;
  changes: number;
}

let tursoClient: any = null;
let initPromise: Promise<void> | null = null;

function isTursoConfigured(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
}

function getTursoClient() {
  if (!tursoClient) {
    if (!isTursoConfigured()) {
      throw new Error('[KRONOS] TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set');
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@libsql/client/web');
    tursoClient = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });
    console.log('[KRONOS] Connected to Turso cloud SQLite');
  }
  return tursoClient;
}

/**
 * Execute raw SQL script
 */
export async function exec(sql: string): Promise<void> {
  await ensureDb();
  const client = getTursoClient();
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  for (const stmt of statements) {
    await client.execute(stmt);
  }
}

/**
 * Run a parameterized query and return all matching rows as plain objects
 */
export async function queryAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  await ensureDb();
  const client = getTursoClient();
  const res = await client.execute({ sql, args: params });
  return (res.rows || []).map((row: any) => {
    const obj: any = {};
    for (const col of res.columns) {
      obj[col] = row[col];
    }
    return obj as T;
  });
}

/**
 * Run a parameterized query and return the first matching row, or null if none
 */
export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  await ensureDb();
  const rows = await queryAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Run an INSERT/UPDATE/DELETE mutation
 */
export async function run(sql: string, params: any[] = []): Promise<RunResult> {
  await ensureDb();
  const client = getTursoClient();
  const res = await client.execute({ sql, args: params });
  return {
    lastInsertRowid: Number(res.lastInsertRowid ?? 0),
    changes: res.rowsAffected ?? 0,
  };
}

/**
 * Seed default subjects for a newly registered user
 */
export async function seedDefaultSubjects(userId: number): Promise<void> {
  const defaultSubjects = [
    { name: 'Digital Electronics (Morris Mano)', color: '#3b82f6', daily_target_hours: 2.0 },
    { name: 'Circuit Theory (Hayt)',             color: '#ec4899', daily_target_hours: 2.0 },
    { name: 'NPTEL System Verilog',              color: '#10b981', daily_target_hours: 1.5 },
    { name: 'Coding (C++ / DSA)',                color: '#8b5cf6', daily_target_hours: 2.0 },
    { name: 'Principles of Electrical Engineering', color: '#f59e0b', daily_target_hours: 1.5 },
  ];
  for (const sub of defaultSubjects) {
    const sql = 'INSERT INTO subjects (name, color, daily_target_hours, user_id) VALUES (?, ?, ?, ?)';
    await getTursoClient().execute({ sql, args: [sub.name, sub.color, sub.daily_target_hours, userId] });
  }
  console.log(`[KRONOS] Seeded default subjects for user ${userId}`);
}

/**
 * Initialize database tables and migrations (self-healing, runs once)
 */
async function performInit(): Promise<void> {
  const tables = [
    // Users table for multi-account authentication
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_url TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT DEFAULT NULL,
      is_archived INTEGER DEFAULT 0,
      daily_target_hours REAL DEFAULT 2.0,
      weekly_target_hours REAL DEFAULT NULL,
      study_days_per_week INTEGER DEFAULT 5,
      user_id INTEGER DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS daily_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      subject_id INTEGER NOT NULL,
      target_hours REAL NOT NULL DEFAULT 0.0,
      hours_completed REAL NOT NULL DEFAULT 0.0,
      start_time TEXT,
      end_time TEXT,
      topics_covered TEXT,
      notes TEXT,
      status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed', 'skipped')),
      focus_rating INTEGER,
      interruptions INTEGER DEFAULT 0,
      user_id INTEGER DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS custom_columns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      column_name TEXT NOT NULL,
      column_type TEXT NOT NULL CHECK (column_type IN ('text', 'number', 'boolean', 'date')),
      applies_to TEXT NOT NULL CHECK (applies_to IN ('subjects', 'daily_entries')),
      user_id INTEGER DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS custom_column_values (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      custom_column_id INTEGER NOT NULL,
      entity_id INTEGER NOT NULL,
      value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (custom_column_id) REFERENCES custom_columns(id) ON DELETE CASCADE,
      UNIQUE(custom_column_id, entity_id)
    )`
  ];

  for (const t of tables) {
    await getTursoClient().execute(t);
  }

  // Column migrations (multi-user upgrades)
  const migrations = [
    `ALTER TABLE subjects ADD COLUMN daily_target_hours REAL DEFAULT 2.0`,
    `ALTER TABLE subjects ADD COLUMN weekly_target_hours REAL DEFAULT NULL`,
    `ALTER TABLE subjects ADD COLUMN study_days_per_week INTEGER DEFAULT 5`,
    `ALTER TABLE subjects ADD COLUMN user_id INTEGER DEFAULT NULL`,
    `ALTER TABLE daily_entries ADD COLUMN user_id INTEGER DEFAULT NULL`,
    `ALTER TABLE custom_columns ADD COLUMN user_id INTEGER DEFAULT NULL`,
  ];
  for (const sql of migrations) {
    try {
      await getTursoClient().execute(sql);
    } catch {
      // Column already exists
    }
  }
}

export async function ensureDb(): Promise<void> {
  if (!initPromise) {
    initPromise = performInit().catch(err => {
      initPromise = null;
      console.error('[KRONOS] DB init error:', err);
      throw err;
    });
  }
  return initPromise;
}
