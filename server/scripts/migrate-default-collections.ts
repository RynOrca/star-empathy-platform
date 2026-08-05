/**
 * 【一次性脚本】为所有用户创建「公开星笺+私密星笺」双默认合集 + 将以往未归属合集的用户故事批量移入「公开星笺」
 *
 * 用法（在 server/ 目录下执行）：
 *   npx ts-node scripts/migrate-default-collections.ts
 *
 * 执行逻辑：
 *   1) 遍历 users 表所有用户
 *   2) 对每个用户调用 getOrCreateDefaultCollections → 确保「公开星笺(public)+私密星笺(private)」都存在
 *   3) UPDATE stars: user_id = X 且 type='user' 且 collection_id IS NULL 的故事 → collection_id = 公开星笺.id
 *   4) 全程幂等（已经有 collection_id 的故事不动，重复执行安全）
 *
 * 注意：
 *   - 脚本只读/写 db，不调后端 API，不需要启动后端服务
 *   - 执行前建议备份 server/data/stars.db
 */
import db from '../src/db';
import { getOrCreateDefaultCollections } from '../src/services/collectionService';

type UserRow = { id: number; username: string };

function main() {
  console.log('\n=== 🚀 开始迁移：所有用户双默认合集（公开星笺+私密星笺） + 旧故事归入公开星笺 ===\n');

  const users = db.prepare('SELECT id, username FROM users ORDER BY id ASC').all() as UserRow[];
  if (users.length === 0) {
    console.log('⚠️  users 表为空，没有需要迁移的用户\n=== 完成（无操作）===');
    return;
  }

  let createdPublic = 0;
  let createdPrivate = 0;
  let updatedStories = 0;
  let skippedWithColl = 0;
  const errors: string[] = [];

  for (const u of users) {
    try {
      // 1) 确保该用户的「公开星笺 + 私密星笺」双默认合集都存在
      const beforeColls = (db.prepare('SELECT COUNT(*) AS cnt FROM collections WHERE user_id = ?').get(u.id) as { cnt: number }).cnt;
      const defs = getOrCreateDefaultCollections(u.id);
      const afterColls = (db.prepare('SELECT COUNT(*) AS cnt FROM collections WHERE user_id = ?').get(u.id) as { cnt: number }).cnt;
      const collDelta = afterColls - beforeColls;
      if (collDelta >= 2) { createdPublic += 1; createdPrivate += 1; }
      else if (collDelta === 1) {
        // 只新建了一个：判断缺的是公开还是私密（按 visibility 查询）
        const publicExists = db.prepare('SELECT 1 FROM collections WHERE user_id = ? AND visibility = ? LIMIT 1').get(u.id, 'public');
        const privateExists = db.prepare('SELECT 1 FROM collections WHERE user_id = ? AND visibility = ? LIMIT 1').get(u.id, 'private');
        if (!publicExists) createdPublic += 1;
        else if (!privateExists) createdPrivate += 1;
        else createdPublic += 1; // fallback：两个都有但 delta=1 说明之前就有一个，归公开计数
      }

      const publicColl = defs?.publicCollection;
      const privateColl = defs?.privateCollection;
      if (!publicColl || !publicColl.id) {
        errors.push(`用户 ${u.username}(id=${u.id}) 无法获取/创建公开星笺`);
        continue;
      }
      if (!privateColl || !privateColl.id) {
        errors.push(`用户 ${u.username}(id=${u.id}) 无法获取/创建私密星笺`);
        // 注意：只要公开星笺可用就继续迁移故事（私密没创建成功不阻塞公开星笺迁移）
      }

      // 2) 统计：该用户未归属合集的故事数（只动 type='user' 的用户故事，不动系统/历史星）
      const pendingCnt = (db.prepare(
        `SELECT COUNT(*) AS cnt FROM stars WHERE user_id = ? AND type = 'user' AND collection_id IS NULL`
      ).get(u.id) as { cnt: number }).cnt;
      const withCollCnt = (db.prepare(
        `SELECT COUNT(*) AS cnt FROM stars WHERE user_id = ? AND type = 'user' AND collection_id IS NOT NULL`
      ).get(u.id) as { cnt: number }).cnt;
      skippedWithColl += withCollCnt;

      if (pendingCnt === 0) {
        console.log(
          `  ✅ 用户#${u.id} ${u.username.padEnd(16)}  ` +
          `新建[公:${collDelta>=2 || (collDelta===1 && createdPublic>0) ? '是' : '否'} / 私:${collDelta>=2 || (collDelta===1 && createdPrivate>0) ? '是' : '否'}]  ` +
          `待迁移故事: 0（全部已归属）`
        );
        continue;
      }

      // 3) UPDATE: 把该用户 collection_id 为空的用户故事归属到「公开星笺」
      const updateInfo = db.prepare(
        `UPDATE stars SET collection_id = ? WHERE user_id = ? AND type = 'user' AND collection_id IS NULL`
      ).run(publicColl.id, u.id);
      const changed = (updateInfo as { changes?: number }).changes ?? 0;
      updatedStories += changed;

      console.log(
        `  ✨ 用户#${u.id} ${u.username.padEnd(16)}  ` +
        `新建[公:${(afterColls - beforeColls) >= 1 ? '是' : '否'} / 私:${(afterColls - beforeColls) >= 2 ? '是' : '否'}]  ` +
        `迁移故事: ${changed}/${pendingCnt}  (原有归属 ${withCollCnt} 条不动)`
      );
    } catch (e: any) {
      errors.push(`用户 ${u.username}(id=${u.id}) 迁移异常: ${e?.message || String(e)}`);
    }
  }

  console.log('\n=== 📊 迁移统计 ===');
  console.log(`  总用户数              : ${users.length}`);
  console.log(`  新建「公开星笺」数    : ${createdPublic}`);
  console.log(`  新建「私密星笺」数    : ${createdPrivate}`);
  console.log(`  迁移/归属的故事总数   : ${updatedStories}  (全部归入「公开星笺」)`);
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
