import db from '../db';
import { getStoriesByCollectionId } from './starService';
import { invalidateCollectionAnalysisCache } from './collectionAnalysis';

export type CollectionVisibility = 'public' | 'private' | 'anonymous' | 'galaxy';
export const PUBLIC_VISIBILITIES: CollectionVisibility[] = ['public', 'anonymous', 'galaxy']; // 匿名/星河也公开展示

export interface Collection {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  cover_color: string | null;
  visibility: CollectionVisibility;
  sort_order: number;
  is_default: number;   // INTEGER 0/1：1=系统级默认合集（不可删/不可改可见性/不可改名）
  created_at: string;
  updated_at: string;
}

export interface CollectionInput {
  name: string;
  description?: string | null;
  coverColor?: string | null;
  visibility?: CollectionVisibility;
}

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

/**
 * 校验合集输入：
 * - 星河合集仅由后台/DB 管理，普通 API 一律拒绝创建或切换到 galaxy
 * - anonymous：公开展示，对外隐藏故事作者名
 */
export function validateCollectionInput(input: CollectionInput): string | null {
  const name = (input.name || '').trim();
  if (!name) return '合集名称不能为空';
  if (name.length > 40) return '合集名称最长 40 字';
  if (input.description != null && typeof input.description === 'string' && input.description.length > 200) {
    return '合集描述最长 200 字';
  }
  if (input.coverColor != null && input.coverColor !== '' && !HEX_RE.test(input.coverColor)) {
    return '主题色需为 #RRGGBB 格式';
  }
  if (input.visibility != null && !['public', 'private', 'anonymous', 'galaxy'].includes(input.visibility)) {
    return '可见性仅支持 public/private/anonymous/galaxy';
  }
  if (input.visibility === 'galaxy') {
    return '星河合集仅由官方后台统一维护，不开放自建';
  }
  return null;
}

/**
 * 故事用户名/作者名隐藏规则：
 *   - anonymous 合集：对外隐藏作者（仅合集创建者自己可见）
 *   - 故事单篇 is_anonymous=1：对外隐藏（保留老机制）
 */
export function shouldHideAuthor(params: {
  collectionVisibility?: CollectionVisibility | string | null;
  collectionUserId?: number;
  storyIsAnonymous?: number | boolean;
  currentUserId?: number;
}): boolean {
  const { collectionVisibility, collectionUserId, storyIsAnonymous, currentUserId } = params;
  const isOwner = currentUserId === collectionUserId;
  if (Number(storyIsAnonymous) === 1 && !isOwner) return true;
  if (collectionVisibility === 'anonymous' && !isOwner) return true;
  return false;
}

// 给合集行附加 storyCount（聚合 stars.collection_id）
function attachStoryCount(rows: any[]): any[] {
  if (rows.length === 0) return rows;
  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => '?').join(',');
  const counts = db.prepare(
    `SELECT collection_id, COUNT(*) as cnt FROM stars WHERE collection_id IN (${placeholders}) GROUP BY collection_id`
  ).all(...ids) as { collection_id: number; cnt: number }[];
  const map = new Map<number, number>();
  for (const c of counts) map.set(c.collection_id, c.cnt);
  return rows.map((r) => ({ ...r, story_count: map.get(r.id) ?? 0 }));
}

// 计算合集列表项的 resonanceTotal（合辑内所有故事 resonance_count 总和）
function attachResonanceTotal(rows: any[]): any[] {
  if (rows.length === 0) return rows;
  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => '?').join(',');
  const sums = db.prepare(
    `SELECT collection_id, COALESCE(SUM(resonance_count), 0) as total FROM stars WHERE collection_id IN (${placeholders}) GROUP BY collection_id`
  ).all(...ids) as { collection_id: number; total: number }[];
  const map = new Map<number, number>();
  for (const s of sums) map.set(s.collection_id, s.total);
  return rows.map((r) => ({ ...r, resonance_total: map.get(r.id) ?? 0 }));
}

