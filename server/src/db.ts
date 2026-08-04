import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

function resolveDbPath(): string {
  const candidates = [
    path.join(__dirname, '../data/stars.db'),
    path.join(__dirname, '../../data/stars.db'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  const finalPath = candidates[candidates.length - 1];
  const dataDir = path.dirname(finalPath);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return finalPath;
}

const DB_PATH = resolveDbPath();
const db = new DatabaseSync(DB_PATH);

// 建表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    email         TEXT,
    signature     TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

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
    tag             TEXT,
    image_url       TEXT,
    tags            TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_stars_type ON stars(type);
  CREATE INDEX IF NOT EXISTS idx_stars_catalog ON stars(catalog_star_id);

  CREATE TABLE IF NOT EXISTS catalog_visits (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    catalog_star_id INTEGER NOT NULL,
    visited_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_catalog_visits ON catalog_visits(catalog_star_id);

  CREATE TABLE IF NOT EXISTS favorites (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    catalog_star_id INTEGER NOT NULL,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(catalog_star_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_favorites ON favorites(catalog_star_id);

  CREATE TABLE IF NOT EXISTS narratives (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    catalog_star_id INTEGER NOT NULL,
    content         TEXT NOT NULL,
    generated_at    TEXT NOT NULL DEFAULT (datetime('now')),
    is_visible      INTEGER NOT NULL DEFAULT 1
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_narratives_day ON narratives(catalog_star_id, date(generated_at), is_visible);

  CREATE TABLE IF NOT EXISTS story_kernels (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id        INTEGER NOT NULL UNIQUE REFERENCES stars(id),
    emotional_tags  TEXT NOT NULL DEFAULT '[]',
    essence         TEXT NOT NULL DEFAULT '',
    themes          TEXT NOT NULL DEFAULT '[]',
    generated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_story_kernels_story ON story_kernels(story_id);

  CREATE TABLE IF NOT EXISTS story_catalog_stars (
    story_id        INTEGER NOT NULL REFERENCES stars(id),
    catalog_star_id INTEGER NOT NULL,
    is_primary      INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (story_id, catalog_star_id)
  );
  CREATE INDEX IF NOT EXISTS idx_scs_story ON story_catalog_stars(story_id);
  CREATE INDEX IF NOT EXISTS idx_scs_catalog ON story_catalog_stars(catalog_star_id);

  CREATE TABLE IF NOT EXISTS token_blacklist (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at);

  CREATE TABLE IF NOT EXISTS resonance_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id   INTEGER NOT NULL REFERENCES stars(id),
    user_id    INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(story_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_resonance_log_story ON resonance_log(story_id);

  CREATE TABLE IF NOT EXISTS story_views (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id  INTEGER NOT NULL REFERENCES stars(id),
    user_id   INTEGER NOT NULL REFERENCES users(id),
    viewed_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_story_views_dedup ON story_views(story_id, user_id);

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT NOT NULL,
    code       TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used       INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_password_reset_email ON password_reset_tokens(email, expires_at);

  CREATE TABLE IF NOT EXISTS moon_insights (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    phase_label  TEXT NOT NULL,
    lunar_day    TEXT NOT NULL,
    content      TEXT NOT NULL,
    generated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_moon_insights_day ON moon_insights(phase_label, lunar_day, date(generated_at));

  -- AI 预生成的单星分析结果（门户首页 + 情感 + 主题时辰）
  CREATE TABLE IF NOT EXISTS catalog_star_analyses (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    catalog_star_id   TEXT NOT NULL UNIQUE,
    persona_json      TEXT,
    emotion_json      TEXT,
    themehour_json    TEXT,
    story_count       INTEGER NOT NULL DEFAULT 0,
    story_hash        TEXT,
    generated_at      INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_csa_star ON catalog_star_analyses(catalog_star_id);
`);

// 兼容旧数据库：添加新列
try { db.exec('ALTER TABLE users ADD COLUMN signature TEXT'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN email TEXT'); } catch {}
try { db.exec('ALTER TABLE stars ADD COLUMN location_lat REAL'); } catch {}
try { db.exec('ALTER TABLE stars ADD COLUMN location_lng REAL'); } catch {}
try { db.exec('ALTER TABLE stars ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE stars ADD COLUMN origin TEXT'); } catch {}
try { db.exec('ALTER TABLE stars ADD COLUMN user_id INTEGER REFERENCES users(id)'); } catch {}
try { db.exec('ALTER TABLE stars ADD COLUMN tag TEXT'); } catch {}
// 兼容旧数据库：favorites 表加 user_id 列
try { db.exec('ALTER TABLE favorites ADD COLUMN user_id INTEGER REFERENCES users(id)'); } catch {}
try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_unique ON favorites(catalog_star_id, user_id)'); } catch {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id)'); } catch {}
// 兼容旧数据库：narratives 表
try { db.exec('CREATE TABLE IF NOT EXISTS narratives (id INTEGER PRIMARY KEY AUTOINCREMENT, catalog_star_id INTEGER NOT NULL, content TEXT NOT NULL, generated_at TEXT NOT NULL DEFAULT (datetime(\'now\')))'); } catch {}
try { db.exec('ALTER TABLE narratives ADD COLUMN is_visible INTEGER NOT NULL DEFAULT 1'); } catch {}
try { db.exec('DROP INDEX IF EXISTS idx_narratives_day'); } catch {}
try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_narratives_day ON narratives(catalog_star_id, date(generated_at), is_visible)'); } catch {}
// 兼容旧数据库：添加新索引
try { db.exec('CREATE INDEX IF NOT EXISTS idx_stars_user ON stars(user_id)'); } catch {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_stars_created ON stars(created_at)'); } catch {}
// 兼容旧数据库：catalog_visits 加 user_id 列
try { db.exec('ALTER TABLE catalog_visits ADD COLUMN user_id INTEGER REFERENCES users(id)'); } catch {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_catalog_visits_user ON catalog_visits(user_id)'); } catch {}
// 兼容旧数据库：stars 加 is_anonymous 列
try { db.exec('ALTER TABLE stars ADD COLUMN is_anonymous INTEGER NOT NULL DEFAULT 0'); } catch {}
// 兼容旧数据库：stars 加 image_url 列
try { db.exec('ALTER TABLE stars ADD COLUMN image_url TEXT'); } catch {}
// 兼容旧数据库：stars 加 tags JSON 列（多标签数组）
try { db.exec('ALTER TABLE stars ADD COLUMN tags TEXT'); } catch {}

// 兼容旧数据库：迁移 story_catalog_stars 连接表（幂等）
try {
  db.exec(`
    INSERT OR IGNORE INTO story_catalog_stars (story_id, catalog_star_id, is_primary)
    SELECT id, catalog_star_id, 1
    FROM stars
    WHERE catalog_star_id IS NOT NULL
  `);
} catch {}

export default db;
