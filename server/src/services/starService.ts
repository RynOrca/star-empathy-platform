import db from '../db';
import { generatePosition } from '../utils/position';

export interface Star {
  id: number;
  type: string;
  title: string | null;
  content: string;
  resonance_count: number;
  pos_x: number;
  pos_y: number;
  pos_z: number;
  catalog_star_id: number | null;
  location_lat: number | null;
  location_lng: number | null;
  created_at: string;
  view_count: number;
  origin: string | null;
  image_url: string | null;
}

// 获取所有星星（含用户名、用户 ID 和标签）
// 注：字段名由 response.ts 的 convertKeys 统一转为 camelCase，SQL 中无需重复别名
export function getAllStars(): (Star & { username: string | null; tag: string | null; userId: number | null })[] {
  return db.prepare(`
    SELECT s.*,
      CASE WHEN s.is_anonymous = 1 THEN NULL ELSE u.username END as username
    FROM stars s
    LEFT JOIN users u ON s.user_id = u.id
    ORDER BY s.created_at DESC
  `).all() as unknown as (Star & { username: string | null; tag: string | null; userId: number | null })[];
}

// 分页获取所有星星
export function getAllStarsPaged(page: number, limit: number): {
  items: (Star & { username: string | null; tag: string | null; userId: number | null })[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} {
  const p = Math.max(1, Math.floor(page));
  const l = Math.max(1, Math.min(100, Math.floor(limit)));
  const offset = (p - 1) * l;

  const totalRow = db.prepare('SELECT COUNT(*) as cnt FROM stars').get() as { cnt: number };
  const total = totalRow.cnt;
  const totalPages = Math.ceil(total / l);

  const items = db.prepare(`
    SELECT s.*,
      CASE WHEN s.is_anonymous = 1 THEN NULL ELSE u.username END as username
    FROM stars s
    LEFT JOIN users u ON s.user_id = u.id
    ORDER BY s.created_at DESC
    LIMIT ? OFFSET ?
  `).all(l, offset) as unknown as (Star & { username: string | null; tag: string | null; userId: number | null })[];

  return { items, total, page: p, limit: l, totalPages };
}

// 创建星星
export function createStar(
  content: string,
  title?: string,
  catalogStarId?: number,
  location?: { lat: number; lng: number },
  userId?: number,
  tag?: string,
  isAnonymous?: boolean,
  imageUrl?: string,
): Star & { username: string | null; userId: number | null } {
  const pos = generatePosition();
  const validTags = ['思念', '等待', '离别', '愿望', '孤独'];
  const safeTag = tag && validTags.includes(tag) ? tag : null;
  const stmt = db.prepare(`
    INSERT INTO stars (type, title, content, pos_x, pos_y, pos_z, catalog_star_id, location_lat, location_lng, user_id, tag, is_anonymous, image_url)
    VALUES ('user', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    title ?? null,
    content,
    pos.x, pos.y, pos.z,
    catalogStarId ?? null,
    location?.lat ?? null,
    location?.lng ?? null,
    userId ?? null,
    safeTag,
    isAnonymous ? 1 : 0,
    imageUrl ?? null,
  );
  return db.prepare(`
    SELECT s.*,
      CASE WHEN s.is_anonymous = 1 THEN NULL ELSE u.username END as username
    FROM stars s
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.id = ?
  `).get(result.lastInsertRowid) as unknown as Star & { username: string | null; userId: number | null };
}

// 共鸣 +1（支持去重）
export function resonate(id: number, userId?: number): { id: number; resonance_count: number; already?: boolean } | null {
  const star = db.prepare('SELECT * FROM stars WHERE id = ?').get(id) as unknown as Star | undefined;
  if (!star) return null;

  // 登录用户去重：同一用户对同一故事只能共鸣一次
  if (userId) {
    const existing = db.prepare(
      'SELECT id FROM resonance_log WHERE story_id = ? AND user_id = ?'
    ).get(id, userId) as unknown as { id: number } | undefined;
    if (existing) {
      const current = db.prepare('SELECT id, resonance_count FROM stars WHERE id = ?').get(id) as unknown as {
        id: number; resonance_count: number;
      };
      return { ...current, already: true };
    }
    db.prepare('INSERT INTO resonance_log (story_id, user_id) VALUES (?, ?)').run(id, userId);
  }

  db.prepare('UPDATE stars SET resonance_count = resonance_count + 1 WHERE id = ?').run(id);
  const updated = db.prepare('SELECT id, resonance_count FROM stars WHERE id = ?').get(id) as unknown as {
    id: number;
    resonance_count: number;
  };
  return updated;
}

// 浏览 +1（按 catalog_star_id 批量 +1）
export function incrementView(catalogStarId: number): void {
  db.prepare('UPDATE stars SET view_count = view_count + 1 WHERE catalog_star_id = ?').run(catalogStarId);
}

// 星星级浏览记录（打开详情页一次 = +1，纯计数不去重）
export function recordCatalogVisit(catalogStarId: number): void {
  db.prepare('INSERT INTO catalog_visits (catalog_star_id) VALUES (?)').run(catalogStarId);
}

// 故事级浏览 +1（点击进入故事详情 = +1，纯计数不去重）
export function recordStoryView(storyId: number): void {
  db.prepare('UPDATE stars SET view_count = view_count + 1 WHERE id = ?').run(storyId);
}

// 按 catalog_star_id 获取统计数据
export function getCatalogStats(catalogStarId: number): { storyCount: number; totalResonance: number; totalViews: number; starViews: number; favoriteCount: number } {
  const row = db.prepare(`
    SELECT
      COUNT(*) as story_count,
      COALESCE(SUM(resonance_count), 0) as total_resonance,
      COALESCE(SUM(view_count), 0) as total_story_views
    FROM stars
    WHERE catalog_star_id = ?
  `).get(catalogStarId) as unknown as { story_count: number; total_resonance: number; total_story_views: number };

  const visitRow = db.prepare('SELECT COUNT(*) as cnt FROM catalog_visits WHERE catalog_star_id = ?').get(catalogStarId) as unknown as { cnt: number };
  const favRow = db.prepare('SELECT COUNT(*) as cnt FROM favorites WHERE catalog_star_id = ?').get(catalogStarId) as unknown as { cnt: number };

  return {
    storyCount: row.story_count,
    totalResonance: row.total_resonance,
    totalViews: row.total_story_views,
    starViews: visitRow.cnt,
    favoriteCount: favRow.cnt,
  };
}

// 收藏星星（用户级，同一用户对同一星只能收藏一次）
export function addFavorite(catalogStarId: number, userId: number): { already: boolean } {
  const existing = db.prepare(
    'SELECT id FROM favorites WHERE catalog_star_id = ? AND user_id = ?'
  ).get(catalogStarId, userId) as unknown as { id: number } | undefined;
  if (existing) return { already: true };
  db.prepare(
    'INSERT INTO favorites (catalog_star_id, user_id) VALUES (?, ?)'
  ).run(catalogStarId, userId);
  return { already: false };
}

// 取消收藏星星
export function removeFavorite(catalogStarId: number, userId: number): void {
  db.prepare(
    'DELETE FROM favorites WHERE catalog_star_id = ? AND user_id = ?'
  ).run(catalogStarId, userId);
}

// 全局统计
export function getGlobalStats(): { starCount: number; userCount: number; totalResonance: number } {
  const starRow = db.prepare('SELECT COUNT(*) as cnt FROM stars').get() as unknown as { cnt: number };
  const userRow = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as unknown as { cnt: number };
  const resRow = db.prepare('SELECT COALESCE(SUM(resonance_count), 0) as cnt FROM stars').get() as unknown as { cnt: number };
  return { starCount: starRow.cnt, userCount: userRow.cnt, totalResonance: resRow.cnt };
}

// 单条故事详情
export function getStoryById(storyId: number): (Star & { username: string | null; tag: string | null }) | null {
  const row = db.prepare(`
    SELECT s.*, u.username
    FROM stars s
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.id = ?
  `).get(storyId) as unknown as (Star & { username: string | null; tag: string | null }) | undefined;
  return row ?? null;
}

// 单星下的所有故事
export function getStoriesByCatalogStarId(catalogStarId: number): (Star & { username: string | null; tag: string | null })[] {
  return db.prepare(`
    SELECT s.*, u.username
    FROM stars s
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.catalog_star_id = ?
    ORDER BY s.created_at DESC
  `).all(catalogStarId) as unknown as (Star & { username: string | null; tag: string | null })[];
}

// 我的故事
export function getUserStories(userId: number): (Star & { username: string | null; tag: string | null })[] {
  return db.prepare(`
    SELECT s.*, u.username
    FROM stars s LEFT JOIN users u ON s.user_id = u.id
    WHERE s.user_id = ? ORDER BY s.created_at DESC
  `).all(userId) as unknown as (Star & { username: string | null; tag: string | null })[];
}

export function getUserStoriesPaged(userId: number, page: number, limit: number): {
  items: (Star & { username: string | null; tag: string | null })[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} {
  const p = Math.max(1, Math.floor(page));
  const l = Math.max(1, Math.min(100, Math.floor(limit)));
  const offset = (p - 1) * l;

  const totalRow = db.prepare('SELECT COUNT(*) as cnt FROM stars WHERE user_id = ?').get(userId) as { cnt: number };
  const total = totalRow.cnt;
  const totalPages = Math.ceil(total / l);

  const items = db.prepare(`
    SELECT s.*, u.username
    FROM stars s LEFT JOIN users u ON s.user_id = u.id
    WHERE s.user_id = ? ORDER BY s.created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, l, offset) as unknown as (Star & { username: string | null; tag: string | null })[];

  return { items, total, page: p, limit: l, totalPages };
}

// 我的收藏（返回该用户收藏的 catalog_star_id 列表）
export function getUserFavorites(userId: number): number[] {
  const rows = db.prepare(
    'SELECT catalog_star_id FROM favorites WHERE user_id = ? ORDER BY created_at DESC'
  ).all(userId) as unknown as { catalog_star_id: number }[];
  return rows.map(r => r.catalog_star_id);
}

// 删除故事（只能删除自己的，userId 为 null 表示匿名不允许删）
export function deleteStory(storyId: number, userId: number): {
  success: boolean;
  notFound?: boolean;
  notOwner?: boolean;
} {
  const existing = db.prepare('SELECT user_id FROM stars WHERE id = ?').get(storyId) as { user_id: number | null } | undefined;
  if (!existing) return { success: false, notFound: true };
  if (existing.user_id !== userId) return { success: false, notOwner: true };
  // 先清理外键关联数据，再删除故事本身
  db.prepare('DELETE FROM resonance_log WHERE story_id = ?').run(storyId);
  db.prepare('DELETE FROM story_views WHERE story_id = ?').run(storyId);
  db.prepare('DELETE FROM story_kernels WHERE story_id = ?').run(storyId);
  db.prepare('DELETE FROM stars WHERE id = ?').run(storyId);
  return { success: true };
}