/**
 * 合集行归一化：
 *   - 双写 snake_case → camelCase（userId / coverColor / sortOrder / createdAt / updatedAt / storyCount / favoriteCount / resonanceTotal）
 *   - 保留原始 snake 字段（兼容可能的旧调用方）
 *   - 对故事数组（如有）也做 camelCase 双写（resonanceCount / viewCount / createdAt / updatedAt / catalogStarId / locationLat / locationLng / isAnonymous / storyTags 等）
 */
function normalizeStory(s: any): any {
  if (!s || typeof s !== 'object') return s;
  return {
    ...s,
    // 主键字段
    catalogStarId: s.catalog_star_id ?? s.catalogStarId,
    collectionId: s.collection_id ?? s.collectionId,
    // 计数字段
    resonanceCount: s.resonance_count ?? s.resonanceCount ?? 0,
    viewCount: s.view_count ?? s.viewCount ?? 0,
    // 时间字段
    createdAt: s.created_at ?? s.createdAt,
    updatedAt: s.updated_at ?? s.updatedAt,
    // 位置字段
    locationLat: s.location_lat ?? s.locationLat,
    locationLng: s.location_lng ?? s.locationLng,
    // 匿名字段
    isAnonymous: s.is_anonymous ?? s.isAnonymous,
    authorHidden: s.author_hidden ?? s.authorHidden,
    // 标签字段（tags 一般 JSON 字符串解析后是数组，这里不重复转换内容，只转键）
    storyTags: s.story_tags ?? s.storyTags ?? s.tags,
    // 作者字段
    username: s.username ?? (s as any).user_name,
    userId: s.user_id ?? s.userId,
  };
}
export function normalizeCollectionRow(row: any, opts?: { withStories?: boolean }): any {
  if (!row || typeof row !== 'object') return row;
  const withStories = opts?.withStories ?? true;
  const storiesRaw = row.stories ?? (row as any).story_list;
  const stories = withStories && Array.isArray(storiesRaw) ? storiesRaw.map(normalizeStory) : storiesRaw;
  return {
    ...row,
    // id / name / description / visibility 一般本身就一致，不动
    userId: row.user_id ?? row.userId,
    coverColor: row.cover_color ?? row.coverColor,
    sortOrder: row.sort_order ?? row.sortOrder,
    /** 系统级默认合集标志：DB INTEGER 0/1 → 前端 boolean，避免再判 type */
    isDefault: row.is_default === 1 || !!row.isDefault || false,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
    // 计数：snake 已经由 attachStoryCount / 详情 SQL 计算，这里直接双写
    storyCount: row.story_count ?? row.storyCount ?? (withStories && Array.isArray(stories) ? stories.length : 0),
    favoriteCount: row.favorite_count ?? row.favoriteCount ?? 0,
    resonanceTotal: row.resonance_total ?? row.resonanceTotal ?? (
      withStories && Array.isArray(stories)
        ? stories.reduce((sum: number, s: any) => sum + (s.resonanceCount ?? s.resonance_count ?? 0), 0)
        : 0
    ),
    // 故事数组（如有）也归一化
    ...(stories !== undefined ? { stories } : {}),
  };
}

// 我的合集列表（可选按可见性过滤，支持 anonymous/galaxy 过滤）
export function listCollections(userId: number, visibility?: CollectionVisibility): any[] {
  const rows = visibility
    ? db.prepare('SELECT * FROM collections WHERE user_id = ? AND visibility = ? ORDER BY sort_order ASC, created_at DESC').all(userId, visibility)
    : db.prepare('SELECT * FROM collections WHERE user_id = ? ORDER BY sort_order ASC, created_at DESC').all(userId);
  const enriched = attachResonanceTotal(attachStoryCount(rows as any[]));
  return enriched.map((r) => normalizeCollectionRow(r, { withStories: false }));
}

