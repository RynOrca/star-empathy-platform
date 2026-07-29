/**
 * moonSvg — SVG 月相路径生成工具
 *
 * 用于 7 天日程小图标（44×44），用 SVG path + radialGradient 模拟月相
 *
 * 视觉增强：
 *   - 亮面 radialGradient：中心暖白 → 边缘冷暗，模拟球体立体感
 *   - 暗面 radialGradient：中心深蓝微光 → 边缘全暗，模拟 earthshine（地球反照）
 *   - 外圈柔和光晕：亮面周围微弱辉光
 *   - 细描边：增强月球边缘清晰度
 *
 * phaseAngle 语义（astronomy-engine MoonPhase）：
 *   0=新月, 90=上弦, 180=满月, 270=下弦
 *
 * 算法：
 *   - 月相圆心 (22,22)，半径 18
 *   - 明暗分界线是椭圆，rx = |cos(phaseAngle)| * r
 *   - waxing（0~180）：亮面在右
 *     - 0~90 蛾眉月：亮面 < 半圆，椭圆向右凸（sweep=0）
 *     - 90~180 盈凸月：亮面 > 半圆，椭圆向左凸（sweep=1）
 *   - waning（180~360）：亮面在左
 *     - 180~270 亏凸月：亮面 > 半圆，椭圆向右凸（sweep=0）
 *     - 270~360 残月：亮面 < 半圆，椭圆向左凸（sweep=1）
 */

const VIEW_BOX = 44
const CENTER = 22
const RADIUS = 18

/**
 * 生成月相亮面 SVG path（视图框 0 0 44 44）
 * @param phaseAngle 0-360°
 * @returns SVG path data 字符串，新月返回空串（不绘制亮面）
 */
export function moonSvgPath(
  phaseAngle: number,
  cx: number = CENTER,
  cy: number = CENTER,
  r: number = RADIUS,
): string {
  // 归一化到 0-360
  const angle = ((phaseAngle % 360) + 360) % 360

  // 椭圆 x 半径（明暗分界线宽度）
  const rx = Math.abs(Math.cos(angle * Math.PI / 180)) * r

  // 判断亮面方向
  const isWaxing = angle <= 180

  // 特殊情况：rx 极小（新月或满月附近，分界线退化为直径）
  if (Math.abs(rx) < 0.3) {
    if (angle < 90 || angle > 270) {
      // 新月：全暗，亮面 path 为空
      return ''
    }
    // 满月：全亮，画整圆
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`
  }

  // 一般情况：半圆 + 椭圆弧
  if (isWaxing) {
    // 上半月：亮面在右
    const sweep = angle < 90 ? 0 : 1
    return [
      `M ${cx} ${cy - r}`,
      `A ${r} ${r} 0 0 1 ${cx} ${cy + r}`,
      `A ${rx} ${r} 0 0 ${sweep} ${cx} ${cy - r}`,
      'Z',
    ].join(' ')
  }
  // 下半月：亮面在左
  const sweep = angle < 270 ? 0 : 1
  return [
    `M ${cx} ${cy - r}`,
    `A ${r} ${r} 0 0 0 ${cx} ${cy + r}`,
    `A ${rx} ${r} 0 0 ${sweep} ${cx} ${cy - r}`,
    'Z',
  ].join(' ')
}

/**
 * 生成月相 SVG 完整字符串（含暗面背景、亮面、光晕、描边）
 * @param phaseAngle 0-360°
 * @param size 图标尺寸（默认 44）
 * @returns 完整 SVG 字符串
 */
export function moonSvg(phaseAngle: number, size: number = 44): string {
  // 唯一 id 后缀，避免多个 SVG 的 gradient 定义冲突
  const id = Math.round(phaseAngle * 10)
  const litPath = moonSvgPath(phaseAngle)
  const litPathEl = litPath ? `<path d="${litPath}" fill="url(#lit-${id})" />` : ''

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${VIEW_BOX} ${VIEW_BOX}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="lit-${id}" cx="42%" cy="38%" r="62%">
      <stop offset="0%" stop-color="#fff8dc" />
      <stop offset="55%" stop-color="#f0e6c8" />
      <stop offset="100%" stop-color="#b89868" />
    </radialGradient>
    <radialGradient id="dark-${id}" cx="50%" cy="50%" r="58%">
      <stop offset="0%" stop-color="#1c2548" />
      <stop offset="65%" stop-color="#0a0e20" />
      <stop offset="100%" stop-color="#04060e" />
    </radialGradient>
    <radialGradient id="glow-${id}" cx="50%" cy="50%" r="50%">
      <stop offset="60%" stop-color="#f0e6c8" stop-opacity="0" />
      <stop offset="82%" stop-color="#f0e6c8" stop-opacity="0.14" />
      <stop offset="100%" stop-color="#f0e6c8" stop-opacity="0" />
    </radialGradient>
  </defs>
  <circle cx="${CENTER}" cy="${CENTER}" r="${RADIUS + 3}" fill="url(#glow-${id})" />
  <circle cx="${CENTER}" cy="${CENTER}" r="${RADIUS}" fill="url(#dark-${id})" />
  ${litPathEl}
  <circle cx="${CENTER}" cy="${CENTER}" r="${RADIUS}" fill="none" stroke="rgba(200,180,140,0.18)" stroke-width="0.6" />
</svg>`
}
