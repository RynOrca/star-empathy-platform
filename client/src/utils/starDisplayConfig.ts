/**
 * 星空显示可定制化配置（issue #34）
 *
 * 设计目标：
 * - 集中管理所有「星星显示 / 星座连线 / tooltip 交互」的可调参数
 * - 上层组件可在运行时覆盖任意子字段，无需修改 useSky 内部代码
 * - 默认值经过调优，符合 Stellarium 默认 + 项目暗夜风格
 *
 * 使用方式：
 *   import { STAR_DISPLAY_CONFIG, type StarDisplayConfig } from '@/utils/starDisplayConfig'
 *   const cfg = { ...STAR_DISPLAY_CONFIG, hoverThreshold: 0.003 }
 *   useSky(canvas, { displayConfig: cfg, ... })
 *
 * 物理依据与参考：
 * - hover 阈值 0.003（屏幕归一化平方距离）≈ 55px 半径 @ 1080p，比原 0.0015(~37px) 更宽松
 *   参考 Stellarium 的 hover 容差逻辑：以屏幕像素半径换算，而非世界坐标
 * - tooltip Y 偏移 -50（世界单位）：CSS2DObject 自动投影，无需 CSS margin
 * - 星座连线淡入系数 0.15：约 6 帧（100ms）达到 80% 目标，符合人眼感知阈值
 */

export interface StarDisplayConfig {
  /** hover 检测阈值（屏幕归一化平方距离，越小越严格） */
  hoverThreshold: number
  /** hover 检测节流间隔（毫秒） */
  hoverThrottleMs: number
  /** 长悬浮触发延时（毫秒） */
  hoverLongDelayMs: number

  /** tooltip 字体大小（px） */
  tooltipFontSize: number
  /** tooltip 名称字体大小（px） */
  tooltipNameFontSize: number
  /** tooltip 背景色（CSS rgba） */
  tooltipBgColor: string
  /** tooltip 文字色（CSS） */
  tooltipTextColor: string
  /** tooltip 名称色（CSS，亮星） */
  tooltipNameColor: string
  /** 亮星名称光晕阈值（视星等 ≤ 此值时加 textShadow） */
  brightStarThreshold: number

  /** 星座连线默认目标 opacity（hover 时） */
  constellationOpacity: number
  /** 星座连线 glow 层相对 main 的不透明度比例 */
  constellationGlowRatio: number
  /** 星座连线淡入淡出 lerp 系数（每帧） */
  constellationLerpFactor: number
  /** 星座标签 hover 时 opacity */
  constellationLabelOpacity: number
  /** 是否默认显示所有星座连线（true=全部常驻显示；false=仅 hover 显示） */
  showAllConstellations: boolean
  /** 全部常驻显示时的连线 opacity */
  constellationIdleOpacity: number

  /** 星座连线主色（hex） */
  constellationLineColor: number
  /** 星座连线 glow 色（hex，暖金） */
  constellationGlowColor: number
  /** 星座连线宽度（像素，仅 LineMaterial 支持） */
  constellationLineWidth: number
  /** 星座连线 glow 宽度（像素） */
  constellationGlowWidth: number
  /** 星座标签色（CSS rgba） */
  constellationLabelColor: string

  /** 星名标注：视角中心阈值（度），星星偏离视角中心小于此角度时显示名称 */
  nameLabelFovDeg: number
  /** 星名标注字体大小（px） */
  nameLabelFontSize: number
  /** 星名标注颜色（CSS rgba） */
  nameLabelColor: string
  /** 星名标注：相对星星锚点的屏幕像素偏移（负值=上方，正值=下方） */
  nameLabelOffsetPx: number
  /** tooltip：相对星星锚点的屏幕像素偏移（负值=上方，正值=下方） */
  tooltipOffsetPx: number
}

export const STAR_DISPLAY_CONFIG: StarDisplayConfig = {
  hoverThreshold: 0.003,
  hoverThrottleMs: 80,
  hoverLongDelayMs: 1000,

  tooltipFontSize: 11,
  tooltipNameFontSize: 13,
  tooltipBgColor: 'rgba(12,12,28,0.92)',
  tooltipTextColor: '#c8c2d8',
  tooltipNameColor: '#ffd98a',
  brightStarThreshold: 1.5,

  constellationOpacity: 0.28,
  constellationGlowRatio: 0.43,
  constellationLerpFactor: 0.15,
  constellationLabelOpacity: 0.8,
  showAllConstellations: false,
  constellationIdleOpacity: 0.12,

  constellationLineColor: 0x4a5a88,
  constellationGlowColor: 0xffd98a,
  constellationLineWidth: 2.0,
  constellationGlowWidth: 1,
  constellationLabelColor: 'rgba(140,160,220,0.85)',

  nameLabelFovDeg: 15,
  nameLabelFontSize: 10,
  nameLabelColor: 'rgba(255,217,138,0.7)',
  nameLabelOffsetPx: -12,
  tooltipOffsetPx: -8,
}

/**
 * 根据相机缩放层级（1~4）返回气泡显示档位
 * Ⅰ (1): zoom < 1.8 → 仅星名 + 关键词（size-s）
 * Ⅱ (2): 1.8 ≤ zoom < 2.6 → 短句摘要（size-m）
 * Ⅲ (3): 2.6 ≤ zoom < 3.4 → 完整摘要 + meta（size-l）
 * Ⅳ (4): zoom ≥ 3.4 → 完整摘要 + meta + 高亮（size-l + active）
 */
export function getZoomStage(zoomLevel: number): 1 | 2 | 3 | 4 {
  if (zoomLevel < 1.8) return 1
  if (zoomLevel < 2.6) return 2
  if (zoomLevel < 3.4) return 3
  return 4
}