// 创建合集
export function createCollection(userId: number, input: CollectionInput): { error?: string; collection?: any } {
  const err = validateCollectionInput(input);
  if (err) return { error: err };
  const name = input.name.trim();
  // cover_color 用默认色替代 NULL，兼容旧库 NOT NULL 约束
  const coverColor = input.coverColor || '#E8B86D';
  const result = db.prepare(
    `INSERT INTO collections (user_id, name, description, cover_color, visibility) VALUES (?, ?, ?, ?, ?)`
  ).run(userId, name, input.description?.trim() || null, coverColor, input.visibility || 'public');
  const id = result.lastInsertRowid as number;
  const row = db.prepare('SELECT * FROM collections WHERE id = ?').get(id);
  const enriched = attachResonanceTotal(attachStoryCount([row as any]));
  return { collection: normalizeCollectionRow(enriched[0], { withStories: false }) };
}

// 合集详情（含故事列表）。可见性：
//   - private：仅 owner 可见，否则 404
//   - public / anonymous / galaxy：对所有人可见
// 故事作者名：anonymous 合集对外隐藏，owner 可看到
export function getCollectionDetail(id: number, currentUserId?: number): any | null {
  const row = db.prepare('SELECT * FROM collections WHERE id = ?').get(id) as Collection | undefined;
  if (!row) return null;
  const isOwner = currentUserId === row.user_id;
  if (row.visibility === 'private' && !isOwner) return null;
  const stories = getStoriesByCollectionId(id);
  // 匿名合集对外隐藏故事作者名
  const storiesSanitized = stories.map((s: any) => {
    if (shouldHideAuthor({
      collectionVisibility: row.visibility,
      collectionUserId: row.user_id,
      storyIsAnonymous: s.is_anonymous,
      currentUserId,
    })) {
      return { ...s, username: null, authorHidden: true };
    }
    return s;
  });
  // 收藏数：合集故事所属 catalog star 被收藏的总次数（含 story_catalog_stars 多对多绑定）
  const favRow = db.prepare(`
    SELECT COUNT(*) as cnt FROM favorites
    WHERE catalog_star_id IN (
      SELECT DISTINCT catalog_star_id FROM stars WHERE collection_id = ? AND catalog_star_id IS NOT NULL
      UNION
      SELECT DISTINCT scs.catalog_star_id FROM story_catalog_stars scs
      JOIN stars s ON s.id = scs.story_id WHERE s.collection_id = ?
    )
  `).get(id, id) as { cnt: number };
  const enriched = {
    ...attachStoryCount([row])[0],
    resonance_total: storiesSanitized.reduce((sum: number, s: any) => sum + (s.resonance_count ?? 0), 0),
    favorite_count: favRow.cnt,
    stories: storiesSanitized,
  };
  return normalizeCollectionRow(enriched, { withStories: true });
}

