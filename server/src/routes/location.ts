import { Router, Request, Response } from 'express'
import { ok, badRequest, serverError } from '../utils/response'
import { getAmapKey } from '../services/amap'

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
// 主方案：高德地图（国内覆盖最全、响应最快），备选：BigDataCloud + Nominatim
// 仅用于显示城市名 toast，不影响天球旋转的坐标精度
router.get('/reverse', async (req: Request, res: Response) => {
  const lat = req.query.lat
  const lng = req.query.lng
  if (lat == null || lng == null) {
    return badRequest(res, '缺少 lat/lng 参数')
  }
  console.log(`[location] reverse 请求: lat=${lat}, lng=${lng}`)

  // 主方案：高德地图（国内精确到区县，响应 <100ms）
  const amapKey = getAmapKey()
  if (amapKey) {
    try {
      const url = `https://restapi.amap.com/v3/geocode/regeo?key=${encodeURIComponent(amapKey)}&location=${encodeURIComponent(String(lng))},${encodeURIComponent(String(lat))}&output=JSON`
      console.log('[location] 高德请求:', url.replace(amapKey, '***'))
      const resp = await fetch(url, { signal: AbortSignal.timeout(3000) })
      const data = await resp.json() as {
        status: string; info?: string; regeocode?: {
          addressComponent?: {
            city?: string | string[]; province?: string; district?: string; township?: string
          }
        }
      }
      console.log('[location] 高德响应 status:', data.status, 'info:', data.info)
      if (data.status === '1' && data.regeocode?.addressComponent) {
        const ac = data.regeocode.addressComponent
        const city = typeof ac.city === 'string' ? ac.city : (Array.isArray(ac.city) ? ac.city[0] : '')
        // 直辖市 city 可能为 []，依次取 district / province
        const result = city || ac.district || ac.province || ac.township || ''
        console.log('[location] 高德结果:', { city, district: ac.district, province: ac.province, result })
        if (result) return ok(res, 'ok', { city: result })
      } else {
        console.log('[location] 高德失败:', data.info || 'status 非 1')
      }
    } catch (e: any) {
      console.log('[location] 高德异常:', e.message)
    }
  } else {
    console.log('[location] 无高德 Key，跳过')
  }

  // 备选 1：BigDataCloud（免费，无 Key 要求，每日大量配额）
  try {
    console.log('[location] 尝试 BigDataCloud...')
    const resp = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(String(lat))}&longitude=${encodeURIComponent(String(lng))}&localityLanguage=zh`,
      { signal: AbortSignal.timeout(5000) },
    )
    const data = await resp.json() as {
      city?: string; principalSubdivision?: string; countryName?: string
    }
    console.log('[location] BigDataCloud 结果:', { city: data.city, subdivision: data.principalSubdivision })
    if (data.city) {
      return ok(res, 'ok', { city: data.city })
    }
    if (data.principalSubdivision) {
      return ok(res, 'ok', { city: data.principalSubdivision })
    }
  } catch (e: any) {
    console.log('[location] BigDataCloud 异常:', e.message)
  }

  // 备选 2：Nominatim（OpenStreetMap）
  try {
    console.log('[location] 尝试 Nominatim...')
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
    console.log('[location] Nominatim 结果:', { city, addr: Object.keys(addr) })
    if (city) return ok(res, 'ok', { city })
  } catch (e: any) {
    console.log('[location] Nominatim 异常:', e.message)
  }

  // 都不行 → 不返回 IP 猜测的城市（避免误导）
  console.log('[location] 所有方案均失败，返回空城市')
  ok(res, 'ok', { city: '' })
})

export default router
