import { DatabaseSync } from 'node:sqlite';
import path from 'path';

const DB_PATH = path.join(__dirname, '../data/stars.db');
const db = new DatabaseSync(DB_PATH);

// 建表
db.exec(`
  CREATE TABLE IF NOT EXISTS stars (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    type            TEXT NOT NULL DEFAULT 'user',
    title           TEXT,
    content         TEXT NOT NULL,
    resonance_count INTEGER NOT NULL DEFAULT 0,
    pos_x           REAL NOT NULL,
    pos_y           REAL NOT NULL,
    pos_z           REAL NOT NULL,
    catalog_star_id INTEGER,
    location_lat    REAL,
    location_lng    REAL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    view_count      INTEGER NOT NULL DEFAULT 0,
    origin          TEXT,
    user_id         INTEGER REFERENCES users(id),
    tag             TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_stars_type ON stars(type);
  CREATE INDEX IF NOT EXISTS idx_stars_catalog ON stars(catalog_star_id);
  CREATE INDEX IF NOT EXISTS idx_stars_user ON stars(user_id);

  CREATE TABLE IF NOT EXISTS catalog_visits (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    catalog_star_id INTEGER NOT NULL,
    visited_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_catalog_visits ON catalog_visits(catalog_star_id);

  CREATE TABLE IF NOT EXISTS favorites (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    catalog_star_id INTEGER NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_favorites ON favorites(catalog_star_id);

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// 兼容旧数据库：添加新列
try { db.exec('ALTER TABLE stars ADD COLUMN location_lat REAL'); } catch {}
try { db.exec('ALTER TABLE stars ADD COLUMN location_lng REAL'); } catch {}
try { db.exec('ALTER TABLE stars ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE stars ADD COLUMN origin TEXT'); } catch {}
try { db.exec('ALTER TABLE stars ADD COLUMN user_id INTEGER REFERENCES users(id)'); } catch {}
try { db.exec('ALTER TABLE stars ADD COLUMN tag TEXT'); } catch {}

export default db;
