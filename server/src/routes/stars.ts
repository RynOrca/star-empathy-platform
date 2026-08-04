import { Router, Request, Response } from 'express';
import { getAllStars, getAllStarsPaged, getStoryById, getStoriesByCatalogStarId, createStar, resonate, recordCatalogVisit, recordStoryView, getCatalogStats, addFavorite, removeFavorite, deleteStory, getCatalogStarIdsForStory } from '../services/starService';
import { authOptional, authRequired } from '../middleware/auth';
import { ok, badRequest, notFound, forbidden, serverError } from '../utils/response';
import { triggerKernelGeneration, triggerAnalysisRegeneration } from '../services/kernel';
import { verifyCollectionOwnership, createCollection, ensureDefaultCollection } from '../services/collectionService';

const router = Router();

// 获取所有星星（支持分页 ?page=&limit=，不传则返回全量）
router.get('/', authOptional, (req: Request, res: Response) => {
  try {
    const currentUserId = (req as Request & { user?: { id: number } }).user?.id;
    const page = parseInt(req.query.page as string, 10);
    const limit = parseInt(req.query.limit as string, 10);
    if (!isNaN(page) && !isNaN(limit)) {
      const paged = getAllStarsPaged(page, limit, currentUserId);
      ok(res, 'success', paged);
    } else {
      const stars = getAllStars(currentUserId);
      ok(res, 'success', stars);
    }
  } catch (error) {
    console.error('GET /api/stars error:', error);
    serverError(res);
  }
});

// 单条故事详情（旧路由兼容）
router.get('/story/:storyId', (req: Request, res: Response) => {
  try {
    const storyId = parseInt(req.params.storyId, 10);
    if (isNaN(storyId)) return badRequest(res, '无效的 storyId');
    const story = getStoryById(storyId);
    if (!story) return notFound(res, '故事不存在');
    ok(res, 'success', story);
  } catch (error) {
    console.error('GET /api/stars/story/:storyId error:', error);
    serverError(res);
  }
});

// 单星下的所有故事（旧路由兼容）
router.get('/:catalogStarId/stories', authOptional, (req: Request, res: Response) => {
  try {
    const catalogStarId = parseInt(req.params.catalogStarId, 10);
    if (isNaN(catalogStarId)) return badRequest(res, '无效的 catalogStarId');
    const currentUserId = (req as Request & { user?: { id: number } }).user?.id;
    const stories = getStoriesByCatalogStarId(catalogStarId, currentUserId);
    ok(res, 'success', stories);
  } catch (error) {
    console.error('GET /api/stars/:catalogStarId/stories error:', error);
    serverError(res);
  }
});