// 编辑合集（仅 owner 可编辑；星河合集仅后台/DB 管理，普通 API 直接拒绝创建/更新 visibility=galaxy）
// ⚠️ 默认合集（is_default=1）三禁止：改可见性 / 改名字 / 改 sort_order（保证系统默认排最前）
export function updateCollection(
  id: number,
  userId: number,
  patch: Partial<CollectionInput> & { sortOrder?: number },
): { error?: string; collection?: any; notFound?: boolean; forbidden?: boolean } {
  const existing = db.prepare('SELECT * FROM collections WHERE id = ?').get(id) as Collection | undefined;
  if (!existing) return { notFound: true };
  // 星河合集：仅后台/DB 管理，普通前端接口不允许改
  if (existing.visibility === 'galaxy') return { forbidden: true };
  if (userId !== existing.user_id) return { forbidden: true };

  // ── 系统级默认合集：三项强锁 ──
  if (Number(existing.is_default) === 1) {
    if (patch.visibility !== undefined && patch.visibility !== existing.visibility) {
      return { error: '系统默认合集不可改变可见性' };
    }
    if (patch.name !== undefined && patch.name.trim() !== existing.name) {
      return { error: '系统默认合集名称由平台管理，不可手动修改' };
    }
    if (patch.sortOrder !== undefined && (Math.floor(Number(patch.sortOrder)) || 0) !== existing.sort_order) {
      return { error: '系统默认合集排序固定（置顶），不可手动调整' };
    }
  }

  // 切换到 galaxy：不开放（后台管理）
  const nextVisibility = patch.visibility ?? existing.visibility;
  if (nextVisibility === 'galaxy') return { error: '星河合集仅由官方后台统一维护，不开放自建' };
  const input: CollectionInput = {
    name: patch.name ?? existing.name,
    description: patch.description !== undefined ? patch.description : existing.description,
    coverColor: patch.coverColor !== undefined ? patch.coverColor : existing.cover_color,
    visibility: nextVisibility,
  };
  const err = validateCollectionInput(input);
  if (err) return { error: err };
  const sortOrder = patch.sortOrder !== undefined ? (Math.floor(Number(patch.sortOrder)) || 0) : existing.sort_order;
  // cover_color 用默认色替代 NULL，兼容旧库 NOT NULL 约束
  const coverColor = input.coverColor || '#E8B86D';
  db.prepare(
    `UPDATE collections SET name = ?, description = ?, cover_color = ?, visibility = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(input.name.trim(), input.description?.trim() || null, coverColor, input.visibility || 'public', sortOrder, id);
  const row = db.prepare('SELECT * FROM collections WHERE id = ?').get(id);
  const enriched = attachResonanceTotal(attachStoryCount([row as any]));
  return { collection: normalizeCollectionRow(enriched[0], { withStories: false }) };
}

// 删除合集（仅 owner 可删；星河合集 & 系统默认合集，接口层面不允许删）
export function deleteCollection(id: number, userId: number): { notFound?: boolean; forbidden?: boolean; error?: string } {
  const existing = db.prepare('SELECT * FROM collections WHERE id = ?').get(id) as Collection | undefined;
  if (!existing) return { notFound: true };
  if (existing.visibility === 'galaxy') return { forbidden: true, error: '星河合集仅由官方后台统一维护，不允许删除' };
  if (Number(existing.is_default) === 1) return { forbidden: true, error: '系统默认合集不可删除' };
  if (userId !== existing.user_id) return { forbidden: true };
  invalidateCollectionAnalysisCache(id);
  db.prepare('UPDATE stars SET collection_id = NULL WHERE collection_id = ?').run(id);
  db.prepare('DELETE FROM collections WHERE id = ?').run(id);
  return {};
}

export type PublicCollectionsSort =
  | 'hot'       // 热度：storyCount*2 + 合辑内故事总共鸣数
  | 'new'       // 最近创建（默认）
  | 'resonance' // 合辑内故事总共鸣数 DESC
  | 'name_asc'  // 合集名拼音排序（SQLite 默认 utf-8 字节序就行）
  | 'stories_desc'; // 故事数 DESC

// 公开合集列表（分页，可按 userId/sort/visibility/keyword 过滤）
// 公开 = visibility IN ('public', 'anonymous', 'galaxy')，星河/匿名合集也对外展示
export function listPublicCollections(params: {
  userId?: number;
  page?: number;
  limit?: number;
  sort?: PublicCollectionsSort;
  /** 只返回指定 visibility 的公开子集：'public' 纯公开 / 'anonymous' 匿名 / 'galaxy' 星河 / 默认=全部 */
  visibility?: 'public' | 'anonymous' | 'galaxy';
  /** 关键字模糊搜索：合集 name / description / 合集中故事 title / content / tags */
  keyword?: string;
}): { items: any[]; total: number; page: number; limit: number; totalPages: number } {
  const p = Math.max(1, Math.floor(params.page ?? 1));
  const l = Math.max(1, Math.min(100, Math.floor(params.limit ?? 20)));
  const offset = (p - 1) * l;
  const sort = params.sort ?? 'new';

  // WHERE 构造
  const visibilities: CollectionVisibility[] = params.visibility
    ? [params.visibility]
    : PUBLIC_VISIBILITIES;
  const placeholders = visibilities.map(() => '?').join(',');
  let where = `visibility IN (${placeholders})`;
  const countParams: any[] = [...visibilities];
  const listParams: any[] = [...visibilities];

  if (params.userId) {
    where += ' AND user_id = ?';
    countParams.push(params.userId);
    listParams.push(params.userId);
  }

  // 关键字搜索：合集名/描述 或 合集中任一故事的标题/正文/tags 命中（LIKE 模糊匹配，大小写不敏感）
  const kwRaw = (params.keyword ?? '').trim();
  if (kwRaw) {
    // LIKE 通配符 % 包裹；SQLite 默认 LIKE 已对 ASCII 大小写不敏感，中文按字节匹配无影响
    const likeKw = `%${kwRaw}%`;
    where += ` AND (
      c.name LIKE ?
      OR c.description LIKE ?
      OR EXISTS (
        SELECT 1 FROM stars s
        WHERE s.collection_id = c.id
          AND (s.title LIKE ? OR s.content LIKE ? OR COALESCE(s.tags, '') LIKE ?)
      )
    )`;
    countParams.push(likeKw, likeKw, likeKw, likeKw, likeKw);
    listParams.push(likeKw, likeKw, likeKw, likeKw, likeKw);
  }

  // ORDER 构造
  // 注意：这里不能用 c.story_count（DB 冗余列，可能恒为 0 未及时回写），
  //       一律走子查询：
  //         real_story_count  = (SELECT COUNT(*) FROM stars s WHERE s.collection_id = c.id)
  //         real_resonance_sum = (SELECT COALESCE(SUM(resonance_count),0) FROM stars s WHERE s.collection_id = c.id)
  const realSC = '(SELECT COUNT(*) FROM stars s WHERE s.collection_id = c.id)';
  const realRS = '(SELECT COALESCE(SUM(resonance_count),0) FROM stars s WHERE s.collection_id = c.id)';
  let orderBy: string;
  switch (sort) {
    case 'hot':
      orderBy = `((${realSC} * 2) + ${realRS}) DESC, c.created_at DESC`;
      break;
    case 'resonance':
      orderBy = `${realRS} DESC, c.created_at DESC`;
      break;
    case 'stories_desc':
      orderBy = `${realSC} DESC, c.sort_order ASC, c.created_at DESC`;
      break;
    case 'name_asc':
      orderBy = 'COALESCE(c.name, "") COLLATE NOCASE ASC';
      break;
    case 'new':
    default:
      orderBy = 'c.created_at DESC';
      break;
  }

  const totalRow = db.prepare(`SELECT COUNT(*) as cnt FROM collections c WHERE ${where}`).get(...countParams) as { cnt: number };
  const total = totalRow.cnt;
  const totalPages = Math.ceil(total / l) || 0;
  const rows = db.prepare(
    `SELECT c.* FROM collections c WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
  ).all(...listParams, l, offset);
  const enriched = attachResonanceTotal(attachStoryCount(rows as any[]));
  return {
    items: enriched.map((r) => normalizeCollectionRow(r, { withStories: false })),
    total, page: p, limit: l, totalPages,
  };
}

