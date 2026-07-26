/**
 * 聊天路由 — Feature 2「古人陪看」
 * GET  /api/catalog/stars/:catalogStarId/chat/figures — 获取古人列表
 * POST /api/catalog/stars/:catalogStarId/chat         — SSE 流式聊天
 */

import { Router, Request, Response } from 'express'
import { getPublicFigures } from '../data/ancientFigures'
import { streamChat } from '../services/chat'
import { ok, badRequest, notFound } from '../utils/response'
import fs from 'fs'
import path from 'path'

const router = Router()

// 加载星表数据（用于查找星星信息）
interface CatalogStar {
  id: number
  name: string | null
  con: string
  mag: number
  dist?: number
}

interface CatalogData {
  stars: CatalogStar[]
  lines: number[][]
}

let starsData: CatalogStar[] = []
try {
  const starsPath = path.resolve(__dirname, '../../../client/src/data/stars.json')
  const raw = fs.readFileSync(starsPath, 'utf-8')
  const catalog = JSON.parse(raw) as CatalogData
  starsData = catalog.stars || []
} catch {
  console.warn('无法加载星表数据，星星上下文将不完整')
}

// 星座缩写 → 中文名
const CON_NAMES: Record<string, string> = {
  And: '仙女', Ant: '唧筒', Aps: '天燕', Aqr: '宝瓶', Aql: '天鹰', Ara: '天坛',
  Ari: '白羊', Aur: '御夫', Boo: '牧夫', Cae: '雕具', Cam: '鹿豹', Cnc: '巨蟹',
  CVn: '猎犬', CMa: '大犬', CMi: '小犬', Cap: '摩羯', Car: '船底', Cas: '仙后',
  Cen: '半人马', Cep: '仙王', Cet: '鲸鱼', Cha: '蝘蜓', Cir: '圆规', Col: '天鸽',
  Com: '后发', CrA: '南冕', CrB: '北冕', Crv: '乌鸦', Crt: '巨爵', Cru: '南十字',
  Cyg: '天鹅', Del: '海豚', Dor: '剑鱼', Dra: '天龙', Equ: '小马', Eri: '波江',
  For: '天炉', Gem: '双子', Gru: '天鹤', Her: '武仙', Hor: '时钟', Hya: '长蛇',
  Hyi: '水蛇', Ind: '印第安', Lac: '蝎虎', Leo: '狮子', LMi: '小狮', Lep: '天兔',
  Lib: '天秤', Lup: '豺狼', Lyn: '天猫', Lyr: '天琴', Men: '山案', Mic: '显微镜',
  Mon: '麒麟', Mus: '苍蝇', Nor: '矩尺', Oct: '南极', Oph: '蛇夫', Ori: '猎户',
  Pav: '孔雀', Peg: '飞马', Per: '英仙', Phe: '凤凰', Pic: '绘架', Psc: '双鱼',
  PsA: '南鱼', Pup: '船尾', Pyx: '罗盘', Ret: '网罟', Sge: '天箭', Sgr: '人马',
  Sco: '天蝎', Scl: '玉夫', Sct: '盾牌', Ser: '巨蛇', Sex: '六分仪', Tau: '金牛',
  Tel: '望远镜', Tri: '三角', TrA: '南三角', Tuc: '杜鹃', UMa: '大熊', UMi: '小熊',
  Vel: '船帆', Vir: '处女', Vol: '飞鱼', Vul: '狐狸',
}

/**
 * 根据 catalogStarId 查找星星信息
 */
function findStar(catalogStarId: number): CatalogStar | undefined {
  return starsData.find((s) => s.id === catalogStarId)
}

/**
 * GET /api/catalog/stars/:catalogStarId/chat/figures
 * 获取可选古人列表
 */
router.get('/:catalogStarId/chat/figures', (req: Request, res: Response) => {
  const catalogStarId = parseInt(req.params.catalogStarId, 10)
  if (isNaN(catalogStarId)) {
    badRequest(res, '无效的恒星 ID')
    return
  }

  const star = findStar(catalogStarId)
  const figures = getPublicFigures()

  ok(res, '获取古人列表成功', {
    figures,
    star: star
      ? {
          name: star.name,
          constellation: CON_NAMES[star.con] || star.con,
          magnitude: star.mag,
        }
      : null,
  })
})

/**
 * POST /api/catalog/stars/:catalogStarId/chat
 * SSE 流式聊天
 */
router.post('/:catalogStarId/chat', async (req: Request, res: Response) => {
  const catalogStarId = parseInt(req.params.catalogStarId, 10)
  if (isNaN(catalogStarId)) {
    badRequest(res, '无效的恒星 ID')
    return
  }

  const { figureId, message, history } = req.body
  if (!figureId || !message) {
    badRequest(res, '缺少必填参数：figureId 和 message')
    return
  }

  if (typeof message !== 'string' || message.trim().length === 0) {
    badRequest(res, '消息不能为空')
    return
  }

  if (message.length > 500) {
    badRequest(res, '消息过长，最多 500 字')
    return
  }

  // 构建星星上下文
  const star = findStar(catalogStarId)
  const starContext = star
    ? {
        starName: star.name || `恒星 #${catalogStarId}`,
        constellation: CON_NAMES[star.con] || star.con,
        magnitude: star.mag,
        distance: star.dist,
      }
    : { starName: `恒星 #${catalogStarId}`, constellation: '' }

  await streamChat(res, figureId, message.trim(), history || [], starContext)
})

export default router