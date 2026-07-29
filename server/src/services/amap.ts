/**
 * 高德地图 API Key 管理
 * 运行时 Key 优先级高于环境变量 AMAP_KEY
 * 持久化到 .runtime-amap-key 文件
 */

import fs from 'node:fs'
import path from 'node:path'

function resolveKeyFilePath(): string {
  const candidates = [
    path.resolve(process.cwd(), '.runtime-amap-key'),
    path.resolve(__dirname, '../../.runtime-amap-key'),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return candidates[0]
}

const KEY_FILE = resolveKeyFilePath()

let runtimeAmapKey: string | null = null

// 启动时从文件恢复
try {
  if (fs.existsSync(KEY_FILE)) {
    runtimeAmapKey = fs.readFileSync(KEY_FILE, 'utf-8').trim()
    console.log(`🗺️  已从文件加载高德 Key (${KEY_FILE})`)
  }
} catch { /* ignore */ }

if (process.env.AMAP_KEY) {
  console.log('🗺️  检测到环境变量 AMAP_KEY')
}

export function setAmapKey(key: string | null) {
  runtimeAmapKey = key
  try {
    if (key) {
      fs.writeFileSync(KEY_FILE, key, 'utf-8')
    } else if (fs.existsSync(KEY_FILE)) {
      fs.unlinkSync(KEY_FILE)
    }
  } catch { /* ignore */ }
}

/** 获取高德 API Key：运行时 > 环境变量 */
export function getAmapKey(): string | null {
  return runtimeAmapKey || process.env.AMAP_KEY || null
}