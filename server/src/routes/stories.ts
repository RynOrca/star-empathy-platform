import { Router, Request, Response } from 'express';
import { getAllStars, getAllStarsPaged, getStoryById, createStar, resonate, recordStoryView, deleteStory, getCatalogStarIdsForStory } from '../services/starService';
import { getNearbyStories } from '../services/nearbyService';
import {
  addEmotionResonance,
  getEmotionProfileView,
  getEmotionGraph,
} from '../services/emotionResonanceService';
import { authOptional, authRequired } from '../middleware/auth';
import { ok, badRequest, notFound, forbidden, serverError } from '../utils/response';
import { ensureKernel, updateKernel, getKernel, triggerKernelGeneration, triggerAnalysisRegeneration, findMatchingStarsForContent, extractSuggestedTagsForContent } from '../services/kernel';
import { verifyCollectionOwnership, createCollection, getDefaultCollection, ensureDefaultCollection } from '../services/collectionService';
import { resolveValidCatalogIds } from '../services/catalogMeta';
import { encode as encodeGeohash, PRECISION_LEVELS } from '../utils/geohash';

/** 解析布尔查询参数（支持 1/0/true/false/yes/no） */
function parseBool(v: unknown, defaultVal: boolean): boolean {
  if (v === undefined || v === null || v === '') return defaultVal;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(s)) return true;
  if (['0', 'false', 'no', 'off'].includes(s)) return false;
  return defaultVal;
}

const router = Router();

// 获取所有故事（支持分页 ?page=&limit=，不传则返回全量）
router.get('/', authOptional, (req: Request, res: Response) => {
  try {
    const currentUserId = (req as Request & { user?: { id: number } }).user?.id;
    const page = parseInt(req.query.page as string, 10);
    const limit = parseInt(req.query.limit as string, 10);
    if (!isNaN(page) && !isNaN(limit)) {
      const typeFilter = req.query.type as string | undefined;
      const paged = getAllStarsPaged(page, limit, currentUserId, typeFilter);
      ok(res, 'success', paged);
    } else {
      const stories = getAllStars(currentUserId);
      ok(res, 'success', stories);
    }
  } catch (error) {
    console.error('GET /api/stories error:', error);
    serverError(res);
  }
});

// 附近的人的心事：GET /api/stories/nearby?geohash=&limit=&diversity=&exploration=&excludeViewed=
// 基于geohash网格 + k-匿名降级 + IDF加权Jaccard情绪匹配 + 持久化画像 + 二阶推荐
//   - diversity (默认 true)  MMR 多样性重排，避免前 N 条都是同一情绪
//   - exploration (默认 true) ε-greedy 探索，10% 概率混入跨象限新情绪
//   - excludeViewed (默认 true) 排除已浏览/已打标的故事
// 前端传入当前用户geohash（5位），后端自动降级同城→同省→全国→情绪优先
// 必须注册在 /:storyId 之前，避免被当作 storyId 匹配
router.get('/nearby', authRequired, (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { id: number } }).user;
    const geohash = req.query.geohash as string;
    if (!geohash || geohash.length < 3) {
      return badRequest(res, '缺少 geohash 参数（至少3位）');
    }
    const limit = !isNaN(parseInt(req.query.limit as string, 10)) ? parseInt(req.query.limit as string, 10) : 20;
    const diversity = parseBool(req.query.diversity, true);
    const exploration = parseBool(req.query.exploration, true);
    const excludeViewed = parseBool(req.query.excludeViewed, true);
    const result = getNearbyStories(geohash, user.id, limit, undefined, {
      diversity,
      exploration,
      excludeViewed,
    });
    ok(res, 'success', result);
  } catch (error) {
    console.error('GET /api/stories/nearby error:', error);
    serverError(res);
  }
});

