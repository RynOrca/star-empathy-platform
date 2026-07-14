import { Router, Request, Response } from 'express';
import { getAllStars, createStar, resonate, recordCatalogVisit, recordStoryView, getCatalogStats, addFavorite, removeFavorite } from '../services/starService';

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

// 投递心事/创建星星
router.post('/story', (req: Request, res: Response) => {
  try {
    const { title, content, catalog_star_id, location } = req.body;

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

    const star = createStar(safeContent, safeTitle ?? undefined, starId, locationData);
    res.status(200).json({ code: 200, message: '故事已化作星光', data: star });
  } catch (error) {
    console.error('POST /api/stars/story error:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

// 共鸣点亮
router.post('/:id/resonate', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ code: 400, message: '无效的 id', data: null });

    const result = resonate(id);
    if (!result) return res.status(404).json({ code: 404, message: '星星不存在', data: null });

    res.json({ code: 200, message: '共鸣已点亮', data: result });
  } catch (error) {
    console.error('POST /api/stars/:id/resonate error:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

// 获取星星统计数据
router.get('/:id/stats', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ code: 400, message: '无效的 id', data: null });
    const stats = getCatalogStats(id);
    res.json({ code: 200, message: 'success', data: stats });
  } catch (error) {
    console.error('GET /api/stars/:id/stats error:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

// 记录星星级浏览（打开详情页一次）
router.post('/:id/visit', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ code: 400, message: '无效的 id', data: null });
    recordCatalogVisit(id);
    res.json({ code: 200, message: 'success', data: null });
  } catch (error) {
    console.error('POST /api/stars/:id/visit error:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

// 记录故事级浏览（点击进入故事详情）
router.post('/story/:id/view', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ code: 400, message: '无效的 id', data: null });
    recordStoryView(id);
    res.json({ code: 200, message: 'success', data: null });
  } catch (error) {
    console.error('POST /api/stars/story/:id/view error:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

// 收藏星星
router.post('/:id/favorite', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ code: 400, message: '无效的 id', data: null });
    addFavorite(id);
    res.json({ code: 200, message: '已收藏', data: null });
  } catch (error) {
    console.error('POST /api/stars/:id/favorite error:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

// 取消收藏星星
router.delete('/:id/favorite', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ code: 400, message: '无效的 id', data: null });
    removeFavorite(id);
    res.json({ code: 200, message: '已取消收藏', data: null });
  } catch (error) {
    console.error('DELETE /api/stars/:id/favorite error:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

export default router;
