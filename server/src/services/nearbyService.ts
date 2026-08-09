/**
 * 附近的人的心事 — 核心匹配服务
 *
 * 设计理念：
 *   不是"物理距离最近"，而是"同区域 + 同情绪"的共鸣匹配。
 *   用情绪标签让同城里有着相似烦恼的人彼此辨认、互相宣泄。
 *
 * 算法分层：
 *   1. 地理锚点：geohash 网格 + k-匿名降级（同城→同省→全国）
 *   2. 情绪匹配：IDF 加权 Jaccard（复用 story_kernels 的 emotional_tags/themes）
 *   3. 综合排序：geo 权重 × 情绪相似度 + 时间新鲜度 + 热度微调
 *   4. 标签输出：返回 sharedEmotions/sharedThemes 供前端"打标签"展示
 *
 * 隐私：
 *   - 只用 geohash 前缀查询，不涉及精确坐标
 *   - k-匿名：同格心事 < k 条时自动扩大范围，兼顾隐私与体验
 *   - 响应只含城市名，不含坐标/距离精确值
 */

import db from '../db';
import { truncate, neighbors, PRECISION_LEVELS } from '../utils/geohash';
import { buildVisibilityFilter, buildCollectionMap, hideAuthorForRows, attachCatalogStarIds } from './starService';

/** k-匿名阈值：同格心事少于此数时降级到更粗网格 */
const K_ANONYMITY = 5;

/** 降级层级定义 */
interface DegradationLevel {
  name: 'district' | 'city' | 'province' | 'country' | 'emotion';
  precision: number | null;  // null = 无地理约束
  geoWeight: number;          // 地理权重（越远越低）
  label: string;              // 前端展示文案
}

const DEGRADATION_CHAIN: DegradationLevel[] = [
  { name: 'district',  precision: PRECISION_LEVELS.DISTRICT,  geoWeight: 1.0,  label: '同城' },
  { name: 'city',      precision: PRECISION_LEVELS.CITY,      geoWeight: 0.8,  label: '同城' },
  { name: 'province',  precision: PRECISION_LEVELS.PROVINCE,  geoWeight: 0.5,  label: '同省' },
  { name: 'country',   precision: 2,                           geoWeight: 0.3,  label: '全国' },
  { name: 'emotion',   precision: null,                        geoWeight: 0.0,  label: '同频' },
];

export interface NearbyStory {
  id: number;
  title: string | null;
  content: string;
  resonanceCount: number;
  createdAt: string;
  viewCount: number;
  tags: string[];
  catalogStarIds: number[];
  city: string | null;
  province: string | null;
  username: string | null;
  authorHidden?: boolean;
  essence: string | null;
  // 匹配输出
  sharedEmotions: string[];
  sharedThemes: string[];
  emotionSim: number;
  matchScore: number;
  geoLevel: string;
}

export interface NearbyResult {
  stories: NearbyStory[];
  geoLevel: string;
  geoLabel: string;
  totalFound: number;
  degraded: boolean;
}

/** 计算全局 IDF 权重表（标签稀有度） */
function computeIdfTable(): Map<string, number> {
  const rows = db.prepare(`
    SELECT emotional_tags, themes FROM story_kernels
  `).all() as { emotional_tags: string; themes: string }[];

  const N = rows.length || 1;
  const df = new Map<string, number>();

  for (const row of rows) {
    const tags = new Set<string>();
    try { JSON.parse(row.emotional_tags).forEach((t: string) => tags.add(t)); } catch {}
    try { JSON.parse(row.themes).forEach((t: string) => tags.add(t)); } catch {}
    for (const t of tags) {
      df.set(t, (df.get(t) || 0) + 1);
    }
  }

  const idf = new Map<string, number>();
  for (const [tag, count] of df) {
    // IDF = log(N / df)，最少 0.1 防止除零，冷启动期退化为均匀权重
    idf.set(tag, Math.max(0.1, Math.log(N / count)));
  }
  return idf;
}