// 投递心事/创建星星（需登录）
router.post('/story', authRequired, (req: Request, res: Response) => {
  try {
    const { title, content, catalog_star_id, catalog_star_ids, location, tag, tags, isAnonymous, collectionId, collectionName, collectionVisibility } = req.body;
    const user = (req as Request & { user: { id: number } }).user;

    if (!content || typeof content !== 'string') {
      return badRequest(res, 'content 不能为空');
    }

    const trimmed = content.trim();
    if (trimmed.length === 0 || trimmed.length > 2000) {
      return badRequest(res, 'content 长度需在 1~2000 字之间');
    }

    const starId = typeof catalog_star_id === 'number' ? catalog_star_id : undefined;
    const catalogStarIds: number[] | undefined = Array.isArray(catalog_star_ids)
      ? catalog_star_ids.filter((id: unknown) => typeof id === 'number')
      : undefined;

    let locationData: { lat: number; lng: number } | undefined;
    if (
      location &&
      typeof location.lat === 'number' &&
      typeof location.lng === 'number' &&
      location.lat >= -90 && location.lat <= 90 &&
      location.lng >= -180 && location.lng <= 180
    ) {
      locationData = { lat: location.lat, lng: location.lng };
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

    // 合集归属：collectionId 优先，其次 collectionName 新建，都没有则自动归入默认合集
    let finalCollectionId: number | undefined;
    if (typeof collectionId === 'number') {
      if (!verifyCollectionOwnership(collectionId, user.id)) {
        return badRequest(res, '合集不存在或不属于当前用户');
      }
      finalCollectionId = collectionId;
    } else if (typeof collectionName === 'string' && collectionName.trim()) {
      const visi = typeof collectionVisibility === 'string' && ['public', 'private'].includes(collectionVisibility)
        ? collectionVisibility as 'public' | 'private'
        : undefined;
      const created = createCollection(user.id, { name: collectionName.trim(), visibility: visi });
      if (created.error) return badRequest(res, created.error);
      finalCollectionId = created.collection?.id;
    } else {
      const def = ensureDefaultCollection(user.id);
      finalCollectionId = def?.id;
    }

    const star = createStar(safeContent, safeTitle ?? undefined, starId, locationData, user.id, safeTag, anonymous, undefined, catalogStarIds, safeTags, finalCollectionId);

    // 异步生成 AI 故事内核
    if (star && (star as { id: number }).id) {
      triggerKernelGeneration((star as { id: number }).id, safeContent, safeTitle);
    }

    // 异步触发 catalog 级分析自动更新（闭环：新增故事 → 够5条 → AI 卡片内容自动重新生成）
    // 对 createStar 写入的所有 catalog_star_id（包括一对多挂多颗星）都触发一次
    const allAffectedIds = catalogStarIds?.length
      ? catalogStarIds
      : (starId != null ? [starId] : []);
    if (allAffectedIds.length > 0) {
      setImmediate(() => {
        try { triggerAnalysisRegeneration(allAffectedIds); }
        catch (e) { console.error('[stars/analysis] 自动触发失败:', e); }
      });
    }

    ok(res, '故事已化作星光', star);
  } catch (error) {
    console.error('POST /api/stars/story error:', error);
    serverError(res);
  }
});

// 共鸣点亮（需登录，去重）
router.post('/:storyId/resonate', authRequired, (req: Request, res: Response) => {
  try {
    const storyId = parseInt(req.params.storyId, 10);
    if (isNaN(storyId)) return badRequest(res, '无效的 storyId');

    const user = (req as Request & { user: { id: number } }).user;
    const result = resonate(storyId, user.id);
    if (!result) return notFound(res, '故事不存在');
    if (result.already) return ok(res, '已共鸣', result);

    // 共鸣会改变 story_count 的聚合权重分布 → 触发 catalog 级 AI 分析延迟再生
    // （15s debounce 合并窗口，不会每次点击都调 AI）
    const affected = getCatalogStarIdsForStory(storyId);
    if (affected.length) {
      setImmediate(() => {
        try { triggerAnalysisRegeneration(affected); }
        catch (e) { console.error('[stars/resonate] 自动触发分析失败:', e); }
      });
    }

    ok(res, '共鸣已点亮', result);
  } catch (error) {
    console.error('POST /api/stars/:storyId/resonate error:', error);
    serverError(res);
  }
});

// 获取恒星统计数据（按 catalog_star_id）
router.get('/:catalogStarId/stats', (req: Request, res: Response) => {
  try {
    const catalogStarId = parseInt(req.params.catalogStarId, 10);
    if (isNaN(catalogStarId)) return badRequest(res, '无效的 catalogStarId');
    const stats = getCatalogStats(catalogStarId);
    ok(res, 'success', stats);
  } catch (error) {
    console.error('GET /api/stars/:catalogStarId/stats error:', error);
    serverError(res);
  }
});

// 记录恒星浏览（打开详情页一次，纯计数）
router.post('/:catalogStarId/visit', (req: Request, res: Response) => {
  try {
    const catalogStarId = parseInt(req.params.catalogStarId, 10);
    if (isNaN(catalogStarId)) return badRequest(res, '无效的 catalogStarId');
    recordCatalogVisit(catalogStarId);
    ok(res, 'success');
  } catch (error) {
    console.error('POST /api/stars/:catalogStarId/visit error:', error);
    serverError(res);
  }
});

// 记录故事浏览（点击进入故事详情，纯计数）
router.post('/story/:storyId/view', (req: Request, res: Response) => {
  try {
    const storyId = parseInt(req.params.storyId, 10);
    if (isNaN(storyId)) return badRequest(res, '无效的 storyId');
    recordStoryView(storyId);
    ok(res, 'success');
  } catch (error) {
    console.error('POST /api/stars/story/:storyId/view error:', error);
    serverError(res);
  }
});

// 收藏星星（需登录）
router.post('/:catalogStarId/favorite', authRequired, (req: Request, res: Response) => {
  try {
    const catalogStarId = parseInt(req.params.catalogStarId, 10);
    if (isNaN(catalogStarId)) return badRequest(res, '无效的 catalogStarId');
    const user = (req as Request & { user: { id: number } }).user;
    const result = addFavorite(catalogStarId, user.id);
    ok(res, result.already ? '已收藏' : '收藏成功');
  } catch (error) {
    console.error('POST /api/stars/:catalogStarId/favorite error:', error);
    serverError(res);
  }
});

// 取消收藏星星（需登录）
router.delete('/:catalogStarId/favorite', authRequired, (req: Request, res: Response) => {
  try {
    const catalogStarId = parseInt(req.params.catalogStarId, 10);
    if (isNaN(catalogStarId)) return badRequest(res, '无效的 catalogStarId');
    const user = (req as Request & { user: { id: number } }).user;
    removeFavorite(catalogStarId, user.id);
    ok(res, '已取消收藏');
  } catch (error) {
    console.error('DELETE /api/stars/:catalogStarId/favorite error:', error);
    serverError(res);
  }
});

// 删除故事（旧路由兼容，需登录，只能删自己的）
router.delete('/story/:storyId', authRequired, (req: Request, res: Response) => {
  try {
    const storyId = parseInt(req.params.storyId, 10);
    if (isNaN(storyId)) return badRequest(res, '无效的 storyId');
    const user = (req as Request & { user: { id: number } }).user;
    // 先拿到受影响的 catalog 星（删除后 story_catalog_stars 会被清空，必须在此之前查）
    const affected = getCatalogStarIdsForStory(storyId);
    const result = deleteStory(storyId, user.id);
    if (result.notFound) return notFound(res, '故事不存在');
    if (result.notOwner) return forbidden(res, '只能删除自己的故事');
    // 删除成功 → 触发 catalog 级 AI 分析再生（故事集合变了，原来的画像/主题可能失真）
    if (affected.length) {
      setImmediate(() => {
        try { triggerAnalysisRegeneration(affected); }
        catch (e) { console.error('[stars/delete-story] 自动触发分析失败:', e); }
      });
    }
    ok(res, '已删除');
  } catch (error) {
    console.error('DELETE /api/stars/story/:storyId error:', error);
    serverError(res);
  }
});

export default router;
