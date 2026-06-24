import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.resolve(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'eater.db');

let dbInstance: Database | null = null;

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

function saveDb(db: Database) {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Debounced persistence: rapid mutations (swipes, slider ticks, toggles) are
// coalesced into a single disk write instead of writing the whole DB file
// synchronously on every request, which blocked the event loop and made the
// app feel laggy. The in-memory DB is always up to date immediately; only the
// flush to disk is debounced (~300 ms after the last write).
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 300;

export async function initDB(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  // Enable foreign keys
  dbInstance.run('PRAGMA foreign_keys = ON');

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      image_url     TEXT NOT NULL,
      location      TEXT NOT NULL,
      category      TEXT NOT NULL,
      rating        REAL NOT NULL DEFAULT 0.0,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS groups (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL UNIQUE,
      icon_url      TEXT NOT NULL,
      members       INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS friends (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      avatar_url    TEXT NOT NULL,
      is_favorite   INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS swipes (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id INTEGER NOT NULL,
      direction     TEXT NOT NULL CHECK(direction IN ('like', 'reject')),
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key           TEXT PRIMARY KEY,
      value         TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS group_restaurants (
      group_id       INTEGER NOT NULL,
      restaurant_id  INTEGER NOT NULL,
      PRIMARY KEY (group_id, restaurant_id),
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS group_members (
      group_id     INTEGER NOT NULL,
      friend_id    INTEGER NOT NULL,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (group_id, friend_id),
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (friend_id) REFERENCES friends(id) ON DELETE CASCADE
    );
  `);

  // Migration: lat/lon ergänzen (für echte OSM-Daten + spätere Radius-Filter).
  migrateColumns(dbInstance);

  saveDb(dbInstance);
  return dbInstance;
}

// Fügt fehlende Spalten schrittweise zu einer bestehenden DB hinzu.
function migrateColumns(db: Database): void {
  const cols = new Set<string>(
    (db.exec('PRAGMA table_info(restaurants)')[0]?.values ?? []).map((r) => String(r[1]))
  );
  if (!cols.has('lat')) db.run('ALTER TABLE restaurants ADD COLUMN lat REAL');
  if (!cols.has('lon')) db.run('ALTER TABLE restaurants ADD COLUMN lon REAL');
  if (!cols.has('osm_type')) db.run('ALTER TABLE restaurants ADD COLUMN osm_type TEXT');
  if (!cols.has('osm_id')) db.run('ALTER TABLE restaurants ADD COLUMN osm_id INTEGER');
}

export function getDb(): Database {
  if (!dbInstance) throw new Error('Database not initialized. Call initDB() first.');
  return dbInstance;
}

export function save(): void {
  if (!dbInstance) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveDb(dbInstance!);
    saveTimer = null;
  }, SAVE_DEBOUNCE_MS);
}

// Force an immediate flush (e.g. on shutdown). Waits for the write to finish.
export function flushNow(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (dbInstance) saveDb(dbInstance);
}