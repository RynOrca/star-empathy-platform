/**
 * 【一次性脚本】为历史故事创建 8 个主题合集，并按内容/主题/origin 自动归类
 *
 * ── 8 个合集设计 ────────────────────────────────────────────
 *  1. 月韵·唐诗中的星空   origin=中国，标题是诗词（静夜思等10首）
 *  2. 星官故实           origin=中国，带"由来"/"由"/星官/星宿/帝车/北斗/参商/牛郎织女/牵牛不服箱 等
 *  3. 奥林匹斯星河       origin=古希腊 / 希腊语 / 拉丁语 / 罗马语
 *  4. 阿拉伯星名考       origin=阿拉伯语 / 苏美尔 / 巴比伦 / 古埃及
 *  5. 近代星名志         origin=近代命名 / 近代综合 / 现代命名 / 南岛语
 *  6. 星界编年史         origin=天文学 / 跨文化（非纯神话，含天文叙事）
 *  7. 星座图谱           标题含"座"字（不含阿拉伯古希腊等的命名故事，如"猎户座"/"天蝎座"那种故事）
 *                       （注意：先按 1~6 分完，剩余的标题里有"·由"字的中国星官→算 #2，其他含"座"的→#7）
 *  8. 星友之声           origin=null（社区原创 5 条）
 *
 * 匹配顺序：按上述优先级从高到低；命中即停止，不会重复归属。
 *
 * 合集归属原则：
 *   - 合集所有者为 user_id=0 的「星穹守护」系统虚拟用户；但 collections.user_id 有
 *     REFERENCES users(id) 外键，所以我们先在 users 表里创建/复用一个系统用户
 *     （username='star穹' 或类似，保证存在）。
 *   - 所有合集 visibility='public'，sort_order 按 1..8 排列
 *
 * 使用方法：
 *   cd server && npx ts-node scripts/seed-history-collections.ts
 *
 * 幂等性：
 *   - 合集按 name 精确匹配，存在则复用不重复创建
 *   - 只更新 collection_id 为 NULL 的故事；已有归属的故事不触碰
 *   - 重复执行安全
 */
import db from '../src/db';

/* ──────────────────── 8 个合集的定义 ──────────────────── */
type CollSpec = {
  name: string;
  desc: string;
  color: string; // #RRGGBB
  order: number;
  match: (title: string, origin: string | null) => boolean;
};

const POEMS = new Set([
  '静夜思', '水调歌头', '春江花月夜', '望月怀远', '霜月',
  '十五夜望月', '月下独酌', '古朗月行', '把酒问月', '西江月',
]);

const SPECS: CollSpec[] = [
  {
    name: '月韵·唐诗中的星空',
    desc: '收录唐诗宋词中与明月、星河、长空为伴的千古绝唱，十首必读的月下名篇',
    color: '#E8D0A8',
    order: 1,
    match: (t, o) => o === '中国' && POEMS.has(t),
  },
  {
    name: '星官故实',
    desc: '中国古代天文体系：天官星官与星宿的由来、命名与民间传说，从三垣到四象二十八宿',
    color: '#C97A5E',
    order: 2,
    match: (t, o) => {
      if (o !== '中国') return false;
      // 诗词已经被 #1 吃掉
      if (POEMS.has(t)) return false;
      // 标题含"由来"/"由"字（xxx·由来 / xxx·由）、或典型中国星官词
      if (t.includes('·由') || t.includes('由来')) return true;
      if (/北斗|参商|牛郎|织女|牵牛|帝车|星官|星宿|三垣|四象|二十八宿/.test(t)) return true;
      return false;
    },
  },
  {
    name: '奥林匹斯星河',
    desc: '古希腊神话中的星座叙事：众神、英雄、怪物与王室家族被宙斯举上天穹的故事',
    color: '#8A7FCE',
    order: 3,
    match: (_t, o) => ['古希腊', '希腊语', '拉丁语', '罗马语'].includes(o ?? ''),
  },
  {
    name: '阿拉伯星名考',
    desc: '九至十一世纪阿拉伯天文学家命名的恒星专名：从《恒星之书》到苏美尔、巴比伦的古老星空',
    color: '#C09969',
    order: 4,
    match: (_t, o) => ['阿拉伯语', '苏美尔', '巴比伦', '古埃及'].includes(o ?? ''),
  },
  {
    name: '近代星名志',
    desc: '十七世纪至今的亮星新名：大航海时代的荷兰航海家、十九世纪星图学家、二十世纪航空导航星表的造名',
    color: '#6FA3B8',
    order: 5,
    match: (_t, o) => ['近代命名', '近代综合', '现代命名', '南岛语'].includes(o ?? ''),
  },
  {
    name: '星界编年史',
    desc: '跨文明叙事与科学史实交融：岁差、北极游移、食变星、古代天文记载的非纯神话内容',
    color: '#6FA17A',
    order: 6,
    match: (_t, o) => ['天文学', '跨文化'].includes(o ?? ''),
  },
  {
    name: '天汉神话',
    desc: '散落在中国典籍中的天文神话：十日并出、夸父逐日、嫦娥奔月、启明长庚与南极仙翁的故事',
    color: '#7A8FD6',
    order: 7,
    match: (t, o) => {
      if (o !== '中国') return false;
      // 典型中国天文神话标题关键词（非星官命名故事、非诗词）
      if (/十日|夸父|嫦娥|玉兔|吴刚|启明|长庚|金星|彗星|南极仙翁|春秋之彗|哈雷|仙翁/.test(t)) return true;
      // 带 '·' 的复合标题里排除已归类的 '·由来' 类
      return t.includes('·') && !t.includes('·由') && !t.includes('由来')
        && !POEMS.has(t) && !/北斗|参商|牛郎|织女|牵牛|帝车|星官|星宿|三垣|四象|二十八宿/.test(t);
    },
  },
  {
    name: '星友之声',
    desc: '社区星友的原创心声 —— 深夜独白、异乡人、雨天思考、毕业季与程序员的自白',
    color: '#A580C5',
    order: 8,
    match: (_t, o) => o == null,
  },
];

