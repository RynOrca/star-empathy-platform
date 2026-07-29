#!/usr/bin/env node
/**
 * 安全修复 catalog_star_id 脚本
 * 
 * 功能：只修正 history 故事的 catalog_star_id 字段，不删除任何数据，
 *       不重置 resonance_count / view_count / 坐标，不碰 user 故事。
 * 
 * 用法：
 *   node scripts/fix-cids.mjs          # 干跑模式（只打印要改什么，不实际修改）
 *   node scripts/fix-cids.mjs --force  # 实际执行修复（自动备份 + 事务保障）
 * 
 * 安全保障：
 *   1. 执行前自动备份 data/stars.db → data/stars.db.before-fix-cids-<timestamp>
 *   2. 所有 UPDATE 在一个事务中，出错自动回滚
 *   3. 只更新 type='history' 且 title 能匹配 seed.ts 的记录
 *   4. 不碰 type='user'、resonance_count、view_count、pos_*、created_at
 *   5. 幂等：多次运行安全（已正确的 cid 不会重复更新）
 */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── 参数解析 ──
const DRY_RUN = !process.argv.includes('--force');
const CUSTOM_DB = (() => {
  const idx = process.argv.findIndex(a => a === '--db');
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
})();

// ── 路径 ──
const DATA_DIR = path.join(__dirname, '../data');
const DB_PATH = CUSTOM_DB || path.join(DATA_DIR, 'stars.db');
const SEED_PATH = path.join(__dirname, 'seed.ts');

if (!existsSync(DB_PATH)) {
  console.error('❌ 数据库文件不存在:', DB_PATH);
  process.exit(1);
}
if (!existsSync(SEED_PATH)) {
  console.error('❌ seed.ts 不存在:', SEED_PATH);
  process.exit(1);
}

// ── 1. 从 seed.ts 解析 title → correct_cid 映射 ──
console.log('📖 解析 seed.ts 中的正确 cid 映射...');
const seedContent = readFileSync(SEED_PATH, 'utf8');
const titleCidMap = new Map();

// 匹配 seedData 数组中每个条目: { title: 'xxx', ..., catalog_star_id: N, ... }
const entryRegex = /\{\s*title:\s*'([^']+)'[\s\S]*?catalog_star_id:\s*(-?\d+)/g;
let match;
while ((match = entryRegex.exec(seedContent)) !== null) {
  const title = match[1];
  const cid = parseInt(match[2]);
  titleCidMap.set(title, cid);
}
console.log(`   解析到 ${titleCidMap.size} 个标题→cid映射`);

// ── 2. 连接数据库 ──
const db = new DatabaseSync(DB_PATH);

// ── 3. 预检：查看当前 history 故事的 cid 状态 ──
console.log('\n🔍 预检当前数据库状态...');
const totalHistory = db.prepare("SELECT COUNT(*) as cnt FROM stars WHERE type='history'").get().cnt;
const totalUser = db.prepare("SELECT COUNT(*) as cnt FROM stars WHERE type='user'").get().cnt;
console.log(`   history故事: ${totalHistory} 条`);
console.log(`   user故事:    ${totalUser} 条`);

// 找出所有 history 故事及其当前 cid
const allHistory = db.prepare("SELECT id, title, catalog_star_id FROM stars WHERE type='history'").all();
let toFix = [];
let alreadyCorrect = 0;
let unmatched = [];

for (const story of allHistory) {
  const correctCid = titleCidMap.get(story.title);
  if (correctCid === undefined) {
    unmatched.push(story);
  } else if (correctCid !== story.catalog_star_id) {
    toFix.push({ ...story, correctCid });
  } else {
    alreadyCorrect++;
  }
}

console.log(`   已正确绑定: ${alreadyCorrect} 条`);
console.log(`   需要修正:   ${toFix.length} 条`);
console.log(`   未匹配标题: ${unmatched.length} 条`);

if (unmatched.length > 0) {
  console.log('\n   ⚠️  以下标题在seed.ts中找不到对应（可能是服务器额外数据，将被跳过）:');
  for (const s of unmatched.slice(0, 10)) {
    console.log(`     id=${s.id} cid=${s.catalog_star_id} "${s.title}"`);
  }
  if (unmatched.length > 10) console.log(`     ... 共 ${unmatched.length} 条`);
}

