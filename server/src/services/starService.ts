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
}

// 获取所有星星（含用户名和标签）
export function getAllStars(): (Star & { username: string | null; tag: string | null })[] {
  return db.prepare(`
    SELECT s.*, u.username, s.tag
    FROM stars s
    LEFT JOIN users u ON s.user_id = u.id
    ORDER BY s.created_at DESC
  `).all() as unknown as (Star & { username: string | null; tag: string | null })[];
}

// 创建星星
export function createStar(
  content: string,
  title?: string,
  catalogStarId?: number,
  location?: { lat: number; lng: number },
  userId?: number,
  tag?: string,
): Star {
  const pos = generatePosition();
  const validTags = ['思念', '等待', '离别', '愿望', '孤独'];
  const safeTag = tag && validTags.includes(tag) ? tag : null;
  const stmt = db.prepare(`
    INSERT INTO stars (type, title, content, pos_x, pos_y, pos_z, catalog_star_id, location_lat, location_lng, user_id, tag)
    VALUES ('user', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
  );
  return db.prepare('SELECT * FROM stars WHERE id = ?').get(result.lastInsertRowid) as unknown as Star;
}

// 共鸣 +1
export function resonate(id: number): { id: number; resonance_count: number } | null {
  const star = db.prepare('SELECT * FROM stars WHERE id = ?').get(id) as unknown as Star | undefined;
  if (!star) return null;
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

// 星星级浏览记录（打开详情页一次 = +1）
export function recordCatalogVisit(catalogStarId: number): void {
  db.prepare('INSERT INTO catalog_visits (catalog_star_id) VALUES (?)').run(catalogStarId);
}

// 故事级浏览 +1（点击进入故事详情 = +1）
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

// 收藏星星
export function addFavorite(catalogStarId: number): void {
  db.prepare('INSERT INTO favorites (catalog_star_id) VALUES (?)').run(catalogStarId);
}

// 取消收藏星星
export function removeFavorite(catalogStarId: number): void {
  db.prepare('DELETE FROM favorites WHERE catalog_star_id = ?').run(catalogStarId);
}

// 全局统计
export function getGlobalStats(): { starCount: number; userCount: number; totalResonance: number } {
  const starRow = db.prepare('SELECT COUNT(*) as cnt FROM stars').get() as unknown as { cnt: number };
  const userRow = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as unknown as { cnt: number };
  const resRow = db.prepare('SELECT COALESCE(SUM(resonance_count), 0) as cnt FROM stars').get() as unknown as { cnt: number };
  return { starCount: starRow.cnt, userCount: userRow.cnt, totalResonance: resRow.cnt };
}

// 我的故事
export function getUserStories(userId: number): (Star & { username: string | null; tag: string | null })[] {
  return db.prepare(`
    SELECT s.*, u.username, s.tag
    FROM stars s LEFT JOIN users u ON s.user_id = u.id
    WHERE s.user_id = ? ORDER BY s.created_at DESC
  `).all(userId) as unknown as (Star & { username: string | null; tag: string | null })[];
}

// 我的收藏（返回收藏的星星 catalog_star_id 列表）
export function getUserFavorites(userId: number): number[] {
  // favorites 表存的是 catalog_star_id，不需要关联用户
  // 这里简化：返回所有收藏的星星ID（平台级收藏，非用户级）
  const rows = db.prepare('SELECT DISTINCT catalog_star_id FROM favorites ORDER BY catalog_star_id').all() as unknown as { catalog_star_id: number }[];
  return rows.map(r => r.catalog_star_id);
}