// 用户情绪画像（持久化 + 时间衰减 + VA 维度分布）
// GET /api/stories/emotion-profile
// 返回当前用户的长期情绪标签权重、Top 情绪、VA 空间分布
// 必须注册在 /:storyId 之前，避免被当作 storyId 匹配
router.get('/emotion-profile', authRequired, (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { id: number } }).user;
    const data = getEmotionProfileView(user.id);
    ok(res, 'success', data);
  } catch (error) {
    console.error('GET /api/stories/emotion-profile error:', error);
    serverError(res);
  }
});

// 情绪共振图谱：当前用户与他人的共振关系网
// GET /api/stories/emotion-graph?limit=
// 返回共振邻居列表（含 sharedEmotions / totalWeight / lastResonanceAt）+ Top 共振情绪
// 必须注册在 /:storyId 之前，避免被当作 storyId 匹配
router.get('/emotion-graph', authRequired, (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { id: number } }).user;
    const limit = !isNaN(parseInt(req.query.limit as string, 10)) ? parseInt(req.query.limit as string, 10) : 20;
    const data = getEmotionGraph(user.id, Math.max(1, Math.min(50, limit)));
    ok(res, 'success', data);
  } catch (error) {
    console.error('GET /api/stories/emotion-graph error:', error);
    serverError(res);
  }
});

// 单条故事详情（authOptional：登录时附带 resonated 是否已共鸣标志）
router.get('/:storyId', authOptional, (req: Request, res: Response) => {
  try {
    const storyId = parseInt(req.params.storyId, 10);
    if (isNaN(storyId)) return badRequest(res, '无效的 storyId');
    const currentUserId = (req as Request & { user?: { id: number } }).user?.id;
    const story = getStoryById(storyId, currentUserId);
    if (!story) return notFound(res, '故事不存在');
    ok(res, 'success', story);
  } catch (error) {
    console.error('GET /api/stories/:storyId error:', error);
    serverError(res);
  }
});

