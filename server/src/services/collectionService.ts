import db from '../db';
import { getStoriesByCollectionId } from './starService';

export interface Collection {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  cover_color: string | null;
  visibility: 'public' | 'private';
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionInput {
  name: string;
  description?: string | null;
  coverColor?: string | null;
  visibility?: 'public' | 'private';
}

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

// 校验合集输入，返回错误信息或 null
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
  if (input.visibility != null && !['public', 'private'].includes(input.visibility)) {
    return '可见性仅支持 public/private';
  }
  return null;
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

// 我的合集列表（可选按可见性过滤）
export function listCollections(userId: number, visibility?: 'public' | 'private'): any[] {
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

// 合集详情（含故事列表）。可见性：private 仅 owner 可见，否则返回 null（404，不暴露存在性）
export function getCollectionDetail(id: number, currentUserId?: number): any | null {
  const row = db.prepare('SELECT * FROM collections WHERE id = ?').get(id) as Collection | undefined;
  if (!row) return null;
  if (row.visibility === 'private' && row.user_id !== currentUserId) return null;
  const stories = getStoriesByCollectionId(id);
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
  return { ...attachStoryCount([row])[0], favorite_count: favRow.cnt, stories };
}

// 编辑合集（owner 校验）
export function updateCollection(
  id: number,
  userId: number,
  patch: Partial<CollectionInput> & { sortOrder?: number },
): { error?: string; collection?: any; notFound?: boolean; forbidden?: boolean } {
  const existing = db.prepare('SELECT * FROM collections WHERE id = ?').get(id) as Collection | undefined;
  if (!existing) return { notFound: true };
  if (existing.user_id !== userId) return { forbidden: true };
  const input: CollectionInput = {
    name: patch.name ?? existing.name,
    description: patch.description !== undefined ? patch.description : existing.description,
    coverColor: patch.coverColor !== undefined ? patch.coverColor : existing.cover_color,
    visibility: patch.visibility ?? existing.visibility,
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

// 删除合集（owner 校验；故事 collection_id 置 NULL，故事保留）
export function deleteCollection(id: number, userId: number): { notFound?: boolean; forbidden?: boolean } {
  const existing = db.prepare('SELECT * FROM collections WHERE id = ?').get(id) as Collection | undefined;
  if (!existing) return { notFound: true };
  if (existing.user_id !== userId) return { forbidden: true };
  db.prepare('UPDATE stars SET collection_id = NULL WHERE collection_id = ?').run(id);
  db.prepare('DELETE FROM collections WHERE id = ?').run(id);
  return {};
}

// 公开合集列表（分页，可按 userId 过滤某作者）
export function listPublicCollections(
  userId?: number,
  page = 1,
  limit = 20,
): { items: any[]; total: number; page: number; limit: number; totalPages: number } {
  const p = Math.max(1, Math.floor(page));
  const l = Math.max(1, Math.min(100, Math.floor(limit)));
  const offset = (p - 1) * l;
  const where = userId ? 'visibility = ? AND user_id = ?' : 'visibility = ?';
  const countParams = userId ? (['public', userId] as any[]) : (['public'] as any[]);
  const listParams = userId ? (['public', userId, l, offset] as any[]) : (['public', l, offset] as any[]);

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
  // 1) 尝试 is_default=1（旧库列，try-catch 兼容新库无此列）
  try {
    const def = db.prepare('SELECT * FROM collections WHERE user_id = ? AND is_default = 1 LIMIT 1').get(userId);
    if (def) return attachStoryCount([def as any])[0];
  } catch {}

  // 2) 第一个公开合集
  const firstPub = db.prepare('SELECT * FROM collections WHERE user_id = ? AND visibility = ? ORDER BY sort_order ASC, created_at ASC LIMIT 1').get(userId, 'public') as Collection | undefined;
  if (firstPub) return attachStoryCount([firstPub])[0];

  // 3) 任意一个合集
  const any = db.prepare('SELECT * FROM collections WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC LIMIT 1').get(userId) as Collection | undefined;
  if (any) return attachStoryCount([any])[0];

  // 4) 创建默认合集
  const created = createCollection(userId, { name: '我的默认合集', description: '默认收纳所有未分类的故事', coverColor: '#E8B86D', visibility: 'public' });
  return created.collection;
}

/**
 * 获取用户的默认合集（不创建）。
 * 用于投递故事时自动归属。
 */
export function getDefaultCollection(userId: number): any | null {
  try {
    const def = db.prepare('SELECT * FROM collections WHERE user_id = ? AND is_default = 1 LIMIT 1').get(userId);
    if (def) return def;
  } catch {}
  const firstPub = db.prepare('SELECT * FROM collections WHERE user_id = ? AND visibility = ? ORDER BY sort_order ASC, created_at ASC LIMIT 1').get(userId, 'public');
  if (firstPub) return firstPub;
  const any = db.prepare('SELECT * FROM collections WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC LIMIT 1').get(userId);
  return any ?? null;
}
