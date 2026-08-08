import { defineComponent, h } from 'vue'

/** 通用 SVG props */
const svgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 1.8,
  'stroke-linecap': 'round' as const,
  'stroke-linejoin': 'round' as const,
}

/** Aperture — 相机光圈（天镜览星入口/EXIT） */
export const ApertureIcon = defineComponent({
  name: 'ApertureIcon',
  setup(_, { attrs }) {
    return () => h('svg', { ...svgProps, width: 18, height: 18, ...attrs }, [
      h('circle', { cx: 12, cy: 12, r: 10 }),
      h('line', { x1: 14.31, y1: 8, x2: 20.05, y2: 17.94 }),
      h('line', { x1: 9.69, y1: 8, x2: 21.17, y2: 8 }),
      h('line', { x1: 7.38, y1: 12, x2: 13.12, y2: 2.06 }),
      h('line', { x1: 9.69, y1: 16, x2: 3.95, y2: 6.06 }),
      h('line', { x1: 14.31, y1: 16, x2: 2.83, y2: 16 }),
      h('line', { x1: 16.62, y1: 12, x2: 10.88, y2: 21.94 }),
    ])
  },
})

/** ChevronLeft — 返回 */
export const ChevronLeftIcon = defineComponent({
  name: 'ChevronLeftIcon',
  setup(_, { attrs }) {
    return () => h('svg', { ...svgProps, width: 20, height: 20, ...attrs }, [
      h('polyline', { points: '15 18 9 12 15 6' }),
    ])
  },
})

/** Close — 关闭 */
export const CloseIcon = defineComponent({
  name: 'CloseIcon',
  setup(_, { attrs }) {
    return () => h('svg', { ...svgProps, width: 20, height: 20, ...attrs }, [
      h('line', { x1: 18, y1: 6, x2: 6, y2: 18 }),
      h('line', { x1: 6, y1: 6, x2: 18, y2: 18 }),
    ])
  },
})

