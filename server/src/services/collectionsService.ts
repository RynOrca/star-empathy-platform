import db from '../db';
import { getCatalogStar } from './catalogMeta';

export interface Collection {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  cover_color: string;
  is_default: number;
  is_public: number;
  status: string;
  reject_reason: string | null;
  sort_order: number;
  story_count: number;
  total_resonance: number;
  total_views: number;
  created_at: string;
  updated_at: string;
}

const NAME_RE = /^[\u4e00-\u9fa5A-Za-z0-9\s\-_·]{1,30}$/;

function cleanName(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  const v = name.trim();
  if (!NAME_RE.test(v)) return null;
  return v;
}
function cleanDescription(desc: unknown): string | null {
  if (typeof desc !== 'string') return null;
  const v = desc.trim();
  if (v.length > 500) return v.substring(0, 500);
  return v.length ? v : null;
}
function cleanColor(c: unknown): string {
  if (typeof c !== 'string') return '#ffd98a';
  if (/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(c.trim())) return c.trim();
  return '#ffd98a';
}

/** 获取某个用户的默认合集，不存在就建（注册/老用户升级/提交流程兜底都会用） */
export function ensureDefaultCollection(userId: number): { id: number; isDefault: boolean; created: boolean } {
  const existing = db.prepare(
    'SELECT id FROM collections WHERE user_id = ? AND is_default = 1 LIMIT 1'
  ).get(userId) as { id: number } | undefined;
  if (existing) return { id: existing.id, isDefault: true, created: false };

  const info = db.prepare(
    `INSERT INTO collections (user_id, name, description, cover_color, is_default, is_public, status, sort_order)
     VALUES (?, ?, ?, ?, 1, 1, 'approved', 0)`
  ).run(userId, '我的默认合集', '默认收纳所有未分类的故事，这是你的公开笔记本', '#ffd98a');
  return { id: info.lastInsertRowid as number, isDefault: true, created: true };
}

/** 每次服务启动：给所有没建默认合集的老用户补一条（幂等） */
export function backfillDefaultCollectionsForAll(): number {
  const users = db.prepare('SELECT id FROM users WHERE id NOT IN (SELECT user_id FROM collections WHERE is_default = 1)').all() as { id: number }[];
  let cnt = 0;
  for (const u of users) {
    const r = ensureDefaultCollection(u.id);
    if (r.created) cnt++;
  }
  return cnt;
}

/**
 * 将某条故事的合集冗余计数重新计算并 UPDATE。
 * 调用场景：新增故事 / 从合集移除（移到其它合集） / 删除故事 / 共鸣 / 浏览后
 */
