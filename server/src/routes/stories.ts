import { Router, Request, Response } from 'express';
import { getAllStars, createStar, resonate, recordStoryView } from '../services/starService';
import { authOptional } from '../middleware/auth';

const router = Router();

// 获取所有故事
router.get('/', (_req: Request, res: Response) => {
  try {
    const stories = getAllStars();
    res.json({ code: 200, message: 'success', data: stories });
  } catch (error) {
    console.error('GET /api/stories error:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

// 投递故事（可选登录）
router.post('/', authOptional, (req: Request, res: Response) => {
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
    res.status(200).json({ code: 200, message: '故事已化作星光', data: story });
  } catch (error) {
    console.error('POST /api/stories error:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

// 共鸣故事
router.post('/:storyId/resonate', (req: Request, res: Response) => {
  try {
    const storyId = parseInt(req.params.storyId, 10);
    if (isNaN(storyId)) return res.status(400).json({ code: 400, message: '无效的 storyId', data: null });

    const result = resonate(storyId);
    if (!result) return res.status(404).json({ code: 404, message: '故事不存在', data: null });

    res.json({ code: 200, message: '共鸣已点亮', data: result });
  } catch (error) {
    console.error('POST /api/stories/:storyId/resonate error:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

// 故事级浏览 +1
router.post('/:storyId/view', (req: Request, res: Response) => {
  try {
    const storyId = parseInt(req.params.storyId, 10);
    if (isNaN(storyId)) return res.status(400).json({ code: 400, message: '无效的 storyId', data: null });
    recordStoryView(storyId);
    res.json({ code: 200, message: 'success', data: null });
  } catch (error) {
    console.error('POST /api/stories/:storyId/view error:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

export default router;
