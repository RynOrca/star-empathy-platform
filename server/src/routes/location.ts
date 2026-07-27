import { Router, Request, Response } from 'express'
import { ok, badRequest, serverError } from '../utils/response'

const router = Router()

// GET /api/location/ip — IP 定位（无 Key 免费，宽松额度）
// 仅作为建议/参考，不保证精度
router.get('/ip', async (req: Request, res: Response) => {
  try {
    const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim()
      || req.socket.remoteAddress
      || ''

    const resp = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(clientIp)}?lang=zh-CN&fields=status,country,regionName,city,lat,lon,query`,
      { headers: { 'User-Agent': 'StarLanguageDome/1.0' } },
    )
    const data = await resp.json() as {
      status: string; country: string; regionName: string
      city: string; lat: number; lon: number; query: string
    }

    if (data.status !== 'success') {
      const fallback = await fetch(
        'http://ip-api.com/json/?lang=zh-CN&fields=status,country,regionName,city,lat,lon',
        { headers: { 'User-Agent': 'StarLanguageDome/1.0' } },
      )
      const fbData = await fallback.json() as {
        status: string; country: string; regionName: string
        city: string; lat: number; lon: number; query?: string
      }
      if (fbData.status !== 'success') return badRequest(res, 'IP 定位失败')
      return ok(res, 'ok', {
        ip: fbData.query || '', country: fbData.country,
        region: fbData.regionName, city: fbData.city,
        lat: fbData.lat, lng: fbData.lon,
      })
    }

    ok(res, 'ok', {
      ip: data.query, country: data.country,
      region: data.regionName, city: data.city,
      lat: data.lat, lng: data.lon,
    })
  } catch (e: any) {
    serverError(res, `IP 定位失败: ${e.message}`)
  }
})

// GET /api/location/reverse?lat=&lng= — 反向地理编码代理
// 使用 BigDataCloud（免费、无 Key、连通性好）将经纬度转为城市名
// 仅用于显示城市名 toast，不影响天球旋转的坐标精度
router.get('/reverse', async (req: Request, res: Response) => {
  const lat = req.query.lat
  const lng = req.query.lng
  if (lat == null || lng == null) {
    return badRequest(res, '缺少 lat/lng 参数')
  }

  // 主方案：BigDataCloud（免费，无 Key 要求，每日大量配额）
  try {
    const resp = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(String(lat))}&longitude=${encodeURIComponent(String(lng))}&localityLanguage=zh`,
      { signal: AbortSignal.timeout(5000) },
    )
    const data = await resp.json() as {
      city?: string; principalSubdivision?: string; countryName?: string
    }
    if (data.city) {
      return ok(res, 'ok', { city: data.city })
    }
    // 没有 city 字段，返回省份
    if (data.principalSubdivision) {
      return ok(res, 'ok', { city: data.principalSubdivision })
    }
  } catch {
    // BigDataCloud 失败，走备选
  }

  // 备选：Nominatim（OpenStreetMap）
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}&zoom=10&accept-language=zh`,
      {
        headers: {
          'User-Agent': 'StarLanguageDome/1.0',
          'Accept-Language': 'zh-CN,zh;q=0.9',
        },
        signal: AbortSignal.timeout(5000),
      },
    )
    const data = await resp.json() as { address?: Record<string, string> }
    const addr = data.address || {}
    const city = addr.city || addr.town || addr.county || addr.state || addr.province || ''
    if (city) return ok(res, 'ok', { city })
  } catch {
    // 都失败，返回空
  }

  // 都不行 → 不返回 IP 猜测的城市（避免误导）
  ok(res, 'ok', { city: '' })
})

export default router
