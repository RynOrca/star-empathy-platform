/**
 * /api/catalog/stars/:id/analysis
 * /api/stars/:id/analysis（兼容旧 URL）
 *
 * 返回该 catalog_star_id 对应的预生成 AI 分析结果。
 * - themehour：即使未预生成也会用 SQL 即时聚合返回（轻量、真实）
 * - persona / emotion：未生成则返回 null，前端组件 fallback 到自身假数据
 * - 支持太阳系行星（负 id，-100~-108），readAnalysis 对负 id 安全：返回空分析
 */

import { Router, Request, Response } from 'express'
import { ok, badRequest } from '../utils/response'
import { readAnalysis } from '../services/starAnalysis'

const router = Router()

function getCatalogId(req: Request, res: Response): number | null {
  const raw = req.params.id
  const id = parseInt(raw, 10)
  // 允许负 id（太阳系行星 -100~-108）；仅拒绝 NaN / 0
  if (!Number.isFinite(id) || id === 0) {
    badRequest(res, 'catalog_star_id 无效')
    return null
  }
  return id
}

router.get('/:id/analysis', (req: Request, res: Response) => {
  const id = getCatalogId(req, res)
  if (id === null) return
  const data = readAnalysis(id)
  ok(res, 'ok', data)
})

export default router
