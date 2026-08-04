import { Router, Request, Response } from 'express';
import { authRequired, authOptional } from '../middleware/auth';
import { ok, badRequest, notFound, forbidden, serverError } from '../utils/response';
import {
  createCollection,
  listMyCollections,
  patchCollection,
  deleteCollection,
  moveStoryToCollection,
  getCollectionStoriesPaged,
  getCollectionStats,
  recordCollectionVisit,
} from '../services/collectionsService';

const router = Router();

// 获取我的合集列表
router.get('/mine', authRequired, (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { id: number } }).user;
    const list = listMyCollections(user.id);
    ok(res, 'success', { list });
  } catch (error) {
    console.error('GET /api/collections/mine error:', error);
    serverError(res);
  }
});

// 创建合集
router.post('/', authRequired, (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { id: number } }).user;
    const { name, description, coverColor, isPublic } = req.body ?? {};
    const r = createCollection(user.id, { name, description, coverColor, isPublic });
    if ('error' in r) return badRequest(res, r.error);
    ok(res, '已创建合集', r);
  } catch (error) {
    console.error('POST /api/collections error:', error);
    serverError(res);
  }
});

// 合集统计（头卡片展示用）
router.get('/:id/stats', authOptional, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return badRequest(res, '无效的合集ID');
    const userAny = (req as any).user;
    const uid = userAny?.id ?? 0;
    const r = getCollectionStats(uid, id);
    if (!r.ok) {
      return r.reason === 'not-found' ? notFound(res, '合集不存在') : forbidden(res, '无权查看');
    }
    // 记录一次访问（访问者本人看也算一次）
    recordCollectionVisit(uid || null, id);
    // 读回更新后的 total_views（因为刚 +1）
    const r2 = getCollectionStats(uid, id);
    if (!r2.ok) return ok(res, 'success', r);
    ok(res, 'success', r2);
  } catch (error) {
    console.error('GET /api/collections/:id/stats error:', error);
    serverError(res);
  }
});

// 合集详情故事列表（分页）
router.get('/:id/stories', authOptional, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return badRequest(res, '无效的合集ID');
    const page = parseInt((req.query as any).page ?? '1', 10);
    const limit = parseInt((req.query as any).limit ?? '20', 10);
    const userAny = (req as any).user;
    const uid = userAny?.id ?? 0;
    const r = getCollectionStoriesPaged(uid, id, page, limit);
    if (!r.ok) {
      return r.reason === 'not-found' ? notFound(res, '合集不存在') : forbidden(res, '无权查看');
    }
    ok(res, 'success', r);
  } catch (error) {
    console.error('GET /api/collections/:id/stories error:', error);
    serverError(res);
  }
});

// 修改合集（name/description/coverColor/sortOrder/isPublic）
router.patch('/:id', authRequired, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return badRequest(res, '无效的合集ID');
    const user = (req as Request & { user: { id: number } }).user;
    const { name, description, coverColor, isPublic, sortOrder } = req.body ?? {};
    const r = patchCollection(user.id, id, { name, description, coverColor, isPublic, sortOrder });
    if (!r.ok) {
      return r.reason === 'not-found' ? notFound(res, '合集不存在') : badRequest(res, r.reason);
    }
    ok(res, '已更新', { collection: r.collection });
  } catch (error) {
    console.error('PATCH /api/collections/:id error:', error);
    serverError(res);
  }
});

// 删除合集（禁止删除默认合集；被删合集下的故事自动移到默认合集）
router.delete('/:id', authRequired, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return badRequest(res, '无效的合集ID');
    const user = (req as Request & { user: { id: number } }).user;
    const r = deleteCollection(user.id, id);
    if (!r.ok) return badRequest(res, r.reason);
    ok(res, '合集已删除');
  } catch (error) {
    console.error('DELETE /api/collections/:id error:', error);
    serverError(res);
  }
});

// 将一条故事移动到目标合集（MVP1 一故事一合集，覆盖赋值）
// body: { storyId: number, collectionId: number | null }  collectionId=null = 解除分类（不进任何合集）
router.post('/move-story', authRequired, (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { id: number } }).user;
    const { storyId, collectionId } = req.body ?? {};
    const sid = typeof storyId === 'number' ? storyId : parseInt(String(storyId), 10);
    if (isNaN(sid)) return badRequest(res, '无效的故事ID');
    let cid: number | null = null;
    if (collectionId !== null && collectionId !== undefined && collectionId !== '') {
      cid = typeof collectionId === 'number' ? collectionId : parseInt(String(collectionId), 10);
      if (isNaN(cid)) return badRequest(res, '无效的目标合集ID');
    }
    const r = moveStoryToCollection(user.id, sid, cid);
    if (!r.ok) {
      switch (r.reason) {
        case '故事不存在': return notFound(res, r.reason);
        default: return badRequest(res, r.reason);
      }
    }
    ok(res, '已移动');
  } catch (error) {
    console.error('POST /api/collections/move-story error:', error);
    serverError(res);
  }
});

export default router;
