/**
 * 【一次性脚本】为所有用户创建默认合集 + 将以往所有未归属合集的用户故事批量移入默认合集
 *
 * 用法（在 server/ 目录下执行）：
 *   npx ts-node scripts/migrate-default-collections.ts
 *
 * 执行逻辑：
 *   1) 遍历 users 表所有用户
 *   2) 对每个用户调用 ensureDefaultCollection → 确保至少有一个「我的默认合集」（没就创建）
 *   3) UPDATE stars: user_id = X 且 type='user' 且 collection_id IS NULL 的故事 → collection_id = 默认合集.id
 *   4) 全程幂等（已经有 collection_id 的故事不动，重复执行安全）
 *
 * 注意：
 *   - 脚本只读/写 db，不调后端 API，不需要启动后端服务
 *   - 执行前建议备份 server/data/stars.db
 */
import db from '../src/db';
import { ensureDefaultCollection } from '../src/services/collectionService';

type UserRow = { id: number; username: string };

function main() {
  console.log('\n=== 🚀 开始迁移：所有用户默认合集 + 旧故事归属 ===\n');

  const users = db.prepare('SELECT id, username FROM users ORDER BY id ASC').all() as UserRow[];
  if (users.length === 0) {
    console.log('⚠️  users 表为空，没有需要迁移的用户\n=== 完成（无操作）===');
    return;
  }

  let createdCollections = 0;
  let updatedStories = 0;
  let skippedWithColl = 0;
  const errors: string[] = [];

  for (const u of users) {
    try {
      // 1) 确保该用户至少有一个默认合集（没就创建）
      const beforeColls = (db.prepare('SELECT COUNT(*) AS cnt FROM collections WHERE user_id = ?').get(u.id) as { cnt: number }).cnt;
      const defaultColl = ensureDefaultCollection(u.id);
      const afterColls = (db.prepare('SELECT COUNT(*) AS cnt FROM collections WHERE user_id = ?').get(u.id) as { cnt: number }).cnt;
      if (afterColls > beforeColls) createdCollections += 1;

      if (!defaultColl || !defaultColl.id) {
        errors.push(`用户 ${u.username}(id=${u.id}) 无法获取/创建默认合集`);
        continue;
      }

      // 2) 统计：该用户未归属合集的故事数（只动 type='user' 的用户故事，不动系统/历史星）
      const pendingCnt = (db.prepare(
        `SELECT COUNT(*) AS cnt FROM stars WHERE user_id = ? AND type = 'user' AND collection_id IS NULL`
      ).get(u.id, u.id) as { cnt: number }).cnt;
      const withCollCnt = (db.prepare(
        `SELECT COUNT(*) AS cnt FROM stars WHERE user_id = ? AND type = 'user' AND collection_id IS NOT NULL`
      ).get(u.id, u.id) as { cnt: number }).cnt;
      skippedWithColl += withCollCnt;

      if (pendingCnt === 0) {
        console.log(`  ✅ 用户#${u.id} ${u.username.padEnd(16)}  新创建合集: ${afterColls > beforeColls ? '是' : '否'}  待迁移故事: 0（全部已归属）`);
        continue;
      }

      // 3) UPDATE: 把该用户 collection_id 为空的用户故事归属到默认合集
      const updateInfo = db.prepare(
        `UPDATE stars SET collection_id = ? WHERE user_id = ? AND type = 'user' AND collection_id IS NULL`
      ).run(defaultColl.id, u.id, u.id);
      const changed = (updateInfo as { changes?: number }).changes ?? 0;
      updatedStories += changed;

      console.log(
        `  ✨ 用户#${u.id} ${u.username.padEnd(16)}  新创建合集: ${afterColls > beforeColls ? '是' : '否'}  迁移故事: ${changed}/${pendingCnt}  (原有归属 ${withCollCnt} 条不动)`
      );
    } catch (e: any) {
      errors.push(`用户 ${u.username}(id=${u.id}) 迁移异常: ${e?.message || String(e)}`);
    }
  }

  console.log('\n=== 📊 迁移统计 ===');
  console.log(`  总用户数              : ${users.length}`);
  console.log(`  新建默认合集数        : ${createdCollections}`);
  console.log(`  迁移/归属的故事总数   : ${updatedStories}`);
  console.log(`  已归属合集跳过的故事  : ${skippedWithColl}`);
  if (errors.length) {
    console.log(`\n❌ 错误 (${errors.length}):`);
    errors.forEach((m) => console.log('   -', m));
  } else {
    console.log('\n✅ 全部迁移完成，无错误');
  }
  console.log('');
}

main();
