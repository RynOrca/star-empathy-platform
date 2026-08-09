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
import { getStarStoryMeta } from '../agents/starAnalysisAgent'
import { triggerAnalysisRegeneration } from '../services/kernel'

const router = Router()

// 懒生成触发冷却：同一颗星 60s 内只触发一次。
// 前端详情页会 5s 轮询 analysis 接口，若不冷却会反复重置 kernel 的 15s 防抖，
// 导致 ensureOne 被无限推迟到轮询结束。
const TRIGGER_COOLDOWN_MS = 60 * 1000
const lastTriggerAt = new Map<string, number>()

function getCatalogId(req: Request, res: Response): number | null {
  const raw = req.params.id
  const id = parseInt(raw, 10)
  // 允许负 id（太阳系行星 -100~-108）；也允许 0（星表第一颗星「天枢 Dubhe」的 id 就是 0）
  if (!Number.isFinite(id)) {
    badRequest(res, 'catalog_star_id 无效')
    return null
  }
  return id
}

router.get('/:id/analysis', (req: Request, res: Response) => {
  const id = getCatalogId(req, res)
  if (id === null) return
  const data = readAnalysis(id)
  // 懒生成兜底：分析未 ready 且故事数 ≥5 时，后台自动补生成（15s 防抖 + 并发 1 + story_hash 幂等，
  // 不会刷爆 API）。覆盖批量生成任务漏掉的星（如 seed 导入的故事从未走 API 写操作触发再生）。
  if (!data.ready) {
    const meta = getStarStoryMeta(id)
    const cid = String(id)
    const now = Date.now()
    const last = lastTriggerAt.get(cid) ?? 0
    if ((meta.total ?? 0) >= 5 && now - last > TRIGGER_COOLDOWN_MS) {
      lastTriggerAt.set(cid, now)
      triggerAnalysisRegeneration([id])
    }
  }
  ok(res, 'ok', data)
})

export default router
