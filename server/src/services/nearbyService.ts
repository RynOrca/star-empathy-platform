/**
 * 附近的人的心事 — 核心匹配服务 v2（情绪共振图谱版）
 *
 * 设计理念：
 *   不是"物理距离最近"，而是"同区域 + 同情绪"的共鸣匹配。
 *   用情绪标签让同城里有着相似烦恼的人彼此辨认、互相宣泄。
 *
 * 算法分层：
 *   1. 地理锚点：geohash 网格 + k-匿名降级（同城→同省→全国→同频）
 *   2. 情绪匹配：IDF 加权 Jaccard + VA 维度相似度 + 标签共现增益
 *   3. 持久化画像：多来源加权（story/emotion_resonance/resonate/view）+ 时间衰减
 *   4. 二阶推荐：和你共振过的人的最新故事优先推
 *   5. 多样性重排：MMR 平衡相关性与多样性，ε-greedy 引入跨象限探索
 *   6. 已读过滤 + 同作者限频 + 质量过滤
 *
 * 隐私：
 *   - 只用 geohash 前缀查询，不涉及精确坐标
 *   - k-匿名：同格心事 < k 条时自动扩大范围，兼顾隐私与体验
 *   - 响应只含城市名，不含坐标/距离精确值
 */

import db from '../db';
import { truncate, neighbors, PRECISION_LEVELS } from '../utils/geohash';
import { vaSimilarity, emotionIntensity, isSameResonanceZone } from '../utils/emotionModel';
import {
  getPersistentEmotionProfile,
  getEmotionNeighbors,
  getViewedStoryIds,
} from './emotionResonanceService';
import {
  buildVisibilityFilter,
  buildCollectionMap,
  hideAuthorForRows,
  attachCatalogStarIds,
} from './starService';

/** k-匿名阈值：同格心事少于此数时降级到更粗网格 */
const K_ANONYMITY = 5;

/** MMR 多样性重排的 λ 参数（越大越偏相关性，越小越偏多样性） */
const MMR_LAMBDA = 0.7;

/** ε-greedy 探索概率：以此概率混入一条跨情绪象限的故事 */
const EXPLORATION_EPSILON = 0.1;

/** 同一作者在结果中最多出现的次数 */
const MAX_PER_AUTHOR = 3;

/** 质量过滤：内容最短长度 */
const MIN_CONTENT_LENGTH = 10;

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

/** 查询选项 */
export interface NearbyOptions {
  /** MMR 多样性重排（默认 true） */
  diversity?: boolean;
  /** ε-greedy 探索，混入跨象限情绪故事（默认 true） */
  exploration?: boolean;
  /** 排除已浏览/已打标的故事（默认 true） */
  excludeViewed?: boolean;
}

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
  vaSim: number;              // VA 维度相似度（情绪环模型距离）
  timeResonance: number;      // 时间共振因子（深夜情绪更强烈）
  coOccurBoost: number;       // 标签共现增益
  sameZone: boolean;          // 是否处于同一情感象限
  neighborBoost: number;      // 二阶推荐加分（共振邻居的故事）
  isExploration: boolean;     // 是否为 ε-greedy 探索项
  matchScore: number;
  geoLevel: string;
}

