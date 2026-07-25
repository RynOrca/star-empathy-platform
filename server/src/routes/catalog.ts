import { Router, Request, Response } from 'express';
import { recordCatalogVisit, getCatalogStats, addFavorite, removeFavorite } from '../services/starService';
import { authRequired } from '../middleware/auth';
import { ok, badRequest, serverError } from '../utils/response';

const router = Router();

// 获取恒星统计数据（按 catalog_star_id 聚合）
router.get('/:catalogStarId/stats', (req: Request, res: Response) => {
  try {
    const catalogStarId = parseInt(req.params.catalogStarId, 10);
    if (isNaN(catalogStarId)) return badRequest(res, '无效的 catalogStarId');
    const stats = getCatalogStats(catalogStarId);
    ok(res, 'success', stats);
  } catch (error) {
    console.error('GET /api/catalog/stars/:catalogStarId/stats error:', error);
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
    console.error('POST /api/catalog/stars/:catalogStarId/visit error:', error);
    serverError(res);
  }
});

// 收藏恒星（需登录）
router.post('/:catalogStarId/favorite', authRequired, (req: Request, res: Response) => {
  try {
    const catalogStarId = parseInt(req.params.catalogStarId, 10);
    if (isNaN(catalogStarId)) return badRequest(res, '无效的 catalogStarId');
    const user = (req as Request & { user: { id: number } }).user;
    const result = addFavorite(catalogStarId, user.id);
    ok(res, result.already ? '已收藏' : '收藏成功');
  } catch (error) {
    console.error('POST /api/catalog/stars/:catalogStarId/favorite error:', error);
    serverError(res);
  }
});

// 取消收藏恒星（需登录）
router.delete('/:catalogStarId/favorite', authRequired, (req: Request, res: Response) => {
  try {
    const catalogStarId = parseInt(req.params.catalogStarId, 10);
    if (isNaN(catalogStarId)) return badRequest(res, '无效的 catalogStarId');
    const user = (req as Request & { user: { id: number } }).user;
    removeFavorite(catalogStarId, user.id);
    ok(res, '已取消收藏');
  } catch (error) {
    console.error('DELETE /api/catalog/stars/:catalogStarId/favorite error:', error);
    serverError(res);
  }
});

export default router;
