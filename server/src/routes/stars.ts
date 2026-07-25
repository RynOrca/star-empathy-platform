import { Router, Request, Response } from 'express';
import { getAllStars, createStar, resonate, recordCatalogVisit, recordStoryView, getCatalogStats, addFavorite, removeFavorite } from '../services/starService';
import { authOptional, authRequired } from '../middleware/auth';

const router = Router();

// 获取所有星星
router.get('/', (_req: Request, res: Response) => {
  try {
    const stars = getAllStars();
    res.json({ code: 200, message: 'success', data: stars });
  } catch (error) {
    console.error('GET /api/stars error:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

// 投递心事/创建星星（可选登录）
router.post('/story', authOptional, (req: Request, res: Response) => {
  try {
    const { title, content, catalog_star_id, location, tag } = req.body;
    const user = (req as Request & { user?: { id: number } }).user;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ code: 400, message: 'content 不能为空', data: null });
    }

    const trimmed = content.trim();
    if (trimmed.length === 0 || trimmed.length > 300) {
      return res.status(400).json({ code: 400, message: 'content 长度需在 1~300 字之间', data: null });
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
    res.status(200).json({ code: 200, message: '故事已化作星光', data: star });
  } catch (error) {
    console.error('POST /api/stars/story error:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

// 共鸣点亮
router.post('/:storyId/resonate', (req: Request, res: Response) => {
  try {
    const storyId = parseInt(req.params.storyId, 10);
    if (isNaN(storyId)) return res.status(400).json({ code: 400, message: '无效的 storyId', data: null });

    const result = resonate(storyId);
    if (!result) return res.status(404).json({ code: 404, message: '故事不存在', data: null });

    res.json({ code: 200, message: '共鸣已点亮', data: result });
  } catch (error) {
    console.error('POST /api/stars/:storyId/resonate error:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

// 获取恒星统计数据（按 catalog_star_id）
router.get('/:catalogStarId/stats', (req: Request, res: Response) => {
  try {
    const catalogStarId = parseInt(req.params.catalogStarId, 10);
    if (isNaN(catalogStarId)) return res.status(400).json({ code: 400, message: '无效的 catalogStarId', data: null });
    const stats = getCatalogStats(catalogStarId);
    res.json({ code: 200, message: 'success', data: stats });
  } catch (error) {
    console.error('GET /api/stars/:catalogStarId/stats error:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

// 记录恒星浏览（打开详情页一次）
router.post('/:catalogStarId/visit', (req: Request, res: Response) => {
  try {
    const catalogStarId = parseInt(req.params.catalogStarId, 10);
    if (isNaN(catalogStarId)) return res.status(400).json({ code: 400, message: '无效的 catalogStarId', data: null });
    recordCatalogVisit(catalogStarId);
    res.json({ code: 200, message: 'success', data: null });
  } catch (error) {
    console.error('POST /api/stars/:catalogStarId/visit error:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

// 记录故事浏览（点击进入故事详情）
router.post('/story/:storyId/view', (req: Request, res: Response) => {
  try {
    const storyId = parseInt(req.params.storyId, 10);
    if (isNaN(storyId)) return res.status(400).json({ code: 400, message: '无效的 storyId', data: null });
    recordStoryView(storyId);
    res.json({ code: 200, message: 'success', data: null });
  } catch (error) {
    console.error('POST /api/stars/story/:storyId/view error:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

// 收藏星星（需登录）
router.post('/:catalogStarId/favorite', authRequired, (req: Request, res: Response) => {
  try {
    const catalogStarId = parseInt(req.params.catalogStarId, 10);
    if (isNaN(catalogStarId)) return res.status(400).json({ code: 400, message: '无效的 catalogStarId', data: null });
    const user = (req as Request & { user: { id: number } }).user;
    const result = addFavorite(catalogStarId, user.id);
    res.json({ code: 200, message: result.already ? '已收藏' : '收藏成功', data: null });
  } catch (error) {
    console.error('POST /api/stars/:catalogStarId/favorite error:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

// 取消收藏星星（需登录）
router.delete('/:catalogStarId/favorite', authRequired, (req: Request, res: Response) => {
  try {
    const catalogStarId = parseInt(req.params.catalogStarId, 10);
    if (isNaN(catalogStarId)) return res.status(400).json({ code: 400, message: '无效的 catalogStarId', data: null });
    const user = (req as Request & { user: { id: number } }).user;
    removeFavorite(catalogStarId, user.id);
    res.json({ code: 200, message: '已取消收藏', data: null });
  } catch (error) {
    console.error('DELETE /api/stars/:catalogStarId/favorite error:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

export default router;
