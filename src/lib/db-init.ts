import { Database } from 'better-sqlite3';

export function initDb(db: Database) {
  // Create tables if they do not exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      color TEXT NOT NULL,
      icon TEXT DEFAULT NULL,
      is_archived INTEGER DEFAULT 0,
      daily_target_hours REAL DEFAULT 2.0,
      weekly_target_hours REAL DEFAULT NULL,
      study_days_per_week INTEGER DEFAULT 5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS daily_entries (
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      UNIQUE(date, subject_id)
    );

    CREATE TABLE IF NOT EXISTS custom_columns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      column_name TEXT NOT NULL,
      column_type TEXT NOT NULL CHECK (column_type IN ('text', 'number', 'boolean', 'date')),
      applies_to TEXT NOT NULL CHECK (applies_to IN ('subjects', 'daily_entries')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(column_name, applies_to)
    );

    CREATE TABLE IF NOT EXISTS custom_column_values (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      custom_column_id INTEGER NOT NULL,
      entity_id INTEGER NOT NULL,
      value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (custom_column_id) REFERENCES custom_columns(id) ON DELETE CASCADE,
      UNIQUE(custom_column_id, entity_id)
    );
  `);

  // Run migrations for existing DB (add new columns if missing)
  const migrations = [
    `ALTER TABLE subjects ADD COLUMN daily_target_hours REAL DEFAULT 2.0`,
    `ALTER TABLE subjects ADD COLUMN weekly_target_hours REAL DEFAULT NULL`,
    `ALTER TABLE subjects ADD COLUMN study_days_per_week INTEGER DEFAULT 5`,
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch (_) { /* column already exists */ }
  }

  // Seed default subjects if none exist
  const subjectsCount = db.prepare('SELECT count(*) as count FROM subjects').get() as { count: number };
  if (subjectsCount.count === 0) {
    const defaultSubjects = [
      { name: 'Digital Electronics (Morris Mano)', color: '#3b82f6', daily_target_hours: 2.0 },
      { name: 'Circuit Theory (Hayt)',             color: '#ec4899', daily_target_hours: 2.0 },
      { name: 'NPTEL System Verilog',              color: '#10b981', daily_target_hours: 1.5 },
      { name: 'Coding (C++ / DSA)',                color: '#8b5cf6', daily_target_hours: 2.0 },
      { name: 'Principles of Electrical Engineering', color: '#f59e0b', daily_target_hours: 1.5 },
    ];

    const insertSubject = db.prepare(
      'INSERT INTO subjects (name, color, daily_target_hours) VALUES (?, ?, ?)'
    );
    for (const sub of defaultSubjects) {
      insertSubject.run(sub.name, sub.color, sub.daily_target_hours);
    }
    console.log('Seeded default subjects successfully.');
  }
}