/**
 * 星笺广场推荐 Picks：
 *   - 固定前 N 本（默认前 3）取官方「星河」合辑，按 sort_order ASC 取最前排的
 *   - 再填充：最近 14 天内「热度 hot」Top (wanted - galaxyN) 本公开/匿名星笺（排除已选星河）
 * 返回 wanted 本（默认 6）；若不够就用所有非星河合辑 hot 排序补足
 */
export function getPublicCollectionPicks(wanted = 6, galaxyN = 3): any[] {
  // 与 listPublicCollections 保持一致：不依赖 DB 冗余列，走真实聚合子查询
  const realSC = '(SELECT COUNT(*) FROM stars s WHERE s.collection_id = c.id)';
  const realRS = '(SELECT COALESCE(SUM(resonance_count),0) FROM stars s WHERE s.collection_id = c.id)';

  // 官方星河卷：优先真实故事数多的卷轴排前（避免空壳占坑）；同档按 sort_order ASC（官方预设卷次）
  const galaxyTopN = db.prepare(
    `SELECT c.* FROM collections c WHERE c.visibility = 'galaxy'
     ORDER BY ${realSC} DESC, c.sort_order ASC, c.id ASC LIMIT ?`
  ).all(galaxyN) as any[];

  const ids = new Set<number>(galaxyTopN.map(x => x.id));
  const fill = Math.max(0, wanted - galaxyTopN.length);
  let filled: any[] = [];
  if (fill > 0) {
    const nonGalaxy = db.prepare(
      `SELECT c.* FROM collections c
       WHERE c.visibility IN ('public','anonymous') AND c.id NOT IN (${galaxyTopN.length ? galaxyTopN.map(() => '?').join(',') : '0'})
       ORDER BY ((${realSC} * 2) + ${realRS}) DESC, c.created_at DESC
       LIMIT ?`
    ).all(...(galaxyTopN.length ? galaxyTopN.map(x => x.id) : []), fill) as any[];
    filled = nonGalaxy.filter(x => !ids.has(x.id));
  }

  const list = [...galaxyTopN, ...filled].slice(0, wanted);
  const enriched = attachResonanceTotal(attachStoryCount(list));
  return enriched.map((r) => normalizeCollectionRow(r, { withStories: false }));
}

