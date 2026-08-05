import { Router, Request, Response } from 'express';
import { authRequired, authOptional } from '../middleware/auth';
import { ok, badRequest, notFound, forbidden, serverError } from '../utils/response';
import {
  listCollections,
  createCollection,
  getCollectionDetail,
  updateCollection,
  deleteCollection,
  listPublicCollections,
} from '../services/collectionService';
import { readCollectionAnalysis, triggerAnalysisIfNeeded } from '../services/collectionAnalysis';

const router = Router();

type AuthedReq = Request & { user: { id: number } };

// 我的合集列表（?visibility=public|private 可选过滤）
router.get('/', authRequired, (req: Request, res: Response) => {
  try {
    const user = (req as AuthedReq).user;
    const visibility = req.query.visibility as 'public' | 'private' | undefined;
    const list = listCollections(user.id, visibility);
    ok(res, 'success', list);
  } catch (error) {
    console.error('GET /api/collections error:', error);
    serverError(res);
  }
});

// 创建合集
router.post('/', authRequired, (req: Request, res: Response) => {
  try {
    const user = (req as AuthedReq).user;
    const { name, description, coverColor, visibility } = req.body || {};
    if (!name || typeof name !== 'string') return badRequest(res, 'name 不能为空');
    const result = createCollection(user.id, { name, description, coverColor, visibility });
    if (result.error) return badRequest(res, result.error);
    ok(res, '合集已创建', result.collection);
  } catch (error) {
    console.error('POST /api/collections error:', error);
    serverError(res);
  }
});

// 公开合集列表（必须在 /:id 之前注册，避免被 :id 参数吞掉）
router.get('/public', authOptional, (req: Request, res: Response) => {
  try {
    const userIdRaw = req.query.userId as string | undefined;
    const userIdParsed = userIdRaw ? parseInt(userIdRaw, 10) : NaN;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const result = listPublicCollections(!isNaN(userIdParsed) ? userIdParsed : undefined, page, limit);
    ok(res, 'success', result);
  } catch (error) {
    console.error('GET /api/collections/public error:', error);
    serverError(res);
  }
});

// 合集详情（含故事列表）。authOptional：未登录或非 owner 时仅 public 可见，private 返回 404
router.get('/:id', authOptional, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return badRequest(res, '无效的合集 id');
    const currentUserId = (req as Request & { user?: { id: number } }).user?.id;
    const detail = getCollectionDetail(id, currentUserId);
    if (!detail) return notFound(res, '合集不存在');
    ok(res, 'success', detail);
  } catch (error) {
    console.error('GET /api/collections/:id error:', error);
    serverError(res);
  }
});

// 编辑合集（仅 owner）
router.patch('/:id', authRequired, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return badRequest(res, '无效的合集 id');
    const user = (req as AuthedReq).user;
    const { name, description, coverColor, visibility, sortOrder } = req.body || {};
    const patch: { name?: string; description?: string | null; coverColor?: string | null; visibility?: 'public' | 'private'; sortOrder?: number } = {};
    if (name !== undefined) patch.name = name;
    if (description !== undefined) patch.description = description;
    if (coverColor !== undefined) patch.coverColor = coverColor;
    if (visibility !== undefined) patch.visibility = visibility;
    if (sortOrder !== undefined) patch.sortOrder = sortOrder;
    const result = updateCollection(id, user.id, patch);
    if (result.notFound) return notFound(res, '合集不存在');
    if (result.forbidden) return forbidden(res, '只能编辑自己的合集');
    if (result.error) return badRequest(res, result.error);
    ok(res, '合集已更新', result.collection);
  } catch (error) {
    console.error('PATCH /api/collections/:id error:', error);
    serverError(res);
  }
});

// 删除合集（仅 owner；故事 collection_id 置 NULL，故事保留）
router.delete('/:id', authRequired, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return badRequest(res, '无效的合集 id');
    const user = (req as AuthedReq).user;
    const result = deleteCollection(id, user.id);
    if (result.notFound) return notFound(res, '合集不存在');
    if (result.forbidden) return forbidden(res, '只能删除自己的合集');
    ok(res, '合集已删除');
  } catch (error) {
    console.error('DELETE /api/collections/:id error:', error);
    serverError(res);
  }
});

// 合集级 AI 分析
//  - storyCount < 3：返回 ready=false 但带 storyCount 提示（前端显示"心事不够多"空态，不轮询）
//  - storyCount >= 3：首次触发会合成（Phase 1 立即完成，Phase 2 异步 agent），返回 { persona, emotion, nightscape, ready, generatedAt }
//  - 前端轮询：ready=false 时每 3s 再拉一次，直到 ready=true 或超过 MAX_POLL 次
router.get('/:id/analysis', authOptional, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return badRequest(res, '无效的合集 id');
    const currentUserId = (req as Request & { user?: { id: number } }).user?.id;

    // 先通过 getCollectionDetail 检查可见性（private 仅 owner 可见；public 任何人）
    const detail = getCollectionDetail(id, currentUserId);
    if (!detail) return notFound(res, '合集不存在');

    const storyCount = detail.storyCount ?? 0;

    // 故事太少：直接返回空态（带 storyCount 供前端判定），不写缓存，不生成
    if (storyCount < 3) {
      return ok(res, 'success', {
        persona: null,
        emotion: null,
        nightscape: null,
        ready: false,
        tooFewStories: true,
        storyCount,
        generatedAt: null,
      });
    }

    // storyCount >= 3：触发懒生成 + 读（Phase 1 同步合成完，ready=true；Phase 2 会先返回 ready=false 异步写）
    triggerAnalysisIfNeeded(id);
    const analysis = readCollectionAnalysis(id);
    return ok(res, 'success', { ...analysis, tooFewStories: false, storyCount });
  } catch (error) {
    console.error('GET /api/collections/:id/analysis error:', error);
    serverError(res);
  }
});

export default router;
