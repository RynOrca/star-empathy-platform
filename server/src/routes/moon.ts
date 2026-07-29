/**
 * 月相解读路由
 *
 * POST /api/moon/insight
 * Body：
 *   phaseLabel       - 月相相位名（如"盈凸月"）
 *   lunarDay         - 农历日（如"廿五"）
 *   jieQi            - 当前节气（可选）
 *   season           - 季节（春/夏/秋/冬）
 *   altitude         - 月球高度（可选，度）
 *   azimuth          - 方位角（可选，度）
 *   daysToFullMoon   - 距下次满月天数（可选）
 *   userPreferences  - 用户喜好聚合（可选，{emotionalTags, themes, storyCount}）
 *
 * 认证：authRequired（JWT）
 * 响应：始终返回 ok，data.source 标识来源（'ai' | 'fallback'）
 *       前端依据 source === 'ai' 决定是否写 localStorage 缓存
 */

import { Router, Request, Response } from 'express'
import { ok } from '../utils/response'
import { getMoonInsight, type UserPreferencesInput } from '../services/moonInsight'
import { authRequired } from '../middleware/auth'

const router = Router()

router.post('/insight', authRequired, async (req: Request, res: Response) => {
  const {
    phaseLabel,
    lunarDay,
    jieQi,
    season,
    altitude,
    azimuth,
    daysToFullMoon,
    userPreferences,
  } = req.body ?? {}

  // 参数校验
  if (typeof phaseLabel !== 'string' || typeof lunarDay !== 'string') {
    return res.status(400).json({ code: 400, message: 'phaseLabel 和 lunarDay 为必填参数', data: null })
  }

  // 规范化 userPreferences（前端可能传 null/undefined/对象）
  const prefs: UserPreferencesInput | null =
    userPreferences && typeof userPreferences === 'object'
      ? {
          emotionalTags: Array.isArray(userPreferences.emotionalTags) ? userPreferences.emotionalTags : [],
          themes: Array.isArray(userPreferences.themes) ? userPreferences.themes : [],
          storyCount: typeof userPreferences.storyCount === 'number' ? userPreferences.storyCount : 0,
        }
      : null

  const result = await getMoonInsight({
    phaseLabel,
    lunarDay,
    jieQi: typeof jieQi === 'string' && jieQi ? jieQi : null,
    season: typeof season === 'string' ? season : '通用',
    altitude: altitude != null && !Number.isNaN(Number(altitude)) ? Number(altitude) : null,
    azimuth: azimuth != null && !Number.isNaN(Number(azimuth)) ? Number(azimuth) : null,
    daysToFullMoon:
      daysToFullMoon != null && !Number.isNaN(Number(daysToFullMoon))
        ? Number(daysToFullMoon)
        : null,
    userPreferences: prefs,
  })

  return ok(res, 'ok', result)
})

export default router
