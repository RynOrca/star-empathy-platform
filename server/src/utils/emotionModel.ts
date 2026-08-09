/**
 * 情绪维度模型 — Valence（效价）× Arousal（唤醒度）二维坐标
 *
 * 基于 Russell (1980) 情感环模型，给 AI 提取的 16 个情绪标签预设坐标：
 *   valence:  -1（极负面）~ 1（极正面），描述情绪的愉悦度
 *   arousal:   0（极平静）~ 1（极激动），描述情绪的激活程度
 *
 * 用途：
 *   1. 情绪距离：两个标签在 VA 空间的欧氏距离越近，情绪越同频
 *   2. 情绪共振：相近区域的情绪即使标签不同也能匹配（如"焦虑"和"紧张"）
 *   3. 强度推断：arousal 高的情绪标签权重更高（更急需排解）
 *
 * 参考来源：
 *   - Russell, J.A. (1980). "A circumplex model of affect"
 *   - 调研报告方向二："情绪有极性/维度，可引入情绪二维模型"
 */

export interface EmotionCoord {
  valence: number;  // -1 ~ 1
  arousal: number;  //  0 ~ 1
}

/** AI 提取的 16 个情绪标签的 VA 坐标（基于情感环模型 + 心事场景校准） */
export const EMOTION_VA: Record<string, EmotionCoord> = {
  // 负面高唤醒（焦虑区）
  焦虑:   { valence: -0.7, arousal: 0.85 },
  愤怒:   { valence: -0.8, arousal: 0.90 },
  愧疚:   { valence: -0.6, arousal: 0.55 },
  迷茫:   { valence: -0.5, arousal: 0.45 },
  遗憾:   { valence: -0.6, arousal: 0.35 },

  // 负面低唤醒（悲伤区）
  孤独:   { valence: -0.65, arousal: 0.30 },
  怀念:   { valence: -0.2, arousal: 0.25 },
  思念:   { valence: -0.3, arousal: 0.40 },

  // 正面低唤醒（平静区）
  释怀:   { valence:  0.55, arousal: 0.15 },
  释然:   { valence:  0.50, arousal: 0.10 },
  平静:   { valence:  0.40, arousal: 0.05 },
  感恩:   { valence:  0.70, arousal: 0.30 },
  欣慰:   { valence:  0.60, arousal: 0.25 },

  // 正面高唤醒（喜悦区）
  温暖:   { valence:  0.75, arousal: 0.45 },
  希望:   { valence:  0.65, arousal: 0.55 },
  期待:   { valence:  0.70, arousal: 0.65 },
};

/** 默认坐标（未见过的标签） */
const DEFAULT_COORD: EmotionCoord = { valence: 0, arousal: 0.3 };

/** 获取标签的 VA 坐标 */
export function getEmotionCoord(tag: string): EmotionCoord {
  return EMOTION_VA[tag] ?? DEFAULT_COORD;
}

/**
 * 计算两组情绪标签的 VA 维度相似度
 *
 * 方法：取两组标签各自的重心（平均 VA），计算重心间欧氏距离，
 * 再转为 0~1 的相似度（距离越近越相似）。
 *
 * 比纯 Jaccard 的优势：能发现"焦虑"和"愤怒"虽然标签不同但情绪同频
 */
export function vaSimilarity(tagsA: Set<string>, tagsB: Set<string>): number {
  if (tagsA.size === 0 || tagsB.size === 0) return 0;

  const centroid = (tags: Set<string>): EmotionCoord => {
    let v = 0, a = 0;
    for (const t of tags) {
      const c = getEmotionCoord(t);
      v += c.valence;
      a += c.arousal;
    }
    return { valence: v / tags.size, arousal: a / tags.size };
  };

  const cA = centroid(tagsA);
  const cB = centroid(tagsB);

  // 归一化距离：理论最大距离 = sqrt((2)^2 + (1)^2) = sqrt(5) ≈ 2.236
  const MAX_DIST = Math.sqrt(5);
  const dist = Math.sqrt(
    Math.pow(cA.valence - cB.valence, 2) +
    Math.pow(cA.arousal - cB.arousal, 2)
  );

  // 相似度 = 1 - 归一化距离
  return Math.max(0, 1 - dist / MAX_DIST);
}

/**
 * 情绪强度推断：从 arousal 均值推断故事的情绪强度
 * 高 arousal（焦虑、愤怒）的故事更急需排解，匹配权重应提升
 */
export function emotionIntensity(tags: Set<string>): number {
  if (tags.size === 0) return 0.3; // 默认中等强度
  let totalArousal = 0;
  for (const t of tags) {
    totalArousal += getEmotionCoord(t).arousal;
  }
  return totalArousal / tags.size;
}

/**
 * 情绪共振区判断：两组标签是否处于同一情感象限
 * 用于判断是否真正"同频"——同为负面高唤醒 vs 一正一负
 */
export function isSameResonanceZone(tagsA: Set<string>, tagsB: Set<string>): boolean {
  const zone = (tags: Set<string>): string => {
    if (tags.size === 0) return 'neutral';
    const c = getEmotionCoord([...tags][0]);
    if (c.valence < -0.3 && c.arousal > 0.5) return 'distress';   // 困扰区
    if (c.valence < -0.3 && c.arousal <= 0.5) return 'sadness';   // 悲伤区
    if (c.valence >= 0.3 && c.arousal > 0.3) return 'joy';        // 喜悦区
    if (c.valence >= 0.3 && c.arousal <= 0.3) return 'calm';      // 平静区
    return 'neutral';
  };
  return zone(tagsA) === zone(tagsB);
}
