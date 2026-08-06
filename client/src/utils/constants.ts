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

// ═══ 行星特写模式（closeup） ═══
// 物理直径比例下小天体（水星/月球等）盘面亚像素，通过相机距离补偿让用户能"不断放大"看表面
// 状态机：IDLE → TWEENING → CLOSEUP → EXITING → IDLE
// 安全不变式：near 平面、Halo 可见性、wheel 语义必须与状态严格一致
export const CLOSEUP_FOV = 30              // 特写模式固定 FOV（视觉舒适、不畸变）
export const CLOSEUP_INIT_RATIO = 50       // 初始距离 = size × 50（盘面占比 ~7.5%，舒服观察）
export const CLOSEUP_MIN_RATIO = 3         // 最近距离 = size × 3（盘面占比 ~124%，沉浸表面）
export const CLOSEUP_MAX_RATIO = 80        // 最远距离 = size × 80（超过则退出特写回天球）
export const CLOSEUP_NEAR = 0.001          // 特写模式 near 平面（小天体 dist < 0.5 需要）
export const DEFAULT_NEAR = 0.5            // 默认 near 平面（IDLE 恢复用）
export const CLOSEUP_WHEEL_FACTOR = 0.88   // 滚轮每步拉近系数（向上 = ×0.88，约 12% 步进）

// 邻星连线
export const NEARBY_LINE_COUNT = 4
export const NEARBY_LINE_THRESHOLD = 80 // 距离阈值

// ═══ 天镜览星模式 ═══
/** 热门故事阈值：resonanceCount >= HOT_THRESHOLD 判为 isHot */
export const HOT_THRESHOLD = 100
/** 相机模式缩放层级对应的 FOV 值（度） */
export const CAMERA_FOV_BY_STAGE: Record<number, number> = {
  1: 75,
  2: 60,
  3: 45,
  4: 35,
}
/** 相机模式飞行动画时长（ms） */
export const CAMERA_FLY_DURATION_MS = 670
/** 取景框星过滤节流间隔（ms） */
export const CAMERA_FRAME_THROTTLE_MS = 400
/** 取景框列表最大显示项数 */
export const CAMERA_LIST_MAX_ITEMS = 50

