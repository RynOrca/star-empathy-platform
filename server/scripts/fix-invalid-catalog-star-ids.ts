/**
 * fix-invalid-catalog-star-ids.ts
 *
 * 一次性数据修复脚本：把 stars 表里 catalog_star_id 为「NULL / 负数非行星 / 不存在于 stars.json」
 * 的坏故事，随机挂到一颗有效的 catalog 星表星（正数 id，stars.json 真实存在）上，
 * 并补写 story_catalog_stars 一对多连接表。
 *
 * 用法（在项目根目录执行）：
 *   cd server
 *   npx tsx scripts/fix-invalid-catalog-star-ids.ts
 *     或：npm run fix:catalog
 *
 * 注：此脚本幂等（已修复过的数据不会被二次处理），可重复执行。
 */

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

// ─────────────────────────────── 路径解析 ───────────────────────────────

function getProjectRoot(): string {
  const cwd = process.cwd();
  if (cwd.endsWith('server') || cwd.endsWith('server/') || cwd.endsWith('server\\')) {
    return path.resolve(cwd, '..');
  }
  return cwd;
}
const PROJECT_ROOT = getProjectRoot();
const DB_PATH = path.resolve(PROJECT_ROOT, 'server/data/stars.db');
const STARS_JSON = path.resolve(PROJECT_ROOT, 'client/src/data/stars.json');
const PLANET_IDS = new Set([-1, -2, -3, -4, -5, -6, -7, -8]); // 与 narrative.PLANET_MAP 对齐

// ─────────────────────────────── 工具函数 ───────────────────────────────

function loadValidCatalogIds(): Set<number> {
  if (!fs.existsSync(STARS_JSON)) {
    console.error(`❌ 找不到 stars.json：${STARS_JSON}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(STARS_JSON, 'utf-8');
  const obj = JSON.parse(raw) as { stars?: Array<{ id: number }> };
  const arr = Array.isArray(obj?.stars) ? obj.stars : [];
  const set = new Set<number>();
  for (const s of arr) if (Number.isFinite(s.id) && s.id > 0) set.add(s.id);
  console.log(`[catalog] 有效星表星 id 数量：${set.size} 颗`);
  return set;
}

function pickRandomCatalogId(valid: Set<number>): number {
  const arr = Array.from(valid);
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─────────────────────────────── 主流程 ───────────────────────────────

interface BadRow {
  id: number;
  title: string | null;
  catalog_star_id: number | null;
  type: string;
}

function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`❌ 找不到 stars.db：${DB_PATH}`);
    process.exit(1);
  }
  const db = new DatabaseSync(DB_PATH);
  const validIds = loadValidCatalogIds();

  // ─── ① 统计修复前数据 ──────────────────────────────────────────
  const total: number = (db.prepare('SELECT COUNT(*) as c FROM stars').get() as { c: number }).c;
  const nullCount: number = (
    db.prepare('SELECT COUNT(*) as c FROM stars WHERE catalog_star_id IS NULL').get() as { c: number }
  ).c;

  const badNegNonPlanet = (
    db.prepare(`SELECT COUNT(*) as c FROM stars
                WHERE catalog_star_id IS NOT NULL
                  AND catalog_star_id < 0
                  AND catalog_star_id NOT IN (${Array.from(PLANET_IDS).join(',')})`).get() as { c: number }
  ).c;

  // catalog_star_id>0 但不在 stars.json（有效 ids）里的
  const badPosNotIn = (
    db.prepare(`SELECT catalog_star_id FROM stars WHERE catalog_star_id IS NOT NULL AND catalog_star_id > 0`).all() as unknown as Array<{ catalog_star_id: number }>
  ).filter(r => !validIds.has(r.catalog_star_id)).length;

  const beforeBad = nullCount + badNegNonPlanet + badPosNotIn;
  console.log(`\n[修复前] 总记录数：${total}`);
  console.log(`  · catalog_star_id IS NULL            : ${nullCount} 条`);
  console.log(`  · catalog_star_id < 0（非行星负id） : ${badNegNonPlanet} 条`);
  console.log(`  · catalog_star_id > 0（星表不存在） : ${badPosNotIn} 条`);
  console.log(`  ────────────────────────────────────────────────`);
  console.log(`  · 合计需要修复                       : ${beforeBad} 条`);

  if (beforeBad === 0) {
    console.log('\n✅ 没有需要修复的记录，脚本退出。');
    db.close();
    return;
  }

  // ─── ② 查所有坏故事 id + catalog_star_id ──────────────────────
  const allRows = db.prepare('SELECT id, title, catalog_star_id, type FROM stars').all() as unknown as BadRow[];
  const badRows = allRows.filter(r => {
    if (r.catalog_star_id == null) return true;
    if (r.catalog_star_id < 0) return !PLANET_IDS.has(r.catalog_star_id);
    return !validIds.has(r.catalog_star_id);
  });

  // prepared statements
  const updateStar = db.prepare(
    `UPDATE stars SET catalog_star_id = ? WHERE id = ?`
  );
  const insertLink = db.prepare(
    `INSERT OR IGNORE INTO story_catalog_stars (story_id, catalog_star_id, is_primary)
     VALUES (?, ?, 1)`
  );
  const hasLink = db.prepare(
    `SELECT COUNT(*) as c FROM story_catalog_stars WHERE story_id = ? AND catalog_star_id = ?`
  );

  let fixed = 0;
  let linksAdded = 0;

  console.log(`\n[开始修复] 共 ${badRows.length} 条坏故事 → 随机挂到 catalog 星表星...\n`);
  db.exec('BEGIN');
  try {
    for (const row of badRows) {
      const newCid = pickRandomCatalogId(validIds);
      updateStar.run(newCid, row.id);
      fixed++;
      // 补写连接表（如果没有的话）
      const existed = (hasLink.get(row.id, newCid) as { c: number }).c;
      if (!existed) {
        insertLink.run(row.id, newCid);
        linksAdded++;
      }
      const titleShort = (row.title || '').slice(0, 20).padEnd(20, ' ');
      console.log(
        `  ✓ story=${String(row.id).padStart(5)}  "${titleShort}"  ` +
        `cid ${row.catalog_star_id ?? 'NULL'} → ${newCid}  (type=${row.type})`
      );
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    console.error('\n❌ 修复过程出错，已回滚：', e);
    process.exit(1);
  }

  // ─── ③ 修复后统计 ──────────────────────────────────────────────
  const afterNull = (
    db.prepare('SELECT COUNT(*) as c FROM stars WHERE catalog_star_id IS NULL').get() as { c: number }
  ).c;
  const afterBad =
    afterNull +
    (db.prepare(`SELECT COUNT(*) as c FROM stars
                 WHERE catalog_star_id IS NOT NULL
                   AND catalog_star_id < 0
                   AND catalog_star_id NOT IN (${Array.from(PLANET_IDS).join(',')})`).get() as { c: number }).c +
    (db.prepare(`SELECT catalog_star_id FROM stars WHERE catalog_star_id IS NOT NULL AND catalog_star_id > 0`).all() as unknown as Array<{ catalog_star_id: number }>)
      .filter(r => !validIds.has(r.catalog_star_id)).length;

  console.log(`\n[修复后] 剩余坏记录：${afterBad} 条`);
  console.log(`  · stars 表修复行数                : ${fixed} 条`);
  console.log(`  · 新增 story_catalog_stars 关联   : ${linksAdded} 条`);
  console.log(`\n✅ 修复完成！`);
  db.close();
}

main();
