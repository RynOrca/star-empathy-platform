import { Router, Request, Response } from 'express';
import { getUserStories, getUserStoriesPaged, getUserFavorites } from '../services/starService';
import { authRequired } from '../middleware/auth';
import { ok, serverError } from '../utils/response';

const router = Router();

// 我的故事（支持 ?page=&limit= 分页，不传返回全量）
router.get('/stories', authRequired, (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { id: number } }).user;
    const page = parseInt(req.query.page as string, 10);
    const limit = parseInt(req.query.limit as string, 10);
    if (!isNaN(page) && !isNaN(limit)) {
      const result = getUserStoriesPaged(user.id, page, limit);
      ok(res, 'success', result);
    } else {
      const stories = getUserStories(user.id);
      ok(res, 'success', stories);
    }
  } catch (error) {
    console.error('GET /api/profile/stories error:', error);
    serverError(res);
  }
});

// 我的收藏
router.get('/favorites', authRequired, (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { id: number } }).user;
    const favIds = getUserFavorites(user.id);
    ok(res, 'success', favIds);
  } catch (error) {
    console.error('GET /api/profile/favorites error:', error);
    serverError(res);
  }
});

export default router;
