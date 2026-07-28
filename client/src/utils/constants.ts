import type { Color } from 'three'

// 天球
export const SPHERE_RADIUS = 500
export const BACKGROUND_STAR_COUNT = 2000

// 相机
// FOV_MIN=8 允许放大到行星附近（"上帝视角"），解决行星点击区域过小问题
// 8° FOV 在 R=490 天球上相当于放大 7.5 倍，水星(半径1.0)在屏幕上放大到可点击尺寸
export const DEFAULT_FOV = 60
export const FOV_MIN = 8
export const FOV_MAX = 75
export const FOV_ZOOM_STEP = 1.5
export const BREATHING_AMPLITUDE = 2
export const BREATHING_PERIOD = 8 // 秒

// 星星外观
export const STAR_SIZES = {
  history: 3.5,
  user: 3.0,
  highResonance: 4.0,
  highResonanceHistory: 4.5,
}

// 颜色来自 star-empathy-platform.html
export const STAR_COLORS = {
  history: '#ffd98a',    // 暖金 — story-dot
  user: '#86a8ff',       // 星蓝 — user-dot
  highResonance: '#95f0c0', // 翠绿 — green dot
  highResonanceHistory: '#ffffff', // 亮白
} as const

// 高共鸣阈值
export const HIGH_RESONANCE_THRESHOLD = 50

// Raycaster
export const RAYCASTER_THRESHOLD = 8

// 邻星连线
export const NEARBY_LINE_COUNT = 4
export const NEARBY_LINE_THRESHOLD = 80 // 距离阈值
