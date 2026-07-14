import { Router, Request, Response } from 'express';
import { getUserStories, getUserFavorites } from '../services/starService';
import { authRequired } from '../middleware/auth';

const router = Router();

// 我的故事
router.get('/stories', authRequired, (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { id: number } }).user;
    const stories = getUserStories(user.id);
    res.json({ code: 200, message: 'success', data: stories });
  } catch (error) {
    console.error('GET /api/profile/stories error:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

// 我的收藏
router.get('/favorites', authRequired, (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { id: number } }).user;
    const favIds = getUserFavorites(user.id);
    res.json({ code: 200, message: 'success', data: favIds });
  } catch (error) {
    console.error('GET /api/profile/favorites error:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

export default router;
