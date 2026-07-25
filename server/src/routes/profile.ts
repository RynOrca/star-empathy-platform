import { Router, Request, Response } from 'express';
import { getUserStories, getUserFavorites } from '../services/starService';
import { authRequired } from '../middleware/auth';
import { ok, serverError } from '../utils/response';

const router = Router();

// 我的故事
router.get('/stories', authRequired, (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { id: number } }).user;
    const stories = getUserStories(user.id);
    ok(res, 'success', stories);
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
