/**
 * 【默认合集重构 CLI 工具】
 *
 * 规则（需求 1+2）：
 *   1. 每个用户必有两本「系统级默认合集」（is_default=1）
 *      - 默认公开合集：name = `{用户名}的默认公开合集`，visibility = 'public'
 *      - 默认私有合集：name = `默认私有合集`，                visibility = 'private'
 *   2. 默认合集不可删除、不可改变可见性（脚本层强制修 name/visibility；接口层在 service 层拦截）
 *
 * 用法（在 server/ 目录下执行）：
 *   # 1) 确保每个用户都有两本默认合集（已有就修正 name/is_default/visibility/sort_order；没有就新建）
 *   npm run default-collections ensure
 *
 *   # 2) 只修正现有默认合集的 name/visibility（不新建，适合改了用户名后同步改名）
 *   npm run default-collections reset-names
 *
 *   # 3) 单独处理某个用户（排错用，userId 传整数）
 *   npm run default-collections user 123
 *
 *   # 4) dry-run：只打印将要做的改动，不写 DB
 *   npm run default-collections ensure -- --dry
 *   npm run default-collections reset-names -- --dry
 *
 * 全程幂等（重复执行不会乱加重复默认合集），执行前建议备份 server/data/stars.db。
 */
import db from '../src/db';

type UserRow = { id: number; username: string };
type CollRow = {
  id: number; user_id: number; name: string; visibility: string;
  is_default: number; sort_order: number; cover_color: string | null;
  description: string | null; created_at: string;
};

const PUBLIC_DEFAULT_DESC = '默认收纳所有未指定合集的公开故事，公开可见';
const PRIVATE_DEFAULT_DESC = '收纳仅自己可见的私密心事，不对外展示';
const PUBLIC_DEFAULT_COLOR = '#E8B86D';   // 暖金（原默认色，星空感）
const PRIVATE_DEFAULT_COLOR = '#6A7ACB';  // 星靛蓝（私密夜色感）

function publicNameOf(username: string): string {
  return `${username}的默认公开合集`;
}
function privateNameOf(_username: string): string {
  return `默认私有合集`; // 不带用户名（用户原文：「私有为默认私有合集」）
}

type Mode = 'ensure' | 'reset-names' | 'user';
interface RunOpts {
  mode: Mode;
  targetUserId?: number;
  dryRun: boolean;
}

let STAT = {
  usersScanned: 0, usersTouched: 0,
  defaultPublicCreated: 0, defaultPrivateCreated: 0,
  nameCorrected: 0, visibilityCorrected: 0, defaultFlagged: 0, sortOrderFixed: 0,
  errors: [] as string[],
};

function logUser(u: UserRow, msg: string) {
  console.log(`  · 用户#${String(u.id).padStart(4)} ${u.username.padEnd(18)}  ${msg}`);
}

/**
 * 处理单个用户的两本默认合集：
 *   mode=ensure       : 确保存在 + 修 name/vis/is_default/so（默认命令）
 *   mode=reset-names  : 仅修正已存在默认合集的 name/vis（不新建）
 */
