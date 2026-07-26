import { Router, Request, Response } from 'express';
import { getGlobalStats } from '../services/starService';
import { ok, serverError } from '../utils/response';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  try {
    const stats = getGlobalStats();
    ok(res, 'success', stats);
  } catch (error) {
    console.error('GET /api/stats error:', error);
    serverError(res);
  }
});

export default router;