// 投递故事（需登录）
router.post('/', authRequired, (req: Request, res: Response) => {
  try {
    const { title, content, catalogStarId: catalog_star_id, catalogStarIds: catalog_star_ids, location, tag, tags, isAnonymous, imageUrl, collectionId, collectionName, collectionVisibility, geoInfo } = req.body;
    const user = (req as Request & { user: { id: number } }).user;

    if (!content || typeof content !== 'string') {
      return badRequest(res, 'content 不能为空');
    }

    const trimmed = content.trim();
    if (trimmed.length === 0 || trimmed.length > 2000) {
      return badRequest(res, 'content 长度需在 1~2000 字之间');
    }

    // ─── 归属星（必填）：要么对着星星填故事，要么 AI 帮忙挑星，绝不允许无归属 ───
    const resolved = resolveValidCatalogIds(catalog_star_id, catalog_star_ids);
    if (!resolved) {
      return badRequest(
        res,
        '必须选择或 AI 匹配一颗归属星辰（catalogStarId 或 catalogStarIds 至少含一颗有效星表星/太阳系行星 id）'
      );
    }
    const { ids: effectiveCatalogStarIds, primaryId: catalogStarId } = resolved;
    // 后续 createStar 用 catalogStarIds（一对多挂星支持）
    const catalogStarIds: number[] = effectiveCatalogStarIds;

    // 地理信息处理：前端传 location{lat,lng} 或 geoInfo{geohash,city,province}
    // 后端统一转为 geohash（5位截断）+ city/province 存储，不落库精确坐标
    let finalGeoInfo: { geohash?: string; city?: string; province?: string } | undefined;
    if (geoInfo && typeof geoInfo === 'object') {
      finalGeoInfo = {
        geohash: typeof geoInfo.geohash === 'string' ? geoInfo.geohash.slice(0, 5) : undefined,
        city: typeof geoInfo.city === 'string' ? geoInfo.city.slice(0, 50) : undefined,
        province: typeof geoInfo.province === 'string' ? geoInfo.province.slice(0, 50) : undefined,
      };
    } else if (
      location &&
      typeof location.lat === 'number' &&
      typeof location.lng === 'number' &&
      location.lat >= -90 && location.lat <= 90 &&
      location.lng >= -180 && location.lng <= 180
    ) {
      // 兼容：前端传了 location 但没传 geoInfo → 后端计算 geohash（5位截断，存储层脱敏）
      finalGeoInfo = {
        geohash: encodeGeohash(location.lat, location.lng, PRECISION_LEVELS.DISTRICT),
      };
    }

    const esc = (s: string) => s.replace(/[<&"]/g, (c) => {
      const map: Record<string, string> = {
        '<': '&lt;', '&': '&amp;', '"': '&quot;',
      };
      return map[c] || c;
    });
    const safeContent = esc(trimmed);
    const safeTitle = typeof title === 'string' && title.trim() ? esc(title.trim()) : null;
    const safeTag = typeof tag === 'string' ? tag : undefined;
    const safeTags: string[] | undefined = Array.isArray(tags) ? tags.filter((t) => typeof t === 'string') : undefined;
    const anonymous = typeof isAnonymous === 'boolean' ? isAnonymous : false;

    // 合集归属处理：collectionId 优先（校验归属），其次 collectionName 便捷新建，
    // 都没有则自动归入用户的默认合集（每个用户必有默认合集，确保故事不裸奔）
    let finalCollectionId: number | undefined;
    if (typeof collectionId === 'number') {
      if (!verifyCollectionOwnership(collectionId, user.id)) {
        return badRequest(res, '合集不存在或不属于当前用户');
      }
      finalCollectionId = collectionId;
    } else if (typeof collectionName === 'string' && collectionName.trim()) {
      const visi = typeof collectionVisibility === 'string' && ['public', 'private', 'anonymous'].includes(collectionVisibility)
        ? collectionVisibility as 'public' | 'private' | 'anonymous'
        : undefined;
      const created = createCollection(user.id, { name: collectionName.trim(), visibility: visi });
      if (created.error) return badRequest(res, created.error);
      finalCollectionId = created.collection?.id;
    } else {
      // 无指定合集 → 自动归入默认合集
      const def = ensureDefaultCollection(user.id);
      finalCollectionId = def?.id;
    }

    const story = createStar(safeContent, safeTitle ?? undefined, catalogStarId, undefined, user.id, safeTag, anonymous, typeof imageUrl === 'string' && imageUrl.startsWith('/uploads/') ? imageUrl : undefined, catalogStarIds, safeTags, finalCollectionId, finalGeoInfo);

    // 异步生成 AI 故事内核
    if (story && (story as { id: number }).id) {
      triggerKernelGeneration((story as { id: number }).id, safeContent, safeTitle);
    }

    // 异步触发 catalog 级分析自动更新（闭环：新增故事 → 够5条 → AI 卡片内容自动重新生成）
    const allAffectedIds = catalogStarIds?.length
      ? catalogStarIds
      : (catalogStarId != null ? [catalogStarId] : []);
    if (allAffectedIds.length > 0) {
      setImmediate(() => {
        try { triggerAnalysisRegeneration(allAffectedIds); }
        catch (e) { console.error('[stories/analysis] 自动触发失败:', e); }
      });
    }

    ok(res, '故事已化作星光', story);
  } catch (error) {
    console.error('POST /api/stories error:', error);
    serverError(res);
  }
});

// 共鸣故事（需登录，去重）
router.post('/:storyId/resonate', authRequired, (req: Request, res: Response) => {
  try {
    const storyId = parseInt(req.params.storyId, 10);
    if (isNaN(storyId)) return badRequest(res, '无效的 storyId');

    const user = (req as Request & { user: { id: number } }).user;
    const result = resonate(storyId, user.id);
    if (!result) return notFound(res, '故事不存在');
    if (result.already) return ok(res, '已共鸣', result);

    // 共鸣改变聚合分布 → 触发 catalog 级 AI 分析延迟再生
    const affected = getCatalogStarIdsForStory(storyId);
    if (affected.length) {
      setImmediate(() => {
        try { triggerAnalysisRegeneration(affected); }
        catch (e) { console.error('[stories/resonate] 自动触发分析失败:', e); }
      });
    }

    ok(res, '共鸣已点亮', result);
  } catch (error) {
    console.error('POST /api/stories/:storyId/resonate error:', error);
    serverError(res);
  }
});