// 校验合集归属当前用户（投递故事时用）
export function verifyCollectionOwnership(collectionId: number, userId: number): boolean {
  const row = db.prepare('SELECT user_id FROM collections WHERE id = ?').get(collectionId) as { user_id: number } | undefined;
  return !!row && row.user_id === userId;
}

/**
 * 确保用户拥有默认公开合集。
 * - 优先返回 is_default=1 的合集（旧库兼容）
 * - 其次返回第一个公开合集
 * - 都没有则创建「我的默认合集」(public)
 * 返回值始终非 null（已确保至少有一个合集）。
 */
export function ensureDefaultCollection(userId: number): any {
  return getOrCreateDefaultCollections(userId).publicCollection;
}

/**
 * 获取用户的默认合集（不创建）。
 * 用于投递故事时自动归属。
 */
export function getDefaultCollection(userId: number): any | null {
  return getOrCreateDefaultCollections(userId).publicCollection;
}

/**
 * 🌟 新默认机制（2026-08-08 重构）：每个用户必有两本系统级默认合集（is_default=1）
 *   - 默认公开合集：name = `{用户名}的默认公开合集`, visibility = 'public',  sort_order = 0
 *   - 默认私有合集：name = `默认私有合集`,                 visibility = 'private', sort_order = 1
 *   命中优先级：is_default=1 且 visibility 匹配 → fallback 同名/近似名行 → fallback 同 visibility 第一个 → 新建
 *   幂等：存在就复用（若标记不对自动补上 is_default），不存在才创建。
 */
export interface DefaultCollections {
  publicCollection: any;   // 默认公开合集（所有新故事/历史故事默认放这）
  privateCollection: any;  // 默认私有合集（用户手动放）
}
function publicNameOf(username: string): string { return `${username}的默认公开合集`; }
function privateNameOf(_username: string): string { return `默认私有合集`; }
const PUBLIC_DEFAULT_DESC = '默认收纳所有未指定合集的公开故事，公开可见';
const PRIVATE_DEFAULT_DESC = '收纳仅自己可见的私密心事，不对外展示';
const PUBLIC_DEFAULT_COLOR = '#E8B86D';   // 暖金（原默认色，星空感）
const PRIVATE_DEFAULT_COLOR = '#6A7ACB';  // 星靛蓝（私密夜色感）