export interface NearbyResult {
  stories: NearbyStory[];
  geoLevel: string;
  geoLabel: string;
  totalFound: number;
  degraded: boolean;
  profileSummary?: {
    emotionsCount: number;
    topEmotions: string[];
    neighborsCount: number;
  };
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

/** 时间新鲜度：30 天半衰期 */
function freshness(createdAt: string): number {
  const ageDays = (Date.now() - new Date(createdAt + 'Z').getTime()) / 86400000;
  return Math.exp(-ageDays / 30);
}

/**
 * 时间共振因子：同一时段的情绪更容易共鸣
 * 深夜（23:00-05:00）的情绪最强烈（孤独、焦虑多发于深夜），
 * 同一时段的故事在情绪共振上权重提升
 */
function timeResonance(createdAt: string, userRecentHour: number): number {
  // 解析故事投递时段（北京时间 UTC+8）
  const storyDate = new Date(createdAt + 'Z');
  const storyHour = (storyDate.getUTCHours() + 8) % 24;

  // 时段距离（环形）：0~12
  const hourDiff = Math.min(
    Math.abs(storyHour - userRecentHour),
    24 - Math.abs(storyHour - userRecentHour)
  );

  // 深夜加权：23:00-05:00 的故事情绪浓度更高
  const isDeepNight = (h: number) => h >= 23 || h <= 5;
  const deepNightBoost = (isDeepNight(storyHour) ? 0.15 : 0) + (isDeepNight(userRecentHour) ? 0.15 : 0);

  // 时段越接近 → 共振越强（1 - hourDiff/12），加上深夜加权
  return Math.max(0, 1 - hourDiff / 12) + deepNightBoost;
}

/**
 * 标签共现矩阵：从 story_kernels 统计标签共现频率
 * "焦虑"和"失眠"虽不同标签但常共现，匹配时给增益
 */
function computeCoOccurrenceMatrix(): Map<string, Map<string, number>> {
  const rows = db.prepare(`
    SELECT emotional_tags, themes FROM story_kernels
  `).all() as { emotional_tags: string; themes: string }[];

  const coOccur = new Map<string, Map<string, number>>();

  for (const row of rows) {
    const allTags = new Set<string>();
    try { JSON.parse(row.emotional_tags).forEach((t: string) => allTags.add(t)); } catch {}
    try { JSON.parse(row.themes).forEach((t: string) => allTags.add(t)); } catch {}
    const tags = [...allTags];
    // 两两共现计数
    for (let i = 0; i < tags.length; i++) {
      for (let j = i + 1; j < tags.length; j++) {
        const a = tags[i], b = tags[j];
        if (!coOccur.has(a)) coOccur.set(a, new Map());
        if (!coOccur.has(b)) coOccur.set(b, new Map());
        coOccur.get(a)!.set(b, (coOccur.get(a)!.get(b) || 0) + 1);
        coOccur.get(b)!.set(a, (coOccur.get(b)!.get(a) || 0) + 1);
      }
    }
  }

  return coOccur;
}

/**
 * 计算两组标签间的共现增益
 * 如果 A 的标签和 B 的标签在历史数据中频繁共现，说明虽不同但相关
 */
function coOccurrenceBoost(
  userTags: Set<string>,
  storyTags: Set<string>,
  matrix: Map<string, Map<string, number>>
): number {
  if (userTags.size === 0 || storyTags.size === 0) return 0;

  let maxBoost = 0;
  for (const ut of userTags) {
    const row = matrix.get(ut);
    if (!row) continue;
    for (const st of storyTags) {
      if (ut === st) continue; // 完全相同不算共现
      const count = row.get(st);
      if (count) {
        // 共现频率归一化（log 压缩，避免高频标签主导）
        const boost = Math.log(1 + count) / 5;
        maxBoost = Math.max(maxBoost, boost);
      }
    }
  }
  return Math.min(maxBoost, 0.3); // 上限 0.3
}

/**
 * MMR（Maximal Marginal Relevance）多样性重排
 *
 * 在相关性与多样性之间取平衡：每一步从候选中选出
 *   λ × relevance - (1 - λ) × maxSim(候选, 已选)
 * 最大的项，避免前 N 条都是同一情绪。
 */
function mmrRerank(candidates: NearbyStory[], lambda: number = MMR_LAMBDA): NearbyStory[] {
  if (candidates.length <= 1) return candidates;

  const result: NearbyStory[] = [];
  const remaining = [...candidates];

  // 第一条直接取相关性最高（candidates 已按 matchScore 降序）
  result.push(remaining.shift()!);

  while (remaining.length > 0 && result.length < candidates.length) {
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i];
      const relevance = cand.matchScore;

      // 计算与已选集合的最大标签 Jaccard 相似度
      let maxSim = 0;
      const candTags = new Set([...cand.sharedEmotions, ...cand.sharedThemes]);
      for (const selected of result) {
        const selTags = new Set([...selected.sharedEmotions, ...selected.sharedThemes]);
        if (candTags.size === 0 || selTags.size === 0) continue;
        let inter = 0;
        for (const t of candTags) if (selTags.has(t)) inter++;
        const sim = inter / (candTags.size + selTags.size - inter);
        if (sim > maxSim) maxSim = sim;
      }

      const mmrScore = lambda * relevance - (1 - lambda) * maxSim;
      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIdx = i;
      }
    }

    result.push(remaining.splice(bestIdx, 1)[0]);
  }

  return result;
}