/* ──────────────────── 工具函数 ──────────────────── */
function ensureSystemUser(): number {
  const SYS_NAME = '星穹守护';
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(SYS_NAME) as { id: number } | undefined;
  if (existing) return existing.id;
  // 外键需要 user_id 存在；密码 hash 随便填（这个账号从不在前端登录）
  const PWD_HASH_PLACEHOLDER =
    '$2a$10$CwTycUXWue0Thq9StjUM0uJ8vZ7uY7hU7zJwH6uX5eQrY6X7hU5eQ';
  const res = db.prepare(
    `INSERT INTO users (username, password_hash, email, signature) VALUES (?, ?, NULL, '星语穹庭 · 历史故事守护人')`
  ).run(SYS_NAME, PWD_HASH_PLACEHOLDER);
  return res.lastInsertRowid as number;
}

function upsertCollection(userId: number, spec: CollSpec): number {
  const found = db.prepare('SELECT * FROM collections WHERE name = ?').get(spec.name) as
    | { id: number } | undefined;
  if (found) return found.id;
  const r = db.prepare(
    `INSERT INTO collections (user_id, name, description, cover_color, visibility, sort_order)
     VALUES (?, ?, ?, ?, 'public', ?)`
  ).run(userId, spec.name, spec.desc, spec.color, spec.order);
  return r.lastInsertRowid as number;
}

/* ──────────────────── 主流程 ──────────────────── */
function main() {
  console.log('\n=== 🌟 为历史故事创建主题合集 ===\n');

  const sysUserId = ensureSystemUser();
  console.log(`· 系统守护用户：user_id = ${sysUserId}`);

  const collIdByName = new Map<string, number>();
  for (const s of SPECS) {
    const id = upsertCollection(sysUserId, s);
    collIdByName.set(s.name, id);
    console.log(`· 合集 #${String(s.order).padStart(2)}  [id=${String(id).padStart(3)}]  ${s.name}`);
  }

  // 读取所有故事（只关心 id/title/origin/type/collection_id）
  const all = db.prepare(
    `SELECT id, title, origin, type, collection_id FROM stars ORDER BY id ASC`
  ).all() as {
    id: number; title: string; origin: string | null; type: string; collection_id: number | null;
  }[];

  const byColl: Record<string, number[]> = {};
  for (const s of SPECS) byColl[s.name] = [];
  let alreadyHave = 0;
  let unassigned = 0;
  let skippedNonHistory = 0;

  const updStmt = db.prepare(`UPDATE stars SET collection_id = ? WHERE id = ?`);
  for (const row of all) {
    if (row.type === 'user') { skippedNonHistory++; continue; }
    if (row.collection_id != null) { alreadyHave++; continue; }

    let matched: CollSpec | null = null;
    for (const spec of SPECS) {
      if (spec.match(row.title, row.origin)) { matched = spec; break; }
    }
    if (!matched) { unassigned++; continue; }

    const cid = collIdByName.get(matched.name)!;
    updStmt.run(cid, row.id);
    byColl[matched.name].push(row.id);
  }

  // 输出分类报告
  console.log('\n── 分类统计 ──────────────────────────────────────');
  let sum = 0;
  for (const s of SPECS) {
    const n = byColl[s.name].length;
    sum += n;
    console.log(`  ${String(s.order).padStart(2)}. ${s.name.padEnd(18)}  本次归类 ${String(n).padStart(3)} 篇`);
  }
  console.log(`\n  总归类数         : ${sum}`);
  console.log(`  已有合集跳过     : ${alreadyHave}`);
  console.log(`  用户故事不触碰   : ${skippedNonHistory}`);
  console.log(`  未命中匹配       : ${unassigned}`);
  console.log('');

  if (unassigned > 0) {
    // 把未命中的 id 打印 20 个，方便调试
    const sample: string[] = [];
    for (const row of all) {
      if (unassigned <= 0) break;
      if (row.type === 'user') continue;
      if (row.collection_id != null) continue;
      let matched = false;
      for (const spec of SPECS) if (spec.match(row.title, row.origin)) { matched = true; break; }
      if (!matched) {
        sample.push(`#${row.id} ${row.title} (origin=${row.origin ?? 'null'})`);
        if (sample.length >= 15) break;
      }
    }
    if (sample.length) {
      console.log('未命中样例（最多 15 条）：');
      for (const s of sample) console.log('  ·', s);
      console.log('');
    }
  }

  console.log('✅ 完成。\n');
}

main();
