/**
 * 情绪共振服务 — nearbyService v2 核心
 *
 * 三大职责：
 *   1. 接收用户主动情绪打标（"我也有同感"），写入 emotion_resonances
 *   2. 反哺用户长期情绪画像 user_emotion_profile（来源加权 + 时间衰减）
 *   3. 建立用户间共振边 emotion_edges（用于二阶推荐）
 *
 * 来源权重（行为强度 → 画像贡献）：
 *   story(1.0)         用户自己写的故事内核标签 → 最强信号
 *   emotion_resonance(0.6)  用户主动给别人的故事打的情绪标签 → 强信号
 *   resonate(0.3)      用户点过共鸣的故事（无具体情绪） → 弱信号，用对方故事内核标签
 *   view(0.1)          浏览过的故事 → 最弱信号，仅作冷启动
 *
 * 时间衰减：30 天半衰期（与 nearbyService.freshness 对齐）
 *   weight_decayed = weight_raw * exp(-ageDays / 30)
 */

import db from '../db';
import { EMOTION_VA } from '../utils/emotionModel';

/** 行为来源类型 */
export type EmotionSource = 'story' | 'emotion_resonance' | 'resonate' | 'view';

const SOURCE_WEIGHTS: Record<EmotionSource, number> = {
  story: 1.0,
  emotion_resonance: 0.6,
  resonate: 0.3,
  view: 0.1,
};

/** 30 天半衰期（与 freshness 对齐） */
const HALF_LIFE_DAYS = 30;
const DECAY_LAMBDA = Math.LN2 / HALF_LIFE_DAYS;

/** 计算时间衰减权重 */
function decayedWeight(rawWeight: number, lastBoostAt: string): number {
  const ageDays = (Date.now() - new Date(lastBoostAt + 'Z').getTime()) / 86400000;
  return rawWeight * Math.exp(-DECAY_LAMBDA * ageDays);
}

/** 校验情绪标签合法性（在 EMOTION_VA 中或允许 AI 提取的扩展标签） */
export function isValidEmotionTag(tag: string): boolean {
  if (typeof tag !== 'string') return false;
  const trimmed = tag.trim();
  if (trimmed.length < 1 || trimmed.length > 12) return false;
  // 允许 EMOTION_VA 预设标签，也允许 AI 提取的其他中文情绪标签
  return /^[\u4e00-\u9fa5A-Za-z]+$/.test(trimmed);
}

/** 限制每个用户每次行为最多打 5 个标签 */
const MAX_TAGS_PER_ACTION = 5;

export interface EmotionResonanceResult {
  success: boolean;
  message: string;
  inserted: number;
  skipped: number;
  /** 同时更新的画像标签 */
  profileUpdated: string[];
  /** 同时建立/更新的共振边数（含 target user） */
  edgesUpdated: number;
}

/**
 * 用户给某条故事打情绪标签（"我也有同感"）
 *
 * 副作用：
 *   1. 写入 emotion_resonances（已存在则 ON CONFLICT 更新 weight）
 *   2. 反哺当前用户的情绪画像（每个标签 source='emotion_resonance' 加权）
 *   3. 建立当前用户 ↔ 故事作者的共振边（每个标签一条）
 *
 * 幂等：同一 (user_id, story_id, emotion_tag) 重复打标会累加 weight
 *
 * @param userId       当前用户 ID
 * @param storyId      被打标的故事 ID
 * @param emotionTags  情绪标签数组（最多 5 个，超出截断）
 * @param weight       单次打标权重，默认 1.0
 */