export function recountCollectionTotals(collectionId: number) {
  const agg = db.prepare(`
    SELECT
      COUNT(s.id)                                           AS sc,
      COALESCE(SUM(s.resonance_count), 0)                   AS sr,
      COALESCE(SUM(s.view_count), 0)                        AS sv
    FROM stars s
    WHERE s.collection_id = ?
  `).get(collectionId) as { sc: number; sr: number; sv: number };
  db.prepare(
    `UPDATE collections
       SET story_count = ?, total_resonance = ?, total_views = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(agg.sc, agg.sr, agg.sv, collectionId);
}

/** 若故事原先挂在某合集下：先把旧合集 recount；再把新合集 recount。 */
function bumpAfterCollectionChange(storyId: number, prevCollectionId: number | null, newCollectionId: number | null) {
  const ids = new Set<number>();
  if (prevCollectionId) ids.add(prevCollectionId);
  if (newCollectionId) ids.add(newCollectionId);
  for (const cid of ids) recountCollectionTotals(cid);
}

/** 校验合集归属：返回 null=OK，否则返回错误原因（"不存在" / "无权操作"）*/
export function checkOwnership(collectionId: number, userId: number):
  | { ok: true; collection: Collection }
  | { ok: false; reason: 'not-found' | 'forbidden' }
{
  const c = db.prepare('SELECT * FROM collections WHERE id = ?').get(collectionId) as Collection | undefined;
  if (!c) return { ok: false, reason: 'not-found' };
  if (c.user_id !== userId) return { ok: false, reason: 'forbidden' };
  return { ok: true, collection: c };
}

/** 创建合集：name 必填，description/cover_color 可选；默认 is_public=1 公开，status=approved（MVP1 暂不审核） */
export function createCollection(userId: number, params: {
  name: unknown; description?: unknown; coverColor?: unknown; isPublic?: unknown;
}): { id: number } | { error: string } {
  const name = cleanName(params.name);
  if (!name) return { error: '合集名称必填，最多 30 个汉字/字母/数字' };
  const description = cleanDescription(params.description);
  const coverColor = cleanColor(params.coverColor);
  const isPublic = typeof params.isPublic === 'number'
    ? (params.isPublic === 1 ? 1 : 0)
    : typeof params.isPublic === 'boolean'
      ? (params.isPublic ? 1 : 0)
      : 1; // 默认公开

  const info = db.prepare(
    `INSERT INTO collections (user_id, name, description, cover_color, is_default, is_public, status, sort_order)
     VALUES (?, ?, ?, ?, 0, ?, 'approved',
       COALESCE((SELECT COALESCE(MAX(sort_order) + 1, 0) FROM collections WHERE user_id = ?), 0))`
  ).run(userId, name, description, coverColor, isPublic, userId);
  const id = info.lastInsertRowid as number;
  return { id };
}

/** 列表：登录用户的所有合集（is_default 置顶 → sort_order → updated_at DESC） */
export function listMyCollections(userId: number): Collection[] {
  ensureDefaultCollection(userId);
  const rows = db.prepare(`
    SELECT * FROM collections
    WHERE user_id = ?
    ORDER BY is_default DESC, sort_order ASC, updated_at DESC
  `).all(userId) as any[];
  return rows as Collection[];
}

/** 改合集：name/description/coverColor/isPublic/isDefault(禁止从 1 改 0)/sortOrder */
export function patchCollection(userId: number, collectionId: number, patch: {
  name?: unknown;
  description?: unknown;
  coverColor?: unknown;
  isPublic?: unknown;
  sortOrder?: unknown;
}): { ok: true; collection: Collection } | { ok: false; reason: string } {
  const own = checkOwnership(collectionId, userId);
  if (!own.ok) return { ok: false, reason: own.reason };
  const c = own.collection;

  const assignments: string[] = [];
  const bindings: (string | number | null)[] = [];

  if (patch.name !== undefined) {
    const name = cleanName(patch.name);
    if (!name) return { ok: false, reason: '合集名称不合法（1~30 个汉字/字母/数字）' };
    assignments.push('name = ?');
    bindings.push(name);
  }
  if (patch.description !== undefined) {
    assignments.push('description = ?');
    bindings.push(cleanDescription(patch.description));
  }
  if (patch.coverColor !== undefined) {
    assignments.push('cover_color = ?');
    bindings.push(cleanColor(patch.coverColor));
  }
  if (patch.isPublic !== undefined) {
    const v = typeof patch.isPublic === 'number'
      ? (patch.isPublic === 1 ? 1 : 0)
      : typeof patch.isPublic === 'boolean'
        ? (patch.isPublic ? 1 : 0)
        : null;
    if (v === null) return { ok: false, reason: 'isPublic 参数不合法（true/false 或 1/0）' };
    assignments.push('is_public = ?');
    bindings.push(v);
    // 1 → 公开 → 直接 approved；0 → 私密 → draft（MVP1 暂不审核，所以不通过审核直接生效）
    assignments.push("status = ?");
    bindings.push(v === 1 ? 'approved' : 'draft');
  }
  if (patch.sortOrder !== undefined) {
    const so = typeof patch.sortOrder === 'number' && Number.isInteger(patch.sortOrder)
      ? patch.sortOrder
      : null;
    if (so === null) return { ok: false, reason: 'sortOrder 必须是整数' };
    assignments.push('sort_order = ?');
    bindings.push(so);
  }
  if (assignments.length === 0) return { ok: true, collection: c };

  assignments.push("updated_at = datetime('now')");
  bindings.push(collectionId);
  db.prepare(`UPDATE collections SET ${assignments.join(', ')} WHERE id = ?`).run(...bindings);

  const fresh = db.prepare('SELECT * FROM collections WHERE id = ?').get(collectionId) as any as Collection;
  return { ok: true, collection: fresh };
}

/** 删除合集（不能删默认合集；被删合集下的故事 collection_id 置为默认合集） */
export function deleteCollection(userId: number, collectionId: number):
  { ok: true } | { ok: false; reason: string }
{
  const own = checkOwnership(collectionId, userId);
  if (!own.ok) return { ok: false, reason: own.reason };
  if (own.collection.is_default === 1) {
    return { ok: false, reason: '默认合集不能删除' };
  }
  const defaultId = ensureDefaultCollection(userId).id;
  const deletedCollectionAffected = collectionId === defaultId ? null : collectionId;
  db.prepare('UPDATE stars SET collection_id = ? WHERE user_id = ? AND collection_id = ?')
    .run(defaultId, userId, collectionId);
  db.prepare('DELETE FROM collections WHERE id = ?').run(collectionId);

  recountCollectionTotals(defaultId);
  if (deletedCollectionAffected) { /* 删掉的合集不用 recount */ }
  return { ok: true };
}

/**
 * 将一条故事移动到新合集（MVP1：一故事一合集，相当于覆盖赋值）。
 * 权限：故事必须是 userId 自己写的；newCollectionId 要么是 null 要么是自己的合集
 */
export function moveStoryToCollection(
  userId: number, storyId: number, newCollectionId: number | null,
): { ok: true } | { ok: false; reason: string } {
  const story = db.prepare(
    'SELECT user_id, collection_id FROM stars WHERE id = ?'
  ).get(storyId) as { user_id: number | null; collection_id: number | null } | undefined;
  if (!story) return { ok: false, reason: '故事不存在' };
  if (story.user_id !== userId) return { ok: false, reason: '只能移动自己写的故事' };
  const prev = story.collection_id;
  let target = newCollectionId;
  if (target !== null) {
    const own = checkOwnership(target, userId);
    if (!own.ok) return { ok: false, reason: own.reason === 'forbidden' ? '无权使用该合集' : '合集不存在' };
  }
  db.prepare('UPDATE stars SET collection_id = ? WHERE id = ?').run(target, storyId);
  bumpAfterCollectionChange(storyId, prev, target);
  return { ok: true };
}

/** 写故事时直接写入 collection_id（路由层调用前必须先 ensureDefaultCollection + 校验归属） */
export function attachCollectionIdToStory(storyId: number, collectionId: number | null, prevForRecount: number | null = null) {
  if (collectionId == null) {
    db.prepare('UPDATE stars SET collection_id = NULL WHERE id = ?').run(storyId);
  } else {
    db.prepare('UPDATE stars SET collection_id = ? WHERE id = ?').run(collectionId, storyId);
  }
  bumpAfterCollectionChange(storyId, prevForRecount, collectionId ?? null);
}

/** 合集详情页的故事列表（跨星；每条附所在星名+星色；分页） */
export function getCollectionStoriesPaged(
  userId: number,  // 访问者 userId，未登录可传 0/null
  collectionId: number,
  page: number, limit: number,
): {
  ok: true;
  items: any[]; total: number; page: number; limit: number; totalPages: number;
} | { ok: false; reason: string } {
  const c = db.prepare('SELECT * FROM collections WHERE id = ?').get(collectionId) as Collection | undefined;
  if (!c) return { ok: false, reason: 'not-found' };
  // 权限：(1) 合集创建者本人（无论公开/私密均可进入）(2) 公开合集且已通过审核（MVP1 approved）= 允许任何登录/未登录用户读
  const isOwner = userId && c.user_id === userId;
  const isPublicReadable = c.is_public === 1 && c.status === 'approved';
  if (!isOwner && !isPublicReadable) return { ok: false, reason: 'forbidden' };

  const p = Math.max(1, page | 0);
  const l = Math.max(1, Math.min(50, limit | 0));

  const totalRow = db.prepare('SELECT COUNT(*) AS c FROM stars WHERE collection_id = ?').get(collectionId) as { c: number };
  const total = totalRow.c;
  const totalPages = Math.max(1, Math.ceil(total / l));

  const rows = db.prepare(`
    SELECT s.*,
      CASE WHEN s.is_anonymous = 1 THEN NULL ELSE u.username END as username,
      COALESCE(scs.catalog_star_id, s.catalog_star_id) as catalog_star_id_resolved
    FROM stars s
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN story_catalog_stars scs ON scs.story_id = s.id AND scs.is_primary = 1
    WHERE s.collection_id = ?
    ORDER BY s.created_at DESC
    LIMIT ? OFFSET ?
  `).all(collectionId, l, (p - 1) * l);

  // 复用 starService 的 tags 规范化
  // 这里只做 tags 列解析，减少循环依赖（collectionsService 不引入 starService，避免双向 require）
  const TAG_RE = /^[\u4e00-\u9fa5A-Za-z0-9]{2,6}$/;
  const items = rows.map((s: any) => {
    let tagsArr: string[] = [];
    if (typeof s.tags === 'string' && s.tags.length > 0) {
      try {
        const p = JSON.parse(s.tags);
        if (Array.isArray(p)) tagsArr = p.filter((t: unknown) => typeof t === 'string' && TAG_RE.test(t));
      } catch { /* ignore */ }
    }
    if (tagsArr.length === 0 && typeof s.tag === 'string' && s.tag.trim()) {
      tagsArr = [s.tag.trim()];
    }
    const catalogId = s.catalog_star_id_resolved;
    const meta = catalogId != null ? getCatalogStar(catalogId) : undefined;
    const catalogStarName = meta?.name ? (meta.constellationCN ? `${meta.name}·${meta.constellationCN}座` : meta.name) : null;
    // 简单 fallback 色温：根据视星等 mag 给一个暖色/白色（越亮越暖）
    let catalogStarColor = '#ffffff';
    if (meta?.mag != null) {
      const m = meta.mag;
      if (m < 0.5) catalogStarColor = '#fff3d6';
      else if (m < 1.5) catalogStarColor = '#ffd98a';
      else if (m < 2.5) catalogStarColor = '#e7e2ff';
      else if (m < 3.5) catalogStarColor = '#cfd3ff';
      else catalogStarColor = '#f0f0ff';
    }
    return {
      ...s,
      tags: Array.from(new Set(tagsArr)),
      catalogStarName,
      catalogStarColor,
    };
  });

  return { ok: true, items, total, page: p, limit: l, totalPages };
}

type CollectionStatsCatalog = { catalogStarId: number | null; name: string | null; color: string | null; count: number };

/** 合集聚合统计（头部卡片用；story_count/total_resonance/total_views + 标签聚合） */
export function getCollectionStats(userId: number, collectionId: number):
  { ok: false; reason: string }
  | {
      ok: true;
      id: number; name: string; description: string | null; coverColor: string;
      isDefault: boolean; isPublic: boolean;
      storyCount: number; totalResonance: number; totalViews: number;
      createdAt: string; updatedAt: string;
      topTags: { tag: string; count: number }[];
      catalogs: CollectionStatsCatalog[];
    }
{
  const c = db.prepare('SELECT * FROM collections WHERE id = ?').get(collectionId) as Collection | undefined;
  if (!c) return { ok: false, reason: 'not-found' };
  const isOwner = userId && c.user_id === userId;
  const isPublicReadable = c.is_public === 1 && c.status === 'approved';
  if (!isOwner && !isPublicReadable) return { ok: false, reason: 'forbidden' };

  const topTagsAll = db.prepare(`
    SELECT s.tags as tags, s.tag as tag
    FROM stars s WHERE s.collection_id = ?
    LIMIT 1000
  `).all(collectionId) as { tags: string | null; tag: string | null }[];
  const TAG_RE = /^[\u4e00-\u9fa5A-Za-z0-9]{2,6}$/;
  const tagCount = new Map<string, number>();
  for (const row of topTagsAll) {
    const tags: string[] = [];
    if (row.tags) try { const p = JSON.parse(row.tags); if (Array.isArray(p)) p.forEach((t: unknown) => typeof t === 'string' && tags.push(t)); } catch { /* ignore */ }
    if (row.tag) tags.push(row.tag);
    for (const raw of tags) {
      const v = raw.trim();
      if (!TAG_RE.test(v)) continue;
      tagCount.set(v, (tagCount.get(v) ?? 0) + 1);
    }
  }
  const topTags = Array.from(tagCount.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const catalogRows = db.prepare(`
    SELECT COALESCE(scs.catalog_star_id, s.catalog_star_id) as cid,
      COUNT(DISTINCT s.id) as cnt
    FROM stars s
    LEFT JOIN story_catalog_stars scs ON scs.story_id = s.id AND scs.is_primary = 1
    WHERE s.collection_id = ?
    GROUP BY cid
    HAVING cid IS NOT NULL
    ORDER BY cnt DESC
    LIMIT 12
  `).all(collectionId) as { cid: number; cnt: number }[];

  const catalogs: CollectionStatsCatalog[] = catalogRows.map((r) => {
    const meta = getCatalogStar(r.cid);
    const name = meta?.name
      ? (meta.constellationCN ? `${meta.name}·${meta.constellationCN}座` : meta.name)
      : null;
    let color = '#ffffff';
    if (meta?.mag != null) {
      const m = meta.mag;
      if (m < 0.5) color = '#fff3d6';
      else if (m < 1.5) color = '#ffd98a';
      else if (m < 2.5) color = '#e7e2ff';
      else if (m < 3.5) color = '#cfd3ff';
      else color = '#f0f0ff';
    }
    return { catalogStarId: r.cid, name, color, count: r.cnt };
  });

  return {
    ok: true,
    id: c.id, name: c.name, description: c.description, coverColor: c.cover_color,
    isDefault: c.is_default === 1, isPublic: c.is_public === 1,
    storyCount: c.story_count, totalResonance: c.total_resonance, totalViews: c.total_views,
    createdAt: c.created_at, updatedAt: c.updated_at,
    topTags, catalogs,
  };
}

/** 打开合集详情：记录一次访问 + total_views 冗余 + recount（只 recount view_count，不重扫全部）*/
export function recordCollectionVisit(userId: number | null, collectionId: number): void {
  db.prepare('INSERT INTO collection_visits (collection_id, user_id) VALUES (?, ?)')
    .run(collectionId, userId ?? null);
  db.prepare(
    `UPDATE collections SET total_views = (
       SELECT COUNT(*) FROM collection_visits WHERE collection_id = ?
     ), updated_at = datetime('now') WHERE id = ?`
  ).run(collectionId, collectionId);
}