function handleUser(u: UserRow, opts: RunOpts) {
  STAT.usersScanned += 1;
  const wantPublicName = publicNameOf(u.username);
  const wantPrivateName = privateNameOf(u.username);
  let touched = false;
  const logsThisUser: string[] = [];

  const all = db.prepare('SELECT * FROM collections WHERE user_id = ?').all(u.id) as CollRow[];

  // ── 1) 命中候选：先找 is_default=1 的行，没有就 fallback 找第一个同 visibility ──
  let publicRow: CollRow | undefined = all.find(c => c.is_default === 1 && c.visibility === 'public');
  let privateRow: CollRow | undefined = all.find(c => c.is_default === 1 && c.visibility === 'private');

  if (!publicRow) {
    // 候选 2：名字精确命中（历史上手动建过同名但没 is_default 标）
    publicRow = all.find(c => c.visibility === 'public' && c.name === wantPublicName);
  }
  if (!publicRow) {
    // 候选 3：老系统默认名「公开星笺/我的默认合集」等公开合集，复用它避免重复
    publicRow = all.find(c => c.visibility === 'public' && (
      c.name === '公开星笺' || c.name === '我的默认合集' || c.name.includes('默认公开')
    ));
  }
  if (!publicRow) {
    // 候选 4：第一个公开合集
    publicRow = all.find(c => c.visibility === 'public');
  }

  if (!privateRow) {
    privateRow = all.find(c => c.visibility === 'private' && c.name === wantPrivateName);
  }
  if (!privateRow) {
    privateRow = all.find(c => c.visibility === 'private' && (
      c.name === '私密星笺' || c.name.includes('默认私有')
    ));
  }
  if (!privateRow) {
    privateRow = all.find(c => c.visibility === 'private');
  }

  // ── 2) 对每本候选行：修 is_default / name / visibility / sort_order ──
  const run = (sql: string, params: any[], tag: string) => {
    if (opts.dryRun) { logsThisUser.push(`DRY · ${tag}`); return; }
    const info = db.prepare(sql).run(...params);
    if ((info as any)?.changes) touched = true;
  };

  function applyCorrections(
    row: CollRow | undefined,
    wantVisibility: 'public' | 'private',
    wantName: string,
    wantSort: 0 | 1,
    label: string,
  ): CollRow | undefined {
    // ① 不存在 → 按 mode 决定要不要新建
    if (!row) {
      if (opts.mode === 'reset-names') {
        logsThisUser.push(`⚠️ ${label}：没有找到默认合集（reset-names 模式不新建，跳过）`);
        return undefined;
      }
      logsThisUser.push(`✨ ${label}：新建 name="${wantName}" vis=${wantVisibility} sort=${wantSort} is_default=1`);
      if (!opts.dryRun) {
        const created = db.prepare(`
          INSERT INTO collections (user_id, name, description, cover_color, visibility, sort_order, is_default, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
        `).run(
          u.id, wantName,
          wantVisibility === 'public' ? PUBLIC_DEFAULT_DESC : PRIVATE_DEFAULT_DESC,
          wantVisibility === 'public' ? PUBLIC_DEFAULT_COLOR : PRIVATE_DEFAULT_COLOR,
          wantVisibility, wantSort,
        );
        const newId = created.lastInsertRowid as number;
        STAT.defaultPublicCreated += wantVisibility === 'public' ? 1 : 0;
        STAT.defaultPrivateCreated += wantVisibility === 'private' ? 1 : 0;
        touched = true;
        row = db.prepare('SELECT * FROM collections WHERE id = ?').get(newId) as CollRow;
      } else {
        STAT.defaultPublicCreated += wantVisibility === 'public' ? 1 : 0;
        STAT.defaultPrivateCreated += wantVisibility === 'private' ? 1 : 0;
      }
      return row;
    }

    // ② 存在 → 逐项修正（幂等）
    const changes: { sql: string; params: any[]; tag: string }[] = [];

    if (row.is_default !== 1) {
      changes.push({
        sql: 'UPDATE collections SET is_default = 1 WHERE id = ?',
        params: [row.id],
        tag: `默认标记 (is_default=1)`,
      });
      STAT.defaultFlagged += 1;
    }
    if (row.visibility !== wantVisibility) {
      changes.push({
        sql: 'UPDATE collections SET visibility = ? WHERE id = ?',
        params: [wantVisibility, row.id],
        tag: `可见性修正 ${row.visibility} → ${wantVisibility}`,
      });
      STAT.visibilityCorrected += 1;
    }
    if (row.name !== wantName) {
      changes.push({
        sql: 'UPDATE collections SET name = ? WHERE id = ?',
        params: [wantName, row.id],
        tag: `名称修正 "${row.name}" → "${wantName}"`,
      });
      STAT.nameCorrected += 1;
    }
    if (row.sort_order !== wantSort) {
      changes.push({
        sql: 'UPDATE collections SET sort_order = ?, updated_at = datetime(\'now\') WHERE id = ?',
        params: [wantSort, row.id],
        tag: `排序修正 sort=${row.sort_order} → ${wantSort}`,
      });
      STAT.sortOrderFixed += 1;
    }

    for (const c of changes) {
      logsThisUser.push(`🔧 ${label}：${c.tag}`);
      run(c.sql, c.params, c.tag);
    }
    if (changes.length === 0) logsThisUser.push(`✅ ${label}：已正确（"${row.name}" vis=${row.visibility}）`);
    return row;
  }

  publicRow = applyCorrections(publicRow, 'public', wantPublicName, 0, '默认公开合集');
  privateRow = applyCorrections(privateRow, 'private', wantPrivateName, 1, '默认私有合集');

  if (touched || logsThisUser.some(l => !l.startsWith('✅'))) {
    STAT.usersTouched += 1;
    logUser(u, '');
    for (const l of logsThisUser) console.log(`      ${l}`);
  } else if (opts.targetUserId != null) {
    // 指定单用户时哪怕没改也打印一下
    logUser(u, '无改动（已符合规则）');
  }
}