/** IDF 加权 Jaccard 相似度 */
function weightedJaccard(
  setA: Set<string>,
  setB: Set<string>,
  idfTable: Map<string, number>,
): { similarity: number; shared: string[] } {
  if (setA.size === 0 && setB.size === 0) return { similarity: 0, shared: [] };

  let intersectionWeight = 0;
  let unionWeight = 0;
  const shared: string[] = [];

  // 并集 = A ∪ B
  const union = new Set([...setA, ...setB]);
  for (const tag of union) {
    const w = idfTable.get(tag) ?? 1.0; // 未见过的标签默认权重 1
    unionWeight += w;
    if (setA.has(tag) && setB.has(tag)) {
      intersectionWeight += w;
      shared.push(tag);
    }
  }

  return {
    similarity: unionWeight > 0 ? intersectionWeight / unionWeight : 0,
    shared,
  };
}

/** 获取当前用户的情绪画像（最近一条故事的内核优先，其次历史聚合） */
function getUserEmotionProfile(userId: number): { emotions: Set<string>; themes: Set<string> } {
  // 优先取最近一条故事的内核
  const recentKernel = db.prepare(`
    SELECT sk.emotional_tags, sk.themes
    FROM story_kernels sk
    JOIN stars s ON s.id = sk.story_id
    WHERE s.user_id = ? AND s.type = 'user'
    ORDER BY s.created_at DESC
    LIMIT 1
  `).get(userId) as { emotional_tags: string; themes: string } | undefined;

  if (recentKernel) {
    const emotions = new Set<string>();
    const themes = new Set<string>();
    try { JSON.parse(recentKernel.emotional_tags).forEach((t: string) => emotions.add(t)); } catch {}
    try { JSON.parse(recentKernel.themes).forEach((t: string) => themes.add(t)); } catch {}
    if (emotions.size > 0 || themes.size > 0) {
      return { emotions, themes };
    }
  }

  // 降级：历史聚合（取出现频次最高的 Top5）
  const rows = db.prepare(`
    SELECT sk.emotional_tags, sk.themes
    FROM story_kernels sk
    JOIN stars s ON s.id = sk.story_id
    WHERE s.user_id = ?
  `).all(userId) as { emotional_tags: string; themes: string }[];

  const emoCounts = new Map<string, number>();
  const themeCounts = new Map<string, number>();
  for (const row of rows) {
    try { JSON.parse(row.emotional_tags).forEach((t: string) => emoCounts.set(t, (emoCounts.get(t) || 0) + 1)); } catch {}
    try { JSON.parse(row.themes).forEach((t: string) => themeCounts.set(t, (themeCounts.get(t) || 0) + 1)); } catch {}
  }
  const topN = (m: Map<string, number>, n: number) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);

  return {
    emotions: new Set(topN(emoCounts, 5)),
    themes: new Set(topN(themeCounts, 5)),
  };
}

/** 时间新鲜度：30 天半衰期 */
function freshness(createdAt: string): number {
  const ageDays = (Date.now() - new Date(createdAt + 'Z').getTime()) / 86400000;
  return Math.exp(-ageDays / 30);
}

/**
 * 核心查询：附近的人的心事
 *
 * @param userGeohash  当前用户的 geohash（5 位）
 * @param userId       当前用户 ID（取情绪画像用）
 * @param limit        返回条数
 * @param k            k-匿名阈值
 */