export function addEmotionResonance(
  userId: number,
  storyId: number,
  emotionTags: string[],
  weight: number = 1.0,
): EmotionResonanceResult {
  // 1. 校验：故事存在 + 不是自己的故事（自己的故事不需要"打标"，应该改自己的内核）
  const story = db.prepare(`
    SELECT id, user_id FROM stars WHERE id = ? AND type = 'user'
  `).get(storyId) as { id: number; user_id: number | null } | undefined;

  if (!story) {
    return { success: false, message: '故事不存在', inserted: 0, skipped: 0, profileUpdated: [], edgesUpdated: 0 };
  }
  if (story.user_id === userId) {
    return { success: false, message: '不能给自己的故事打标签', inserted: 0, skipped: 0, profileUpdated: [], edgesUpdated: 0 };
  }
  if (story.user_id == null) {
    return { success: false, message: '该故事无作者，无法建立共振', inserted: 0, skipped: 0, profileUpdated: [], edgesUpdated: 0 };
  }

  const targetUserId = story.user_id;

  // 2. 过滤 + 去重 + 截断
  const seen = new Set<string>();
  const validTags: string[] = [];
  for (const t of emotionTags) {
    if (!isValidEmotionTag(t)) continue;
    const trimmed = t.trim();
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    validTags.push(trimmed);
    if (validTags.length >= MAX_TAGS_PER_ACTION) break;
  }

  if (validTags.length === 0) {
    return { success: false, message: '没有有效的情绪标签', inserted: 0, skipped: 0, profileUpdated: [], edgesUpdated: 0 };
  }

  // 3. 写入 emotion_resonances（INSERT OR REPLACE 累加权重）
  const insertResonance = db.prepare(`
    INSERT INTO emotion_resonances (user_id, story_id, emotion_tag, weight, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, story_id, emotion_tag) DO UPDATE SET
      weight = emotion_resonances.weight + excluded.weight,
      created_at = datetime('now')
  `);

  // 4. 反哺当前用户画像（source='emotion_resonance'）
  const upsertProfile = db.prepare(`
    INSERT INTO user_emotion_profile (user_id, emotion_tag, weight, source, last_boost_at)
    VALUES (?, ?, ?, 'emotion_resonance', datetime('now'))
    ON CONFLICT(user_id, emotion_tag, source) DO UPDATE SET
      weight = user_emotion_profile.weight + excluded.weight,
      last_boost_at = datetime('now')
  `);

  // 5. 建立共振边（user_a < user_b 防双向重复）
  const [userA, userB] = userId < targetUserId ? [userId, targetUserId] : [targetUserId, userId];
  const upsertEdge = db.prepare(`
    INSERT INTO emotion_edges (user_a, user_b, shared_emotion, weight, last_resonance_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_a, user_b, shared_emotion) DO UPDATE SET
      weight = emotion_edges.weight + excluded.weight,
      last_resonance_at = datetime('now')
  `);

  let inserted = 0;
  let skipped = 0;
  const tx = db.exec('BEGIN');
  try {
    for (const tag of validTags) {
      try {
        insertResonance.run(userId, storyId, tag, weight);
        upsertProfile.run(userId, tag, weight * SOURCE_WEIGHTS.emotion_resonance);
        upsertEdge.run(userA, userB, tag, weight);
        inserted++;
      } catch (e) {
        skipped++;
      }
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  // 消除 unused 警告
  void tx;

  return {
    success: true,
    message: `已记录 ${inserted} 个情绪共振`,
    inserted,
    skipped,
    profileUpdated: validTags,
    edgesUpdated: inserted,
  };
}

/**
 * 获取用户持久化情绪画像（含时间衰减）
 *
 * 合并所有 source 的权重，按衰减后权重排序，返回 Top N 情绪标签
 * 如果画像表为空（新用户），降级到 story_kernels 即时计算
 */
export function getPersistentEmotionProfile(
  userId: number,
  topN: number = 8,
): { emotions: Set<string>; themes: Set<string>; weights: Map<string, number> } {
  // 1. 从画像表读所有 (emotion_tag, weight, source, last_boost_at)
  const rows = db.prepare(`
    SELECT emotion_tag, weight, source, last_boost_at
    FROM user_emotion_profile
    WHERE user_id = ?
  `).all(userId) as { emotion_tag: string; weight: number; source: string; last_boost_at: string }[];

  const aggregatedWeights = new Map<string, number>();

  if (rows.length > 0) {
    for (const row of rows) {
      const decayed = decayedWeight(row.weight, row.last_boost_at);
      aggregatedWeights.set(
        row.emotion_tag,
        (aggregatedWeights.get(row.emotion_tag) || 0) + decayed,
      );
    }
  } else {
    // 冷启动降级：从 story_kernels 即时计算
    const kernelRows = db.prepare(`
      SELECT sk.emotional_tags, sk.themes
      FROM story_kernels sk
      JOIN stars s ON s.id = sk.story_id
      WHERE s.user_id = ? AND s.type = 'user'
      ORDER BY s.created_at DESC
      LIMIT 5
    `).all(userId) as { emotional_tags: string; themes: string }[];

    for (const kr of kernelRows) {
      try {
        const tags: string[] = JSON.parse(kr.emotional_tags);
        for (const t of tags) {
          aggregatedWeights.set(t, (aggregatedWeights.get(t) || 0) + SOURCE_WEIGHTS.story);
        }
      } catch {}
    }
  }

  // 按 weight 排序取 Top N
  const sortedTags = [...aggregatedWeights.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([tag]) => tag);

  // themes 仍从 story_kernels 取（画像表只存情绪）
  const themeRows = db.prepare(`
    SELECT sk.themes
    FROM story_kernels sk
    JOIN stars s ON s.id = sk.story_id
    WHERE s.user_id = ? AND s.type = 'user'
    ORDER BY s.created_at DESC
    LIMIT 5
  `).all(userId) as { themes: string }[];

  const themes = new Set<string>();
  for (const tr of themeRows) {
    try {
      JSON.parse(tr.themes).forEach((t: string) => themes.add(t));
    } catch {}
  }

  return {
    emotions: new Set(sortedTags),
    themes,
    weights: aggregatedWeights,
  };
}

/**
 * 获取用户共振邻居（曾因同一情绪共振过的其他用户）
 *
 * 用于二阶推荐：和你共振过的人最近写的故事，优先推
 *
 * @param userId  当前用户
 * @param limit   返回邻居数
 * @returns Map<userId, { sharedEmotions: string[]; totalWeight: number; lastResonanceAt: string }>
 */
export function getEmotionNeighbors(
  userId: number,
  limit: number = 10,
): Map<number, { sharedEmotions: string[]; totalWeight: number; lastResonanceAt: string }> {
  // user_a 或 user_b 等于当前用户
  const rows = db.prepare(`
    SELECT
      CASE WHEN user_a = ? THEN user_b ELSE user_a END AS neighbor_id,
      shared_emotion,
      weight,
      last_resonance_at
    FROM emotion_edges
    WHERE user_a = ? OR user_b = ?
    ORDER BY last_resonance_at DESC
    LIMIT ?
  `).all(userId, userId, userId, limit * 3) as {
    neighbor_id: number;
    shared_emotion: string;
    weight: number;
    last_resonance_at: string;
  }[];

  const neighbors = new Map<number, { sharedEmotions: string[]; totalWeight: number; lastResonanceAt: string }>();
  for (const r of rows) {
    const existing = neighbors.get(r.neighbor_id);
    if (existing) {
      existing.sharedEmotions.push(r.shared_emotion);
      existing.totalWeight += r.weight;
      if (r.last_resonance_at > existing.lastResonanceAt) {
        existing.lastResonanceAt = r.last_resonance_at;
      }
    } else {
      neighbors.set(r.neighbor_id, {
        sharedEmotions: [r.shared_emotion],
        totalWeight: r.weight,
        lastResonanceAt: r.last_resonance_at,
      });
    }
  }

  // 按 totalWeight 降序，截取 limit
  const sorted = [...neighbors.entries()]
    .sort((a, b) => b[1].totalWeight - a[1].totalWeight)
    .slice(0, limit);
  return new Map(sorted);
}

/**
 * 用户自己写故事时反哺画像（在 createStar 后调用）
 * 复用 kernel.ts 提取的 emotional_tags，按 source='story' 加权
 */
export function boostProfileFromOwnStory(
  userId: number,
  storyId: number,
  emotionalTags: string[],
): void {
  if (!emotionalTags || emotionalTags.length === 0) return;
  const upsert = db.prepare(`
    INSERT INTO user_emotion_profile (user_id, emotion_tag, weight, source, last_boost_at)
    VALUES (?, ?, ?, 'story', datetime('now'))
    ON CONFLICT(user_id, emotion_tag, source) DO UPDATE SET
      weight = user_emotion_profile.weight + excluded.weight,
      last_boost_at = datetime('now')
  `);
  for (const tag of emotionalTags.slice(0, MAX_TAGS_PER_ACTION)) {
    if (!isValidEmotionTag(tag)) continue;
    try {
      upsert.run(userId, tag.trim(), SOURCE_WEIGHTS.story);
    } catch (e) {
      console.error('[emotionResonance] boostProfileFromOwnStory error:', e);
    }
  }
}

/**
 * 用户点过共鸣的故事 → 反哺画像（用对方故事的内核标签，source='resonate'）
 * 在 resonate() 调用后异步触发
 */
export function boostProfileFromResonate(
  userId: number,
  storyId: number,
): void {
  const kernel = db.prepare(`
    SELECT sk.emotional_tags
    FROM story_kernels sk
    WHERE sk.story_id = ?
  `).get(storyId) as { emotional_tags: string } | undefined;

  if (!kernel) return;

  let tags: string[] = [];
  try { tags = JSON.parse(kernel.emotional_tags); } catch {}
  if (tags.length === 0) return;

  const upsert = db.prepare(`
    INSERT INTO user_emotion_profile (user_id, emotion_tag, weight, source, last_boost_at)
    VALUES (?, ?, ?, 'resonate', datetime('now'))
    ON CONFLICT(user_id, emotion_tag, source) DO UPDATE SET
      weight = user_emotion_profile.weight + excluded.weight,
      last_boost_at = datetime('now')
  `);
  for (const tag of tags.slice(0, MAX_TAGS_PER_ACTION)) {
    if (!isValidEmotionTag(tag)) continue;
    try {
      upsert.run(userId, tag.trim(), SOURCE_WEIGHTS.resonate);
    } catch {}
  }
}

/**
 * 获取用户已读故事 ID 集合（用于 nearbyService 已读过滤）
 *
 * 已读定义：
 *   - story_views 表有记录
 *   - emotion_resonances 表有打标记录（打标过的肯定看过）
 */
export function getViewedStoryIds(userId: number): Set<number> {
  const rows = db.prepare(`
    SELECT story_id FROM story_views WHERE user_id = ?
    UNION
    SELECT story_id FROM emotion_resonances WHERE user_id = ?
  `).all(userId, userId) as { story_id: number }[];
  return new Set(rows.map(r => r.story_id));
}

/**
 * 获取共振图谱可视化数据（用于 /emotion-graph 接口）
 */
export interface EmotionGraphNode {
  userId: number;
  username: string | null;
  totalWeight: number;
  sharedEmotions: string[];
  lastResonanceAt: string;
}

export interface EmotionGraphData {
  neighbors: EmotionGraphNode[];
  totalNeighbors: number;
  topSharedEmotions: { tag: string; count: number }[];
}

export function getEmotionGraph(userId: number, limit: number = 20): EmotionGraphData {
  const neighbors = getEmotionNeighbors(userId, limit);
  if (neighbors.size === 0) {
    return { neighbors: [], totalNeighbors: 0, topSharedEmotions: [] };
  }

  // 批量查 username
  const userIds = [...neighbors.keys()];
  const placeholders = userIds.map(() => '?').join(',');
  const userRows = db.prepare(`
    SELECT id, username FROM users WHERE id IN (${placeholders})
  `).all(...userIds) as { id: number; username: string }[];
  const userMap = new Map<number, string>(userRows.map(u => [u.id, u.username]));

  const nodes: EmotionGraphNode[] = [];
  const emotionCounts = new Map<string, number>();

  for (const [nid, info] of neighbors) {
    nodes.push({
      userId: nid,
      username: userMap.get(nid) ?? null,
      totalWeight: Math.round(info.totalWeight * 100) / 100,
      sharedEmotions: info.sharedEmotions,
      lastResonanceAt: info.lastResonanceAt,
    });
    for (const emo of info.sharedEmotions) {
      emotionCounts.set(emo, (emotionCounts.get(emo) || 0) + 1);
    }
  }

  const topSharedEmotions = [...emotionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }));

  return {
    neighbors: nodes,
    totalNeighbors: nodes.length,
    topSharedEmotions,
  };
}

