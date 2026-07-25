import { Router, Request, Response } from 'express';
import { getAllStars, getAllStarsPaged, getStoryById, getStoriesByCatalogStarId, createStar, resonate, recordCatalogVisit, recordStoryView, getCatalogStats, addFavorite, removeFavorite, deleteStory } from '../services/starService';
import { authOptional, authRequired } from '../middleware/auth';
import { ok, badRequest, notFound, forbidden, serverError } from '../utils/response';

const router = Router();

// 获取所有星星（支持分页 ?page=&limit=，不传则返回全量）
router.get('/', (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10);
    const limit = parseInt(req.query.limit as string, 10);
    if (!isNaN(page) && !isNaN(limit)) {
      const paged = getAllStarsPaged(page, limit);
      ok(res, 'success', paged);
    } else {
      const stars = getAllStars();
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
router.get('/:catalogStarId/stories', (req: Request, res: Response) => {
  try {
    const catalogStarId = parseInt(req.params.catalogStarId, 10);
    if (isNaN(catalogStarId)) return badRequest(res, '无效的 catalogStarId');
    const stories = getStoriesByCatalogStarId(catalogStarId);
    ok(res, 'success', stories);
  } catch (error) {
    console.error('GET /api/stars/:catalogStarId/stories error:', error);
    serverError(res);
  }
});

// 投递心事/创建星星（可选登录）
router.post('/story', authOptional, (req: Request, res: Response) => {
  try {
    const { title, content, catalog_star_id, location, tag } = req.body;
    const user = (req as Request & { user?: { id: number } }).user;

    if (!content || typeof content !== 'string') {
      return badRequest(res, 'content 不能为空');
    }

    const trimmed = content.trim();
    if (trimmed.length === 0 || trimmed.length > 300) {
      return badRequest(res, 'content 长度需在 1~300 字之间');
    }

    const starId = typeof catalog_star_id === 'number' ? catalog_star_id : undefined;

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

    const star = createStar(safeContent, safeTitle ?? undefined, starId, locationData, user?.id, safeTag);
    ok(res, '故事已化作星光', star);
  } catch (error) {
    console.error('POST /api/stars/story error:', error);
    serverError(res);
  }
});

// 共鸣点亮
router.post('/:storyId/resonate', (req: Request, res: Response) => {
  try {
    const storyId = parseInt(req.params.storyId, 10);
    if (isNaN(storyId)) return badRequest(res, '无效的 storyId');

    const result = resonate(storyId);
    if (!result) return notFound(res, '故事不存在');

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

// 记录恒星浏览（打开详情页一次）
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

// 记录故事浏览（点击进入故事详情）
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
    const result = deleteStory(storyId, user.id);
    if (result.notFound) return notFound(res, '故事不存在');
    if (result.notOwner) return forbidden(res, '只能删除自己的故事');
    ok(res, '已删除');
  } catch (error) {
    console.error('DELETE /api/stars/story/:storyId error:', error);
    serverError(res);
  }
});

export default router;