// 情绪共振打标（"我也有同感"）：POST /api/stories/:storyId/emotion-resonate
// Body: { emotionTags: string[], weight?: number }
// 用户主动给别人的故事打情绪标签，写入 emotion_resonances + 反哺自身画像 + 建立共振边
// 副作用：
//   1. 持久化当前用户的情绪画像（source='emotion_resonance'，0.6 权重）
//   2. 建立当前用户 ↔ 故事作者的共振边（用于二阶推荐）
//   3. 后续 /nearby 接口会把"和你共振过的人的最新故事"优先推
// 限制：
//   - 不能给自己的故事打标
//   - 每次最多 5 个标签（超出截断）
//   - 标签仅限中英文（≤12 字符）
// 幂等：同一 (user, story, tag) 重复打标会累加 weight
router.post('/:storyId/emotion-resonate', authRequired, (req: Request, res: Response) => {
  try {
    const storyId = parseInt(req.params.storyId, 10);
    if (isNaN(storyId)) return badRequest(res, '无效的 storyId');

    const { emotionTags, weight } = req.body;
    if (!Array.isArray(emotionTags) || emotionTags.length === 0) {
      return badRequest(res, 'emotionTags 必须是非空数组');
    }
    const safeTags = emotionTags.filter((t: unknown) => typeof t === 'string');
    if (safeTags.length === 0) {
      return badRequest(res, 'emotionTags 必须包含至少一个字符串标签');
    }
    const w = typeof weight === 'number' && weight > 0 && weight <= 5
      ? weight
      : 1.0;

    const user = (req as Request & { user: { id: number } }).user;
    const result = addEmotionResonance(user.id, storyId, safeTags, w);

    if (!result.success) {
      // 区分"故事不存在/无作者"与"无有效标签"
      if (result.message.includes('不存在') || result.message.includes('无作者')) {
        return notFound(res, result.message);
      }
      return badRequest(res, result.message);
    }

    ok(res, result.message, result);
  } catch (error) {
    console.error('POST /api/stories/:storyId/emotion-resonate error:', error);
    serverError(res);
  }
});

// 故事级浏览 +1（纯计数）
router.post('/:storyId/view', (req: Request, res: Response) => {
  try {
    const storyId = parseInt(req.params.storyId, 10);
    if (isNaN(storyId)) return badRequest(res, '无效的 storyId');
    recordStoryView(storyId);
    ok(res, 'success');
  } catch (error) {
    console.error('POST /api/stories/:storyId/view error:', error);
    serverError(res);
  }
});

// 删除故事（需登录，只能删自己的）
router.delete('/:storyId', authRequired, (req: Request, res: Response) => {
  try {
    const storyId = parseInt(req.params.storyId, 10);
    if (isNaN(storyId)) return badRequest(res, '无效的 storyId');
    const user = (req as Request & { user: { id: number } }).user;
    // 先拿到受影响的 catalog 星（删除后连接表会被清空，必须在此之前查）
    const affected = getCatalogStarIdsForStory(storyId);
    const result = deleteStory(storyId, user.id);
    if (result.notFound) return notFound(res, '故事不存在');
    if (result.notOwner) return forbidden(res, '只能删除自己的故事');
    // 删除成功 → catalog 级 AI 分析需要重新生成（画像/主题/情感分布都要更新）
    if (affected.length) {
      setImmediate(() => {
        try { triggerAnalysisRegeneration(affected); }
        catch (e) { console.error('[stories/delete] 自动触发分析失败:', e); }
      });
    }
    ok(res, '已删除');
  } catch (error) {
    console.error('DELETE /api/stories/:storyId error:', error);
    serverError(res);
  }
});