/**
 * 同作者限频：同一作者在结果中最多出现 MAX_PER_AUTHOR 次
 * 保留每个作者得分最高的若干条，其余降级到尾部
 */
function limitPerAuthor(stories: NearbyStory[]): NearbyStory[] {
  const authorCounts = new Map<number, number>();
  const kept: NearbyStory[] = [];
  const deferred: NearbyStory[] = [];

  for (const s of stories) {
    const authorId = (s as any).user_id as number | undefined;
    if (authorId == null) {
      kept.push(s);
      continue;
    }
    const count = authorCounts.get(authorId) || 0;
    if (count < MAX_PER_AUTHOR) {
      kept.push(s);
      authorCounts.set(authorId, count + 1);
    } else {
      deferred.push(s);
    }
  }

  return [...kept, ...deferred];
}

/**
 * ε-greedy 探索：从候选池中挑一条"跨情绪象限"的故事
 *
 * 策略：优先选与用户当前情绪象限不同、且得分不至于太低的故事，
 * 避免信息茧房（总推同一种情绪）。
 */
function pickExplorationItem(
  pool: NearbyStory[],
  excludeIds: Set<number>,
  userEmotions: Set<string>,
): NearbyStory | null {
  // 候选：未入选 + 跨象限（sameZone=false）+ 有情绪标签
  const candidates = pool.filter(s => {
    if (excludeIds.has(s.id)) return false;
    if (s.sameZone) return false; // 跨象限
    if (s.sharedEmotions.length === 0 && s.emotionSim === 0) return false;
    return true;
  });

  if (candidates.length === 0) return null;

  // 在跨象限候选中，取综合分最高的（保证探索质量不过差）
  candidates.sort((a, b) => b.matchScore - a.matchScore);
  // 取前 3 名随机一个，增加随机性
  const top = candidates.slice(0, Math.min(3, candidates.length));
  void userEmotions; // 预留：未来可按用户情绪做更精细的探索
  return top[Math.floor(Math.random() * top.length)];
}

/**
 * 核心查询：附近的人的心事
 *
 * @param userGeohash  当前用户的 geohash（≥3 位）
 * @param userId       当前用户 ID（取情绪画像用）
 * @param limit        返回条数（1~100）
 * @param k            k-匿名阈值
 * @param options      多样性/探索/已读过滤开关
 */
