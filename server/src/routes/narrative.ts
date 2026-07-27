import { Router, Request, Response } from 'express'
import { getNarrative } from '../services/narrative'
import { ok, badRequest, notFound, serverError } from '../utils/response'

const router = Router()

/**
 * GET /api/catalog/stars/:catalogStarId/narrative
 * 获取恒星的「古今共望」叙事
 */
router.get('/:catalogStarId/narrative', async (req: Request, res: Response) => {
  try {
    const catalogStarId = parseInt(req.params.catalogStarId, 10)
    if (isNaN(catalogStarId)) {
      return badRequest(res, '无效的 catalogStarId')
    }

    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined
    const result = await getNarrative(catalogStarId, lat, lng)
    ok(res, 'success', result)
  } catch (error: any) {
    if (error?.statusCode === 404) {
      return notFound(res, '恒星不存在')
    }
    console.error('GET /api/catalog/stars/:catalogStarId/narrative error:', error)
    // 把 DeepSeek 的具体错误返回以便调试
    const msg = error?.message || '服务器内部错误'
    serverError(res, msg)
  }
})

export default router