export function getNearbyStories(
  userGeohash: string,
  userId: number,
  limit: number = 20,
  k: number = K_ANONYMITY,
): NearbyResult {
  const l = Math.max(1, Math.min(100, limit));
  const idfTable = computeIdfTable();
  const userProfile = getUserEmotionProfile(userId);

  // 若用户无情绪画像，跳过情绪匹配，纯地理+热度
  const hasProfile = userProfile.emotions.size > 0 || userProfile.themes.size > 0;

  for (const level of DEGRADATION_CHAIN) {
    // 构建地理查询条件
    let geoCondition = '';
    let geoParams: any[] = [];

    if (level.precision !== null) {
      // 截断到当前精度，取 9 格邻居
      const prefix = truncate(userGeohash, level.precision);
      const grids = neighbors(prefix);
      const likeConditions = grids.map(() => 'geohash LIKE ?').join(' OR ');
      geoCondition = `AND (${likeConditions})`;
      geoParams = grids.map(g => g + '%');
    } else {
      // emotion 级别：无地理约束
      geoCondition = '';
    }

    const { sql: filterSql, params: filterParams } = buildVisibilityFilter(userId);

    // 查询候选故事（带内核）
    const candidates = db.prepare(`
      SELECT s.*, u.username as username,
             sk.emotional_tags, sk.themes, sk.essence
      FROM stars s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN collections c ON c.id = s.collection_id
      LEFT JOIN story_kernels sk ON sk.story_id = s.id
      WHERE s.type = 'user'
        AND s.geohash IS NOT NULL
        AND s.user_id != ?
        ${geoCondition}
        AND ${filterSql}
      ORDER BY s.created_at DESC
      LIMIT 200
    `).all(userId, ...geoParams, ...filterParams) as any[];

    if (candidates.length === 0) continue;

    // 对每个候选计算匹配分
    const scored: NearbyStory[] = candidates.map((s: any) => {
      let emotions = new Set<string>();
      let themes = new Set<string>();
      try { emotions = new Set(JSON.parse(s.emotional_tags || '[]')); } catch {}
      try { themes = new Set(JSON.parse(s.themes || '[]')); } catch {}

      let emotionSim = 0;
      let sharedEmotions: string[] = [];
      let sharedThemes: string[] = [];

      if (hasProfile) {
        const emoResult = weightedJaccard(userProfile.emotions, emotions, idfTable);
        const themeResult = weightedJaccard(userProfile.themes, themes, idfTable);
        // 情绪权重 0.6，主题权重 0.4（沿用 kernel.ts getSimilarStars 的既定权重）
        emotionSim = emoResult.similarity * 0.6 + themeResult.similarity * 0.4;
        sharedEmotions = emoResult.shared;
        sharedThemes = themeResult.shared;
      }

      const fresh = freshness(s.created_at);
      const popularity = Math.log(1 + (s.resonance_count || 0) + (s.view_count || 0) * 0.3) / 10;

      // 综合分 = 情绪相似(主导) × geo权重 + 新鲜度 + 热度微调
      const matchScore = hasProfile
        ? emotionSim * (0.5 + level.geoWeight * 0.5) + fresh * 0.15 + popularity * 0.05
        : fresh * 0.3 + popularity * 0.7 + level.geoWeight * 0.1;

      // 情绪匹配阈值：有画像但相似度极低时降权（不硬过滤，保留地理认同）
      const finalScore = hasProfile && emotionSim < 0.05
        ? matchScore * 0.3  // 情绪完全不沾边的降权但不清除
        : matchScore;

      return {
        id: s.id,
        title: s.title,
        content: s.content,
        resonanceCount: s.resonance_count,
        createdAt: s.created_at,
        viewCount: s.view_count,
        // 保留原始 tags JSON 字符串，由 attachCatalogStarIds → normalizeTagsForStories 统一解析
        tags: s.tags,
        tag: s.tag,
        catalogStarIds: [],
        catalog_star_id: s.catalog_star_id,
        collection_id: s.collection_id,
        city: s.city,
        province: s.province,
        username: s.username,
        essence: s.essence ?? null,
        sharedEmotions,
        sharedThemes,
        emotionSim: Math.round(emotionSim * 100) / 100,
        matchScore: Math.round(finalScore * 1000) / 1000,
        geoLevel: level.name,
      };
    });

    // 按匹配分排序
    scored.sort((a, b) => b.matchScore - a.matchScore);

    // 检查是否达到 k-匿名阈值
    if (scored.length >= k || level.name === 'emotion') {
      const result = scored.slice(0, l);

      // 后处理：作者隐藏 + 标签规范化 + catalogStarIds
      const collMap = buildCollectionMap(candidates);
      const hidden = hideAuthorForRows(result as any[], collMap, userId);
      const withTags = attachCatalogStarIds(hidden);

      return {
        stories: withTags.map((s: any) => {
          // 确保不泄露精确坐标和 geohash
          const { location_lat, location_lng, geohash, ...safe } = s;
          return safe;
        }),
        geoLevel: level.name,
        geoLabel: level.label,
        totalFound: scored.length,
        degraded: level.name !== 'district',
      };
    }
  }

  // 所有层级都无数据
  return {
    stories: [],
    geoLevel: 'empty',
    geoLabel: '暂无',
    totalFound: 0,
    degraded: true,
  };
}