export function getNearbyStories(
  userGeohash: string,
  userId: number,
  limit: number = 20,
  k: number = K_ANONYMITY,
  options: NearbyOptions = {},
): NearbyResult {
  const l = Math.max(1, Math.min(100, limit));
  const useDiversity = options.diversity !== false;
  const useExploration = options.exploration !== false;
  const excludeViewed = options.excludeViewed !== false;

  const idfTable = computeIdfTable();
  const coOccurMatrix = computeCoOccurrenceMatrix();

  // v2：使用持久化情绪画像（多来源 + 时间衰减），无画像时内部降级到 story_kernels
  const profile = getPersistentEmotionProfile(userId);
  const userProfile = { emotions: profile.emotions, themes: profile.themes };

  // v2：共振邻居（用于二阶推荐）
  const neighborMap = getEmotionNeighbors(userId, 20);
  const neighborIds = new Set(neighborMap.keys());

  // v2：已读故事集合（用于兜底过滤，主过滤走 SQL 子查询）
  const viewedIds = excludeViewed ? getViewedStoryIds(userId) : new Set<number>();

  // 获取用户最近活跃时段（用于时间共振）
  const recentStory = db.prepare(`
    SELECT created_at FROM stars WHERE user_id = ? AND type = 'user'
    ORDER BY created_at DESC LIMIT 1
  `).get(userId) as { created_at: string } | undefined;
  const userRecentHour = recentStory
    ? (new Date(recentStory.created_at + 'Z').getUTCHours() + 8) % 24
    : new Date().getHours();

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

    // v2：已读过滤（SQL 子查询排除）
    const viewedCondition = excludeViewed
      ? `AND s.id NOT IN (SELECT story_id FROM story_views WHERE user_id = ?)
         AND s.id NOT IN (SELECT story_id FROM emotion_resonances WHERE user_id = ?)`
      : '';
    const viewedParams = excludeViewed ? [userId, userId] : [];

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
        AND length(s.content) >= ?
        ${geoCondition}
        ${viewedCondition}
        AND ${filterSql}
      ORDER BY s.created_at DESC
      LIMIT 200
    `).all(userId, MIN_CONTENT_LENGTH, ...geoParams, ...viewedParams, ...filterParams) as any[];

    if (candidates.length === 0) continue;

    // 对每个候选计算匹配分
    const scored: NearbyStory[] = [];
    for (const s of candidates) {
      let emotions = new Set<string>();
      let themes = new Set<string>();
      try { emotions = new Set(JSON.parse(s.emotional_tags || '[]')); } catch {}
      try { themes = new Set(JSON.parse(s.themes || '[]')); } catch {}

      let emotionSim = 0;
      let sharedEmotions: string[] = [];
      let sharedThemes: string[] = [];
      let vaSim = 0;
      let coOccur = 0;
      let sameZone = false;
      let intensity = 0;

      if (hasProfile) {
        const emoResult = weightedJaccard(userProfile.emotions, emotions, idfTable);
        const themeResult = weightedJaccard(userProfile.themes, themes, idfTable);
        // 情绪权重 0.6，主题权重 0.4（沿用 kernel.ts getSimilarStars 的既定权重）
        emotionSim = emoResult.similarity * 0.6 + themeResult.similarity * 0.4;
        sharedEmotions = emoResult.shared;
        sharedThemes = themeResult.shared;

        // VA 维度相似度：即使标签不完全相同，情绪同频也能匹配
        vaSim = vaSimilarity(userProfile.emotions, emotions);

        // 标签共现增益：发现"焦虑"和"失眠"这种隐含关联
        const userAllTags = new Set([...userProfile.emotions, ...userProfile.themes]);
        const storyAllTags = new Set([...emotions, ...themes]);
        coOccur = coOccurrenceBoost(userAllTags, storyAllTags, coOccurMatrix);

        // 同一情感象限判断
        sameZone = isSameResonanceZone(userProfile.emotions, emotions);

        // 情绪强度：高 arousal 的故事更急需排解
        intensity = emotionIntensity(emotions);
      }

      const fresh = freshness(s.created_at);
      const tResonance = timeResonance(s.created_at, userRecentHour);
      const popularity = Math.log(1 + (s.resonance_count || 0) + (s.view_count || 0) * 0.3) / 10;

      // v2 升级：二阶推荐加分
      // 和你共振过的人（共振邻居）的最新故事，优先推
      const authorId = s.user_id as number | null;
      const isNeighborStory = authorId != null && neighborIds.has(authorId);
      const neighborInfo = isNeighborStory && authorId != null ? neighborMap.get(authorId) : null;
      const neighborBoost = neighborInfo
        ? Math.min(0.15, neighborInfo.totalWeight * 0.03)
        : 0;

      // 综合分 = 七维加权
      //   情绪相似(30%) × geo权重
      // + VA维度相似(18%) × 同区加成(sameZone ? 1.2 : 0.8)
      // + 标签共现增益(8%)
      // + 时间共振(12%) × 情绪强度
      // + 二阶推荐加分(7%)
      // + 新鲜度(15%)
      // + 热度(10%)
      const matchScore = hasProfile
        ? (emotionSim * 0.30) * (0.5 + level.geoWeight * 0.5)
          + (vaSim * 0.18) * (sameZone ? 1.2 : 0.8)
          + coOccur * 0.08
          + (tResonance * 0.12) * (0.5 + intensity * 0.5)
          + (neighborBoost / 0.15) * 0.07
          + fresh * 0.15
          + popularity * 0.10
        : (tResonance * 0.20) * (0.5 + level.geoWeight * 0.5)
          + fresh * 0.25
          + popularity * 0.45
          + level.geoWeight * 0.10;

      // 情绪完全不沾边且不在同一象限时降权
      const finalScore = hasProfile && emotionSim < 0.05 && !sameZone
        ? matchScore * 0.2
        : matchScore;

      scored.push({
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
        user_id: s.user_id,
        city: s.city,
        province: s.province,
        username: s.username,
        essence: s.essence ?? null,
        sharedEmotions,
        sharedThemes,
        emotionSim: Math.round(emotionSim * 100) / 100,
        vaSim: Math.round(vaSim * 100) / 100,
        timeResonance: Math.round(tResonance * 100) / 100,
        coOccurBoost: Math.round(coOccur * 100) / 100,
        sameZone,
        neighborBoost: Math.round(neighborBoost * 100) / 100,
        isExploration: false,
        matchScore: Math.round(finalScore * 1000) / 1000,
        geoLevel: level.name,
      } as NearbyStory);
    }

    if (scored.length === 0) continue;

    // 按匹配分排序
    scored.sort((a, b) => b.matchScore - a.matchScore);

    // v2 升级：同作者限频
    const limited = limitPerAuthor(scored);

    // 检查是否达到 k-匿名阈值
    if (limited.length >= k || level.name === 'emotion') {
      // v2 升级：MMR 多样性重排
      const rerankInput = limited.slice(0, l * 2);
      const reranked = useDiversity
        ? mmrRerank(rerankInput)
        : rerankInput;

      // v2 升级：ε-greedy 探索
      let explorationItem: NearbyStory | null = null;
      if (useExploration && hasProfile && reranked.length > 2) {
        const shouldExplore = Math.random() < EXPLORATION_EPSILON || reranked.length >= l;
        if (shouldExplore) {
          const selectedIds = new Set(reranked.slice(0, l - 1).map(s => s.id));
          explorationItem = pickExplorationItem(
            limited,
            selectedIds,
            userProfile.emotions,
          );
          if (explorationItem) {
            explorationItem.isExploration = true;
          }
        }
      }

      // 组装最终结果
      const keepCount = explorationItem ? l - 1 : l;
      const finalStories = reranked.slice(0, keepCount);
      if (explorationItem) {
        finalStories.push(explorationItem);
      }

      // 兜底：再用 viewedIds 过滤一遍（防止 SQL 子查询未覆盖的边角情况）
      const filteredFinal = viewedIds.size > 0
        ? finalStories.filter(s => !viewedIds.has(s.id))
        : finalStories;

      // 后处理：作者隐藏 + 标签规范化 + catalogStarIds
      const collMap = buildCollectionMap(candidates);
      const hidden = hideAuthorForRows(filteredFinal as any[], collMap, userId);
      const withTags = attachCatalogStarIds(hidden);

      return {
        stories: withTags.map((s: any) => {
          // 确保不泄露精确坐标和 geohash
          const { location_lat, location_lng, geohash, user_id, tag, catalog_star_id, collection_id, ...safe } = s;
          return safe;
        }) as NearbyStory[],
        geoLevel: level.name,
        geoLabel: level.label,
        totalFound: limited.length,
        degraded: level.name !== 'district',
        profileSummary: {
          emotionsCount: userProfile.emotions.size,
          topEmotions: [...userProfile.emotions].slice(0, 5),
          neighborsCount: neighborMap.size,
        },
      };
    }
  }

  // 所有降级层级都没数据
  return {
    stories: [],
    geoLevel: 'emotion',
    geoLabel: '同频',
    totalFound: 0,
    degraded: true,
    profileSummary: {
      emotionsCount: userProfile.emotions.size,
      topEmotions: [...userProfile.emotions].slice(0, 5),
      neighborsCount: neighborMap.size,
    },
  };
}