/** BookOpen — 列表 header */
export const BookOpenIcon = defineComponent({
  name: 'BookOpenIcon',
  setup(_, { attrs }) {
    return () => h('svg', { ...svgProps, width: 16, height: 16, ...attrs }, [
      h('path', { d: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z' }),
      h('path', { d: 'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z' }),
    ])
  },
})

/** Sparkles — 新发/NEW */
export const SparklesIcon = defineComponent({
  name: 'SparklesIcon',
  setup(_, { attrs }) {
    return () => h('svg', { ...svgProps, width: 14, height: 14, ...attrs }, [
      h('path', { d: 'M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z' }),
      h('path', { d: 'M5 3v4M19 17v4M3 5h4M17 19h4' }),
    ])
  },
})

/** Flame — 热门/HOT */
export const FlameIcon = defineComponent({
  name: 'FlameIcon',
  setup(_, { attrs }) {
    return () => h('svg', { ...svgProps, width: 14, height: 14, ...attrs }, [
      h('path', { d: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z' }),
    ])
  },
})

/** MapPin — 附近 */
export const MapPinIcon = defineComponent({
  name: 'MapPinIcon',
  setup(_, { attrs }) {
    return () => h('svg', { ...svgProps, width: 14, height: 14, ...attrs }, [
      h('path', { d: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z' }),
      h('circle', { cx: 12, cy: 10, r: 3 }),
    ])
  },
})

/** Scroll — 古人 */
export const ScrollIcon = defineComponent({
  name: 'ScrollIcon',
  setup(_, { attrs }) {
    return () => h('svg', { ...svgProps, width: 14, height: 14, ...attrs }, [
      h('path', { d: 'M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4' }),
      h('path', { d: 'M19 17V5a2 2 0 0 0-2-2H4' }),
    ])
  },
})

/** Heart — 共鸣 */
export const HeartIcon = defineComponent({
  name: 'HeartIcon',
  setup(_, { attrs }) {
    return () => h('svg', { ...svgProps, width: 14, height: 14, ...attrs }, [
      h('path', { d: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' }),
    ])
  },
})

/** Eye — 浏览 */
export const EyeIcon = defineComponent({
  name: 'EyeIcon',
  setup(_, { attrs }) {
    return () => h('svg', { ...svgProps, width: 14, height: 14, ...attrs }, [
      h('path', { d: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' }),
      h('circle', { cx: 12, cy: 12, r: 3 }),
    ])
  },
})

/** Compass — RA 坐标 */
export const CompassIcon = defineComponent({
  name: 'CompassIcon',
  setup(_, { attrs }) {
    return () => h('svg', { ...svgProps, width: 14, height: 14, ...attrs }, [
      h('circle', { cx: 12, cy: 12, r: 10 }),
      h('polygon', { points: '16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76' }),
    ])
  },
})

/** Clock — 时间 */
export const ClockIcon = defineComponent({
  name: 'ClockIcon',
  setup(_, { attrs }) {
    return () => h('svg', { ...svgProps, width: 14, height: 14, ...attrs }, [
      h('circle', { cx: 12, cy: 12, r: 10 }),
      h('polyline', { points: '12 6 12 12 16 14' }),
    ])
  },
})

/** Crosshair — 取景框中心十字 */
export const CrosshairIcon = defineComponent({
  name: 'CrosshairIcon',
  setup(_, { attrs }) {
    return () => h('svg', { ...svgProps, width: 24, height: 24, ...attrs }, [
      h('circle', { cx: 12, cy: 12, r: 10 }),
      h('line', { x1: 12, y1: 2, x2: 12, y2: 6 }),
      h('line', { x1: 12, y1: 18, x2: 12, y2: 22 }),
      h('line', { x1: 2, y1: 12, x2: 6, y2: 12 }),
      h('line', { x1: 18, y1: 12, x2: 22, y2: 12 }),
    ])
  },
})

/** Telescope — 观星（gazing） */
export const TelescopeIcon = defineComponent({
  name: 'TelescopeIcon',
  setup(_, { attrs }) {
    return () => h('svg', { ...svgProps, width: 14, height: 14, ...attrs }, [
      h('path', { d: 'M3 8l11-4 2 5L5 13z' }),
      h('path', { d: 'M7 13l-2 7' }),
      h('path', { d: 'M11 11l1 4 4 2' }),
      h('circle', { cx: '6', cy: '20', r: '1' }),
    ])
  },
})

/** MessageCircle — 听语（listening） */
export const MessageCircleIcon = defineComponent({
  name: 'MessageCircleIcon',
  setup(_, { attrs }) {
    return () => h('svg', { ...svgProps, width: 14, height: 14, ...attrs }, [
      h('path', { d: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z' }),
    ])
  },
})

/** ChevronRight — 翻页右箭头 */
export const ChevronRightIcon = defineComponent({
  name: 'ChevronRightIcon',
  setup(_, { attrs }) {
    return () => h('svg', { ...svgProps, width: 14, height: 14, ...attrs }, [
      h('polyline', { points: '9 18 15 12 9 6' }),
    ])
  },
})

/** Gallery — 画廊标题图标（四宫格） */
export const GalleryIcon = defineComponent({
  name: 'GalleryIcon',
  setup(_, { attrs }) {
    return () => h('svg', { ...svgProps, width: 14, height: 14, ...attrs }, [
      h('rect', { x: 3, y: 3, width: 7, height: 7, rx: 1 }),
      h('rect', { x: 14, y: 3, width: 7, height: 7, rx: 1 }),
      h('rect', { x: 3, y: 14, width: 7, height: 7, rx: 1 }),
      h('rect', { x: 14, y: 14, width: 7, height: 7, rx: 1 }),
    ])
  },
})

/** User — 用户心声 */
export const UserIcon = defineComponent({
  name: 'UserIcon',
  setup(_, { attrs }) {
    return () => h('svg', { ...svgProps, width: 12, height: 12, ...attrs }, [
      h('path', { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }),
      h('circle', { cx: 12, cy: 7, r: 4 }),
    ])
  },
})

/** Zoom — 视场控制（放大镜） */
export const ZoomIcon = defineComponent({
  name: 'ZoomIcon',
  setup(_, { attrs }) {
    return () => h('svg', { ...svgProps, width: 14, height: 14, ...attrs }, [
      h('circle', { cx: 11, cy: 11, r: 7 }),
      h('line', { x1: 21, y1: 21, x2: '16.65', y2: '16.65' }),
      h('line', { x1: 11, y1: 8, x2: 11, y2: 14 }),
      h('line', { x1: 8, y1: 11, x2: 14, y2: 11 }),
    ])
  },
})