export function getOrCreateDefaultCollections(userId: number): DefaultCollections {
  // 1) 拿用户名（动态命名公开默认合集用）
  const userRow = db.prepare('SELECT username FROM users WHERE id = ?').get(userId) as { username: string } | undefined;
  const username = userRow?.username ?? `user${userId}`;
  const wantPublicName = publicNameOf(username);
  const wantPrivateName = privateNameOf(username);

  // 2) 先找该用户所有合集
  const all = db.prepare('SELECT * FROM collections WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC').all(userId) as unknown as Collection[];

  // 3) 命中候选：按 is_default → 精确名 → 近似名 → 同 visibility 第一 的顺序
  let publicColl: Collection | undefined = all.find((c) => Number(c.is_default) === 1 && c.visibility === 'public');
  let privateColl: Collection | undefined = all.find((c) => Number(c.is_default) === 1 && c.visibility === 'private');
  if (!publicColl)  publicColl  = all.find((c) => c.visibility === 'public'  && c.name === wantPublicName);
  if (!privateColl) privateColl = all.find((c) => c.visibility === 'private' && c.name === wantPrivateName);
  if (!publicColl)  publicColl  = all.find((c) => c.visibility === 'public'  && (
    c.name === '公开星笺' || c.name === '我的默认合集' || c.name.includes('默认公开')
  ));
  if (!privateColl) privateColl = all.find((c) => c.visibility === 'private' && (
    c.name === '私密星笺' || c.name.includes('默认私有')
  ));
  if (!publicColl)  publicColl  = all.find((c) => c.visibility === 'public')  || null as any;
  if (!privateColl) privateColl = all.find((c) => c.visibility === 'private') || null as any;

  // 4) 找到后：如果 is_default 还没标 1，补上；顺便修正 name/visibility/排序（幂等）
  function ensureTouched(row: Collection, wantVisibility: 'public' | 'private', wantName: string, wantSort: 0 | 1): void {
    if (!row) return;
    const fixes: { sql: string; params: any[] }[] = [];
    if (Number(row.is_default) !== 1)
      fixes.push({ sql: 'UPDATE collections SET is_default = 1 WHERE id = ?', params: [row.id] });
    if (row.visibility !== wantVisibility)
      fixes.push({ sql: 'UPDATE collections SET visibility = ? WHERE id = ?', params: [wantVisibility, row.id] });
    if (row.name !== wantName)
      fixes.push({ sql: 'UPDATE collections SET name = ? WHERE id = ?', params: [wantName, row.id] });
    if (row.sort_order !== wantSort)
      fixes.push({ sql: 'UPDATE collections SET sort_order = ?, updated_at = datetime(\'now\') WHERE id = ?', params: [wantSort, row.id] });
    for (const f of fixes) { try { db.prepare(f.sql).run(...f.params); } catch { /* 忽略迁移型小报错 */ } }
    // 回写内存对象，保证 normalize 用到最新字段
    (row as any).is_default = 1;
    if (row.visibility !== wantVisibility) (row as any).visibility = wantVisibility;
    if (row.name !== wantName) (row as any).name = wantName;
    if (row.sort_order !== wantSort) (row as any).sort_order = wantSort;
  }

  // 5) 还没找到 → 创建默认公开合集（sort_order=0 第一个）
  if (!publicColl) {
    const result = db.prepare(`
      INSERT INTO collections (user_id, name, description, cover_color, visibility, sort_order, is_default, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, 1, datetime('now'), datetime('now'))
    `).run(userId, wantPublicName, PUBLIC_DEFAULT_DESC, PUBLIC_DEFAULT_COLOR, 'public');
    const id = result.lastInsertRowid as number;
    publicColl = db.prepare('SELECT * FROM collections WHERE id = ?').get(id) as unknown as Collection;
  } else {
    ensureTouched(publicColl, 'public', wantPublicName, 0);
  }

  // 6) 还没找到 → 创建默认私有合集（sort_order=1 第二个）
  if (!privateColl) {
    const result = db.prepare(`
      INSERT INTO collections (user_id, name, description, cover_color, visibility, sort_order, is_default, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, 1, datetime('now'), datetime('now'))
    `).run(userId, wantPrivateName, PRIVATE_DEFAULT_DESC, PRIVATE_DEFAULT_COLOR, 'private');
    const id = result.lastInsertRowid as number;
    privateColl = db.prepare('SELECT * FROM collections WHERE id = ?').get(id) as unknown as Collection;
  } else {
    ensureTouched(privateColl, 'private', wantPrivateName, 1);
  }

  return {
    publicCollection: normalizeCollectionRow(
      attachResonanceTotal(attachStoryCount([publicColl as any]))[0],
      { withStories: false }
    ),
    privateCollection: normalizeCollectionRow(
      attachResonanceTotal(attachStoryCount([privateColl as any]))[0],
      { withStories: false }
    ),
  };
}
