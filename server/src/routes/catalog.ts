import { Router, Request, Response } from 'express';
import { recordCatalogVisit, getCatalogStats, addFavorite, removeFavorite } from '../services/starService';
import { authRequired } from '../middleware/auth';

const router = Router();

// 获取恒星统计数据（按 catalog_star_id 聚合）
router.get('/:catalogStarId/stats', (req: Request, res: Response) => {
  try {
    const catalogStarId = parseInt(req.params.catalogStarId, 10);
    if (isNaN(catalogStarId)) return res.status(400).json({ code: 400, message: '无效的 catalogStarId', data: null });
    const stats = getCatalogStats(catalogStarId);
    res.json({ code: 200, message: 'success', data: stats });
  } catch (error) {
    console.error('GET /api/catalog/stars/:catalogStarId/stats error:', error);
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
    console.error('POST /api/catalog/stars/:catalogStarId/visit error:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

// 收藏恒星（需登录）
router.post('/:catalogStarId/favorite', authRequired, (req: Request, res: Response) => {
  try {
    const catalogStarId = parseInt(req.params.catalogStarId, 10);
    if (isNaN(catalogStarId)) return res.status(400).json({ code: 400, message: '无效的 catalogStarId', data: null });
    const user = (req as Request & { user: { id: number } }).user;
    const result = addFavorite(catalogStarId, user.id);
    res.json({ code: 200, message: result.already ? '已收藏' : '收藏成功', data: null });
  } catch (error) {
    console.error('POST /api/catalog/stars/:catalogStarId/favorite error:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

// 取消收藏恒星（需登录）
router.delete('/:catalogStarId/favorite', authRequired, (req: Request, res: Response) => {
  try {
    const catalogStarId = parseInt(req.params.catalogStarId, 10);
    if (isNaN(catalogStarId)) return res.status(400).json({ code: 400, message: '无效的 catalogStarId', data: null });
    const user = (req as Request & { user: { id: number } }).user;
    removeFavorite(catalogStarId, user.id);
    res.json({ code: 200, message: '已取消收藏', data: null });
  } catch (error) {
    console.error('DELETE /api/catalog/stars/:catalogStarId/favorite error:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

export default router;
