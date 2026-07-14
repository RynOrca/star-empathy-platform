import { Router, Request, Response } from 'express';
import { getGlobalStats } from '../services/starService';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  try {
    const stats = getGlobalStats();
    res.json({ code: 200, message: 'success', data: stats });
  } catch (error) {
    console.error('GET /api/stats error:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

export default router;
