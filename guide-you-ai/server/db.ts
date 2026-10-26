import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

let db: Database;
const DB_FILE_PATH = path.resolve(process.cwd(), 'data', 'guide_you_ai.sqlite');

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export interface ProjectRecord {
  id: string;
  user_id: string;
  project_name: string;
  upload_date: string;
  status: 'Pending Module 1' | 'Review Scheduled' | 'In Review' | 'Revision Needed' | 'Completed';
  completion_percentage: number;
  summary?: string;
  tech_stack?: string;
  flowchart_json?: string;
  created_at: string;
  updated_at: string;
}

export interface ModuleRecord {
  id: string;
  project_id: string;
  module_number: number;
  title: string;
  description: string;
  key_deliverables: string; // JSON array of string checklist items
  status: 'pending' | 'in_progress' | 'completed' | 'revised';
  completed_at?: string;
}

export interface ReviewRecord {
  id: string;
  project_id: string;
  review_round: number;
  scheduled_date: string;
  google_meet_link: string;
  status: 'scheduled' | 'in_session' | 'completed' | 'cancelled';
  admin_feedback?: string;
  ai_analysis?: string;
  next_steps?: string; // JSON array or formatted markdown
  completed_at?: string;
  created_at: string;
}

export interface EmailLogRecord {
  id: string;
  project_id: string;
  recipient_name: string;
  recipient_email: string;
  subject: string;
  body_html: string;
  meet_link: string;
  review_round: number;
  type: 'initial_breakdown' | 'round_update' | 'completion_congrats' | 'reminder';
  sent_at: string;
}

export async function initDatabase(): Promise<Database> {
  if (db) return db;

  const dataDir = path.dirname(DB_FILE_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE_PATH)) {
    const fileBuffer = fs.readFileSync(DB_FILE_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create Schema Tables: Users, Projects, Modules, Reviews, EmailLogs
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'student',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_name TEXT NOT NULL,
      upload_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending Module 1',
      completion_percentage INTEGER NOT NULL DEFAULT 0,
      summary TEXT,
      tech_stack TEXT,
      flowchart_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      module_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      key_deliverables TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      completed_at TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      review_round INTEGER NOT NULL,
      scheduled_date TEXT NOT NULL,
      google_meet_link TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      admin_feedback TEXT,
      ai_analysis TEXT,
      next_steps TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS email_logs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body_html TEXT NOT NULL,
      meet_link TEXT NOT NULL,
      review_round INTEGER NOT NULL DEFAULT 1,
      type TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  saveDatabase();
  return db;
}

export function saveDatabase() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE_PATH, buffer);
  } catch (err) {
    console.error('Error saving SQLite database to disk:', err);
  }
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// Helper query wrappers
export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  const database = getDatabase();
  const stmt = database.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const all = queryAll<T>(sql, params);
  return all.length > 0 ? all[0] : null;
}

export function runSql(sql: string, params: any[] = []): void {
  const database = getDatabase();
  database.run(sql, params);
  saveDatabase();
}