/**
 * 获取用户自己的情绪画像可视化（用于 /emotion-profile 接口）
 */
export interface EmotionProfileData {
  emotions: { tag: string; weight: number; source: string; lastBoostAt: string }[];
  totalEmotions: number;
  topEmotion: string | null;
  // VA 空间分布（用于前端可视化）
  vaDistribution: { tag: string; valence: number; arousal: number; weight: number }[];
}

export function getEmotionProfileView(userId: number): EmotionProfileData {
  const rows = db.prepare(`
    SELECT emotion_tag, weight, source, last_boost_at
    FROM user_emotion_profile
    WHERE user_id = ?
    ORDER BY weight DESC
  `).all(userId) as { emotion_tag: string; weight: number; source: string; last_boost_at: string }[];

  if (rows.length === 0) {
    return { emotions: [], totalEmotions: 0, topEmotion: null, vaDistribution: [] };
  }

  // 聚合同 tag 不同 source 的衰减后权重
  const aggregated = new Map<string, { weight: number; source: string; lastBoostAt: string }>();
  for (const r of rows) {
    const decayed = decayedWeight(r.weight, r.last_boost_at);
    const existing = aggregated.get(r.emotion_tag);
    if (existing) {
      existing.weight += decayed;
      // 取最近一次时间
      if (r.last_boost_at > existing.lastBoostAt) {
        existing.lastBoostAt = r.last_boost_at;
        existing.source = r.source;
      }
    } else {
      aggregated.set(r.emotion_tag, {
        weight: decayed,
        source: r.source,
        lastBoostAt: r.last_boost_at,
      });
    }
  }

  const emotions = [...aggregated.entries()]
    .sort((a, b) => b[1].weight - a[1].weight)
    .map(([tag, info]) => ({
      tag,
      weight: Math.round(info.weight * 100) / 100,
      source: info.source,
      lastBoostAt: info.lastBoostAt,
    }));

  const vaDistribution = emotions
    .filter(e => EMOTION_VA[e.tag])
    .map(e => ({
      tag: e.tag,
      valence: EMOTION_VA[e.tag].valence,
      arousal: EMOTION_VA[e.tag].arousal,
      weight: e.weight,
    }));

  return {
    emotions,
    totalEmotions: emotions.length,
    topEmotion: emotions[0]?.tag ?? null,
    vaDistribution,
  };
}
