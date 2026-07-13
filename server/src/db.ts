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
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_stars_type ON stars(type);
  CREATE INDEX IF NOT EXISTS idx_stars_catalog ON stars(catalog_star_id);
`);

export default db;
