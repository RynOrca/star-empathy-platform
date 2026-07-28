import { Router, Request, Response } from 'express';
import { getAllStars, getAllStarsPaged, getStoryById, createStar, resonate, recordStoryView, deleteStory } from '../services/starService';
import { authOptional, authRequired } from '../middleware/auth';
import { ok, badRequest, notFound, forbidden, serverError } from '../utils/response';
import { ensureKernel, updateKernel, getKernel, triggerKernelGeneration } from '../services/kernel';

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
    const { title, content, catalogStarId: catalog_star_id, location, tag, isAnonymous, imageUrl } = req.body;
    const user = (req as Request & { user: { id: number } }).user;

    if (!content || typeof content !== 'string') {
      return badRequest(res, 'content 不能为空');
    }

    const trimmed = content.trim();
    if (trimmed.length === 0 || trimmed.length > 300) {
      return badRequest(res, 'content 长度需在 1~300 字之间');
    }

    const catalogStarId = typeof catalog_star_id === 'number' ? catalog_star_id : undefined;

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

    const esc = (s: string) => s.replace(/[<>&"]/g, (c) => {
      const map: Record<string, string> = {
        '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;',
      };
      return map[c] || c;
    });
    const safeContent = esc(trimmed);
    const safeTitle = typeof title === 'string' && title.trim() ? esc(title.trim()) : null;
    const safeTag = typeof tag === 'string' ? tag : undefined;
    const anonymous = typeof isAnonymous === 'boolean' ? isAnonymous : false;

    const story = createStar(safeContent, safeTitle ?? undefined, catalogStarId, locationData, user.id, safeTag, anonymous, typeof imageUrl === 'string' && imageUrl.startsWith('/uploads/') ? imageUrl : undefined);

    // 异步生成 AI 故事内核
    if (story && (story as { id: number }).id) {
      triggerKernelGeneration((story as { id: number }).id, safeContent, safeTitle);
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
    const result = deleteStory(storyId, user.id);
    if (result.notFound) return notFound(res, '故事不存在');
    if (result.notOwner) return forbidden(res, '只能删除自己的故事');
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

    ok(res, '内核已更新', updated);
  } catch (error) {
    console.error('PATCH /api/stories/:storyId/kernel error:', error);
    serverError(res);
  }
});

export default router;