// 获取故事内核（优先缓存，无缓存则触发 AI 生成）
router.post('/:storyId/kernel', async (req: Request, res: Response) => {
  try {
    const storyId = parseInt(req.params.storyId, 10);
    if (isNaN(storyId)) return badRequest(res, '无效的 storyId');

    const story = getStoryById(storyId);
    if (!story) return notFound(res, '故事不存在');

    const kernel = await ensureKernel(storyId, story.content, story.title);
    ok(res, 'success', kernel);
  } catch (error) {
    console.error('POST /api/stories/:storyId/kernel error:', error);
    serverError(res);
  }
});

// 修改故事内核（用户编辑）
router.patch('/:storyId/kernel', (req: Request, res: Response) => {
  try {
    const storyId = parseInt(req.params.storyId, 10);
    if (isNaN(storyId)) return badRequest(res, '无效的 storyId');

    const { emotionalTags, essence, themes } = req.body;
    const updated = updateKernel(storyId, { emotionalTags, essence, themes });
    if (!updated) return notFound(res, '内核不存在，请先生成');

    // 用户手动改了情感标签/主题 → catalog 级 persona / emotion / themhour 都可能变
    const affected = getCatalogStarIdsForStory(storyId);
    if (affected.length) {
      setImmediate(() => {
        try { triggerAnalysisRegeneration(affected); }
        catch (e) { console.error('[stories/patch-kernel] 自动触发分析失败:', e); }
      });
    }

    ok(res, '内核已更新', updated);
  } catch (error) {
    console.error('PATCH /api/stories/:storyId/kernel error:', error);
    serverError(res);
  }
});

// 为一段新故事（尚未落库）仅生成 AI 建议标签，轻量接口（不做星星匹配）
// Body: { title?: string, content: string }
router.post('/ai-tags', authOptional, async (req: Request, res: Response) => {
  try {
    const { title, content } = req.body;
    if (!content || typeof content !== 'string') {
      return badRequest(res, 'content 不能为空');
    }
    const trimmed = content.trim();
    if (trimmed.length < 1 || trimmed.length > 2000) {
      return badRequest(res, 'content 长度需在 1~2000 字之间');
    }
    const result = await extractSuggestedTagsForContent(
      typeof title === 'string' && title.trim() ? title.trim() : null,
      trimmed,
    );
    ok(res, 'success', result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('POST /api/stories/ai-tags error:', msg);
    if (msg.includes('DEEPSEEK_API_KEY') || msg.includes('未设置')) {
      return badRequest(res, 'AI 服务未配置，请先在设置中填入 API Key');
    }
    serverError(res);
  }
});

// 为一段新故事（尚未落库）寻找 Top3 最契合的星辰
// Body: { title?: string, content: string, limit?: number }
router.post('/match-star', authRequired, async (req: Request, res: Response) => {
  try {
    const { title, content } = req.body;
    if (!content || typeof content !== 'string') {
      return badRequest(res, 'content 不能为空');
    }
    const trimmed = content.trim();
    if (trimmed.length < 1 || trimmed.length > 2000) {
      return badRequest(res, 'content 长度需在 1~2000 字之间');
    }
    const limit = typeof req.body.limit === 'number'
      ? Math.max(1, Math.min(10, Math.floor(req.body.limit)))
      : 3;

    const result = await findMatchingStarsForContent(
      typeof title === 'string' && title.trim() ? title.trim() : null,
      trimmed,
      limit,
    );
    ok(res, 'success', result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('POST /api/stories/match-star error:', msg);
    // API Key 类错误不要抛 500，返回明确信息
    if (msg.includes('DEEPSEEK_API_KEY') || msg.includes('未设置')) {
      return badRequest(res, 'AI 服务未配置，请先在设置中填入 API Key');
    }
    serverError(res);
  }
});

export default router;
