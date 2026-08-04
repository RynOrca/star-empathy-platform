import { Router, Request, Response } from 'express';
import { getAllStars, getAllStarsPaged, getStoryById, createStar, resonate, recordStoryView, deleteStory, getCatalogStarIdsForStory } from '../services/starService';
import { authOptional, authRequired } from '../middleware/auth';
import { ok, badRequest, notFound, forbidden, serverError } from '../utils/response';
import { ensureKernel, updateKernel, getKernel, triggerKernelGeneration, triggerAnalysisRegeneration, findMatchingStarsForContent, extractSuggestedTagsForContent } from '../services/kernel';

const router = Router();

// 获取所有故事（支持分页 ?page=&limit=，不传则返回全量）
router.get('/', (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10);
    const limit = parseInt(req.query.limit as string, 10);
    if (!isNaN(page) && !isNaN(limit)) {
      const paged = getAllStarsPaged(page, limit);
      ok(res, 'success', paged);
    } else {
      const stories = getAllStars();
      ok(res, 'success', stories);
    }
  } catch (error) {
    console.error('GET /api/stories error:', error);
    serverError(res);
  }
});

// 单条故事详情
router.get('/:storyId', (req: Request, res: Response) => {
  try {
    const storyId = parseInt(req.params.storyId, 10);
    if (isNaN(storyId)) return badRequest(res, '无效的 storyId');
    const story = getStoryById(storyId);
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
    const { title, content, catalogStarId: catalog_star_id, catalogStarIds: catalog_star_ids, location, tag, tags, isAnonymous, imageUrl } = req.body;
    const user = (req as Request & { user: { id: number } }).user;

    if (!content || typeof content !== 'string') {
      return badRequest(res, 'content 不能为空');
    }

    const trimmed = content.trim();
    if (trimmed.length === 0 || trimmed.length > 2000) {
      return badRequest(res, 'content 长度需在 1~2000 字之间');
    }

    const catalogStarId = typeof catalog_star_id === 'number' ? catalog_star_id : undefined;
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

    const story = createStar(safeContent, safeTitle ?? undefined, catalogStarId, locationData, user.id, safeTag, anonymous, typeof imageUrl === 'string' && imageUrl.startsWith('/uploads/') ? imageUrl : undefined, catalogStarIds, safeTags);

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