function parseArgs(): RunOpts {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry') || args.includes('--dry-run');
  const clean = args.filter(a => !a.startsWith('--'));
  const modeRaw = clean[0] || 'ensure';
  if (!['ensure', 'reset-names', 'user'].includes(modeRaw)) {
    console.error(`❌ 未知 mode: ${modeRaw}。允许：ensure | reset-names | user <id>`);
    process.exit(2);
  }
  let targetUserId: number | undefined;
  if (modeRaw === 'user') {
    const idRaw = clean[1];
    if (!idRaw || isNaN(parseInt(idRaw, 10))) {
      console.error(`❌ user 模式必须跟一个整数 userId。例：npm run default-collections user 123`);
      process.exit(2);
    }
    targetUserId = parseInt(idRaw, 10);
  }
  return { mode: modeRaw as Mode, targetUserId, dryRun };
}

function main() {
  const opts = parseArgs();
  console.log(`\n=== 🚀 默认合集重构工具 ===`);
  console.log(`   mode     : ${opts.mode}`);
  if (opts.targetUserId) console.log(`   target   : user#${opts.targetUserId}`);
  console.log(`   dry-run  : ${opts.dryRun ? 'YES (不写DB)' : 'NO (写DB)'}`);
  console.log('');

  if (opts.targetUserId != null) {
    const row = db.prepare('SELECT id, username FROM users WHERE id = ?').get(opts.targetUserId) as UserRow | undefined;
    if (!row) { console.error(`❌ users 表中找不到 id=${opts.targetUserId}`); process.exit(1); }
    handleUser(row, opts);
  } else {
    const users = db.prepare('SELECT id, username FROM users ORDER BY id ASC').all() as UserRow[];
    if (users.length === 0) {
      console.log('⚠️  users 表为空，没有需要处理的用户\n=== 完成（无操作）===');
      return;
    }
    for (const u of users) {
      try { handleUser(u, opts); }
      catch (e: any) {
        STAT.errors.push(`用户 ${u.username}(id=${u.id}) 异常: ${e?.message || String(e)}`);
      }
    }
  }

  console.log('\n=== 📊 统计 ===');
  console.log(`  扫描用户数                : ${STAT.usersScanned}`);
  console.log(`  实际改动/新增过的用户数   : ${STAT.usersTouched}`);
  console.log(`  新建默认公开合集          : ${STAT.defaultPublicCreated}`);
  console.log(`  新建默认私有合集          : ${STAT.defaultPrivateCreated}`);
  console.log(`  修正 is_default 标记      : ${STAT.defaultFlagged}`);
  console.log(`  修正可见性 visibility     : ${STAT.visibilityCorrected}`);
  console.log(`  修正名称（带用户名命名）  : ${STAT.nameCorrected}`);
  console.log(`  修正 sort_order（0/1置顶）: ${STAT.sortOrderFixed}`);
  if (STAT.errors.length) {
    console.log(`\n❌ 错误 (${STAT.errors.length}):`);
    STAT.errors.forEach((m) => console.log('   -', m));
  } else {
    console.log('\n✅ 处理完成，无错误');
  }
  if (opts.dryRun) console.log('⚠️  以上为 dry-run 预览，未实际写入 DB。去掉 --dry 即可真实执行。\n');
  else console.log('');
}

main();