// ── 4. 打印要修复的条目（前20条） ──
if (toFix.length > 0) {
  console.log('\n🔧 需要修正的 cid（前20条）:');
  for (const f of toFix.slice(0, 20)) {
    console.log(`   id=${f.id} "${f.title}" cid: ${f.catalog_star_id} → ${f.correctCid}`);
  }
  if (toFix.length > 20) console.log(`   ... 共 ${toFix.length} 条`);
}

// ── 5. 干跑模式退出 ──
if (DRY_RUN) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 干跑模式（DRY RUN）：以上是将要执行的变更。');
  console.log('   确认无误后，运行: node scripts/fix-cids.mjs --force');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  db.close();
  process.exit(0);
}

// ── 6. 实际执行：先备份 ──
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const dbDir = path.dirname(DB_PATH);
const BACKUP_PATH = path.join(dbDir, `stars.db.before-fix-cids-${ts}`);
console.log(`\n💾 备份数据库到: ${BACKUP_PATH}`);
copyFileSync(DB_PATH, BACKUP_PATH);
console.log('   ✅ 备份完成');

// ── 7. 事务中执行 UPDATE ──
console.log('\n⚡ 开始修复（事务模式）...');
const updateStmt = db.prepare("UPDATE stars SET catalog_star_id = ? WHERE id = ? AND type = 'history'");

let fixed = 0;
let errors = 0;

try {
  db.exec('BEGIN TRANSACTION');

  for (const f of toFix) {
    try {
      const result = updateStmt.run(f.correctCid, f.id);
      if (result.changes > 0) fixed++;
    } catch (err) {
      console.error(`   ❌ id=${f.id} "${f.title}": ${err.message}`);
      errors++;
    }
  }

  if (errors > 0) {
    throw new Error(`有 ${errors} 条更新失败，回滚事务`);
  }

  db.exec('COMMIT');
  console.log(`   ✅ 事务提交成功，修复 ${fixed} 条记录`);
} catch (err) {
  db.exec('ROLLBACK');
  console.error(`   ❌ 事务回滚: ${err.message}`);
  console.error('   数据库未被修改，备份保留在:', BACKUP_PATH);
  db.close();
  process.exit(1);
}

// ── 8. 验证修复结果 ──
console.log('\n✅ 修复后验证:');
const stillWrong = db.prepare(`
  SELECT s.id, s.title, s.catalog_star_id
  FROM stars s
  WHERE s.type = 'history'
  AND s.title IN (${Array.from(titleCidMap.keys()).map(() => '?').join(',')})
`).all(...Array.from(titleCidMap.keys())).filter(s => s.catalog_star_id !== titleCidMap.get(s.title));

if (stillWrong.length === 0) {
  console.log('   ✅ 所有可匹配的 history 故事 cid 已正确绑定！');
} else {
  console.log(`   ⚠️  仍有 ${stillWrong.length} 条未修复（可能受并发影响）:`);
  stillWrong.forEach(s => console.log(`     id=${s.id} "${s.title}" cid=${s.catalog_star_id}`));
}

// 统计关键亮星
const keyChecks = [
  [219, '心宿二 Antares'],
  [114, '天狼星 Sirius'],
  [162, '织女星 Vega'],
  [22, '北极星 Polaris'],
  [142, '牛郎星 Altair'],
  [92, '参宿四 Betelgeuse'],
  [93, '参宿七 Rigel'],
  [175, '天津四 Deneb'],
  [266, '北河三 Pollux'],
  [199, '大角 Arcturus'],
  [386, '北落师门 Fomalhaut'],
  [329, '轩辕十四 Regulus'],
];
console.log('\n   关键亮星验证:');
for (const [cid, name] of keyChecks) {
  const count = db.prepare("SELECT COUNT(*) as cnt FROM stars WHERE catalog_star_id = ? AND type='history'").get(cid).cnt;
  console.log(`     ${name.padEnd(20)} cid=${cid} → ${count} 条故事 ${count > 0 ? '✅' : '⚠️'}`);
}

// 确认 user 故事未被修改
const userCountAfter = db.prepare("SELECT COUNT(*) as cnt FROM stars WHERE type='user'").get().cnt;
console.log(`\n   user故事数量: ${userCountAfter}（修复前: ${totalUser}）${userCountAfter === totalUser ? ' ✅ 未变动' : ' ❌ 异常！'}`);

db.close();

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🎉 修复完成！');
console.log(`   备份文件: ${BACKUP_PATH}`);
console.log('   如需回滚: 停服务后用备份文件覆盖 data/stars.db');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
