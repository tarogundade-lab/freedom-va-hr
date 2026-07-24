const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'freedom_va.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','va')) DEFAULT 'va',
  status TEXT NOT NULL CHECK (status IN ('active','inactive')) DEFAULT 'active',
  phone TEXT,
  cohort_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cohorts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL CHECK (status IN ('upcoming','active','completed')) DEFAULT 'upcoming',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS applicants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  source TEXT,
  cohort_id TEXT REFERENCES cohorts(id) ON DELETE SET NULL,
  stage TEXT NOT NULL CHECK (stage IN ('applied','screening','interview','training','hired','not_hired')) DEFAULT 'applied',
  notes TEXT,
  linked_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS applicant_activity (
  id TEXT PRIMARY KEY,
  applicant_id TEXT NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  from_stage TEXT,
  to_stage TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cohort_enrollments (
  id TEXT PRIMARY KEY,
  cohort_id TEXT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  applicant_id TEXT NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  attendance_pct INTEGER DEFAULT 0,
  progress_notes TEXT,
  completed INTEGER DEFAULT 0,
  UNIQUE(cohort_id, applicant_id)
);

CREATE TABLE IF NOT EXISTS onboarding_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES onboarding_templates(id) ON DELETE CASCADE,
  completed INTEGER DEFAULT 0,
  completed_at TEXT,
  UNIQUE(user_id, template_id)
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('active','inactive')) DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  va_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  role_title TEXT,
  hourly_rate REAL,
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL CHECK (status IN ('active','ended')) DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('certification','agreement','id_verification','other')) DEFAULT 'certification',
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_data TEXT NOT NULL,
  uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS hours_logs (
  id TEXT PRIMARY KEY,
  va_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  log_date TEXT NOT NULL,
  hours REAL NOT NULL,
  description TEXT,
  approved INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// Lightweight migrations: safe to run every startup, including against an
// already-deployed database that predates these columns. SQLite has no
// "ADD COLUMN IF NOT EXISTS" on older versions, so we just try/catch.
function tryAddColumn(sql) {
  try { db.exec(sql); } catch (err) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }
}
tryAddColumn(`ALTER TABLE users ADD COLUMN skills TEXT DEFAULT '[]'`);
tryAddColumn(`ALTER TABLE users ADD COLUMN weekly_capacity_hours REAL`);
tryAddColumn(`ALTER TABLE users ADD COLUMN offboarded_at TEXT`);
tryAddColumn(`ALTER TABLE users ADD COLUMN offboard_reason TEXT`);
tryAddColumn(`ALTER TABLE assignments ADD COLUMN hours_per_week REAL`);

module.exports = db;
