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

// 我的合集列表（可选按可见性过滤，支持 anonymous/galaxy 过滤）
export function listCollections(userId: number, visibility?: CollectionVisibility): any[] {
  const rows = visibility
    ? db.prepare('SELECT * FROM collections WHERE user_id = ? AND visibility = ? ORDER BY sort_order ASC, created_at DESC').all(userId, visibility)
    : db.prepare('SELECT * FROM collections WHERE user_id = ? ORDER BY sort_order ASC, created_at DESC').all(userId);
  return attachStoryCount(rows as any[]);
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
  return { collection: attachStoryCount([row as any])[0] };
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
  const enriched = { ...attachStoryCount([row])[0], favorite_count: favRow.cnt, stories: storiesSanitized };
  // 双写：同时返回 snake_case (story_count) 和 camelCase (storyCount)，兼容前端/路由不同命名
  enriched.storyCount = enriched.story_count ?? storiesSanitized.length;
  return enriched;
}

// 编辑合集（仅 owner 可编辑；星河合集仅后台/DB 管理，普通 API 直接拒绝创建/更新 visibility=galaxy）
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
  return { collection: attachStoryCount([row as any])[0] };
}

// 删除合集（仅 owner 可删；星河合集仅后台/DB 管理，接口层面不允许删）
export function deleteCollection(id: number, userId: number): { notFound?: boolean; forbidden?: boolean } {
  const existing = db.prepare('SELECT * FROM collections WHERE id = ?').get(id) as Collection | undefined;
  if (!existing) return { notFound: true };
  if (existing.visibility === 'galaxy') return { forbidden: true };
  if (userId !== existing.user_id) return { forbidden: true };
  invalidateCollectionAnalysisCache(id);
  db.prepare('UPDATE stars SET collection_id = NULL WHERE collection_id = ?').run(id);
  db.prepare('DELETE FROM collections WHERE id = ?').run(id);
  return {};
}

// 公开合集列表（分页，可按 userId 过滤某作者）
// 公开 = visibility IN ('public', 'anonymous', 'galaxy')，星河/匿名合集也对外展示
export function listPublicCollections(
  userId?: number,
  page = 1,
  limit = 20,
): { items: any[]; total: number; page: number; limit: number; totalPages: number } {
  const p = Math.max(1, Math.floor(page));
  const l = Math.max(1, Math.min(100, Math.floor(limit)));
  const offset = (p - 1) * l;
  const publicValues = PUBLIC_VISIBILITIES.map(() => '?').join(','); // ?,?,?
  const where = userId
    ? `visibility IN (${publicValues}) AND user_id = ?`
    : `visibility IN (${publicValues})`;
  const countParams: any[] = userId ? [...PUBLIC_VISIBILITIES, userId] : [...PUBLIC_VISIBILITIES];
  const listParams: any[] = userId ? [...PUBLIC_VISIBILITIES, userId, l, offset] : [...PUBLIC_VISIBILITIES, l, offset];

  const totalRow = db.prepare(`SELECT COUNT(*) as cnt FROM collections WHERE ${where}`).get(...countParams) as { cnt: number };
  const total = totalRow.cnt;
  const totalPages = Math.ceil(total / l) || 0;
  const rows = db.prepare(`SELECT * FROM collections WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...listParams);
  return { items: attachStoryCount(rows as any[]), total, page: p, limit: l, totalPages };
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
 * 🌟 新默认机制：每个用户必有「公开星笺」+「私密星笺」两个系统级默认合集
 *   - 公开星笺（name='公开星笺', visibility='public', sort_order=0）→ 所有投稿默认进这里
 *   - 私密星笺（name='私密星笺', visibility='private', sort_order=1）→ 用户手动切到私密
 * 幂等：存在就复用，不存在才创建；返回值始终非 null。
 */
export interface DefaultCollections {
  publicCollection: any;   // 公开星笺（所有新故事/历史故事默认放这）
  privateCollection: any;  // 私密星笺（用户手动放）
}
const PUBLIC_DEFAULT_NAME = '公开星笺';
const PRIVATE_DEFAULT_NAME = '私密星笺';
const PUBLIC_DEFAULT_DESC = '默认收纳所有未指定合集的公开故事，公开可见';
const PRIVATE_DEFAULT_DESC = '收纳仅自己可见的私密心事，不对外展示';
const PUBLIC_DEFAULT_COLOR = '#E8B86D';   // 暖金（原默认色，星空感）
const PRIVATE_DEFAULT_COLOR = '#6A7ACB';  // 星靛蓝（私密夜色感）

export function getOrCreateDefaultCollections(userId: number): DefaultCollections {
  // 1) 先找该用户所有合集
  const all = db.prepare('SELECT * FROM collections WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC').all(userId) as unknown as Collection[];

  // 2) 精准匹配（名字+可见性同时命中），存在就复用
  let publicColl = all.find((c) => c.name === PUBLIC_DEFAULT_NAME && c.visibility === 'public');
  let privateColl = all.find((c) => c.name === PRIVATE_DEFAULT_NAME && c.visibility === 'private');

  // 3) 找不到精准名：fallback 用任意一个同 visibility 的（兼容老用户已有"我的默认合集"等公开合集）
  if (!publicColl) publicColl = all.find((c) => c.visibility === 'public') || null as any;
  if (!privateColl) privateColl = all.find((c) => c.visibility === 'private') || null as any;

  // 4) 还没找到 → 创建公开星笺（sort_order=0 第一个）
  if (!publicColl) {
    const created = createCollection(userId, {
      name: PUBLIC_DEFAULT_NAME,
      description: PUBLIC_DEFAULT_DESC,
      coverColor: PUBLIC_DEFAULT_COLOR,
      visibility: 'public',
    });
    // createCollection 返回 { error?, collection? }，尽量把 sort_order 改成 0 排在最前
    if (created.collection) {
      db.prepare('UPDATE collections SET sort_order = 0 WHERE id = ?').run(created.collection.id);
      created.collection.sort_order = 0;
    }
    publicColl = created.collection as any;
  }

  // 5) 还没找到 → 创建私密星笺（sort_order=1 第二个）
  if (!privateColl) {
    const created = createCollection(userId, {
      name: PRIVATE_DEFAULT_NAME,
      description: PRIVATE_DEFAULT_DESC,
      coverColor: PRIVATE_DEFAULT_COLOR,
      visibility: 'private',
    });
    if (created.collection) {
      db.prepare('UPDATE collections SET sort_order = 1 WHERE id = ?').run(created.collection.id);
      created.collection.sort_order = 1;
    }
    privateColl = created.collection as any;
  }

  return {
    publicCollection: attachStoryCount([publicColl as any])[0],
    privateCollection: attachStoryCount([privateColl as any])[0],
  };
}
