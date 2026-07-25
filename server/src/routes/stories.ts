import { Router, Request, Response } from 'express';
import { getAllStars, getStoryById, createStar, resonate, recordStoryView } from '../services/starService';
import { authOptional } from '../middleware/auth';
import { ok, badRequest, notFound, serverError } from '../utils/response';

const router = Router();

// 获取所有故事
router.get('/', (_req: Request, res: Response) => {
  try {
    const stories = getAllStars();
    ok(res, 'success', stories);
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

// 投递故事（可选登录）
router.post('/', authOptional, (req: Request, res: Response) => {
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

    const story = createStar(safeContent, safeTitle ?? undefined, catalogStarId, locationData, user?.id, safeTag);
    ok(res, '故事已化作星光', story);
  } catch (error) {
    console.error('POST /api/stories error:', error);
    serverError(res);
  }
});

// 共鸣故事
router.post('/:storyId/resonate', (req: Request, res: Response) => {
  try {
    const storyId = parseInt(req.params.storyId, 10);
    if (isNaN(storyId)) return badRequest(res, '无效的 storyId');

    const result = resonate(storyId);
    if (!result) return notFound(res, '故事不存在');

    ok(res, '共鸣已点亮', result);
  } catch (error) {
    console.error('POST /api/stories/:storyId/resonate error:', error);
    serverError(res);
  }
});

// 故事级浏览 +1
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

export default router;
