import {
  Scene, PerspectiveCamera, WebGLRenderer,
  Points, BufferGeometry, BufferAttribute, PointsMaterial, CanvasTexture,
  Line, LineBasicMaterial, LineDashedMaterial, LineSegments,
  AdditiveBlending, Color, Mesh, MeshBasicMaterial, MeshPhongMaterial,
  SphereGeometry, RingGeometry, BackSide, DoubleSide, RepeatWrapping,
  Raycaster, Vector2, Sprite, SpriteMaterial, Vector3, Group, AmbientLight, Matrix4,
  TextureLoader, PointLight, ShaderMaterial, LoadingManager,
  Quaternion, Euler,
  ACESFilmicToneMapping,
  InstancedMesh, Object3D,
} from 'three'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import {
  IcosahedronGeometry,
} from 'three'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
// 后处理：EffectComposer + UnrealBloomPass + OutputPass（自动 ACES 色调映射 + sRGB 输出）
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js'
import { SPHERE_RADIUS, DEFAULT_FOV, FOV_MIN, FOV_MAX, CLOSEUP_FOV, CLOSEUP_INIT_RATIO, CLOSEUP_MIN_RATIO, CLOSEUP_MAX_RATIO, CLOSEUP_NEAR, DEFAULT_NEAR, CLOSEUP_WHEEL_FACTOR } from '../utils/constants'
import { STAR_DISPLAY_CONFIG, type StarDisplayConfig } from '../utils/starDisplayConfig'
import { dateToJD, lstDeg, orientationEuler, eclipticToRaDecJD, getAsteroidPosition, getAsteroidPositionSync } from '../utils/astro'
// 阶段 3 P2：小行星 + 流星雨 + GPU 检测
import { ASTEROIDS } from '../data/asteroids'
import { getActiveShowers, type MeteorShower } from '../data/meteorShowers'
import { detectGPU, getRenderParams } from '../utils/gpuDetect'
// [DISABLED 2026-07-28] 彗星系统已禁用（用户反馈不需要），保留文件以备未来恢复
// import { COMETS, getCometPositionSync, cometTailDirection, type CometElement } from '../data/comets'

// ─── 星表 ───
interface CatStar { id: number; name: string | null; ra: number; dec: number; mag: number; color: string; con: string; x: number; y: number; z: number }
interface CatData { stars: CatStar[] }
// 星座数据结构（外接 constellations.json，按星座分组，规范化星空知识）
interface ConstellationData {
  name: string         // 中文名（如"大熊座"）
  nameEn: string       // 英文名（如"Ursa Major"）
  labelPos: number[] | null  // 标签 3D 位置 [x,y,z]，南天部分星座无标签
  lines: [number, number][]  // 基于星体ID的连线对
}
import rawCatalog from '../data/stars.json'
import constellationsDataRaw from '../data/constellations.json'
const CAT = rawCatalog as unknown as CatData
const constellationsData = constellationsDataRaw as unknown as Record<string, ConstellationData>

const hexRGB = (h: string): [number, number, number] =>
  [parseInt(h.slice(1,3),16)/255, parseInt(h.slice(3,5),16)/255, parseInt(h.slice(5,7),16)/255]

function glowTex(inner: string, sz: number): CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = sz
  const ctx = c.getContext('2d')!, h = sz/2
  const g = ctx.createRadialGradient(h,h,h*0.02, h,h,h)
  g.addColorStop(0, inner); g.addColorStop(0.2, inner); g.addColorStop(1, 'transparent')
  ctx.fillStyle = g; ctx.fillRect(0, 0, sz, sz)
  return new CanvasTexture(c)
}

function bloomTex(color: string, sz: number): CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = sz
  const ctx = c.getContext('2d')!, h = sz/2
  const g = ctx.createRadialGradient(h,h,0, h,h,h)
  g.addColorStop(0, color)
  g.addColorStop(0.15, color)
  g.addColorStop(0.4, 'rgba(255,225,160,0.3)')
  g.addColorStop(0.7, 'rgba(255,225,160,0.08)')
  g.addColorStop(1, 'transparent')
  ctx.fillStyle = g; ctx.fillRect(0, 0, sz, sz)
  return new CanvasTexture(c)
}

// 纯白径向渐变纹理：供行星 hover 光晕使用
// 与恒星 bloomTex（暖金底色）不同，纯白底色让 SpriteMaterial.color tint 完全决定最终颜色
// 灰色系行星（水星 0x999999 / 月球 0xcccccc）在暖金纹理上会变暗淡，纯白纹理保持本色
function whiteBloomTex(sz: number): CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = sz
  const ctx = c.getContext('2d')!, h = sz/2
  const g = ctx.createRadialGradient(h,h,0, h,h,h)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.15, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.4, 'rgba(255,255,255,0.3)')
  g.addColorStop(0.7, 'rgba(255,255,255,0.08)')
  g.addColorStop(1, 'transparent')
  ctx.fillStyle = g; ctx.fillRect(0, 0, sz, sz)
  return new CanvasTexture(c)
}

// P0-5：亮星十字光芒纹理（diffraction spikes）
// 中心一个亮点 + 水平/垂直两条渐变细线，模拟折射光斑
// 配合 AdditiveBlending + BloomPass 形成真实的"星芒"
function spikeTex(sz: number): CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = sz
  const ctx = c.getContext('2d')!, h = sz / 2
  // 水平 spike（中间宽两端窄的渐变）
  const gradH = ctx.createLinearGradient(0, h, sz, h)
  gradH.addColorStop(0, 'transparent')
  gradH.addColorStop(0.45, 'rgba(255,255,255,0.45)')
  gradH.addColorStop(0.5, 'rgba(255,255,255,1)')
  gradH.addColorStop(0.55, 'rgba(255,255,255,0.45)')
  gradH.addColorStop(1, 'transparent')
  ctx.fillStyle = gradH
  ctx.fillRect(0, h - 1, sz, 2)
  // 垂直 spike
  const gradV = ctx.createLinearGradient(h, 0, h, sz)
  gradV.addColorStop(0, 'transparent')
  gradV.addColorStop(0.45, 'rgba(255,255,255,0.45)')
  gradV.addColorStop(0.5, 'rgba(255,255,255,1)')
  gradV.addColorStop(0.55, 'rgba(255,255,255,0.45)')
  gradV.addColorStop(1, 'transparent')
  ctx.fillStyle = gradV
  ctx.fillRect(h - 1, 0, 2, sz)
  // 中心亮点（避免十字中间空）
  const cg = ctx.createRadialGradient(h, h, 0, h, h, h * 0.25)
  cg.addColorStop(0, 'rgba(255,255,255,1)')
  cg.addColorStop(0.6, 'rgba(255,255,255,0.5)')
  cg.addColorStop(1, 'transparent')
  ctx.fillStyle = cg
  ctx.fillRect(0, 0, sz, sz)
  return new CanvasTexture(c)
}

// ─── OPT-23：Split-timing tween 缓动函数（参考 celestiary/web camera.js + Stellarium StelMovementMgr） ───
// 三通道使用不同 easing 以制造"先转头、再拉近、最后定焦"的层次感
// 旋转用 cubic：转向需要明确启停
// FOV 用 quart：放大感到末段最快，制造"拉近"高潮
// 位移用 quint：位移量最大，中段速度最高、首尾最缓，避免晕眩
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}
function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4)
}
function easeInOutQuint(t: number): number {
  return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2
}

// RA(时)/Dec(°) → 天球 3D
const D2R = Math.PI / 180
function raDecXYZ(raH: number, decD: number, R: number) {
  const ra = raH / 24 * Math.PI * 2, dec = decD * D2R, cd = Math.cos(dec)
  return { x: R * cd * Math.cos(ra), y: R * Math.sin(dec), z: -R * cd * Math.sin(ra) }
}

// ─── GMST 计算（Meeus 公式，精度 <0.1s） ───
function gmstHours(date: Date): number {
  const jd = date.getTime() / 86400000 + 2440587.5
  const jd0 = Math.floor(jd - 0.5) + 0.5
  const T = (jd0 - 2451545.0) / 36525.0
  const gmst0 = 6.697374558 + 0.06570982441908 * (jd0 - 2451545.0) + 0.000025930 * T * T - 0.0000000018 * T * T * T
  const ut = (jd - jd0) * 24
  return ((gmst0 + ut * 1.002737909350795) % 24 + 24) % 24
}

// ─── 黄道坐标 → 赤道坐标 (ε = 23.44°) ───
const OBLIQUITY = 23.44 * D2R
function eclipticToRaDec(lonDeg: number): { ra: number; dec: number } {
  const λ = lonDeg * D2R
  const ra = Math.atan2(Math.sin(λ) * Math.cos(OBLIQUITY), Math.cos(λ))
  const dec = Math.asin(Math.sin(λ) * Math.sin(OBLIQUITY))
  return { ra: (ra + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2) * 24, dec: dec / D2R }
}

// ─── 银河坐标 → 赤道坐标 ───
// 北银极: RA=12h51.4m, Dec=+27.13°
// 银心方向: RA=17h45.6m, Dec=-28.94°
// 银经零点在银心方向
const NGP_RA = (12 + 51.4/60) / 24 * Math.PI * 2
const NGP_DEC = 27.13 * D2R
function galacticToRaDec(lonDeg: number): { ra: number; dec: number } {
  const l = lonDeg * D2R
  // 简化：沿银道面 (银纬 b=0) 计算赤道坐标
  // 银道面法向量 = 北银极方向
  const pole = { x: Math.cos(NGP_DEC) * Math.cos(NGP_RA), y: Math.sin(NGP_DEC), z: Math.cos(NGP_DEC) * Math.sin(NGP_RA) }
  // 银心方向 (l=0)
  const gcRA = (17 + 45.6/60) / 24 * Math.PI * 2
  const gcDec = -28.94 * D2R
  const gc = { x: Math.cos(gcDec) * Math.cos(gcRA), y: Math.sin(gcDec), z: Math.cos(gcDec) * Math.sin(gcRA) }
  // 银经 0 的方向 = 银心方向投影到银道面
  // 简化：直接用球面旋转
  const cosL = Math.cos(l), sinL = Math.sin(l)
  // 垂直于银心在银道面上的向量 = pole × gc
  const perp = {
    x: pole.y * gc.z - pole.z * gc.y,
    y: pole.z * gc.x - pole.x * gc.z,
    z: pole.x * gc.y - pole.y * gc.x,
  }
  const plen = Math.sqrt(perp.x**2 + perp.y**2 + perp.z**2)
  perp.x /= plen; perp.y /= plen; perp.z /= plen
  // 银道面上银经 l 的方向
  const dir = {
    x: gc.x * cosL + perp.x * sinL,
    y: gc.y * cosL + perp.y * sinL,
    z: gc.z * cosL + perp.z * sinL,
  }
  const dlen = Math.sqrt(dir.x**2 + dir.y**2 + dir.z**2)
  const dec = Math.asin(dir.y / dlen) / D2R
  const ra = (Math.atan2(dir.z, dir.x) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2) * 24
  return { ra, dec }
}

// 生成带状银河 ribbon（三角形扇形）
function milkyWayRibbon(R: number, width: number, segs = 360): { verts: number[]; indices: number[] } {
  const verts: number[] = [], indices: number[] = []
  for (let i = 0; i <= segs; i++) {
    const { ra, dec } = galacticToRaDec(i / segs * 360)
    const p = raDecXYZ(ra, dec, R)
    // 法向量 = 从球心指向外
    const nlen = Math.sqrt(p.x**2 + p.y**2 + p.z**2)
    const nx = p.x / nlen, ny = p.y / nlen, nz = p.z / nlen
    // 内圈 R-width/2, 外圈 R+width/2
    verts.push(
      p.x - nx * width/2, p.y - ny * width/2, p.z - nz * width/2,  // 内
      p.x + nx * width/2, p.y + ny * width/2, p.z + nz * width/2,  // 外
    )
    if (i < segs) {
      const j = i * 2
      indices.push(j, j+1, j+2,  j+1, j+3, j+2)
    }
  }
  return { verts, indices }
}

// ═══════════════════════════════════════════
export interface ObserverLoc { lat: number; lon: number }

// issue #134：准星吸附目标（区分恒星/行星）
export type SnapTarget =
  | { type: 'star'; starId: number }
  | { type: 'planet'; planetName: string; planetNameCN: string; planetId: number }

export interface SkyAPI {
  camera: PerspectiveCamera
  zoomIn: () => void
  zoomOut: () => void
  dispose: () => void
  setObserver: (obs: ObserverLoc | null) => void
  setStarStatsCache: (cache: Map<number, { stories: number; resonance: number; views: number; favorites: number }>) => void
  updateHorizonRotation: (lat: number | undefined, lng: number | undefined) => void
  /** 绕世界 X 轴旋转天球（弧度），正角 = 右手定则 */
  rotateX: (rad: number) => void
  /** 绕世界 Y 轴旋转天球（弧度），正角 = 右手定则（向东转） */
  rotateY: (rad: number) => void
  /** 绕世界 Z 轴旋转天球（弧度），正角 = 右手定则 */
  rotateZ: (rad: number) => void
  /** 天球回到默认朝向（北极星正上方，春分点正右） */
  resetRotation: () => void
  /**
   * 统一旋转入口 — 一次性绕 X/Y/Z 三轴旋转天球（含黄道、银河、行星等全部子元素）
   * 顺序：先绕 X，再绕 Y，最后绕 Z（本地坐标系累积）
   * @param radX 绕 X 轴弧度（东西轴，正角=北极星向南倒，对应纬度）
   * @param radY 绕 Y 轴弧度（天极轴，正角=星星东升西落，对应地方恒星时）
   * @param radZ 绕 Z 轴弧度（前后轴，正角=北极星向右倒，较少使用）
   */
  rotate: (radX: number, radY: number, radZ: number) => void
  /**
   * 设置天球绝对旋转（覆盖当前旋转，不是叠加）
   * @param radX 绕 X 轴弧度
   * @param radY 绕 Y 轴弧度
   * @param radZ 绕 Z 轴弧度
   */
  setRotation: (radX: number, radY: number, radZ: number) => void
  /**
   * 根据观测者经纬度+UTC时间，自动旋转天球到正确天文位置
   *
   * 公式: M = Rx(90°−lat) · Ry(π/2 − LST)
   *   - NCP/北极星: 高度角=lat, 方位角=北
   *   - 春分点: LST=0°时在子午线, LST=90°时在西点, LST=270°时在东点
   *   - 恒星: 东升西落（LST 增加 → 恒星向西移动）
   *
   * @param latDeg 观测者纬度（度）
   * @param lonDeg 观测者经度（度）
   * @param date UTC 日期时间（默认当前时刻）
   */
  applyAstroRotation: (latDeg: number, lonDeg: number, date?: Date) => void
  /** 设置内核连线（搜索结果星之间的连线） */
  setKernelLines: (lines: { from: { x: number; y: number; z: number }; to: { x: number; y: number; z: number } }[]) => void
  /** 平滑将相机焦点移动到指定恒星（带动画） */
  focusOnStar: (x: number, y: number, z: number) => void
  /** 平滑将相机焦点移动到指定行星（按 bodyName 查当前位置），进入特写模式 */
  focusOnPlanet: (bodyName: string) => void
  /** 退出特写模式，飞回原点（关闭详情面板时调用） */
  exitCloseup: () => void
  /** 高亮指定恒星位置（短暂 2s） */
  highlightStar: (x: number, y: number, z: number) => void
  /** 设置时间加速倍率（1=真实时间，100=加速 100 倍） */
  setTimeScale: (scale: number) => void
  /** 获取当前时间倍率 */
  getTimeScale: () => number
  /** OPT-28：切换标签显示（沉浸模式），返回切换后状态 */
  toggleLabels: () => boolean
  /** issue #34：切换所有星座连线常驻显示，返回切换后状态 */
  toggleConstellations: () => boolean
  /** issue #34：更新星空显示配置（部分覆盖） */
  updateDisplayConfig: (patch: Partial<StarDisplayConfig>) => void
  /** issue #124：主动释放准星吸附（未吸附时为 no-op） */
  releaseSnap: () => void
}

export function useSky(
  canvas: HTMLCanvasElement,
  options?: {
    onStarClick?: (starId: number) => void
    onStarHover?: (starId: number | null) => void
    onStarHoverLong?: (starId: number | null) => void
    onPlanetClick?: (name: string, nameCN: string, planetId: number) => void
    /** issue #134：准星吸附状态变化通知（吸附目标对象，null 表示脱吸附） */
    onSnapChange?: (target: SnapTarget | null) => void
    observerLat?: number
    observerLng?: number
    /** 星空显示配置（issue #34）：覆盖默认 STAR_DISPLAY_CONFIG 的任意字段 */
    displayConfig?: Partial<StarDisplayConfig>
  }
): SkyAPI {
  // 合并默认配置与外部覆盖（issue #34：可定制化调整）
  const cfg: StarDisplayConfig = { ...STAR_DISPLAY_CONFIG, ...(options?.displayConfig ?? {}) }
  const scene = new Scene()

  // 用于统一移除所有事件监听器（dispose 时一次性 abort）
  const abortController = new AbortController()
  // 标志位：异步加载（如行星模块）在 dispose 后应提前返回，避免泄漏
  let disposed = false

  // ═══ 天球组（用于地平旋转） ═══
  const skyGroup = new Group()
  scene.add(skyGroup)

  // OPT-19：降低主环境光强度（0.5 → 0.12），让 sunLight(PointLight) 照亮的昼侧
  // 与背光夜侧形成明显对比，呈现行星昼夜分界线（terminator）效果
  // 注意：PointsMaterial/MeshBasicMaterial 不受光照影响，恒星/太阳/星座连线不受影响
  // 行星夜侧由 skyGroup 内 AmbientLight(0x223355, 0.18) 提供微弱冷蓝补光
  scene.add(new AmbientLight(0xffffff, 0.12))

  const planetMeshes: Mesh[] = []

  // ═══ 行星实时位置更新器（参考 NASA Eyes / Stellarium：每帧重算位置） ═══
  // astronomy-engine Equator() 单次 ~50-100μs，9 颗行星 × 60fps ≈ 3-5% CPU，可接受
  // 闭包缓存 AE 模块避免重复动态 import；planetUpdaters 存 tiltGroup 引用 + body 名
  type PlanetUpdater = { tiltGroup: Group; bodyName: string; mesh: Mesh; haloSprite?: Sprite; color: number; size: number }
  const planetUpdaters: PlanetUpdater[] = []
  // ═══ 特写状态机（closeup） ═══
  // IDLE: 自由浏览天球，相机在原点，near=DEFAULT_NEAR
  // TWEENING: focusOnPlanet 飞行中（1.2s），不可被拖拽中断后继续 CLOSEUP
  // CLOSEUP: 特写模式，每帧跟随行星，wheel 调 dist
  // EXITING: exitCloseup 飞回原点（1.2s），完成恢复 near/halo
  // 安全不变式：near 平面、Halo 可见性、wheel 语义必须与状态严格一致
  let closeupState: 'IDLE' | 'TWEENING' | 'CLOSEUP' | 'EXITING' = 'IDLE'
  let closeupTarget: { updater: PlanetUpdater; dist: number; haloSprite: Sprite | null; size: number } | null = null
  // closeup 跟随复用 Vector3（避免每帧 new，animate 循环高频调用）
  const _closeupWorld = new Vector3()
  const _closeupDir = new Vector3()
  // 行星视星等缓存（每 1s 更新一次，避免每帧调 Illumination API）
  let lastMagUpdate = 0
  // 伽利略卫星（木卫 1-4）Sprite 引用，每帧更新位置
  const moonSprites: Sprite[] = []
  // OPT-26：行星标签 LOD 收集器
  // 每项记录标签 DOM 包装（CSS2DObject）+ 跟随的父对象（tiltGroup 或 sprite）+ 是否为主要标签（Sun/Moon/行星=true，卫星/彗星=false）
  // 在 animate 循环中按相机距离阈值切换 visible，降低 CSS2DRenderer DOM 操作开销
  type LabelLODItem = { label: CSS2DObject; parent: Object3D; isMajor: boolean }
  const labelLODItems: LabelLODItem[] = []
  // 土星环更新器：每帧重算 uSunDirWorld / uPlanetCenter（世界坐标系）
  // P1 优化：从 local-space 改为 world-space，支持 HG 前向散射 + Blinn-Phong 冰粒高光
  // 参考 celestiary/web PR #58 — world-space 计算更自然，避免逆矩阵变换
  type RingUpdater = { ringMat: ShaderMaterial; tiltGroup: Group }
  const ringUpdaters: RingUpdater[] = []
  // OPT-16：土星环阴影投射到行星表面（参考 celestiary/web PR #58 onBeforeCompile 注入）
  // 仅土星启用，注入到 MeshPhongMaterial，不替换为 ShaderMaterial 以保留 OPT-13 双模材质行为
  // 每帧更新 uniforms：uSunWorldPos / uRingCenterWorld / uRingNormalWorld
  type SaturnShadowUpdater = {
    mat: MeshPhongMaterial
    uSunWorldPos: { value: Vector3 }
    uRingCenterWorld: { value: Vector3 }
    uRingNormalWorld: { value: Vector3 }
    tiltGroup: Group
  }
  const saturnShadowUpdaters: SaturnShadowUpdater[] = []
  // OPT-9 大气层更新器：每帧重算 uSunDirWorld（太阳方向，世界坐标系）
  // 仅 High/Medium tier 启用 Physical-Lite shader 时注册
  type AtmosphereUpdater = { atmoMat: ShaderMaterial; planetName: string }
  const atmosphereUpdaters: AtmosphereUpdater[] = []
  // 小行星 InstancedMesh 引用，每帧更新位置（实时模拟运动）
  // [DISABLED 2026-07-27] 用户反馈小行星带效果不佳，暂时禁用
  // let asteroidInst: InstancedMesh | null = null
  // const asteroidDummy = new Object3D()
  // [DISABLED 2026-07-28] 彗星系统已禁用，保留代码以备未来恢复
  // OPT-10 彗星更新器：每帧重算位置 + 拖尾方向（参考 axisrow/open-solar-system 粒子拖尾）
  // 彗星偏心率高，位置变化显著，必须每帧重算
  // type CometUpdater = {
  //   nucleus: Mesh           // 彗核（小型 IcosahedronGeometry，bloom 友好）
  //   tail: Points            // 拖尾（Points + 自定义 shader，沿反太阳方向衰减）
  //   tailMat: ShaderMaterial  // 拖尾材质引用（更新 uTime/uFade）
  //   comet: CometElement      // 轨道根数
  //   // 拖尾顶点位置数组（弧度坐标缓存，避免每帧 new）
  //   tailPositions: Float32Array
  //   tailAlphas: Float32Array
  // }
  // const cometUpdaters: CometUpdater[] = []
  // 复用对象，避免每帧 new 导致 GC 压力（行星/卫星/土星环/彗星更新共用）
  const _reusedObserver = { latitude: 0, longitude: 0, height: 0 } as unknown as import('astronomy-engine').Observer
  const _reusedSunDir = new Vector3()
  // P1 修复：土星环 world-space 计算所需的临时向量（避免每帧 new Vector3）
  // skyGroup 会被 applyAstroRotation 旋转，必须用 getWorldPosition 获取世界坐标
  const _reusedSunWorld = new Vector3()
  const _reusedRingWorld = new Vector3()
  // OPT-14：彗星拖尾末端位置复用（避免每帧 new Vector3）
  const _reusedTailEnd = new Vector3()
  // OPT-26：标签距离 LOD 复用向量（避免每帧 new Vector3）
  const _lodVec = new Vector3()
  // 星名标注：角度计算复用向量
  const _camDir = new Vector3()
  const _starDir = new Vector3()
  // OPT-30：旋转矩阵复用（避免用户拖拽时高频 new Matrix4 导致 GC 压力）
  // 用于 rotateX/Y/Z/rotate/setRotation 方法，makeRotation* 会重置矩阵为单位+旋转
  const _rotMat = new Matrix4()
  let _reusedMoonVec: import('astronomy-engine').Vector | null = null
  let AE: typeof import('astronomy-engine') | null = null
  let bodyMapRef: Record<string, string> | null = null
  let observerForPlanets: { lat: number; lng: number } | null = null
  // 太阳光源位置（每帧跟随太阳 tiltGroup 更新）
  let sunLightRef: PointLight | null = null
  // OPT-2：太阳表面颗粒 ShaderMaterial 引用（仅 high/medium tier 启用，每帧更新 uTime）
  // low/fallback 保留 MeshBasicMaterial 静态贴图，避免移动端 GPU 压力
  let sunSurfaceMat: ShaderMaterial | null = null
  // 模拟时间倍率（1=实时；可外部设为加速倍率用于演示）
  let timeScale = 1
  // OPT-14：太阳赤道坐标缓存（太阳 RA/Dec 每天变化 <1°，无需每帧重算）
  // 缓存策略：每 60 帧（约 1s）更新一次，timeScale>100 时每帧更新（加速时太阳位置变化快）
  let _sunRaCache = 0
  let _sunDecCache = 0
  let _sunCacheFrame = -999
  // 模拟时间（毫秒），按 timeScale 累积；初始为真实时间
  let simTimeMs = Date.now()

  const camera = new PerspectiveCamera(DEFAULT_FOV, canvas.clientWidth/canvas.clientHeight, 0.5, SPHERE_RADIUS*3)
  camera.position.set(0,0,0)

  // ═══ GPU 能力检测（必须在 WebGLRenderer 创建之前，决定 antialias/DPR） ═══
  // 静默自适应：根据用户/部署端机器的 GPU 能力自动分级，无需手动配置
  // OPT-29：提前到 renderer 创建前，使 antialias/maxDpr 可按 tier 配置
  // 参考 zakky8/web-optimization discussion #1（2026-06-01）：移动端 1.5× 是甜点
  // 参考 owensweet/atmoxhere（2026-05-26）：MSAA + DPR 3 在手机上 = 36 次每像素 shader = 发热元凶
  const gpuCap = detectGPU()  // 不传 canvas，让 detect 内部创建临时 canvas 避免上下文冲突
  const renderParams = getRenderParams(gpuCap.tier)
  // 共享 dpr 变量，避免 uDpr uniform 与 setPixelRatio 不一致
  const dpr = Math.min(window.devicePixelRatio || 1, renderParams.maxDpr)

  // OPT-29：antialias 仅 high tier 启用（星点 Points 不需要 MSAA）
  // powerPreference: 'high-performance' 是 free 收益（参考 owensweet/atmoxhere）
  const renderer = new WebGLRenderer({
    canvas,
    antialias: renderParams.antialias,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setSize(canvas.clientWidth, canvas.clientHeight)
  renderer.setPixelRatio(dpr)
  renderer.setClearColor(new Color('#070816'))
  // OPT-22：禁止浏览器默认触摸手势（滚动/pinch 缩放页面），让 pointer 事件完整接管
  canvas.style.touchAction = 'none'
  // P0-1: ACES Filmic 色调映射，让色彩更电影感（亮部不死白，暗部有细节）
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0

  // ═══ 后处理管线：Bloom + Vignette + ACES 输出 ═══
  // UnrealBloomPass：让所有发光物体（星星、太阳、银河）自动获得真实辉光
  // VignetteShader：暗角效果，让画面更聚焦
  // OutputPass：自动应用 ACES + sRGB 转换（无需手动设 outputColorSpace）
  // GPU 分级：high/medium 启用 bloom，low/fallback 关闭以保 FPS
  const composer = new EffectComposer(renderer)
  composer.setSize(canvas.clientWidth, canvas.clientHeight)
  composer.setPixelRatio(dpr)
  composer.addPass(new RenderPass(scene, camera))
  // OPT-12 selective bloom：threshold 0.6 让只有高亮度物体（太阳核心、亮星）触发强 bloom
  // 参考 N3rson/Solar-System-3D（threshold 0.85），实测 0.6 兼顾梦幻星空感与锐利行星
  // 太阳颗粒 shader emissive 输出 > 1.0 必触发；行星 MeshPhongMaterial 输出 < 0.6 不触发
  const bloomPass = renderParams.bloom ? new UnrealBloomPass(
    new Vector2(canvas.clientWidth, canvas.clientHeight),
    0.65,   // strength：辉光强度
    0.6,    // radius：辉光扩散半径
    0.6,    // threshold：阈值 0.6（selective bloom，参考 N3rson 0.85 降至 0.6 保星空梦幻感）
  ) : null
  if (bloomPass) composer.addPass(bloomPass)
  const vignettePass = renderParams.vignette ? new ShaderPass(VignetteShader) : null
  if (vignettePass) {
    vignettePass.uniforms.offset.value = 0.95
    vignettePass.uniforms.darkness.value = 1.05
    composer.addPass(vignettePass)
  }
  composer.addPass(new OutputPass())

  // ═══ CSS2D 标签渲染器 ═══
  const labelRenderer = new CSS2DRenderer()
  labelRenderer.setSize(canvas.clientWidth, canvas.clientHeight)
  const lrEl = labelRenderer.domElement
  lrEl.style.position = 'absolute'
  lrEl.style.top = '0'
  lrEl.style.left = '0'
  lrEl.style.pointerEvents = 'none'
  lrEl.style.zIndex = '10'
  canvas.parentElement?.appendChild(lrEl)

  const stars = CAT.stars; const n = stars.length
const starById = new Map<number, CatStar>()
for (const s of stars) starById.set(s.id, s)

  // ═══ 星星分层 ═══
  // 按视星等分 6 个 tier，每 tier 用独立 Points 渲染（不同 size 的星点纹理）
  // 物理依据：亮星视圆面较大，大气湍流在视圆面上被部分平均（Dravins et al. 1997/1998）
  const tiers = [
    { maxMag: -0.5, size: 11 },
    { maxMag:  0.5, size: 8 },
    { maxMag:  1.8, size: 6 },
    { maxMag:  3.0, size: 4 },
    { maxMag:  4.5, size: 2.8 },
    { maxMag: 99,    size: 1.8 },
  ]
  const bins = tiers.map(() => ({ pos: [] as number[], col: [] as number[] }))
  const tierStarIds: number[][] = tiers.map(() => [])
  for (let i = 0; i < n; i++) {
    const s = stars[i]; const [r,g,b] = hexRGB(s.color)
    for (let t = 0; t < tiers.length; t++) {
      if (s.mag <= tiers[t].maxMag) { bins[t].pos.push(s.x,s.y,s.z); bins[t].col.push(r,g,b); tierStarIds[t].push(s.id); break }
    }
  }
  const texCache = new Map<number, CanvasTexture>()
  const starPointsRefs: Points[] = []
  for (let t = 0; t < tiers.length; t++) {
    const b = bins[t]; if (b.pos.length === 0) continue
    const sz = tiers[t].size
    if (!texCache.has(sz)) texCache.set(sz, glowTex('white', sz <= 3 ? 32 : 48))
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(b.pos), 3))
    g.setAttribute('color', new BufferAttribute(new Float32Array(b.col), 3))
    const tierMat = new PointsMaterial({
      size: sz, map: texCache.get(sz)!, blending: AdditiveBlending,
      depthWrite: false, depthTest: true, transparent: true, vertexColors: true, sizeAttenuation: true,
    })
    const pts = new Points(g, tierMat)
    pts.userData.tierIndex = t
    starPointsRefs.push(pts)
    skyGroup.add(pts)
  }

  // ═══ P0-5：亮星十字光芒（diffraction spikes） ═══
  // 所有 6 层星星叠加十字光芒，按视星等分配强弱
  // - 亮星 spike 大且亮，暗星 spike 小且淡，形成自然的亮度梯度
  // - 用独立的 Points 层 + spike 纹理 + AdditiveBlending，配合 Bloom 形成真实星芒
  // - 颜色继承自原星色（vertexColors 与白 spike 相乘）
  const SPIKE_TEX = spikeTex(128)
  const spikeTiers = [
    { tier: 0, size: 48, opacity: 1.00 },  // mag <= -0.5  天狼、老人等极亮星
    { tier: 1, size: 36, opacity: 0.85 },  // mag <=  0.5  织女、五车二等亮星
    { tier: 2, size: 26, opacity: 0.65 },  // mag <=  1.8  1 等左右星
    { tier: 3, size: 18, opacity: 0.45 },  // mag <=  3.0  2~3 等星
    { tier: 4, size: 12, opacity: 0.28 },  // mag <=  4.5  3~4.5 等星
    { tier: 5, size:  8, opacity: 0.14 },  // mag <=   99  暗星，微弱光晕
  ]
  for (const cfg of spikeTiers) {
    const b = bins[cfg.tier]; if (b.pos.length === 0) continue
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(b.pos), 3))
    g.setAttribute('color', new BufferAttribute(new Float32Array(b.col), 3))
    const spikeMat = new PointsMaterial({
      size: cfg.size, map: SPIKE_TEX, blending: AdditiveBlending,
      depthWrite: false, depthTest: true, transparent: true,
      vertexColors: true, sizeAttenuation: true, opacity: cfg.opacity,
    })
    const pts = new Points(g, spikeMat)
    pts.renderOrder = 5  // 在普通星点之上、UI 元素之下
    skyGroup.add(pts)
  }

  // ═══ 星名标注：靠近视角中心时显示名称 ═══
  const starNameLabels = new Map<number, CSS2DObject>()
  const starNameOpacities = new Map<number, number>() // 当前 opacity（帧间 lerp）
  {
    const namedStars = stars.filter(s => s.name !== null)
    for (const s of namedStars) {
      const inner = document.createElement('div')
      inner.textContent = s.name!.split(' ')[0]
      inner.style.cssText = `
        color: ${cfg.nameLabelColor};
        font-size: ${cfg.nameLabelFontSize}px;
        font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
        text-shadow: 0 0 6px rgba(0,0,0,0.8);
        pointer-events: none;
        white-space: nowrap;
        opacity: 0;
        transform: translateY(calc(-100% + ${cfg.nameLabelOffsetPx}px));
      `
      const el = document.createElement('div')
      el.style.cssText = 'display:flex;justify-content:center'
      el.appendChild(inner)
      const label = new CSS2DObject(el)
      label.position.set(s.x, s.y, s.z)
      label.visible = false
      skyGroup.add(label)
      starNameLabels.set(s.id, label)
      starNameOpacities.set(s.id, 0)
    }
  }

  // ═══ 悬浮高亮辉光（加到 scene，不随 skyGroup 旋转） ═══
  const hoverBloomTex = bloomTex('#ffe5a0', 128)
  const hoverGlow = new Sprite(new SpriteMaterial({
    map: hoverBloomTex,
    blending: AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    transparent: true,
    opacity: 0,
  }))
  hoverGlow.scale.set(10, 10, 1)
  hoverGlow.renderOrder = 100
  hoverGlow.visible = false
  scene.add(hoverGlow)

  // ═══ 行星悬浮辉光（issue #82 补充：行星 hover 淡光晕，与恒星 hoverGlow 对等） ═══
  // 太阳系行星（含日月）悬浮时显示淡光晕表示被选中，色温随行星颜色变化
  // 使用纯白径向渐变纹理（whiteBloomTex），让 SpriteMaterial.color tint 完全决定颜色
  // 暖金纹理 + 灰色 tint 会变暗淡（0x999999 × 暖金 = 暗棕灰），纯白纹理保持行星本色
  const planetHoverBloomTex = whiteBloomTex(128)
  const planetHoverGlow = new Sprite(new SpriteMaterial({
    map: planetHoverBloomTex,
    blending: AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    transparent: true,
    opacity: 0,
  }))
  planetHoverGlow.scale.set(4.5, 4.5, 1)
  planetHoverGlow.renderOrder = 99
  planetHoverGlow.visible = false
  scene.add(planetHoverGlow)
  let planetHoverTargetOpacity = 0
  let planetHoverColor = new Color('#ffe5a0')

  // ═══ 定位高亮辉光（focusOnStar 后短暂高亮 2s） ═══
  const locateHighlightTex = bloomTex('#ffe5a0', 128)
  const locateHighlight = new Sprite(new SpriteMaterial({
    map: locateHighlightTex,
    blending: AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    transparent: true,
    opacity: 0,
  }))
  locateHighlight.scale.set(8, 8, 1)
  locateHighlight.renderOrder = 101
  locateHighlight.visible = false
  scene.add(locateHighlight)
  let locateHighlightUntil = 0
  let locateHighlightPulsePhase = 0

  // ═══ 有故事的星星：呼吸辉光（同款 bloomTex，复用 hoverGlow 的方式） ═══
  const storyGlows: { sprite: Sprite; phase: number; period: number }[] = []
  function updateStoryGlows(cache: Map<number, { stories: number; resonance: number; views: number; favorites: number }>) {
    const existing = new Set<number>()
    for (const sg of storyGlows) existing.add(sg.sprite.userData.starId as number)
    for (const [starId, stats] of cache) {
      if (stats.stories === 0) continue
      if (existing.has(starId)) continue
      const star = starById.get(starId)
      if (!star) continue
      const sp = new Sprite(new SpriteMaterial({
        map: bloomTex('#ffe5a0', 128),
        blending: AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        transparent: true,
        opacity: 0,
      }))
      sp.scale.set(10, 10, 1) // 同 hoverGlow 一样大
      sp.renderOrder = 50
      sp.userData.starId = starId
      sp.position.set(star.x, star.y, star.z)
      skyGroup.add(sp)
      storyGlows.push({
        sprite: sp,
        phase: Math.random() * Math.PI * 2,
        period: 3000 + Math.random() * 2000,
      })
    }
  }

  // ═══ 星座连线（按星座分组，hover 联动淡入淡出） ═══
  // 数据来源：constellations.json（外接数据，按星座分组，基于星名连线）
  // 交互：默认 opacity=0 隐藏，hover 到星座某颗星时淡入该星座连线（issue #34）
  //   - cfg.showAllConstellations=true 时所有连线常驻显示（constellationIdleOpacity）
  //   - cfg.showAllConstellations=false 时仅 hover 显示
  // 性能：仅渲染有连线的星座，opacity lerp 通过 cfg.constellationLerpFactor 配置
  // 设计：使用星体ID进行连线匹配，与 stars.json 索引直接对应，O(1) 查找
  // issue #34：颜色通过 cfg.constellationLineColor / constellationGlowColor 可定制
  const constellationLineGroups = new Map<string, { main: LineSegments2; glow: LineSegments2; targetOpacity: number }>()
  const constellationLabelEls = new Map<string, HTMLDivElement>()
  {
    // 直接通过 ID 获取星星的 3D 位置，无需 name→idx 映射
    function getLineVertex(id: number): { x: number; y: number; z: number } | null {
      if (id == null || id < 0 || id >= n) return null
      const s = stars[id]
      if (!s) return null
      return { x: s.x, y: s.y, z: s.z }
    }

    // 为每个星座创建独立的 LineSegments2（main + glow）
    // LineSegments2 + LineMaterial 支持 lineWidth（像素），解决 WebGL lineWidth=1 限制
    const initialOpacity = cfg.showAllConstellations ? cfg.constellationIdleOpacity : 0
    for (const [abbr, con] of Object.entries(constellationsData)) {
      if (!con.lines.length) continue
      const v: number[] = []
      for (const [a, b] of con.lines) {
        const va = getLineVertex(a), vb = getLineVertex(b)
        if (va && vb) {
          v.push(va.x, va.y, va.z, vb.x, vb.y, vb.z)
        }
      }
      if (!v.length) continue
      // main — 使用 LineSegments2 + LineMaterial（支持像素级 lineWidth）
      const lg = new LineSegmentsGeometry()
      lg.setPositions(v)
      const mainMat = new LineMaterial({
        color: cfg.constellationLineColor,
        linewidth: cfg.constellationLineWidth,
        transparent: true,
        opacity: 0,
        depthTest: true,
        depthWrite: false,
        worldUnits: false,
        alphaToCoverage: true,
        resolution: new Vector2(canvas.clientWidth, canvas.clientHeight),
      })
      const main = new LineSegments2(lg, mainMat)
      skyGroup.add(main)
      // glow — 更宽的金色辉光层
      const lg2 = new LineSegmentsGeometry()
      lg2.setPositions(v.slice())
      const glowMat = new LineMaterial({
        color: cfg.constellationGlowColor,
        linewidth: cfg.constellationGlowWidth,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        worldUnits: false,
        alphaToCoverage: true,
        resolution: new Vector2(canvas.clientWidth, canvas.clientHeight),
      })
      const glow = new LineSegments2(lg2, glowMat)
      skyGroup.add(glow)
      constellationLineGroups.set(abbr, { main, glow, targetOpacity: initialOpacity })
    }
  }

  /**
   * 应用星座连线可见性（根据 showAllConstellations 状态和当前 hover/中心近距星座）
   */
  function applyConstellationVisibility(hoveredCon: string | null) {
    if (cfg.showAllConstellations) {
      for (const [abbr, grp] of constellationLineGroups) {
        grp.targetOpacity = abbr === hoveredCon
          ? cfg.constellationOpacity
          : cfg.constellationIdleOpacity
      }
      for (const [abbr, el] of constellationLabelEls) {
        el.style.opacity = abbr === hoveredCon
          ? String(cfg.constellationLabelOpacity)
          : '0'
      }
    } else {
      if (hoveredCon) {
        for (const [abbr, grp] of constellationLineGroups) {
          grp.targetOpacity = abbr === hoveredCon ? cfg.constellationOpacity : 0
        }
        for (const [abbr, el] of constellationLabelEls) {
          el.style.opacity = abbr === hoveredCon ? String(cfg.constellationLabelOpacity) : '0'
        }
      } else {
        for (const grp of constellationLineGroups.values()) grp.targetOpacity = 0
        for (const el of constellationLabelEls.values()) el.style.opacity = '0'
      }
    }
  }

  // ═══ 内核连线（相似星星） ═══
  const kernelLinesGroup = new Group()
  kernelLinesGroup.visible = false
  skyGroup.add(kernelLinesGroup)

  // ═══ 天赤道 (Dec=0°) ═══
  {
    const v: number[] = []
    for (let i = 0; i <= 360; i++) {
      const p = raDecXYZ(i / 360 * 24, 0, SPHERE_RADIUS)
      v.push(p.x, p.y, p.z)
    }
    const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(new Float32Array(v), 3))
    skyGroup.add(new Line(g, new LineBasicMaterial({ color: 0x335577, transparent: true, opacity: 0.25, depthTest: true, depthWrite: false })))
  }

  // ═══ 黄道 (实线, 当日真黄赤交角, 整圆、下半被地平面挡) ═══
  // [FIX 2026-07-27] LineDashedMaterial → LineBasicMaterial
  //   原因：LineDashedMaterial 的 dashSize 是世界空间单位，相机距离/角度不同时
  //   虚线密度分布不均、相位抖动（参考 three.js LineDashedMaterial 文档 + discourse 讨论）。
  //   改为实线 + 较低 opacity，与 Stellarium 默认实线一致，跨视角视觉稳定。
  let eclipticLine: Line | null = null
  let eclipticRefreshAccum = 0
  {
    const v: number[] = []
    const base: number[] = []
    for (let i = 0; i <= 360; i++) {
      const { ra, dec } = eclipticToRaDecJD(i, new Date())
      const p = raDecXYZ(ra, dec, SPHERE_RADIUS)
      v.push(p.x, p.y, p.z)
      base.push(p.x, p.y, p.z)
    }
    const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(new Float32Array(v), 3))
    g.computeBoundingSphere()
    const mat = new LineBasicMaterial({
      color: 0xcc8844,
      transparent: true,
      opacity: 0.4,
      depthTest: true,
      depthWrite: false,
    })
    const line = new Line(g, mat)
    ;(line.userData as { basePos?: Float32Array }).basePos = new Float32Array(base)
    skyGroup.add(line)
    eclipticLine = line
  }

  // ═══ 真实银河全景贴图（ESO eso0932a，天球内壁，混合方案） ═══
  // ribbon 仍保留作为银心高亮层（在更内层，加性混合）
  // ── 银道坐标 → 赤道坐标的完整 3D 旋转 ──
  // ESO 银河贴图原点是银道坐标系（NGP 在顶边、银心在左边缘、银经向右递增）
  // SphereGeometry 默认 UV 把贴图 +X 映射到 mesh local +X、NGP 映射到 +Y
  // 但项目坐标系 z = -cos(dec)*sin(ra) 是左手系，与 mesh 局部右手系不匹配
  // 解决：水平翻转贴图让 mesh 局部也变左手系，再用 IAU J2000 旋转矩阵对齐
  // 数值来源：M_eq→gal (Berkeley / Green's Spherical Astronomy) 转置 + 坐标系变换 P=(x,z,-y)
  // 验证：银心(RA=17h45.6m, Dec=-28.94°)、NGP(RA=12h51.4m, Dec=+27.13°)、反银心(RA=5h45.6m, Dec=+28.94°) 三点对齐
  {
    const texLoader = new TextureLoader()
    // 使用 JPG 版本（实际存在的资源文件）
    // 天球内壁 opacity=0.45 + AdditiveBlending
    const mwTex = texLoader.load('/textures/skybox/milky_way.jpg')
    mwTex.colorSpace = 'srgb'
    // 水平翻转贴图：让 mesh 局部 +Z 也变左手系（与项目 raDecXYZ 一致）
    mwTex.wrapS = RepeatWrapping
    mwTex.repeat.x = -1
    mwTex.offset.x = 1
    const mwGeo = new SphereGeometry(SPHERE_RADIUS * 0.998, 64, 32)
    const mwMat = new MeshBasicMaterial({
      map: mwTex,
      side: BackSide,
      transparent: true,
      opacity: 0.45,
      blending: AdditiveBlending,
      depthWrite: false,
    })
    const mwMesh = new Mesh(mwGeo, mwMat)
    // IAU J2000 银道→赤道旋转矩阵（已转换到项目 y 向上、z=-sin(ra) 坐标系）
    // 列向量 = mesh 局部 +X/+Y/+Z 在项目赤道系中的目标位置
    //   Col1 (+X, 银心) → 项目赤道系 (-0.054876, -0.483835, 0.873437) → RA=17h45.6m, Dec=-28.94°
    //   Col2 (+Y, NGP)   → 项目赤道系 (-0.86766,  0.455984, 0.198076) → RA=12h51.4m, Dec=+27.13°
    //   Col3 (+Z, l=270°)→ 项目赤道系 (-0.494109,-0.746982,-0.444830) → RA=5h45.6m, Dec=-28.94°
    // Matrix4.set(row0col0, row0col1, row0col2, row0col3, row1col0, ...)
    const galacticToEquatorial = new Matrix4().set(
      -0.054876, -0.86766,  -0.494109, 0,
      -0.483835,  0.455984, -0.746982, 0,
       0.873437,  0.198076, -0.444830, 0,
       0,          0,         0,        1
    )
    mwMesh.setRotationFromMatrix(galacticToEquatorial)
    skyGroup.add(mwMesh)
  }

  // ═══ 银河 ribbon（保留作为银心暖金高亮层） ═══
  {
    const { verts, indices } = milkyWayRibbon(SPHERE_RADIUS, 22, 360)
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(verts), 3))
    g.setIndex(indices)
    g.computeVertexNormals()
    const mwMesh = new Mesh(g, new MeshBasicMaterial({
      color: 0x8bb9ff, transparent: true, opacity: 0.09,
      blending: AdditiveBlending, depthWrite: false, depthTest: true, side: DoubleSide,
    }))
    skyGroup.add(mwMesh)
    // warm-gold inner band (brighter core of the ribbon)
    const core = milkyWayRibbon(SPHERE_RADIUS, 7, 360)
    const cg = new BufferGeometry()
    cg.setAttribute('position', new BufferAttribute(new Float32Array(core.verts), 3))
    cg.setIndex(core.indices)
    skyGroup.add(new Mesh(cg, new MeshBasicMaterial({
      color: 0xffd98a, transparent: true, opacity: 0.10,
      blending: AdditiveBlending, depthWrite: false, depthTest: false, side: DoubleSide,
    })))

    // P1-1：银河多层叠加 + 色调增强
    // 1) 暗云带（dust lane）：在 ribbon 内层加一道深棕红色窄带
    //    模拟银河带中被尘埃遮挡形成的"暗裂缝"，强化亮暗对比
    const dust = milkyWayRibbon(SPHERE_RADIUS * 0.997, 3, 360)
    const dg = new BufferGeometry()
    dg.setAttribute('position', new BufferAttribute(new Float32Array(dust.verts), 3))
    dg.setIndex(dust.indices)
    skyGroup.add(new Mesh(dg, new MeshBasicMaterial({
      color: 0x2a1a0e, transparent: true, opacity: 0.55,
      depthWrite: false, depthTest: true, side: DoubleSide,
    })))
    // 2) 银心方向高亮 sprite：在银心（RA=17h45m, Dec=-28.94°）放一个大范围暖金光晕
    //    让银心区域比旋臂更亮，形成视觉焦点
    const gcRa = (17 + 45.6/60) / 24 * Math.PI * 2
    const gcDec = -28.94 * D2R
    const gcR = SPHERE_RADIUS * 0.99
    const gcx = gcR * Math.cos(gcDec) * Math.cos(gcRa)
    const gcy = gcR * Math.sin(gcDec)
    const gcz = -gcR * Math.cos(gcDec) * Math.sin(gcRa)
    const gcSprite = new Sprite(new SpriteMaterial({
      map: bloomTex('#ffd9a0', 256),
      blending: AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      transparent: true,
      opacity: 0.55,
    }))
    gcSprite.position.set(gcx, gcy, gcz)
    gcSprite.scale.set(180, 180, 1)
    skyGroup.add(gcSprite)
    // 3) 反银心方向（RA=5h45m, Dec=+28.94°）较暗的青蓝微光
    //    让银河带两端有冷暖对比，避免整圈同色
    const agcRa = (5 + 45.6/60) / 24 * Math.PI * 2
    const agcDec = 28.94 * D2R
    const agcx = gcR * Math.cos(agcDec) * Math.cos(agcRa)
    const agcy = gcR * Math.sin(agcDec)
    const agcz = -gcR * Math.cos(agcDec) * Math.sin(agcRa)
    const agcSprite = new Sprite(new SpriteMaterial({
      map: bloomTex('#a0c8ff', 128),
      blending: AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      transparent: true,
      opacity: 0.25,
    }))
    agcSprite.position.set(agcx, agcy, agcz)
    agcSprite.scale.set(100, 100, 1)
    skyGroup.add(agcSprite)
  }

  // ═══ 地平面以下暖色区分 ═══
  {
    const maskGeo = new SphereGeometry(SPHERE_RADIUS * 1.001, 64, 32, 0, Math.PI*2, Math.PI/2, Math.PI/2)
    const maskMat = new MeshBasicMaterial({
      color: 0x2a1e3a,
      transparent: true,
      opacity: 0.65,
      side: BackSide,
      depthWrite: false,
      depthTest: false,
    })
    const mask = new Mesh(maskGeo, maskMat)
    mask.renderOrder = 9999
    scene.add(mask)
  }

  // ═══ 星座名称标签（hover 联动显示，默认隐藏） ═══
  // 数据来源：constellations.json 的 name + labelPos
  // 交互：默认 opacity=0，hover 到星座某颗星时对应标签淡入（与连线联动）
  // issue #34：颜色与 opacity 通过 cfg 可定制
  {
    for (const [abbr, con] of Object.entries(constellationsData)) {
      if (!con.labelPos) continue
      const el = document.createElement('div')
      el.textContent = con.name
      el.style.cssText = [
        `color:${cfg.constellationLabelColor}`,
        'font-family:"Inter","Microsoft YaHei",system-ui,sans-serif',
        'font-size:12px',
        'font-weight:500',
        'letter-spacing:0.15em',
        'white-space:nowrap',
        'pointer-events:none',
        'opacity:0',
        'transition:opacity 0.3s ease',
      ].join(';')
      const label = new CSS2DObject(el)
      label.position.set(con.labelPos[0], con.labelPos[1], con.labelPos[2])
      skyGroup.add(label)
      constellationLabelEls.set(abbr, el)
    }
  }

  // ═══ 东南西北标注（地平坐标，不随 skyGroup 旋转） ═══
  // skyGroup Matrix4 旋转后: +Z=北, -Z=南, +X=西, -X=东
  {
    const cardinals = [
      { text: 'N', sub: '北', x: 0, z: 1 },
      { text: 'S', sub: '南', x: 0, z: -1 },
      { text: 'E', sub: '东', x: -1, z: 0 },
      { text: 'W', sub: '西', x: 1, z: 0 },
    ]
    for (const c of cardinals) {
      const el = document.createElement('div')
      el.textContent = `${c.text} ${c.sub}`
      el.style.cssText = [
        'color:#dd8844',
        'font-family:"Inter","Helvetica Neue",system-ui,sans-serif',
        'font-size:13px',
        'font-weight:400',
        'letter-spacing:0.08em',
        'text-shadow:0 0 12px rgba(221,136,68,0.35), 0 0 30px rgba(7,8,22,0.9)',
        'background:rgba(7,8,22,0.45)',
        'padding:2px 10px',
        'border-radius:12px',
        'border:1px solid rgba(221,136,68,0.18)',
        'backdrop-filter:blur(6px)',
        'white-space:nowrap',
      ].join(';')
      const label = new CSS2DObject(el)
      label.position.set(c.x * SPHERE_RADIUS, 3, c.z * SPHERE_RADIUS)
      scene.add(label)
    }
  }

  // ═══ 悬浮 Tooltip ═══
  const statsCache = new Map<number, { stories: number; resonance: number; views: number; favorites: number }>()

  const tooltipEl = document.createElement('div')
  tooltipEl.className = 'star-tooltip'
  // 偏移在 inner 上，因为 CSS2DRenderer 会覆盖外层 transform
  const tooltipInner = document.createElement('div')
  tooltipInner.className = 'tt-inner'
  tooltipInner.style.setProperty('--tt-offset', `${cfg.tooltipOffsetPx}px`)
  tooltipInner.innerHTML = `
    <div class="tt-name"></div>
    <div class="tt-row">
      <span class="tt-stat" title="故事"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg><em class="tt-val">0</em></span>
      <span class="tt-stat" title="共鸣"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg><em class="tt-val">0</em></span>
    </div>
    <div class="tt-row">
      <span class="tt-stat" title="访问"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg><em class="tt-val">0</em></span>
      <span class="tt-stat" title="收藏"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><em class="tt-val">0</em></span>
    </div>
  `
  tooltipEl.appendChild(tooltipInner)
  // 注入 tooltip 样式（issue #34：字体大小/颜色/背景通过 cfg 可定制）
  // 屏幕空间偏移由 CSS transform: translate(-50%, -100%) 控制，缩放时保持稳定
  const ttStyle = document.createElement('style')
  ttStyle.textContent = `
    .star-tooltip {
      pointer-events:none;
      display:flex; justify-content:center;
    }
    .tt-inner {
      font-family:"Inter","Microsoft YaHei",system-ui,sans-serif;
      font-size:${cfg.tooltipFontSize}px; color:${cfg.tooltipTextColor};
      background:${cfg.tooltipBgColor};
      padding:8px 12px; border-radius:8px;
      border:1px solid rgba(255,255,255,0.06);
      backdrop-filter:blur(8px);
      white-space:nowrap;
      opacity:0; transition:opacity 0.15s;
      line-height:1;
      transform:translateY(calc(-100% + var(--tt-offset, 0px)));
    }
    .star-tooltip .tt-name {
      font-size:${cfg.tooltipNameFontSize}px; font-weight:600;
      color:${cfg.tooltipNameColor}; margin-bottom:6px;
      letter-spacing:0.02em;
    }
    .star-tooltip .tt-row {
      display:flex; gap:10px; margin-bottom:3px;
    }
    .star-tooltip .tt-row:last-child { margin-bottom:0; }
    .star-tooltip .tt-stat {
      display:flex; align-items:center; gap:3px;
      color:#8a849e;
    }
    .star-tooltip .tt-stat svg { opacity:0.7; flex-shrink:0; }
    .star-tooltip .tt-val {
      font-style:normal; font-weight:500;
      color:#b0aacc; min-width:12px;
    }
  `
  document.head.appendChild(ttStyle)
  const tooltipLabel = new CSS2DObject(tooltipEl)
  tooltipLabel.position.set(0, 0, 0)
  scene.add(tooltipLabel)

  // ═══ 点击检测 + 悬浮检测 ═══
  // hoverLongTimer 提升到外层作用域，以便 dispose 能清除未触发的长悬浮回调
  let hoverLongTimer: ReturnType<typeof setTimeout> | null = null
  let hoveredStarId = -1  // 提升到外层作用域，供 animate 中中心近距检测使用

  // ═══ 移动端准星吸附状态（issue #116） ═══
  // 仅在 (max-width: 768px) 启用；PC 完全不进入逻辑分支
  let isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  let crosshairEl: HTMLDivElement | null = null   // 准星 DOM（append 到 document.body）
  let crosshairStyle: HTMLStyleElement | null = null
  let snappedStarId = -1                            // 当前吸附的恒星 ID，-1 = 未吸附恒星
  // issue #134：当前吸附的行星信息（与 snappedStarId 互斥；非 null 表示正吸附在行星上）
  let snappedPlanet: { name: string; nameCN: string; planetId: number } | null = null
  let snapStartX = 0, snapStartY = 0               // 吸附时的指针位置（40px 脱吸附判定）
  let snapBaseFov = 0                               // 吸附前的 FOV（用于恢复）
  let snapFovRafId = 0                              // FOV 动画的 requestAnimationFrame ID
  // 屏幕中心 NDC = (0, 0)；snap 阈值略大于 hover 阈值，便于在密集星区抓住目标
  const SNAP_THRESHOLD = 0.005                      // 吸附范围（NDC 距离平方，缩小一倍）
  const SNAP_RELEASE_PX = 40                        // 脱吸附的指针移动阈值（屏幕像素）
  const SNAP_FOV_DELTA = 4                          // 吸附时 FOV 缩小量（度）
  // issue #134：屏幕中心 NDC 复用向量（避免每帧 new Vector2）
  const _centerNDC = new Vector2(0, 0)

  /**
   * 平滑过渡 camera.fov（issue #116：移动端准星吸附/释放时缩放）
   * 复用文件已有的 easeOutQuart 缓动；新动画会取消进行中的旧动画。
   */
  function animateFov(targetFov: number, durationMs = 300) {
    cancelAnimationFrame(snapFovRafId)
    const startFov = camera.fov
    const startTime = performance.now()
    function step() {
      if (disposed) return
      const t = Math.min(1, (performance.now() - startTime) / durationMs)
      camera.fov = startFov + (targetFov - startFov) * easeOutQuart(t)
      camera.updateProjectionMatrix()
      if (t < 1) snapFovRafId = requestAnimationFrame(step)
    }
    snapFovRafId = requestAnimationFrame(step)
  }

  /** 释放准星吸附：清状态、还原准星视觉、隐藏 tooltip、FOV 缩回 */
  function releaseSnap() {
    if (snappedStarId === -1 && snappedPlanet === null) return
    snappedStarId = -1
    snappedPlanet = null
    if (crosshairEl) crosshairEl.classList.remove('snapped')
    tooltipInner.style.opacity = '0'
    hoverGlowTargetOpacity = 0
    if (snapBaseFov > 0) {
      const targetFov = snapBaseFov
      animateFov(targetFov, 300)
      userFov = targetFov
      snapBaseFov = 0
    }
    // issue #124：通知外部已脱吸附
    options?.onSnapChange?.(null)
  }

  // ═══ 移动端准星 DOM（issue #116） ═══
  // 仅移动端可见；PC 端 display:none，pointer-events:none 不拦截触摸
  crosshairEl = document.createElement('div')
  crosshairEl.className = 'm-crosshair' + (isMobile ? ' visible' : '')
  crosshairEl.innerHTML = `
    <span class="mch-arm mch-tl"></span>
    <span class="mch-arm mch-tr"></span>
    <span class="mch-arm mch-bl"></span>
    <span class="mch-arm mch-br"></span>
  `
  crosshairStyle = document.createElement('style')
  crosshairStyle.textContent = `
    .m-crosshair {
      position: fixed; top: 50%; left: 50%;
      width: 26px; height: 26px;
      margin: -13px 0 0 -13px;
      pointer-events: none; z-index: 50;
      display: none;
      color: rgba(255, 220, 150, 0.5);
    }
    .m-crosshair.visible { display: block; }
    .mch-arm {
      position: absolute;
      width: 8px; height: 1.5px;
      background: currentColor;
      filter: drop-shadow(0 0 3px currentColor);
      transition: transform 0.3s cubic-bezier(.2,.9,.3,1), color 0.2s;
    }
    .mch-tl { top: 1px; left: 1px; transform-origin: 0 50%; transform: rotate(45deg); }
    .mch-tr { top: 1px; right: 1px; transform-origin: 100% 50%; transform: rotate(-45deg); }
    .mch-bl { bottom: 1px; left: 1px; transform-origin: 0 50%; transform: rotate(-45deg); }
    .mch-br { bottom: 1px; right: 1px; transform-origin: 100% 50%; transform: rotate(45deg); }
    /* 吸附时四线段向中心收缩 4px，形成聚焦感 */
    .m-crosshair.snapped .mch-tl { transform: rotate(45deg) translate(4px, 0); }
    .m-crosshair.snapped .mch-tr { transform: rotate(-45deg) translate(-4px, 0); }
    .m-crosshair.snapped .mch-bl { transform: rotate(-45deg) translate(4px, 0); }
    .m-crosshair.snapped .mch-br { transform: rotate(45deg) translate(-4px, 0); }
    @keyframes mch-breathe {
      0%, 100% { color: rgba(255, 220, 150, 0.95); filter: drop-shadow(0 0 8px rgba(255, 220, 150, 0.85)) drop-shadow(0 0 14px rgba(255, 220, 150, 0.4)); }
      50% { color: rgba(202, 167, 255, 0.95); filter: drop-shadow(0 0 8px rgba(202, 167, 255, 0.85)) drop-shadow(0 0 14px rgba(202, 167, 255, 0.4)); }
    }
    .m-crosshair.snapped .mch-arm { animation: mch-breathe 1.6s ease-in-out infinite; }
  `
  document.head.appendChild(crosshairStyle)
  document.body.appendChild(crosshairEl)
  // 响应式：窗口尺寸变化时更新 isMobile 并显示/隐藏准星
  {
    const mql = window.matchMedia('(max-width: 768px)')
    mql.addEventListener('change', () => {
      isMobile = mql.matches
      if (crosshairEl) crosshairEl.classList.toggle('visible', isMobile)
      if (!isMobile) releaseSnap()
    }, { signal: abortController.signal })
  }

  {
    const mouse = new Vector2()
    const _v = new Vector3()
    const _w = new Vector3()
    const DRAG_THRESHOLD = 5
    let clickDrag = false
    let hoverCheckTimer = 0

    // 预计算所有星的归一化位置（用于屏幕投影）
    const allStarNorms: { id: number; nx: number; ny: number; nz: number }[] = []
    const starNormMap = new Map<number, { nx: number; ny: number; nz: number }>()
    for (const s of stars) {
      const len = Math.sqrt(s.x*s.x + s.y*s.y + s.z*s.z)
      if (len > 0) {
        const norm = { id: s.id, nx: s.x/len, ny: s.y/len, nz: s.z/len }
        allStarNorms.push(norm)
        starNormMap.set(s.id, norm)
      }
    }

    // tooltip 内容更新函数（issue #34：使用 cfg 的可定制参数）
    let _lastStatsKey = ''
    function updateTooltipContent(starId: number) {
      const star = starById.get(starId)
      if (!star) return
      const nameEl = tooltipEl.querySelector('.tt-name') as HTMLElement
      const vals = tooltipEl.querySelectorAll('.tt-val') as NodeListOf<HTMLElement>
      const rh = Math.floor(star.ra)
      const rm = Math.floor((star.ra - rh) * 60)
      const ds = star.dec >= 0 ? '+' : '-'
      const dd = Math.floor(Math.abs(star.dec))
      const dm = Math.floor((Math.abs(star.dec) - dd) * 60)
      nameEl.textContent = star.name || `${rh}h${String(rm).padStart(2,'0')}m · ${ds}${dd}°${String(dm).padStart(2,'0')}′`
      // 亮星名称加暖金色光晕（阈值通过 cfg 可定制）
      nameEl.style.textShadow = star.mag <= cfg.brightStarThreshold ? '0 0 8px rgba(255,217,138,0.5)' : 'none'
      const stats = statsCache.get(star.id)
      vals[0].textContent = stats ? String(stats.stories) : '0'
      vals[1].textContent = stats ? String(stats.resonance) : '0'
      vals[2].textContent = stats ? String(stats.views) : '0'
      vals[3].textContent = stats ? String(stats.favorites) : '0'
      _lastStatsKey = `${starId}:${stats?.stories ?? ''}:${stats?.resonance ?? ''}:${stats?.views ?? ''}:${stats?.favorites ?? ''}`
      // tooltip + hoverGlow 位置（通过 skyGroup.matrixWorld 变换到世界坐标）
      // 屏幕空间偏移由 CSS transform: translate(-50%, -100%) 控制，不依赖世界坐标
      const sn = starNormMap.get(starId)
      if (sn) {
        _w.set(sn.nx * SPHERE_RADIUS, sn.ny * SPHERE_RADIUS, sn.nz * SPHERE_RADIUS).applyMatrix4(skyGroup.matrixWorld)
        tooltipLabel.position.set(_w.x, _w.y, _w.z)
        hoverGlow.position.set(_w.x, _w.y, _w.z)
      }
      tooltipInner.style.opacity = '1'
      hoverGlow.visible = true
      hoverGlowTargetOpacity = 0.95
      options?.onStarHover?.(starId)
    }
    // tooltip 位置实时更新（issue #34 修复：skyGroup 旋转时同一颗星的位置会变化）
    function updateTooltipPosition(starId: number) {
      const sn = starNormMap.get(starId)
      if (!sn) return
      _w.set(sn.nx * SPHERE_RADIUS, sn.ny * SPHERE_RADIUS, sn.nz * SPHERE_RADIUS).applyMatrix4(skyGroup.matrixWorld)
      tooltipLabel.position.set(_w.x, _w.y, _w.z)
      hoverGlow.position.set(_w.x, _w.y, _w.z)
    }
    // issue #134：行星吸附 tooltip（移动端准星吸附行星时显示行星名 + 统计清零）
    function updateTooltipContentForPlanet(name: string, nameCN: string) {
      const nameEl = tooltipEl.querySelector('.tt-name') as HTMLElement
      const vals = tooltipEl.querySelectorAll('.tt-val') as NodeListOf<HTMLElement>
      nameEl.textContent = nameCN
      nameEl.style.textShadow = '0 0 8px rgba(255,217,138,0.5)'
      vals[0].textContent = '0'
      vals[1].textContent = '0'
      vals[2].textContent = '0'
      vals[3].textContent = '0'
      _lastStatsKey = `planet:${name}`
      const updater = planetUpdaters.find(u => u.bodyName === name)
      if (updater) {
        const pos = updater.tiltGroup.position
        _w.set(pos.x, pos.y, pos.z).applyMatrix4(skyGroup.matrixWorld)
        tooltipLabel.position.set(_w.x, _w.y, _w.z)
        hoverGlow.position.set(_w.x, _w.y, _w.z)
      }
      tooltipInner.style.opacity = '1'
      hoverGlow.visible = true
      hoverGlowTargetOpacity = 0.95
    }
    // issue #134：行星 tooltip 位置实时更新（行星会随天球运动）
    function updateTooltipPositionForPlanet(name: string) {
      const updater = planetUpdaters.find(u => u.bodyName === name)
      if (!updater) return
      const pos = updater.tiltGroup.position
      _w.set(pos.x, pos.y, pos.z).applyMatrix4(skyGroup.matrixWorld)
      tooltipLabel.position.set(_w.x, _w.y, _w.z)
      hoverGlow.position.set(_w.x, _w.y, _w.z)
    }
    function refreshTooltipStats(starId: number) {
      const stats = statsCache.get(starId)
      const key = `${starId}:${stats?.stories ?? ''}:${stats?.resonance ?? ''}:${stats?.views ?? ''}:${stats?.favorites ?? ''}`
      if (key === _lastStatsKey) return // 没变化
      const vals = tooltipEl.querySelectorAll('.tt-val') as NodeListOf<HTMLElement>
      vals[0].textContent = stats ? String(stats.stories) : '0'
      vals[1].textContent = stats ? String(stats.resonance) : '0'
      vals[2].textContent = stats ? String(stats.views) : '0'
      vals[3].textContent = stats ? String(stats.favorites) : '0'
      _lastStatsKey = key
    }

    canvas.addEventListener('pointerdown', () => { clickDrag = false }, { signal: abortController.signal })

      // ─── 屏幕投影星体检测（hover 与 click 共用同一套判断逻辑，issue #116）───
      // 给定 NDC 坐标，返回距离最近的可见恒星 ID 及其屏幕投影距离平方
      function detectStarByProjection(ndcX: number, ndcY: number): { id: number; dist: number } {
        skyGroup.updateMatrixWorld()
        camera.updateMatrixWorld()
        camera.updateProjectionMatrix()
        let bestDist = Infinity
        let bestId = -1
        for (const sn of allStarNorms) {
          _v.set(sn.nx * SPHERE_RADIUS, sn.ny * SPHERE_RADIUS, sn.nz * SPHERE_RADIUS)
            .applyMatrix4(skyGroup.matrixWorld).project(camera)
          if (_v.z > 1) continue // 在相机后面
          const dx = _v.x - ndcX
          const dy = _v.y - ndcY
          const d = dx * dx + dy * dy
          if (d < bestDist) { bestDist = d; bestId = sn.id }
        }
        return { id: bestId, dist: bestDist }
      }

    canvas.addEventListener('pointermove', (e) => {
      // 给拖动标记距离，由 pointerup 判读是否是点击
      if (dragging) {
        const dx = e.clientX - px, dy = e.clientY - py
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) clickDrag = true
      }

      // 始终更新 mouse 坐标
      const rect = canvas.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      // 悬浮检测（节流通过 cfg.hoverThrottleMs 配置）
      const now = performance.now()
      if (now - hoverCheckTimer < cfg.hoverThrottleMs) return
      hoverCheckTimer = now

      // 用屏幕投影找最近的星（issue #116：提取为共用函数，hover 与 click 同一套逻辑）
      let { id: bestId, dist: bestDist } = detectStarByProjection(mouse.x, mouse.y)
      // 行星 hover 检测（issue #82 补充：行星含日月 hover 淡光晕，与恒星互斥）
      // 特写模式下跳过（相机太近光晕会糊屏）
      let planetHovered = false
      if (closeupState === 'IDLE' && planetMeshes.length) {
        const planetRay = new Raycaster()
        planetRay.setFromCamera(mouse, camera)
        const planetHits = planetRay.intersectObjects(planetMeshes)
        if (planetHits.length) {
          const pd = (planetHits[0].object as Mesh).userData as { planetName: string }
          const updater = planetUpdaters.find(u => u.bodyName === pd.planetName)
          if (updater) {
            planetHovered = true
            const pos = updater.tiltGroup.position
            _v.set(pos.x, pos.y, pos.z).applyMatrix4(skyGroup.matrixWorld)
            planetHoverGlow.position.copy(_v)
            // scale 基于 hitbox 大小动态调整：hitbox = max(size*2.5, 3.0)，光晕 = hitbox × 1.5
            // 水星(0.018)→4.5，木星(0.502)→4.5，太阳(5.0)→18.75
            // 保证小天体光晕可见但不糊屏，大天体光晕足够明显
            const glowSize = Math.max(updater.size * 2.5, 3.0) * 1.5
            planetHoverGlow.scale.set(glowSize, glowSize, 1)
            planetHoverColor.setHex(updater.color)
            planetHoverTargetOpacity = 0.8
            planetHoverGlow.visible = true
          }
        }
      }
      if (!planetHovered) planetHoverTargetOpacity = 0
      // 行星 hover 时跳过恒星 hover（bestId = -1 让下方阈值判断走 else 分支清除恒星高亮）
      if (planetHovered) bestId = -1
      // 阈值通过 cfg.hoverThreshold 配置（移动端跳过 hover：仅吸附星显示 tooltip）
      if (!isMobile) {
        if (bestDist < cfg.hoverThreshold && bestId !== -1) {
          if (bestId !== hoveredStarId) {
            // 清除旧的长悬浮计时器
            if (hoverLongTimer) { clearTimeout(hoverLongTimer); hoverLongTimer = null }
            hoveredStarId = bestId
            // 启动长悬浮计时器（延时通过 cfg.hoverLongDelayMs 配置）
            const currentStarId = bestId
            hoverLongTimer = setTimeout(() => {
              options?.onStarHoverLong?.(currentStarId)
            }, cfg.hoverLongDelayMs)
            updateTooltipContent(bestId)
          } else {
            // issue #34 修复：同一颗星停留时也更新位置（应对 skyGroup 旋转）
            updateTooltipPosition(bestId)
            refreshTooltipStats(bestId)
          }
        } else if (hoveredStarId !== -1) {
          if (hoverLongTimer) { clearTimeout(hoverLongTimer); hoverLongTimer = null }
          // 拖拽旋转时不触发离开逻辑，保持连线可见
          if (!dragging) {
            options?.onStarHoverLong?.(null)
          }
          hoveredStarId = -1
          tooltipInner.style.opacity = '0'
          hoverGlowTargetOpacity = 0
          options?.onStarHover?.(null)
        }
      }

      // ─── issue #116 移动端准星吸附（issue #134 扩展：支持行星吸附） ───
      // 仅移动端 + 非行星特写模式启用；拖拽时也运行（拖拽瞄准是核心交互）
      if (isMobile && closeupState === 'IDLE') {
        // issue #134：先用 Raycaster 检测屏幕中心是否命中行星（优先级：行星 > 恒星，与 PC 端点击一致）
        let centerPlanet: { planetName: string; planetNameCN: string; planetId: number } | null = null
        if (planetMeshes.length) {
          skyGroup.updateMatrixWorld()
          camera.updateMatrixWorld()
          camera.updateProjectionMatrix()
          const planetRay = new Raycaster()
          planetRay.setFromCamera(_centerNDC, camera)
          const planetHits = planetRay.intersectObjects(planetMeshes)
          if (planetHits.length) {
            const pd = (planetHits[0].object as Mesh).userData as { planetName: string; planetNameCN: string; planetId: number }
            if (pd.planetName) centerPlanet = { planetName: pd.planetName, planetNameCN: pd.planetNameCN, planetId: pd.planetId }
          }
        }

        if (centerPlanet) {
          // 命中行星
          if (!snappedPlanet || snappedPlanet.name !== centerPlanet.planetName) {
            // 新吸附行星（从恒星或其他行星切换）：先清恒星吸附态
            snappedStarId = -1
            snappedPlanet = { name: centerPlanet.planetName, nameCN: centerPlanet.planetNameCN, planetId: centerPlanet.planetId }
            snapStartX = e.clientX
            snapStartY = e.clientY
            if (snapBaseFov === 0) {
              cancelAnimationFrame(snapFovRafId)
              snapBaseFov = camera.fov
            }
            if (crosshairEl) crosshairEl.classList.add('snapped')
            updateTooltipContentForPlanet(centerPlanet.planetName, centerPlanet.planetNameCN)
            // 同步 hoveredStarId = -1，避免下一帧 hover 逻辑覆盖准星 tooltip
            hoveredStarId = -1
            animateFov(Math.max(FOV_MIN, snapBaseFov - SNAP_FOV_DELTA))
            // issue #134：通知外部已吸附到该行星（驱动底部「凝听星语」按钮滑入）
            options?.onSnapChange?.({ type: 'planet', planetName: centerPlanet.planetName, planetNameCN: centerPlanet.planetNameCN, planetId: centerPlanet.planetId })
          } else {
            // 已吸附同一行星：检查是否移动超过阈值
            const dx = e.clientX - snapStartX
            const dy = e.clientY - snapStartY
            if (Math.sqrt(dx * dx + dy * dy) > SNAP_RELEASE_PX) {
              releaseSnap()
            } else {
              // 维持吸附：刷新 tooltip 位置（行星随天球运动）
              updateTooltipPositionForPlanet(centerPlanet.planetName)
            }
          }
        } else {
          // 未命中行星 → 检测恒星
          const { id: centerId, dist: centerDist } = detectStarByProjection(0, 0)
          if (centerId !== -1 && centerDist < SNAP_THRESHOLD) {
            if (snappedStarId !== centerId) {
              // 新吸附恒星（从行星或其他恒星切换）：先清行星吸附态
              snappedPlanet = null
              snappedStarId = centerId
              snapStartX = e.clientX
              snapStartY = e.clientY
              if (snapBaseFov === 0) {
                cancelAnimationFrame(snapFovRafId)
                snapBaseFov = camera.fov
              }
              if (crosshairEl) crosshairEl.classList.add('snapped')
              updateTooltipContent(centerId)
              // 同步 hoveredStarId，避免下一帧 hover 逻辑覆盖准星 tooltip
              hoveredStarId = centerId
              animateFov(Math.max(FOV_MIN, snapBaseFov - SNAP_FOV_DELTA))
              // issue #124：通知外部已吸附到该星（驱动底部「凝听星语」按钮滑入）
              options?.onSnapChange?.({ type: 'star', starId: centerId })
            } else {
              // 已吸附同一颗星：检查是否移动超过阈值
              const dx = e.clientX - snapStartX
              const dy = e.clientY - snapStartY
              if (Math.sqrt(dx * dx + dy * dy) > SNAP_RELEASE_PX) {
                releaseSnap()
              } else {
                // 维持吸附：刷新 tooltip 位置（skyGroup 可能已旋转）
                updateTooltipPosition(centerId)
              }
            }
          } else if (snappedStarId !== -1 || snappedPlanet !== null) {
            // 中心无星/行星且超出范围：释放吸附
            releaseSnap()
          }
        }
      }
    }, { signal: abortController.signal })
    canvas.addEventListener('pointerup', (e) => {
      if (disposed) return
      if (clickDrag) {
        // issue #34 修复：拖拽结束时立即触发一次 hover 检测，避免拖拽后无法立即 hover
        clickDrag = false
        const rect = canvas.getBoundingClientRect()
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
        hoverCheckTimer = 0 // 重置节流，强制下一帧立即检测
        return
      }

      // issue #124：移动端不再用触屏点击进入故事页，改为吸附后点击底部「凝听星语」按钮
      // 移动端 pointerup 一律不触发 PC 端 Raycaster 点击逻辑（进入故事由底部按钮驱动）
      if (isMobile) return

      // issue #116 修复：用真实点击坐标更新 mouse，确保检测位置准确
      const rect = canvas.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      // 用屏幕投影检测点击位置最近的恒星（与 hover 同一套逻辑，不依赖 hoveredStarId）
      const { id: clickStarId, dist: clickStarDist } = detectStarByProjection(mouse.x, mouse.y)
      const starHit = clickStarId !== -1 && clickStarDist < cfg.hoverThreshold

      // 行星检测仍用 Raycaster（行星有 Mesh hitbox，投影法不适用）
      skyGroup.updateMatrixWorld()
      const raycaster = new Raycaster()
      raycaster.setFromCamera(mouse, camera)
      let bestPlanetPd: { planetName: string; planetNameCN: string; planetId: number } | null = null
      if (planetMeshes.length) {
        const planetHits = raycaster.intersectObjects(planetMeshes)
        if (planetHits.length) {
          const pd = (planetHits[0].object as Mesh).userData as { planetName: string; planetNameCN: string; planetId: number }
          if (pd.planetName) { bestPlanetPd = pd }
        }
      }

      // 优先级：行星直接命中 > 恒星在阈值内
      // 行星 hitbox 是几何 Mesh，Raycaster 命中即说明点击在行星上
      if (bestPlanetPd) {
        options?.onPlanetClick?.(bestPlanetPd.planetName, bestPlanetPd.planetNameCN, bestPlanetPd.planetId)
      } else if (starHit) {
        options?.onStarClick?.(clickStarId)
      }
    }, { signal: abortController.signal })
  }

  // ═══ 地平旋转（已禁用：天球保持原始赤道坐标系） ═══
  // 不根据 GPS/时间做任何旋转，天球保持默认朝向：
  //   Y+ = 北天极（北极星）  X+ = 春分点（赤经 0h）  Z- = 前方
  skyGroup.matrixAutoUpdate = false
  skyGroup.matrix.identity()

  // ═══ 相机 ═══
  let baseRotX = 0, baseRotY = 0                 // 由 observer/lst 算出的「基础朝向」
  let dragging = false, px = 0, py = 0, rotY = 0, rotX = 0
  let userFov = DEFAULT_FOV
  let observer: ObserverLoc | null = null
  let lstRefDeg = 0                                 // 设定 observer 时的 LST，用于实时自转

  /** 根据当前地点+真实时刻刷新基础朝向 */
  function applyObserverRotation(now = new Date()) {
    // 已禁用：天球回归默认不旋转
    // if (!observer) return
    // const jd = dateToJD(now)
    // const lst = lstDeg(jd, observer.lon)
    // const euler = orientationEuler(observer.lat, lst)
    // baseRotX = euler.rotX
    // baseRotY = euler.rotY
    // lstRefDeg = lst
    // camera.rotation.set(baseRotX + rotX - 0.3, baseRotY + rotY, 0, 'YXZ')
  }

  function setObserver(obs: ObserverLoc | null) {
    // 已禁用：天球回归默认不旋转
    // observer = obs
    // if (obs) applyObserverRotation()
  }

  // OPT-22：多指针管理，支持单指旋转 + 双指 pinch-to-zoom
  // 移动端触控：单指拖拽旋转天球，双指捏合缩放 FOV
  // 桌面端：鼠标单指旋转，wheel 缩放（不变）
  const activePointers = new Map<number, { x: number; y: number }>()
  let pinchPrevDist = 0

  canvas.addEventListener('pointerdown', (e) => {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (activePointers.size === 1) {
      dragging = true; px = e.clientX; py = e.clientY
      canvas.setPointerCapture(e.pointerId)
      // OPT-23：用户拖拽时主动 cancel 进行中的 focus tween
      // 否则 tween 继续写入 camera.quaternion 与用户拖拽竞争，导致视角抖动
      if (activeTweenId !== null) {
        cancelAnimationFrame(activeTweenId)
        activeTweenId = null
      }
    } else if (activePointers.size === 2) {
      // 双指启用 pinch，禁用旋转
      dragging = false
      const pts = Array.from(activePointers.values())
      pinchPrevDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
    }
  }, { signal: abortController.signal })
  canvas.addEventListener('pointermove', (e) => {
    if (!activePointers.has(e.pointerId)) return
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (activePointers.size === 1 && dragging) {
      // 特写模式下拖拽 → 立即退出特写到 IDLE（counterexample: 不应飞回，相机停留继续旋转）
      if (closeupState === 'CLOSEUP' || closeupState === 'TWEENING') {
        if (activeTweenId !== null) { cancelAnimationFrame(activeTweenId); activeTweenId = null }
        camera.near = DEFAULT_NEAR
        camera.updateProjectionMatrix()
        if (closeupTarget?.haloSprite) closeupTarget.haloSprite.visible = true
        closeupState = 'IDLE'
        closeupTarget = null
        // 从当前相机朝向同步 rotY/rotX，避免拖拽首帧跳变
        rotY = camera.rotation.y - baseRotY
        rotX = camera.rotation.x - baseRotX + 0.3
        userFov = camera.fov
      }
      // 单指旋转（issue #116：吸附时拖动阻力 1/4 速度，模拟"穿越糖蜜"手感）
      const dragFactor = (isMobile && snappedStarId !== -1) ? 0.1667 : 1  // 吸附时阻力增大 1.5 倍（1/6 速度）
      rotY += (e.clientX - px) * 0.004 * dragFactor
      rotX += (e.clientY - py) * 0.004 * dragFactor
      rotX = Math.max(-Math.PI*0.48, Math.min(Math.PI*0.48, rotX))
      if (!observer) camera.rotation.set(rotX, rotY, 0, 'YXZ')
      px = e.clientX; py = e.clientY
    } else if (activePointers.size === 2) {
      // 双指 pinch-to-zoom
      const pts = Array.from(activePointers.values())
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      if (pinchPrevDist > 0) {
        // 距离增大 = 放大，距离减小 = 缩小
        const delta = pinchPrevDist - dist
        if (closeupState === 'CLOSEUP' && closeupTarget) {
          // 特写模式：pinch 调 dist（delta>0 = 拉近，delta<0 = 拉远）
          const factor = delta > 0 ? CLOSEUP_WHEEL_FACTOR : 1 / CLOSEUP_WHEEL_FACTOR
          const minDist = Math.max(closeupTarget.size * CLOSEUP_MIN_RATIO, closeupTarget.size + 0.5)
          const maxDist = closeupTarget.size * CLOSEUP_MAX_RATIO
          const newDist = closeupTarget.dist * factor
          if (newDist >= maxDist) {
            // 拉远到极限 → 退出特写到 IDLE（相机停留，继续 pinch 调 FOV）
            camera.near = DEFAULT_NEAR; camera.updateProjectionMatrix()
            if (closeupTarget.haloSprite) closeupTarget.haloSprite.visible = true
            closeupState = 'IDLE'; closeupTarget = null; userFov = camera.fov
          } else {
            closeupTarget.dist = Math.max(minDist, newDist)
          }
        } else {
          userFov = Math.max(FOV_MIN, Math.min(FOV_MAX, userFov + delta * 0.1))
          camera.fov = userFov
          camera.updateProjectionMatrix()
        }
      }
      pinchPrevDist = dist
    }
  }, { signal: abortController.signal })
  const onPointerUp = (e: PointerEvent) => {
    activePointers.delete(e.pointerId)
    if (activePointers.size < 2) pinchPrevDist = 0
    if (activePointers.size === 0) {
      dragging = false
      try { canvas.releasePointerCapture(e.pointerId) } catch { /* 已释放 */ }
    } else if (activePointers.size === 1) {
      // 从双指回到单指，重置单指起点避免跳跃
      const remaining = Array.from(activePointers.values())[0]
      px = remaining.x; py = remaining.y
      dragging = true
    }
  }
  canvas.addEventListener('pointerup', onPointerUp, { signal: abortController.signal })
  canvas.addEventListener('pointercancel', onPointerUp, { signal: abortController.signal })

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault()
    if (closeupState === 'CLOSEUP' && closeupTarget) {
      // 特写模式：滚轮调 dist（向上 = 拉近，向下 = 拉远）
      const factor = e.deltaY < 0 ? CLOSEUP_WHEEL_FACTOR : 1 / CLOSEUP_WHEEL_FACTOR
      const minDist = Math.max(closeupTarget.size * CLOSEUP_MIN_RATIO, closeupTarget.size + 0.5)
      const maxDist = closeupTarget.size * CLOSEUP_MAX_RATIO
      const newDist = closeupTarget.dist * factor
      if (newDist >= maxDist) {
        // 拉远到极限 → 退出特写到 IDLE（相机停留，继续滚轮调 FOV）
        camera.near = DEFAULT_NEAR; camera.updateProjectionMatrix()
        if (closeupTarget.haloSprite) closeupTarget.haloSprite.visible = true
        closeupState = 'IDLE'; closeupTarget = null; userFov = camera.fov
      } else {
        closeupTarget.dist = Math.max(minDist, newDist)
      }
    } else {
      userFov = Math.max(FOV_MIN, Math.min(FOV_MAX, userFov + e.deltaY * 0.05))
      camera.fov = userFov
      camera.updateProjectionMatrix()
    }
  }, { passive: false, signal: abortController.signal })

  window.addEventListener('resize', () => {
    camera.aspect = canvas.clientWidth / canvas.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(canvas.clientWidth, canvas.clientHeight)
    labelRenderer.setSize(canvas.clientWidth, canvas.clientHeight)
    // 同步更新 composer 尺寸，避免 Bloom 模糊错位
    composer.setSize(canvas.clientWidth, canvas.clientHeight)
    if (bloomPass) bloomPass.setSize(canvas.clientWidth, canvas.clientHeight)
    // 更新 LineMaterial resolution（LineSegments2 需要像素级分辨率）
    const res = new Vector2(canvas.clientWidth, canvas.clientHeight)
    for (const grp of constellationLineGroups.values()) {
      ;(grp.main.material as LineMaterial).resolution.copy(res)
      ;(grp.glow.material as LineMaterial).resolution.copy(res)
    }
  }, { signal: abortController.signal })

  // WebGL 上下文丢失处理（Safari GPU 进程崩溃 / GPU 显存耗尽 / GPU 切换）
  // 不处理会导致 canvas 黑屏 + animate 循环空转浪费 CPU
  // 策略：阻止默认行为（允许恢复），停止动画循环，提示用户刷新
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault()  // 允许后续 contextrestored 事件
    cancelAnimationFrame(af)
    console.error('[useSky] WebGL context lost — 3D 渲染已停止，请刷新页面')
    // 在 canvas 上叠加错误提示（轻量 DOM，不依赖 Three.js）
    const overlay = document.createElement('div')
    overlay.textContent = 'GPU 上下文已丢失，请刷新页面'
    overlay.style.cssText = [
      'position:absolute', 'top:50%', 'left:50%', 'transform:translate(-50%,-50%)',
      'color:#ffd98a', 'font-size:16px', 'background:rgba(7,8,22,0.9)',
      'padding:16px 24px', 'border-radius:12px', 'border:1px solid rgba(255,217,138,0.3)',
      'z-index:9999', 'pointer-events:none', 'text-align:center',
    ].join(';')
    canvas.parentElement?.appendChild(overlay)
  }, { signal: abortController.signal })

  // ═══ 太阳系行星 ═══
  // P1-3：加 .catch 避免 chunk 加载失败时 Unhandled Promise Rejection
  import('../data/planets').then(async ({ planets, getBodyPosition, getOrbitPath, BODY_MAP }) => {
    if (disposed) return  // 异步加载期间组件可能已卸载，提前返回避免泄漏

    // 缓存 astronomy-engine 模块供每帧同步更新使用
    AE = await import('astronomy-engine')
    bodyMapRef = BODY_MAP
    _reusedMoonVec = new AE.Vector(0, 0, 0, new AE.AstroTime(0))
    if (disposed) return

    // P1-2：用 LoadingManager 统一捕获纹理加载错误，避免静默失败
    const loadingManager = new LoadingManager()
    loadingManager.onError = (url) => console.error('[useSky] 纹理加载失败:', url)
    const texLoader = new TextureLoader(loadingManager)

    // 太阳光（用于照亮其他行星，太阳本身用 MeshBasicMaterial 不受光照影响）
    // 加到 skyGroup 而非 scene，让光源随天空一起旋转，保持与行星的相对方向正确
    // distance=0, decay=0：天球投影下行星不在真实距离，用均匀光照避免远行星全黑
    // OPT-19：强度从 1.8 提到 2.6，配合主环境光降至 0.12，让行星昼夜分界线明显
    const sunLight = new PointLight(0xffeecc, 2.6, 0, 0)
    sunLight.position.set(0, 0, 0)
    skyGroup.add(sunLight)
    sunLightRef = sunLight  // 供 animate 循环每帧跟随太阳位置

    // 微弱环境光补光：避免行星背光面纯黑（模拟星际散射光）
    // 强度 0.22，冷蓝色调（0x223355），让背光面有微弱细节而非死黑
    // OPT-19：从 0.18 提到 0.22，补偿主环境光降低带来的夜侧过暗
    const ambientLight = new AmbientLight(0x223355, 0.22)
    skyGroup.add(ambientLight)

    const lat = options?.observerLat ?? 0
    const lng = options?.observerLng ?? 0
    observerForPlanets = { lat, lng }
    const R = SPHERE_RADIUS * 0.98

    // P1-5：并行计算所有行星位置（替代串行 await，减少微任务开销）
    const positions = await Promise.all(
      planets.map(p => getBodyPosition(p.name, lat, lng))
    )
    if (disposed) return  // 并行等待期间组件可能已卸载

    // P1-4：提前计算 Sun 位置，消除土星环本影计算对 planets 数组顺序的依赖
    const sunIdx = planets.findIndex(p => p.name === 'Sun')
    const sunPos = sunIdx >= 0 ? positions[sunIdx] : null
    const sunXYZ = sunPos ? raDecXYZ(sunPos.ra, sunPos.dec, R) : null
    const sunLocalPos: Vector3 | null = sunXYZ
      ? new Vector3(sunXYZ.x, sunXYZ.y, sunXYZ.z)
      : null
    if (sunLocalPos) sunLight.position.copy(sunLocalPos)

    for (let i = 0; i < planets.length; i++) {
      const planet = planets[i]
      const pos = positions[i]
      if (!pos) continue
      const { ra, dec } = pos
      const { x, y, z } = raDecXYZ(ra, dec, R)

      // 轴倾角通过外层 tiltGroup 实现：tiltGroup 设轴倾角，mesh 只负责自转
      // 这样自转绕 mesh 局部 Y 轴，倾角不会被自转顺序覆盖
      const tiltGroup = new Group()
      tiltGroup.position.set(x, y, z)
      if (planet.axialTilt) tiltGroup.rotation.z = planet.axialTilt * Math.PI / 180
      skyGroup.add(tiltGroup)

      // 行星球体（OPT-20：分段数按 GPU tier 动态调整，high=64×32 / medium=32×16 / low=16×12）
      const [segW, segH] = renderParams.sphereSegments
      const geo = new SphereGeometry(planet.size, segW, segH)
      const tex = texLoader.load(planet.texture)
      tex.colorSpace = 'srgb'
      // 太阳用 MeshBasicMaterial（自发光，不受光照影响）；其他用 MeshPhongMaterial
      const isSun = planet.name === 'Sun'
      // OPT-2：太阳表面颗粒 shader（参考 coseo12/astro-simulator PR #788）
      // high/medium tier 启用 fbm 3-octave granulation + Eddington limb darkening + 色温梯度
      // low/fallback 保留 MeshBasicMaterial 静态贴图，避免移动端 GPU 压力
      let mat: MeshBasicMaterial | MeshPhongMaterial | ShaderMaterial
      if (isSun && (gpuCap.tier === 'high' || gpuCap.tier === 'medium')) {
        const sunMat = new ShaderMaterial({
          uniforms: {
            uMap: { value: tex },
            uTime: { value: 0 },
            // Allen's Astrophysical Quantities u(λ) 近似（coseo12 实测常数）
            // u_R < u_G < u_B：蓝色 limb darkening 最强，边缘自然偏橙红
            uLimbU: { value: new Vector3(0.5, 0.6, 0.9) },
            uGranScale: { value: 48 },      // GRANULATION_SCALE
            uGranContrast: { value: 0.12 }, // GRANULATION_CONTRAST
          },
          vertexShader: `
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vViewDir;
            varying vec3 vLocalPos;
            void main() {
              vUv = uv;
              vLocalPos = position;
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              vNormal = normalize(normalMatrix * normal);
              vViewDir = normalize(-mvPosition.xyz);
              gl_Position = projectionMatrix * mvPosition;
            }
          `,
          fragmentShader: `
            uniform sampler2D uMap;
            uniform float uTime;
            uniform vec3 uLimbU;
            uniform float uGranScale;
            uniform float uGranContrast;
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vViewDir;
            varying vec3 vLocalPos;

            // hash + value noise + fbm 3-octave（参考 coseo12/astro-simulator sun-shader.ts）
            float hash(vec3 p) {
              p = fract(p * 0.3183099 + 0.1);
              p *= 17.0;
              return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
            }
            float noise(vec3 p) {
              vec3 i = floor(p);
              vec3 f = fract(p);
              f = f * f * (3.0 - 2.0 * f);
              return mix(
                mix(mix(hash(i + vec3(0.0,0.0,0.0)), hash(i + vec3(1.0,0.0,0.0)), f.x),
                    mix(hash(i + vec3(0.0,1.0,0.0)), hash(i + vec3(1.0,1.0,0.0)), f.x), f.y),
                mix(mix(hash(i + vec3(0.0,0.0,1.0)), hash(i + vec3(1.0,0.0,1.0)), f.x),
                    mix(hash(i + vec3(0.0,1.0,1.0)), hash(i + vec3(1.0,1.0,1.0)), f.x), f.y),
                f.z
              );
            }
            float fbm(vec3 p) {
              float v = 0.0;
              float a = 0.5;
              for (int i = 0; i < 3; i++) {
                v += a * noise(p);
                p *= 2.0;
                a *= 0.5;
              }
              return v;
            }

            void main() {
              vec3 texColor = texture2D(uMap, vUv).rgb;

              // 1. granulation: fbm 3-octave 在 vLocalPos 上动态调制（颗粒随 mesh 自转）
              float t = uTime * 0.05;
              float n = fbm(vLocalPos * uGranScale + vec3(t));
              n = (n - 0.5) * 2.0;  // 归一化到 [-1, 1]
              vec3 granColor = texColor + vec3(n * uGranContrast);

              // 2. limb darkening: Eddington I(μ) = 1 - u(1-μ)
              // μ = dot(N, viewDir)，越靠边缘 μ 越小，亮度越低
              // 通道独立 u 系数自动产生边缘橙红偏移（色温梯度）
              float mu = max(dot(vNormal, vViewDir), 0.0);
              vec3 limb = vec3(
                1.0 - uLimbU.x * (1.0 - mu),
                1.0 - uLimbU.y * (1.0 - mu),
                1.0 - uLimbU.z * (1.0 - mu)
              );

              vec3 finalColor = granColor * limb;
              gl_FragColor = vec4(finalColor, 1.0);
            }
          `,
        })
        sunSurfaceMat = sunMat
        mat = sunMat
      } else if (isSun) {
        mat = new MeshBasicMaterial({ map: tex })
      } else {
        // OPT-13 双模材质系统（参考 juejin 太阳系仿真文章 + CK42BB/procedural-stars-threejs）
        // 问题：纯 MeshPhongMaterial 背光面一片死黑，严重影响观察体验
        // 方案：map + emissiveMap 同源纹理，emissiveIntensity 0.18 让背光面可见但不破坏昼夜感
        // 差异化参数：岩石行星高粗糙度（暗淡反光），气态行星低粗糙度（湿润反光）
        //   - 岩石：Mercury/Moon/Mars → shininess 2, specular 0x111111
        //   - 气态：Jupiter/Saturn/Uranus/Neptune → shininess 12, specular 0x444466
        //   - 地球类（有大气）：Venus/Earth → shininess 6, specular 0x333344
        const isRocky = planet.name === 'Mercury' || planet.name === 'Moon' || planet.name === 'Mars'
        const isGasGiant = planet.name === 'Jupiter' || planet.name === 'Saturn' ||
                          planet.name === 'Uranus' || planet.name === 'Neptune'
        const shininess = isRocky ? 2 : isGasGiant ? 12 : 6
        const specular = isRocky ? 0x111111 : isGasGiant ? 0x444466 : 0x333344
        mat = new MeshPhongMaterial({
          map: tex,
          emissiveMap: tex,        // 同源纹理作为自发光贴图
          emissive: 0xffffff,      // 白色自发光（让纹理本色透过）
          emissiveIntensity: 0.18, // 低强度，保留昼夜明暗对比
          shininess,
          specular,
        })
      }
      const mesh = new Mesh(geo, mat)
      tiltGroup.add(mesh)
      mesh.userData = {
        planetName: planet.name,
        planetNameCN: planet.nameCN,
        planetId: planet.planetId,
        rotationPeriod: planet.rotationPeriod,
      }
      planetMeshes.push(mesh)

      // 不可见 hitbox：扩大点击命中区域，解决行星 mesh 半径过小难以点击的问题
      // 半径 = max(size * 2.5, 3.0)，确保水星(0.023)→3.0、木星(0.104)→3.0
      // visible=false 不渲染但参与 raycast，userData 与主 mesh 一致
      const hitboxRadius = Math.max(planet.size * 2.5, 3.0)
      const hitboxGeo = new SphereGeometry(hitboxRadius, 8, 6)
      const hitboxMat = new MeshBasicMaterial({ visible: false })
      const hitboxMesh = new Mesh(hitboxGeo, hitboxMat)
      hitboxMesh.userData = {
        planetName: planet.name,
        planetNameCN: planet.nameCN,
        planetId: planet.planetId,
        rotationPeriod: planet.rotationPeriod,
      }
      tiltGroup.add(hitboxMesh)
      planetMeshes.push(hitboxMesh)

      // Halo 辅助光点：物理直径比例下小天体（size < 0.5）盘面亚像素不可见
      // 用 Sprite 渲染行星颜色的光点，辅助肉眼定位（类似 Stellarium hint circle）
      // halo 不参与 raycast（点击靠 hitbox），不影响物理比例（盘面仍按 size 渲染）
      // 特写模式下隐藏目标行星 halo（避免糊屏），存引用供 closeupState 管理
      let haloSprite: Sprite | undefined
      if (planet.size < 0.5) {
        const haloColor = '#' + planet.color.toString(16).padStart(6, '0')
        const haloTex = glowTex(haloColor, 32)
        haloSprite = new Sprite(new SpriteMaterial({
          map: haloTex,
          blending: AdditiveBlending,
          depthWrite: false,
          depthTest: true,
          transparent: true,
          opacity: 0.7,
        }))
        // halo 半径固定 1.8，保证最小可见性（不随真实比例变化，因为是辅助层）
        haloSprite.scale.set(1.8, 1.8, 1)
        tiltGroup.add(haloSprite)
      }

      // 注册到 planetUpdaters，供 animate 循环每帧重算位置 + 每 1s 重算视星等
      planetUpdaters.push({ tiltGroup, bodyName: planet.name, mesh, haloSprite, color: planet.color, size: planet.size })

      // ═══ 伽利略卫星（木卫 1-4）：实时位置模拟 ═══
      // astronomy-engine JupiterMoons() 返回 jovicentric EQJ 向量（AU）
      // 每帧构造卫星地心向量 = (木星日心 + jovicentric) - 地球日心，用 EquatorFromVector 转 RA/Dec
      // 4 颗卫星：Io(1.2)/Europa(1.0)/Ganymede(1.4)/Callisto(1.3)，颜色按真实反照率
      if (planet.name === 'Jupiter') {
        const galileanMoons = [
          { name: 'Io', nameCN: '木卫一', color: '#fff5d8', size: 1.2, planetId: -109 },
          { name: 'Europa', nameCN: '木卫二', color: '#e8e0d0', size: 1.0, planetId: -110 },
          { name: 'Ganymede', nameCN: '木卫三', color: '#d8c8a8', size: 1.4, planetId: -111 },
          { name: 'Callisto', nameCN: '木卫四', color: '#a89888', size: 1.3, planetId: -112 },
        ]
        for (const moon of galileanMoons) {
          // 用 Sprite 而非 Mesh：卫星太小，Sprite 单顶点更省 GPU
          const moonTex = glowTex(moon.color, 16)
          const moonMat = new SpriteMaterial({
            map: moonTex, blending: AdditiveBlending,
            depthWrite: false, depthTest: true, transparent: true,
          })
          const moonSprite = new Sprite(moonMat)
          moonSprite.scale.set(moon.size, moon.size, 1)
          // 初始隐藏，等首帧位置计算后显示
          moonSprite.visible = false
          skyGroup.add(moonSprite)
          moonSprites.push(moonSprite)

          // 卫星不可见 hitbox：扩大点击命中区域，半径 = max(size * 2.5, 2.5)
          // 卫星尺寸小（1.0~1.4），hitbox 保证可点击性，与行星 hitbox 同模式
          const moonHitboxRadius = Math.max(moon.size * 2.5, 2.5)
          const moonHitboxGeo = new SphereGeometry(moonHitboxRadius, 8, 6)
          const moonHitboxMat = new MeshBasicMaterial({ visible: false })
          const moonHitbox = new Mesh(moonHitboxGeo, moonHitboxMat)
          moonHitbox.userData = {
            planetName: moon.name,
            planetNameCN: moon.nameCN,
            planetId: moon.planetId,
            rotationPeriod: 0,
          }
          moonSprite.add(moonHitbox)
          planetMeshes.push(moonHitbox)
          // 卫星标签：挂到 sprite（自动跟随位置）
          // OPT-26：labelMode='major-only' 时跳过卫星标签（低端设备降级）
          if (renderParams.labelMode === 'all') {
            const moonEl = document.createElement('div')
            moonEl.textContent = moon.nameCN
            moonEl.style.cssText = 'color:#a8d8ff;font-size:9px;background:rgba(7,8,22,0.5);padding:0 4px;border-radius:6px;white-space:nowrap;opacity:0.75'
            const moonLabel = new CSS2DObject(moonEl)
            moonLabel.position.set(0, 1.5, 0)
            moonSprite.add(moonLabel)
            // OPT-26：卫星标签注册到 LOD 数组（isMajor=false，距离 LOD 会隐藏）
            labelLODItems.push({ label: moonLabel, parent: moonSprite, isMajor: false })
          }
        }
      }

      // P0-4：太阳 corona 升级 —— 内层 fresnel + 中层日冕 + 外层 sprite
      // 三层叠加营造厚实感，被 UnrealBloomPass 进一步扩散
      if (isSun) {
        // 内层：紧贴太阳表面的暖金光晕（菲涅尔边缘亮）
        const innerGlowGeo = new SphereGeometry(planet.size * 1.15, 32, 16)
        const innerGlowMat = new ShaderMaterial({
          uniforms: { uColor: { value: new Color(0xffaa33) } },
          vertexShader: `
            varying vec3 vNormal;
            varying vec3 vViewDir;
            void main() {
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              vNormal = normalize(normalMatrix * normal);
              vViewDir = normalize(-mvPosition.xyz);
              gl_Position = projectionMatrix * mvPosition;
            }
          `,
          fragmentShader: `
            uniform vec3 uColor;
            varying vec3 vNormal;
            varying vec3 vViewDir;
            void main() {
              float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 2.0);
              gl_FragColor = vec4(uColor, fresnel * 0.8);
            }
          `,
          transparent: true,
          blending: AdditiveBlending,
          side: BackSide,
          depthWrite: false,
        })
        tiltGroup.add(new Mesh(innerGlowGeo, innerGlowMat))

        // 中层：日冕扩散光晕
        const coronaGeo = new SphereGeometry(planet.size * 1.8, 32, 16)
        const coronaMat = new ShaderMaterial({
          uniforms: { uColor: { value: new Color(0xffcc66) } },
          vertexShader: `
            varying vec3 vNormal;
            varying vec3 vViewDir;
            void main() {
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              vNormal = normalize(normalMatrix * normal);
              vViewDir = normalize(-mvPosition.xyz);
              gl_Position = projectionMatrix * mvPosition;
            }
          `,
          fragmentShader: `
            uniform vec3 uColor;
            varying vec3 vNormal;
            varying vec3 vViewDir;
            void main() {
              float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 3.0);
              gl_FragColor = vec4(uColor, fresnel * 0.4);
            }
          `,
          transparent: true,
          blending: AdditiveBlending,
          side: BackSide,
          depthWrite: false,
        })
        tiltGroup.add(new Mesh(coronaGeo, coronaMat))

        // 外层：大范围 sprite 光晕（被 Bloom 进一步扩散）
        const outerGlow = new Sprite(new SpriteMaterial({
          map: bloomTex('#ffcc66', 256),
          blending: AdditiveBlending,
          depthWrite: false,
          depthTest: false,
          transparent: true,
          opacity: 0.6,
        }))
        outerGlow.scale.set(planet.size * 6, planet.size * 6, 1)
        tiltGroup.add(outerGlow)
      }

      // P0-3 / OPT-9：行星大气层光晕
      // High/Medium tier：Physical-Lite shader（Rayleigh + Mie 散射，太阳方向感知）
      // Low/Fallback tier：简单 fresnel shader（保留向后兼容，省 GPU）
      // 参考：EnceladusCat/Planet-Atmosphere-Renderer（MIT）Rayleigh/Mie 物理参数
      if (planet.atmosphere) {
        // OPT-20：大气层球体分段按 GPU tier 动态调整
        const atmoGeo = new SphereGeometry(planet.size * 1.08, segW, segH)
        const atm = planet.atmosphere
        // 物理参数齐全 + 高/中端 GPU → 启用 Physical-Lite
        const usePhysical = !!(atm.rayleigh && atm.mie != null && atm.mieG != null) &&
                            (gpuCap.tier === 'high' || gpuCap.tier === 'medium')

        let atmoMat: ShaderMaterial
        if (usePhysical) {
          // ═══ Physical-Lite 大气散射 shader（OPT-9）═══
          // 核心改进：太阳方向感知 + Rayleigh 色温梯度 + Mie 前向散射
          atmoMat = new ShaderMaterial({
            uniforms: {
              uColor: { value: new Color(atm.color) },
              uIntensity: { value: atm.intensity },
              uSunDirWorld: { value: new Vector3(1, 0, 0) },  // 每帧由 animate 更新
              uRayleigh: { value: new Vector3(atm.rayleigh![0], atm.rayleigh![1], atm.rayleigh![2]) },
              uMie: { value: atm.mie! },
              uMieG: { value: atm.mieG! },
            },
            vertexShader: `
              varying vec3 vNormal;
              varying vec3 vViewDir;
              varying vec3 vSunDir;
              uniform vec3 uSunDirWorld;
              void main() {
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vNormal = normalize(normalMatrix * normal);
                vViewDir = normalize(-mvPosition.xyz);
                // 世界坐标太阳方向 → 视坐标（mat3(viewMatrix) 转换方向向量）
                vSunDir = normalize(mat3(viewMatrix) * uSunDirWorld);
                gl_Position = projectionMatrix * mvPosition;
              }
            `,
            fragmentShader: `
              uniform vec3 uColor;
              uniform float uIntensity;
              uniform vec3 uRayleigh;
              uniform float uMie;
              uniform float uMieG;
              varying vec3 vNormal;
              varying vec3 vViewDir;
              varying vec3 vSunDir;
              const float PI = 3.14159265359;
              void main() {
                vec3 N = normalize(vNormal);
                vec3 V = normalize(vViewDir);
                vec3 L = normalize(vSunDir);
                // 边缘因子（limb brightening）：BackSide 渲染仅可见边缘环
                float NdotV = max(dot(N, V), 0.0);
                float edge = pow(1.0 - NdotV, 2.0);
                // 昼夜因子：太阳照射面更亮，背阳面保留 25% 底辉
                float NdotL = max(dot(N, L), 0.0);
                float dayFactor = 0.25 + 0.75 * NdotL;
                // 散射角 mu = dot(rayDir, sunDir)，rayDir = -V（相机→表面）
                // mu ≈ 1 前向散射（朝太阳看，亮），mu ≈ -1 后向散射（背太阳，暗）
                float mu = dot(-V, L);
                // Rayleigh 相位函数：3/(16π) * (1 + cos²θ)
                float phaseR = 0.05968 * (1.0 + mu * mu);
                // Mie 相位函数（Henyey-Greenstein）
                float g = uMieG;
                float g2 = g * g;
                float denom = max(1.0 + g2 - 2.0 * g * mu, 0.001);
                float phaseM = 0.11937 * (1.0 - g2) * (1.0 + mu * mu) /
                               ((2.0 + g2) * pow(denom, 1.5));
                // Rayleigh 色温梯度：归一化使最大通道=1
                // Earth [0.0026,0.0029,0.0077]→[0.34,0.38,1.0] 蓝
                // Mars  [0.0045,0.0030,0.0022]→[1.0,0.67,0.49] 红
                float maxR = max(max(uRayleigh.r, uRayleigh.g), uRayleigh.b);
                vec3 rayleighTint = maxR > 0.0 ? uRayleigh / maxR : vec3(1.0);
                // Mie 强度（0.001~0.008 → 0.1~0.8）
                float mieStrength = uMie * 100.0;
                // 散射合成：Rayleigh（波长依赖）+ Mie（白色前向散射）
                vec3 scatter = rayleighTint * phaseR + vec3(mieStrength) * phaseM;
                vec3 color = scatter * edge * dayFactor * uIntensity * 2.5;
                // 色调映射（防爆饱和）
                color = 1.0 - exp(-color);
                float alpha = clamp(edge * uIntensity * 1.5, 0.0, 1.0);
                gl_FragColor = vec4(color, alpha);
              }
            `,
            transparent: true,
            blending: AdditiveBlending,
            side: BackSide,
            depthWrite: false,
          })
          // 注册到 atmosphereUpdaters，每帧更新 uSunDirWorld
          atmosphereUpdaters.push({ atmoMat, planetName: planet.name })
        } else {
          // ═══ 简单 fresnel shader（Low/Fallback tier，保留向后兼容）═══
          atmoMat = new ShaderMaterial({
            uniforms: {
              uColor: { value: new Color(atm.color) },
              uIntensity: { value: atm.intensity },
            },
            vertexShader: `
              varying vec3 vNormal;
              varying vec3 vViewDir;
              void main() {
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vNormal = normalize(normalMatrix * normal);
                vViewDir = normalize(-mvPosition.xyz);
                gl_Position = projectionMatrix * mvPosition;
              }
            `,
            fragmentShader: `
              uniform vec3 uColor;
              uniform float uIntensity;
              varying vec3 vNormal;
              varying vec3 vViewDir;
              void main() {
                float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 2.5);
                gl_FragColor = vec4(uColor, fresnel * uIntensity);
              }
            `,
            transparent: true,
            blending: AdditiveBlending,
            side: BackSide,
            depthWrite: false,
          })
        }
        tiltGroup.add(new Mesh(atmoGeo, atmoMat))
      }

      // ═══ 土星环：ShaderMaterial（P1 优化 — world-space HG 前向散射 + Blinn-Phong 冰粒高光） ═══
      // 参考 celestiary/web PR #58 — world-space 计算更自然，避免逆矩阵变换
      // 改进点：
      //   1. HG 前向散射（g=0.7）：背光时环变亮，模拟冰粒透射光
      //   2. Blinn-Phong 高光（shininess=60）：冰粒表面镜面反射，视角依赖闪烁
      //   3. 双面渲染光照：abs(N·L) + max(spec, -N·H spec) 处理背面
      //   4. 解析本影：sphere intersection test，15% ambient 漏入本影
      //   5. 内/外半径数据驱动（ringInnerFactor / ringOuterFactor）
      if (planet.ringTexture) {
        const ringTex = texLoader.load(planet.ringTexture)
        ringTex.colorSpace = 'srgb'
        const innerR = planet.size * (planet.ringInnerFactor ?? 1.4)
        const outerR = planet.size * (planet.ringOuterFactor ?? 2.3)
        const ringGeo = new RingGeometry(innerR, outerR, 128, 1)
        // 修正 UV：u = 径向归一化（0=内缘, 1=外缘），v = 0.5（采 1D 横条）
        const uvAttr = ringGeo.attributes.uv
        const posAttr = ringGeo.attributes.position
        for (let i = 0; i < uvAttr.count; i++) {
          const px = posAttr.getX(i), py = posAttr.getY(i)
          const r = Math.sqrt(px * px + py * py)
          const u = (r - innerR) / (outerR - innerR)
          uvAttr.setXY(i, u, 0.5)
        }
        uvAttr.needsUpdate = true

        const ringMat = new ShaderMaterial({
          uniforms: {
            uMap: { value: ringTex },
            uPlanetR: { value: planet.size },
            uPlanetCenter: { value: new Vector3() },   // 每帧由 animate 更新（世界坐标）
            uSunDirWorld: { value: new Vector3(1, 0, 0) },  // 每帧由 animate 更新
            uTint: { value: new Color(0xddc8a0) },
          },
          vertexShader: `
            varying vec2 vUv;
            varying vec3 vWorldPos;
            varying vec3 vWorldNormal;
            void main() {
              vUv = uv;
              vec4 worldPos4 = modelMatrix * vec4(position, 1.0);
              vWorldPos = worldPos4.xyz;
              // RingGeometry 法向量默认 (0,0,1)，经 rotation.x=π/2 后为 (0,1,0)
              // 用 mat3(modelMatrix) 变换到世界空间（纯旋转等价于 normalMatrix，无非均匀 scale）
              vWorldNormal = normalize(mat3(modelMatrix) * normal);
              gl_Position = projectionMatrix * viewMatrix * worldPos4;
            }
          `,
          fragmentShader: `
            uniform sampler2D uMap;
            uniform float uPlanetR;
            uniform vec3 uPlanetCenter;
            uniform vec3 uSunDirWorld;
            uniform vec3 uTint;
            varying vec2 vUv;
            varying vec3 vWorldPos;
            varying vec3 vWorldNormal;

            // ─── Henyey-Greenstein 相位函数（冰粒前向散射） ───
            // f(θ) = (1 - g²) / (1 + g² - 2g·cosθ)^1.5
            // g=0.7：冰粒典型前向散射，前后比约 182:1（forward≈18.9, backward≈0.10）
            float hgPhase(float cosTheta, float g) {
              float g2 = g * g;
              float denom = 1.0 + g2 - 2.0 * g * cosTheta;
              return (1.0 - g2) / pow(max(denom, 0.001), 1.5);
            }

            void main() {
              // 采样环纹理（1D 径向条带）
              vec4 tex = texture2D(uMap, vec2(vUv.x, 0.5));
              vec3 baseColor = tex.rgb * uTint;

              // 归一化方向向量（世界坐标系）
              vec3 N = normalize(vWorldNormal);
              vec3 L = normalize(uSunDirWorld);
              // cameraPosition 是 Three.js ShaderMaterial 内置 uniform（世界坐标）
              vec3 V = normalize(cameraPosition - vWorldPos);

              // ─── 1. 朗伯漫反射（双面：abs 处理背面） ───
              float nDotL = abs(dot(N, L));
              float diffuse = max(nDotL, 0.05);  // 5% ambient floor 避免全黑

              // ─── 2. Blinn-Phong 冰粒高光（双面取最大） ───
              vec3 H = normalize(L + V);
              float specFront = pow(max(dot(N, H), 0.0), 60.0);
              float specBack = pow(max(dot(-N, H), 0.0), 60.0);
              float spec = max(specFront, specBack);
              // 冰粒高光偏蓝白（0.9, 0.95, 1.0），强度 0.25 避免过曝
              vec3 specular = vec3(0.9, 0.95, 1.0) * spec * 0.25;

              // ─── 3. HG 前向散射（背光时环变亮） ───
              // cosTheta = dot(-L, V)：当相机朝向太阳穿过环时为负，使 hg 变大
              float cosTheta = dot(-L, V);
              float hg = hgPhase(cosTheta, 0.7);
              // scatter 强度 0.15，乘以环色避免白色泛光
              vec3 scatter = baseColor * hg * 0.15;

              // ─── 4. 行星本影（解析 sphere intersection test） ───
              // 从环片元向太阳射线，判断是否被行星球体遮挡
              vec3 oc = vWorldPos - uPlanetCenter;
              float b = dot(oc, L);
              float c = dot(oc, oc) - uPlanetR * uPlanetR;
              float disc = b * b - c;
              // disc > 0: 射线命中行星球；b < 0: 行星在环片元与太阳之间
              float inShadow = (disc > 0.0 && b < 0.0) ? 1.0 : 0.0;
              // 15% ambient 漏入本影，避免纯黑
              float shadowFactor = 1.0 - inShadow * 0.85;

              // ─── 最终合成（linear space，tonemapping 前） ───
              // 掠射散射（边缘微亮，保留原有视觉风格）— 也受本影衰减
              float graz = 0.45 * (1.0 - abs(dot(N, L)));
              vec3 lit = (baseColor * diffuse + specular + scatter + baseColor * graz * 0.3) * shadowFactor;

              gl_FragColor = vec4(lit, tex.a * 0.95);
            }
          `,
          side: DoubleSide,
          transparent: true,
          depthWrite: false,
        })
        const ring = new Mesh(ringGeo, ringMat)
        // ring 挂到 tiltGroup（自动跟随土星位置）；tiltGroup 已设 axialTilt
        // ring 还需绕 X 轴旋转 90° 让环面水平（RingGeometry 默认在 XY 平面）
        ring.rotation.x = Math.PI / 2
        tiltGroup.add(ring)
        // 注册到 ringUpdaters，供 animate 循环每帧更新 uSunDirWorld / uPlanetCenter
        ringUpdaters.push({ ringMat, tiltGroup })

        // ═══ OPT-16：土星环阴影投射到行星表面（参考 celestiary/web PR #58） ═══
        // 当前已有"行星阴影投射到环上"（ringMat fragment shader 中），缺少反向"环阴影投射到行星"
        // 实现：在土星 MeshPhongMaterial 的 onBeforeCompile 中注入 GLSL
        //   1. vertex shader: 计算 vWorldPos（行星表面顶点的世界坐标）
        //   2. fragment shader: 从顶点向太阳射线，与环平面相交，若交点在环内按 alpha 衰减
        // 风险控制：仅对土星注入，不影响 OPT-13 双模材质的其他 7 颗行星
        if (planet.name === 'Saturn') {
          const planetMat = mesh.material as MeshPhongMaterial
          const uSunWorldPos = { value: new Vector3() }
          const uRingCenterWorld = { value: new Vector3() }
          // 环法向量在 tiltGroup 局部 Y 轴（环 rotation.x=π/2 后法向量为 Y 轴）
          const uRingNormalWorld = { value: new Vector3(0, 1, 0) }
          planetMat.onBeforeCompile = (shader) => {
            shader.uniforms.uSunWorldPos = uSunWorldPos
            shader.uniforms.uRingCenterWorld = uRingCenterWorld
            shader.uniforms.uRingNormalWorld = uRingNormalWorld
            shader.uniforms.uRingInner = { value: innerR }
            shader.uniforms.uRingOuter = { value: outerR }
            shader.uniforms.uRingAlphaMap = { value: ringTex }
            // vertex shader: 计算世界坐标
            shader.vertexShader = shader.vertexShader
              .replace('#include <common>', `
                #include <common>
                varying vec3 vWorldPos;
              `)
              .replace('#include <project_vertex>', `
                #include <project_vertex>
                vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
              `)
            // fragment shader: 在 dithering_fragment（main 末尾）前注入环阴影衰减
            shader.fragmentShader = shader.fragmentShader
              .replace('#include <common>', `
                #include <common>
                uniform vec3 uSunWorldPos;
                uniform vec3 uRingCenterWorld;
                uniform vec3 uRingNormalWorld;
                uniform float uRingInner;
                uniform float uRingOuter;
                uniform sampler2D uRingAlphaMap;
                varying vec3 vWorldPos;
              `)
              .replace('#include <dithering_fragment>', `
                // 环阴影：从顶点向太阳射线，与环平面相交
                vec3 _toSun = uSunWorldPos - vWorldPos;
                float _denom = dot(_toSun, uRingNormalWorld);
                float _ringShadow = 0.0;
                if (abs(_denom) > 1e-6) {
                  float _t = dot(uRingCenterWorld - vWorldPos, uRingNormalWorld) / _denom;
                  if (_t > 0.0) {
                    vec3 _hit = vWorldPos + _t * _toSun;
                    float _r = length(_hit - uRingCenterWorld);
                    if (_r >= uRingInner && _r <= uRingOuter) {
                      float _u = (_r - uRingInner) / (uRingOuter - uRingInner);
                      float _ringA = texture2D(uRingAlphaMap, vec2(_u, 0.5)).a;
                      _ringShadow = _ringA * 0.85;
                    }
                  }
                }
                gl_FragColor.rgb *= 1.0 - _ringShadow;
                #include <dithering_fragment>
              `)
          }
          saturnShadowUpdaters.push({
            mat: planetMat,
            uSunWorldPos,
            uRingCenterWorld,
            uRingNormalWorld,
            tiltGroup,
          })
        }
      }

      // 标签：挂到 tiltGroup（自动跟随行星公转，无需每帧手动更新位置）
      const el = document.createElement('div')
      el.textContent = planet.nameCN
      el.style.cssText = 'color:#ffd98a;font-size:11px;background:rgba(7,8,22,0.6);padding:1px 6px;border-radius:8px;border:1px solid rgba(255,217,138,0.2);backdrop-filter:blur(4px);white-space:nowrap'
      const label = new CSS2DObject(el)
      // 局部坐标：从行星中心沿径向向外偏移 size+6
      label.position.set(0, planet.size + 6, 0)
      tiltGroup.add(label)
      // OPT-26：行星标签注册到 LOD 数组（isMajor=true，距离 LOD 不会隐藏）
      labelLODItems.push({ label, parent: tiltGroup, isMajor: true })
    }

    // ═══ 阶段 3 P0-2：行星视运动轨迹（14-A §2 视运动） ═══
    // 异步采样 astronomy-engine Equator()，不阻塞渲染
    // 内行星（水星、金星）采样 200 天每天一点，外行星采样 800 天每 5 天一点
    // 轨迹为暗色半透明线，让用户看到行星在星空中的运动路径
    for (const planet of planets) {
      if (planet.name === 'Sun' || planet.name === 'Moon') continue
      getOrbitPath(planet.name, lat, lng).then(path => {
        if (disposed || path.length < 2) return
        const verts: number[] = []
        for (const p of path) {
          const v = raDecXYZ(p.ra, p.dec, R)
          verts.push(v.x, v.y, v.z)
        }
        const g = new BufferGeometry()
        g.setAttribute('position', new BufferAttribute(new Float32Array(verts), 3))
        const mat = new LineBasicMaterial({
          color: planet.color,
          transparent: true,
          opacity: 0.35,
          blending: AdditiveBlending,
          depthWrite: false,
          depthTest: true,
        })
        const line = new Line(g, mat)
        skyGroup.add(line)
      }).catch(err => console.error('[useSky] 轨道线计算失败', planet.name, err))
    }
  }).catch(err => {
    console.error('[useSky] 行星模块加载失败', err)
  })

  // ═══ 阶段 3 P2-1：主带小行星（InstancedMesh 单 draw call 渲染 8 颗） ═══
  // [DISABLED 2026-07-27] 用户反馈小行星带效果不佳，暂时禁用整段代码
  // 恢复方式：取消下方注释即可（asteroidInst/asteroidDummy 声明、animate 循环更新、needEarthHelio 判断也需恢复）
  //
  // // GPU 检测：低端设备跳过 InstancedMesh，用 Points 降级
  // // （gpuCap/renderParams 已在 composer 前声明，此处复用）
  // // Fallback 策略：InstancedMesh 位置计算失败时自动降级为 Points，避免 visible=false 永不显示
  //
  // // 共用：异步计算 8 颗小行星地心视位置
  // const asteroidPositionsPromise = Promise.all(ASTEROIDS.map(ast => getAsteroidPosition(ast)))
  //
  // // 共用：降级为 Points 渲染（用于低端设备或 InstancedMesh 失败时）
  // // OPT-24：透视缩放 ShaderMaterial，参考 ChristinaBusacker asteroid-belt-impostor.shader.ts
  // // 改进点：
  // //   1. gl_PointSize 加入 dpr 补偿，避免高 DPR 屏幕小行星过小
  // //   2. 每颗小行星独立 aSize（按视星等反比），与 InstancedMesh 路径视觉一致
  // //   3. 圆形粒子 + 软边缘 discard，比 PointsMaterial 默认方形更真实
  // function renderAsteroidsAsPoints(positions: Array<{ ra: number; dec: number; distance: number } | null>) {
  //   if (disposed) return
  //   const posArr: number[] = []
  //   const colArr: number[] = []
  //   const sizeArr: number[] = []
  //   ASTEROIDS.forEach((ast, idx) => {
  //     const p = positions[idx]
  //     if (!p) return
  //     const v = raDecXYZ(p.ra, p.dec, SPHERE_RADIUS * 0.95)
  //     posArr.push(v.x, v.y, v.z)
  //     const [r, g, b] = hexRGB(ast.color)
  //     colArr.push(r, g, b)
  //     // 与 InstancedMesh 路径一致的视星等反比公式：mag 5.9 → 1.5, mag 8.2 → 0.6
  //     // Points 路径需放大基准（InstancedMesh 用 3D 球体，Points 是 2D 点，视觉等价需 ~6x）
  //     const instSize = Math.max(0.5, 2.5 - (ast.mag - 5.9) * 0.4)
  //     sizeArr.push(instSize * 6.0)
  //   })
  //   if (posArr.length === 0) return
  //   const g = new BufferGeometry()
  //   g.setAttribute('position', new BufferAttribute(new Float32Array(posArr), 3))
  //   g.setAttribute('aColor', new BufferAttribute(new Float32Array(colArr), 3))
  //   g.setAttribute('aSize', new BufferAttribute(new Float32Array(sizeArr), 1))
  //   const mat = new ShaderMaterial({
  //     uniforms: {
  //       uMap: { value: texCache.get(8) ?? glowTex('white', 32) },
  //       uDpr: { value: dpr },  // OPT-29：使用共享 dpr 变量，与 renderer.setPixelRatio 一致
  //     },
  //     vertexShader: `
  //       attribute float aSize;
  //       attribute vec3 aColor;
  //       varying vec3 vColor;
  //       uniform float uDpr;
  //       void main() {
  //         vColor = aColor;
  //         vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  //         // 透视缩放：远距离粒子更小，加 dpr 补偿避免高 DPR 屏幕过小
  //         gl_PointSize = aSize * (300.0 * uDpr / max(1.0, -mvPosition.z));
  //         gl_Position = projectionMatrix * mvPosition;
  //       }
  //     `,
  //     fragmentShader: `
  //       uniform sampler2D uMap;
  //       varying vec3 vColor;
  //       void main() {
  //         // 圆形粒子 + 软边缘 discard，比 PointsMaterial 方形更真实
  //         vec2 c = gl_PointCoord - 0.5;
  //         float d = length(c);
  //         if (d > 0.5) discard;
  //         vec4 tex = texture2D(uMap, gl_PointCoord);
  //         gl_FragColor = vec4(vColor, tex.a);
  //       }
  //     `,
  //     transparent: true,
  //     blending: AdditiveBlending,
  //     depthWrite: false,
  //     depthTest: true,
  //   })
  //   skyGroup.add(new Points(g, mat))
  // }
  //
  // if (renderParams.instancedMesh && gpuCap.instanced) {
  //   // 高/中端：InstancedMesh，8 颗小行星单 draw call
  //   const astGeo = new IcosahedronGeometry(1.2, 0)
  //   const astMat = new MeshBasicMaterial({ vertexColors: true })
  //   const inst = new InstancedMesh(astGeo, astMat, ASTEROIDS.length)
  //   inst.instanceMatrix.setUsage(0x88E8)  // DYNAMIC_DRAW
  //   inst.frustumCulled = false
  //   inst.visible = false  // 异步计算位置前隐藏，避免 8 颗堆叠在天球中心
  //   skyGroup.add(inst)
  //   asteroidInst = inst  // 供 animate 循环每帧更新位置
  //
  //   const dummy = new Object3D()
  //   asteroidPositionsPromise.then(positions => {
  //     if (disposed) return
  //     let validCount = 0
  //     ASTEROIDS.forEach((ast, idx) => {
  //       const pos = positions[idx]
  //       if (!pos) return
  //       validCount++
  //       const v = raDecXYZ(pos.ra, pos.dec, SPHERE_RADIUS * 0.95)
  //       dummy.position.set(v.x, v.y, v.z)
  //       // 大小按视星等反比：mag 5.9 → 1.5, mag 8.2 → 0.6
  //       const size = Math.max(0.5, 2.5 - (ast.mag - 5.9) * 0.4)
  //       dummy.scale.set(size, size, size)
  //       // 随机自转倾角（静态，不动画以省 GPU）
  //       dummy.rotation.set(
  //         (ast.number * 0.7) % Math.PI,
  //         (ast.number * 1.3) % (2 * Math.PI),
  //         (ast.number * 0.5) % Math.PI,
  //       )
  //       dummy.updateMatrix()
  //       inst.setMatrixAt(idx, dummy.matrix)
  //       const [r, g, b] = hexRGB(ast.color)
  //       inst.setColorAt(idx, new Color(r, g, b))
  //     })
  //     if (validCount === 0) {
  //       // 所有位置计算失败：降级为 Points
  //       console.warn('[useSky] 小行星位置全部失败，降级为 Points')
  //       skyGroup.remove(inst)
  //       astGeo.dispose(); astMat.dispose()
  //       renderAsteroidsAsPoints(positions)
  //       return
  //     }
  //     inst.instanceMatrix.needsUpdate = true
  //     if (inst.instanceColor) inst.instanceColor.needsUpdate = true
  //     inst.visible = true
  //   }).catch(err => {
  //     console.error('[useSky] 小行星 InstancedMesh 渲染失败，降级为 Points', err)
  //     skyGroup.remove(inst)
  //     astGeo.dispose(); astMat.dispose()
  //     asteroidPositionsPromise.then(renderAsteroidsAsPoints)
  //   })
  // } else {
  //   // 低端降级：用 Points 渲染小行星（无立体感但省 GPU）
  //   asteroidPositionsPromise.then(renderAsteroidsAsPoints)
  //     .catch(err => console.error('[useSky] 小行星降级渲染失败', err))
  // }

  // ═══ 阶段 3 P2-2：流星雨粒子系统（季节性触发） ═══
  // 活跃期内从辐射点向外发散的拖尾粒子
  // 粒子数按 GPU 等级：high=60, medium=40, low=20, fallback=0
  interface MeteorParticle {
    active: boolean       // 是否激活
    pos: Vector3          // 当前位置
    vel: Vector3          // 速度向量
    life: number          // 剩余寿命 (0~1)
    maxLife: number       // 总寿命
    color: Color          // 拖尾颜色
    trail: Float32Array   // 拖尾历史位置（用于线段渲染）
    trailLen: number      // 当前拖尾长度
  }
  const maxParticles = renderParams.meteorParticles
  const meteorParticles: MeteorParticle[] = []
  // OPT-25：流星拖尾改用 ShaderMaterial，加入程序化湍流抖动
  // 改进点：
  //   1. uTime uniform 驱动 sin 噪声，让 alpha 沿位置相位抖动（等离子体湍流感）
  //   2. 保留 vertexColors 通道，但片元 shader 中乘以 vAlpha 实现亮度调制
  //   3. 替代 LineBasicMaterial 的固定 opacity，获得"程序化形状"的视觉
  let meteorTrailMat: ShaderMaterial | null = null
  const meteorTrailLines: LineSegments | null = maxParticles > 0 ? (() => {
    // 拖尾用 LineSegments：每个粒子 8 段 = 16 个顶点
    const TRAIL_SEGMENTS = 8
    const totalVerts = maxParticles * TRAIL_SEGMENTS * 2
    const positions = new Float32Array(totalVerts * 3)
    const colors = new Float32Array(totalVerts * 3)
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(positions, 3))
    g.setAttribute('color', new BufferAttribute(colors, 3))
    meteorTrailMat = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.85 },
      },
      vertexShader: `
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        void main() {
          vColor = color;
          // 程序化湍流：基于位置相位 + 时间的 sin 噪声，让 alpha 抖动
          // 相邻顶点位置接近，相位接近，alpha 过渡连续；远处顶点相位差大，形成湍流
          float phase = position.x * 0.15 + position.y * 0.15 + position.z * 0.15;
          vAlpha = 0.75 + 0.25 * sin(uTime * 4.0 + phase);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uOpacity;
        void main() {
          // vColor 已包含寿命衰减（CPU 端预乘），vAlpha 是湍流抖动，uOpacity 是全局透明度
          gl_FragColor = vec4(vColor, vAlpha * uOpacity);
        }
      `,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      vertexColors: true,
    })
    const lines = new LineSegments(g, meteorTrailMat)
    lines.frustumCulled = false
    skyGroup.add(lines)
    // 初始化粒子池
    for (let i = 0; i < maxParticles; i++) {
      meteorParticles.push({
        active: false,
        pos: new Vector3(),
        vel: new Vector3(),
        life: 0,
        maxLife: 0,
        color: new Color(),
        trail: new Float32Array(TRAIL_SEGMENTS * 3),
        trailLen: 0,
      })
    }
    return lines
  })() : null

  // OPT-25：流星头部光晕 Points（参考 OPT-24 透视缩放模板 + fake-glow-material 思路）
  // 改进点：
  //   1. 每颗激活流星在当前位置渲染一个发光点，复用 OPT-24 透视缩放公式
  //   2. aSize 按寿命衰减（出现时大，消失时小）
  //   3. sin(uTime * 频率 + 粒子索引) 呼吸抖动，模拟等离子体"闪烁"
  //   4. 圆形软边缘 + AdditiveBlending，比 LineSegments 起点更亮
  let meteorHeadPoints: Points | null = null
  let meteorHeadPosAttr: BufferAttribute | null = null
  let meteorHeadSizeAttr: BufferAttribute | null = null
  let meteorHeadColorAttr: BufferAttribute | null = null
  let meteorHeadMat: ShaderMaterial | null = null
  if (maxParticles > 0) {
    const headPositions = new Float32Array(maxParticles * 3)
    const headSizes = new Float32Array(maxParticles)
    const headColors = new Float32Array(maxParticles * 3)
    const headGeo = new BufferGeometry()
    meteorHeadPosAttr = new BufferAttribute(headPositions, 3)
    meteorHeadSizeAttr = new BufferAttribute(headSizes, 1)
    meteorHeadColorAttr = new BufferAttribute(headColors, 3)
    headGeo.setAttribute('position', meteorHeadPosAttr)
    headGeo.setAttribute('aSize', meteorHeadSizeAttr)
    headGeo.setAttribute('aColor', meteorHeadColorAttr)
    // 初始 drawRange = 0（无激活流星时不渲染）
    headGeo.setDrawRange(0, 0)
    meteorHeadMat = new ShaderMaterial({
      uniforms: {
        uMap: { value: texCache.get(8) ?? glowTex('white', 32) },
        uDpr: { value: dpr },  // OPT-29：使用共享 dpr 变量，与 renderer.setPixelRatio 一致
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float aSize;
        attribute vec3 aColor;
        varying vec3 vColor;
        varying float vBreath;
        uniform float uDpr;
        uniform float uTime;
        void main() {
          vColor = aColor;
          // 呼吸抖动：sin(uTime * 6 + 粒子相位)，模拟等离子体闪烁
          // gl_VertexID 在 WebGL1 不可用，用 position 推导相位
          float phase = position.x * 0.3 + position.y * 0.3;
          vBreath = 0.85 + 0.15 * sin(uTime * 6.0 + phase);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          // 复用 OPT-24 透视缩放公式
          gl_PointSize = aSize * (300.0 * uDpr / max(1.0, -mvPosition.z));
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        varying vec3 vColor;
        varying float vBreath;
        void main() {
          // 圆形粒子 + 软边缘 discard
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          vec4 tex = texture2D(uMap, gl_PointCoord);
          // vBreath 调制亮度，让光晕"呼吸"
          gl_FragColor = vec4(vColor * vBreath, tex.a);
        }
      `,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      depthTest: true,
    })
    meteorHeadPoints = new Points(headGeo, meteorHeadMat)
    meteorHeadPoints.frustumCulled = false
    skyGroup.add(meteorHeadPoints)
  }

  // 当前活跃的流星雨（每小时刷新一次，基于模拟时间）
  let activeShowers: Array<MeteorShower & { intensity: number }> = []
  let lastShowerRefresh = 0
  function refreshShowers(date: Date = new Date()) {
    activeShowers = getActiveShowers(date)
    lastShowerRefresh = performance.now()
  }
  refreshShowers()

  // 发射一颗流星
  function spawnMeteor(particle: MeteorParticle) {
    if (activeShowers.length === 0) return
    // 按强度加权选流星雨
    const totalWeight = activeShowers.reduce((s, sh) => s + sh.intensity * sh.zhr, 0)
    let r = Math.random() * totalWeight
    let shower = activeShowers[0]
    for (const sh of activeShowers) {
      r -= sh.intensity * sh.zhr
      if (r <= 0) { shower = sh; break }
    }
    // 辐射点位置
    const radiant = raDecXYZ(shower.radiantRA, shower.radiantDec, SPHERE_RADIUS)
    // 在辐射点附近随机偏移（±5°）
    const offsetAngle = (Math.random() - 0.5) * 10 * D2R
    const offsetDir = new Vector3(radiant.x, radiant.y, radiant.z).normalize()
    // 随机切线方向
    const tangent = new Vector3(-offsetDir.y, offsetDir.x, 0).normalize()
    const finalPos = offsetDir.applyAxisAngle(tangent, offsetAngle).multiplyScalar(SPHERE_RADIUS)
    particle.pos.copy(finalPos)
    // 速度方向：从辐射点向外（沿天球切平面）
    // 切平面法向量 = finalPos.normalize()，取随机向量投影到切平面
    const normal = finalPos.clone().normalize()
    const randVec = new Vector3(
      Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5,
    )
    // 减去法向量分量，得到切平面内向量
    randVec.addScaledVector(normal, -randVec.dot(normal)).normalize()
    particle.vel.copy(randVec.multiplyScalar(shower.speed * 0.5))
    // 寿命：0.8~2.0 秒
    particle.maxLife = 0.8 + Math.random() * 1.2
    particle.life = particle.maxLife
    particle.color.set(shower.color)
    particle.trailLen = 0
    particle.active = true
  }

  /* [DISABLED 2026-07-28] 彗星渲染已禁用（用户反馈不需要），保留代码以备未来恢复
  // ═══ OPT-10：彗星渲染（哈雷 + 恩克，2 颗著名短/长周期彗星） ═══
  // 渲染策略（参考 axisrow/open-solar-system + N3rson/Solar-System-3D）：
  //   1. 彗核：IcosahedronGeometry + MeshBasicMaterial（additive，触发 bloom）
  //   2. 拖尾：Points + 自定义 ShaderMaterial，沿反太阳方向线性衰减
  //   3. 拖尾长度按 sunDist 反比：近日点附近拖尾最长（物理真实）
  //   4. 位置每帧重算（高偏心率轨道，位置变化显著）
  // GPU 分级：low/fallback 跳过拖尾，仅渲染彗核（保 FPS）
  const COMET_TAIL_PARTICLES = gpuCap.tier === 'high' ? 80
    : gpuCap.tier === 'medium' ? 50 : 0
  if (COMET_TAIL_PARTICLES > 0) {
    COMETS.forEach((comet: CometElement) => {
      // ── 彗核 ──
      const nucGeo = new IcosahedronGeometry(comet.nucleusSize * 0.8, 1)
      const [r, g, b] = hexRGB('#' + comet.color.toString(16).padStart(6, '0'))
      const nucMat = new MeshBasicMaterial({
        color: new Color(r, g, b),
        transparent: true,
        opacity: 0.95,
        blending: AdditiveBlending,
        depthWrite: false,
      })
      const nucleus = new Mesh(nucGeo, nucMat)
      nucleus.frustumCulled = false
      skyGroup.add(nucleus)

      // ── 彗星标签（CSS2D，自动跟随彗核位置） ──
      // OPT-26：labelMode='major-only' 时跳过彗星标签（低端设备降级）
      if (renderParams.labelMode === 'all') {
        const cometLabelEl = document.createElement('div')
        cometLabelEl.textContent = comet.nameCN
        cometLabelEl.style.cssText = 'color:#a8d8ff;font-size:10px;background:rgba(7,8,22,0.6);padding:1px 5px;border-radius:7px;border:1px solid rgba(168,216,255,0.25);backdrop-filter:blur(4px);white-space:nowrap;opacity:0.85'
        const cometLabel = new CSS2DObject(cometLabelEl)
        cometLabel.position.set(0, comet.nucleusSize * 1.5, 0)
        nucleus.add(cometLabel)
        // OPT-26：彗星标签注册到 LOD 数组（isMajor=false）
        labelLODItems.push({ label: cometLabel, parent: nucleus, isMajor: false })
      }

      // 彗星不可见 hitbox：彗核尺寸极小（0.48~0.36），hitbox 半径 2.5 保证可点击
      const cometHitboxRadius = 2.5
      const cometHitboxGeo = new SphereGeometry(cometHitboxRadius, 8, 6)
      const cometHitboxMat = new MeshBasicMaterial({ visible: false })
      const cometHitbox = new Mesh(cometHitboxGeo, cometHitboxMat)
      cometHitbox.userData = {
        planetName: comet.name,
        planetNameCN: comet.nameCN,
        planetId: comet.planetId,
        rotationPeriod: 0,
      }
      nucleus.add(cometHitbox)
      planetMeshes.push(cometHitbox)

      // ── 拖尾（Points + ShaderMaterial） ──
      // 顶点：N 个粒子沿反太阳方向分布，alpha 从 1.0 线性衰减到 0
      const N = COMET_TAIL_PARTICLES
      const tailPositions = new Float32Array(N * 3)
      const tailAlphas = new Float32Array(N)
      const tailGeo = new BufferGeometry()
      tailGeo.setAttribute('position', new BufferAttribute(tailPositions, 3))
      tailGeo.setAttribute('aAlpha', new BufferAttribute(tailAlphas, 1))

      const tailMat = new ShaderMaterial({
        uniforms: {
          uColor: { value: new Color(r, g, b) },
          uSize: { value: 12.0 },
          uTime: { value: 0 },
        },
        vertexShader: `
          attribute float aAlpha;
          uniform float uSize;
          varying float vAlpha;
          void main() {
            vAlpha = aAlpha;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            // 透视缩放：远距离粒子更小
            gl_PointSize = uSize * (300.0 / max(-mvPosition.z, 1.0)) * (0.5 + aAlpha * 0.5);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          varying float vAlpha;
          void main() {
            // 圆形粒子（软边缘）
            vec2 c = gl_PointCoord - 0.5;
            float d = length(c);
            if (d > 0.5) discard;
            float soft = smoothstep(0.5, 0.0, d);
            gl_FragColor = vec4(uColor, soft * vAlpha * 0.85);
          }
        `,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      })
      const tail = new Points(tailGeo, tailMat)
      tail.frustumCulled = false
      skyGroup.add(tail)

      cometUpdaters.push({
        nucleus, tail, tailMat, comet,
        tailPositions, tailAlphas,
      })
    })
  } else {
    // Low/Fallback tier：仅渲染彗核（无拖尾，省 GPU）
    COMETS.forEach((comet: CometElement) => {
      const nucGeo = new IcosahedronGeometry(comet.nucleusSize * 0.8, 0)
      const [r, g, b] = hexRGB('#' + comet.color.toString(16).padStart(6, '0'))
      const nucMat = new MeshBasicMaterial({
        color: new Color(r, g, b),
        transparent: true,
        opacity: 0.9,
        blending: AdditiveBlending,
        depthWrite: false,
      })
      const nucleus = new Mesh(nucGeo, nucMat)
      nucleus.frustumCulled = false
      skyGroup.add(nucleus)
      // 彗星标签（CSS2D，自动跟随彗核位置）
      // OPT-26：labelMode='major-only' 时跳过彗星标签（低端设备降级）
      if (renderParams.labelMode === 'all') {
        const cometLabelEl = document.createElement('div')
        cometLabelEl.textContent = comet.nameCN
        cometLabelEl.style.cssText = 'color:#a8d8ff;font-size:10px;background:rgba(7,8,22,0.6);padding:1px 5px;border-radius:7px;border:1px solid rgba(168,216,255,0.25);backdrop-filter:blur(4px);white-space:nowrap;opacity:0.85'
        const cometLabel = new CSS2DObject(cometLabelEl)
        cometLabel.position.set(0, comet.nucleusSize * 1.5, 0)
        nucleus.add(cometLabel)
        // OPT-26：彗星标签注册到 LOD 数组（isMajor=false）
        labelLODItems.push({ label: cometLabel, parent: nucleus, isMajor: false })
      }
      // 彗星不可见 hitbox（low tier 同样需要可点击）
      const cometHitboxRadius = 2.5
      const cometHitboxGeo = new SphereGeometry(cometHitboxRadius, 8, 6)
      const cometHitboxMat = new MeshBasicMaterial({ visible: false })
      const cometHitbox = new Mesh(cometHitboxGeo, cometHitboxMat)
      cometHitbox.userData = {
        planetName: comet.name,
        planetNameCN: comet.nameCN,
        planetId: comet.planetId,
        rotationPeriod: 0,
      }
      nucleus.add(cometHitbox)
      planetMeshes.push(cometHitbox)
      // 注册简化更新器（仅更新位置，无拖尾）
      cometUpdaters.push({
        nucleus, tail: null as unknown as Points,
        tailMat: null as unknown as ShaderMaterial,
        comet,
        tailPositions: new Float32Array(0),
        tailAlphas: new Float32Array(0),
      })
    })
  }
  */ // [END DISABLED] 彗星渲染

  // ═══ 渲染 ═══
  let af = 0
  // OPT-23：split-timing tween 的活动 rAF id（用于打断与 dispose 清理）
  // 当用户连续点击行星或卸载组件时，cancel 旧 tween 避免抖动与内存泄漏
  let activeTweenId: number | null = null
  let frameCount = 0  // OPT-14：帧计数器，用于太阳坐标缓存节流
  let hoverGlowTargetOpacity = 0
  let lstSyncAccum = 0
  let lastFrameTime = performance.now()
  // OPT-28：标签可见状态（沉浸模式切换），false 时跳过 labelRenderer.render() 节省 CPU
  let labelsVisible = true
  // OPT-27：?debug URL 参数启用 FPS/DrawCall 监控（零侵入，仅开发调试用）
  // 参考 dev-kreg/threejs-solar-system 的 ?debug 实现（A9 技巧）
  // 显示：FPS / 帧时间 / draw calls / triangles / 标签数
  const debugMode = typeof URLSearchParams !== 'undefined' &&
    new URLSearchParams(window.location.search).has('debug')
  let debugEl: HTMLDivElement | null = null
  let debugLastUpdate = 0
  let debugFrameCount = 0
  let debugFps = 0
  // OPT-36：FPS watchdog 自适应降级
  // 参考 galaxy-explorer 的 FPS watchdog 设计（2026-07 活跃项目）
  // 当 avg FPS < 30 持续 2 秒时，自动关闭 bloom（移动端最大单点性能收益）
  // 仅降级不自动恢复，避免反复切换导致视觉闪烁；用户重新加载页面可恢复
  let fpsWatchdogFrames = 0
  let fpsWatchdogStart = 0
  let bloomDisabled = false
  const FPS_WATCHDOG_THRESHOLD = 30   // 触发降级的 FPS 阈值
  const FPS_WATCHDOG_WINDOW_MS = 2000  // 检测窗口（2 秒）
  if (debugMode) {
    debugEl = document.createElement('div')
    debugEl.style.cssText = [
      'position:fixed', 'top:8px', 'left:8px', 'z-index:9999',
      'padding:6px 10px', 'border-radius:6px',
      'background:rgba(7,8,22,0.85)', 'color:#7fffd4',
      'font-family:ui-monospace,Monaco,monospace', 'font-size:11px',
      'line-height:1.5', 'pointer-events:none', 'white-space:pre',
      'border:1px solid rgba(127,255,212,0.25)',
    ].join(';')
    document.body.appendChild(debugEl)
  }
  // 监听页面可见性：切回前台时重置 lastFrameTime，避免下一帧 deltaMs 爆表导致 simTimeMs 跳变
  // 在 timeScale=1000 时，1 分钟后台 = 16.6 小时模拟时间跳变，会让行星位置瞬移
  // OPT-36 修复：同时重置 fpsWatchdogStart/fpsWatchdogFrames，否则后台 30s 后 elapsed≈30s 而 frames≈30
  //   → avgFps≈1.0 → 误触发 bloom 关闭（false positive）
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      lastFrameTime = performance.now()
      fpsWatchdogStart = 0
      fpsWatchdogFrames = 0
    }
  }, { signal: abortController.signal })
  function animate() {
    af = requestAnimationFrame(animate)
    camera.updateProjectionMatrix()
    frameCount++  // OPT-14：帧计数器递增（用于太阳坐标缓存节流）

    // 实时恒星漂移：按真实恒星时与基础 LST 的差修正 rotY
    // 已禁用：天球回归默认不旋转
    // if (observer) {
    //   lstSyncAccum += 16
    //   if (lstSyncAccum >= 5000) {
    //     lstSyncAccum = 0
    //     const jd = dateToJD(new Date())
    //     const cur = lstDeg(jd, observer.lon)
    //     let d = cur - lstRefDeg
    //     if (d > 180) d -= 360
    //     if (d < -180) d += 360
    //     baseRotY = -(cur / 15) * D2R
    //     lstRefDeg = cur
    //   }
    //   // 基础朝向 + 用户拖动偏移
    //   camera.rotation.set(
    //     baseRotX + (rotX - 0.3),
    //     baseRotY + rotY,
    //     0,
    //     'YXZ',
    //   )
    // }
    // 每日同步一次黄道顶点（已禁用：天球回归静态坐标系）
    // eclipticRefreshAccum += 16
    // if (eclipticRefreshAccum > 1000 * 60 * 60 * 24 && eclipticLine) {
    //   eclipticRefreshAccum = 0
    //   const now = new Date()
    //   const v: number[] = []
    //   for (let i = 0; i <= 360; i++) {
    //     const { ra, dec } = eclipticToRaDecJD(i, now)
    //     const p = raDecXYZ(ra, dec, SPHERE_RADIUS)
    //     v.push(p.x, p.y, p.z)
    //   }
    //   const next = new Float32Array(v)
    //   ;(eclipticLine.userData as { basePos: Float32Array }).basePos = next
    //   eclipticLine.geometry.setAttribute('position', new BufferAttribute(next, 3))
    //   eclipticLine.geometry.computeBoundingSphere()
    //   eclipticLine.computeLineDistances()
    // }
    // hover glow opacity lerp
    const sm = hoverGlow.material as SpriteMaterial
    sm.opacity += (hoverGlowTargetOpacity - sm.opacity) * 0.2
    if (sm.opacity < 0.01 && hoverGlowTargetOpacity === 0) {
      sm.opacity = 0
      hoverGlow.visible = false
    }
    // 行星 hover 光晕 opacity lerp（与恒星 hoverGlow 同模式）
    const phMat = planetHoverGlow.material as SpriteMaterial
    phMat.color.copy(planetHoverColor)
    phMat.opacity += (planetHoverTargetOpacity - phMat.opacity) * 0.2
    if (phMat.opacity < 0.01 && planetHoverTargetOpacity === 0) {
      phMat.opacity = 0
      planetHoverGlow.visible = false
    }
    // 特写模式：相机每帧跟随行星（行星在持续运动，timeScale 加速下尤甚）
    // counterexample: 不跟随会导致月球 1 秒飞出视野
    if (closeupState === 'CLOSEUP' && closeupTarget) {
      const pos = closeupTarget.updater.tiltGroup.position
      _closeupWorld.set(pos.x, pos.y, pos.z).applyMatrix4(skyGroup.matrixWorld)
      // 相机沿当前朝向反方向 dist 处，保持盘面在视野中心
      _closeupDir.set(0, 0, -1).applyQuaternion(camera.quaternion)
      camera.position.copy(_closeupWorld).sub(_closeupDir.multiplyScalar(closeupTarget.dist))
      // 每帧重新朝向行星：行星在持续运动（timeScale 加速下尤甚），
      // 若只跟位置不跟朝向，行星会逐渐飞出视野中心
      // counterexample: 月球公转周期 27 天，timeScale=100 时 6.5 小时一圈，不跟朝向会丢失
      camera.lookAt(_closeupWorld)
    }
    // 星座连线 opacity lerp（淡入淡出系数与 glow 比例通过 cfg 配置）
    // issue #34：原硬编码 0.15 / 0.43 → cfg.constellationLerpFactor / cfg.constellationGlowRatio
    for (const grp of constellationLineGroups.values()) {
      const mainMat = grp.main.material as LineMaterial
      const glowMat = grp.glow.material as LineMaterial
      mainMat.opacity += (grp.targetOpacity - mainMat.opacity) * cfg.constellationLerpFactor
      glowMat.opacity += (grp.targetOpacity * cfg.constellationGlowRatio - glowMat.opacity) * cfg.constellationLerpFactor
      if (grp.targetOpacity === 0 && mainMat.opacity < 0.005) {
        mainMat.opacity = 0
        glowMat.opacity = 0
      }
    }
    // 定位高亮呼吸动画（2s 后自动消失）
    const _now = performance.now()
    if (locateHighlightUntil > 0) {
      if (_now >= locateHighlightUntil) {
        locateHighlight.visible = false
        ;(locateHighlight.material as SpriteMaterial).opacity = 0
        locateHighlightUntil = 0
      } else {
        const remaining = locateHighlightUntil - _now
        const fadeProgress = remaining / 2000 // 0→1
        const pulse = Math.sin(_now * 0.008) * 0.5 + 0.5
        const scale = 10 + pulse * 15 // 10~25 呼吸
        locateHighlight.scale.set(scale, scale, 1)
        ;(locateHighlight.material as SpriteMaterial).opacity = fadeProgress * (0.4 + pulse * 0.6)
      }
    }
    // 有故事的星：呼吸辉光动画
    for (const sg of storyGlows) {
      const t = ((_now + sg.phase * 1000) % sg.period) / sg.period
      const breath = (Math.sin(t * Math.PI * 2 - Math.PI / 2) + 1) * 0.5
      ;(sg.sprite.material as SpriteMaterial).opacity = 0.15 + breath * 0.55
    }
    // 行星自转（14-A §4）：rotationPeriod 单位为小时，负值表示逆向自转
    // clamp deltaMs 到 250ms：visibilitychange 已重置 lastFrameTime，但极端情况下（卡顿/调试断点）仍需兜底
    const deltaMs = Math.min(_now - lastFrameTime, 250)
    lastFrameTime = _now
    // ─── 行星公转：每帧重算位置（实时模拟运动，参考 NASA Eyes / Stellarium） ───
    // simTimeMs 按 timeScale 累积，支持加速演示；timeScale=1 时为真实时间
    simTimeMs += deltaMs * timeScale
    if (AE && bodyMapRef && observerForPlanets && planetUpdaters.length > 0) {
      const simDate = new Date(simTimeMs)
      // 复用 Observer 对象，避免每帧 new
      _reusedObserver.latitude = observerForPlanets.lat
      _reusedObserver.longitude = observerForPlanets.lng
      _reusedObserver.height = 0
      const R = SPHERE_RADIUS * 0.98
      for (const { tiltGroup, bodyName } of planetUpdaters) {
        const bodyKey = bodyMapRef[bodyName]
        if (!bodyKey) continue
        const body = (AE.Body as unknown as Record<string, unknown>)[bodyKey] as
          typeof AE.Body.Sun
        if (!body) continue
        try {
          // ofdate=false：返回 J2000 平均赤道坐标（不含岁差）
          // 必须与恒星表（J2000）、小行星/彗星（手动黄赤转换用 J2000 ε=23.44°）、伽利略卫星统一参考系
          // 否则 J2000→2026 累积岁差 ≈ 0.36°，Moon 视差尤为明显，行星会偏离背景星空
          const eq = AE.Equator(body, simDate, _reusedObserver, false, false)
          const v = raDecXYZ(eq.ra, eq.dec, R)
          tiltGroup.position.set(v.x, v.y, v.z)
          // 太阳光源跟随太阳 tiltGroup
          if (bodyName === 'Sun' && sunLightRef) {
            sunLightRef.position.set(v.x, v.y, v.z)
          }
        } catch {
          // 单帧计算失败静默跳过，避免 animate 循环中断
        }
      }
      // ─── 行星视星等动态调整（每 1s 更新一次） ───
      // astronomy-engine Illumination API 计算视星等，映射到 mesh.scale + opacity
      // 金星最亮 mag=-4.9 → 1.5x，木星 mag=-2.9 → 1.3x，火星 mag=+1 → 0.9x
      // 接近合（AngleFromSun<5°）时 opacity 降低，模拟行星被太阳光淹没
      if (_now - lastMagUpdate > 1000) {
        lastMagUpdate = _now
        for (const { bodyName, mesh } of planetUpdaters) {
          if (bodyName === 'Sun') continue
          const bodyKey = bodyMapRef[bodyName]
          if (!bodyKey) continue
          const body = (AE.Body as unknown as Record<string, unknown>)[bodyKey] as typeof AE.Body.Sun
          if (!body) continue
          try {
            const illum = AE.Illumination(body, simDate)
            const mag = illum.mag
            // size 微调：mag=-4 → 1.5x, mag=0 → 1.0x, mag=+4 → 0.6x
            const sizeFactor = Math.max(0.5, Math.min(1.5, 1.0 - 0.15 * mag))
            mesh.scale.setScalar(sizeFactor)
            // 接近合时弱化（AngleFromSun < 10° 开始降低 opacity）
            // 注意：astronomy-engine JS 版 AngleFromSun 已返回「度」（范围 [0,180]），不要再 * 180/π
            const angleFromSun = AE.AngleFromSun(body, simDate)
            const mat = mesh.material as MeshPhongMaterial
            mat.transparent = true
            const conjFactor = Math.max(0.25, Math.min(1.0, (angleFromSun - 2) / 8))
            const magFactor = Math.max(0.4, Math.min(1.0, 1.1 - 0.1 * mag))
            mat.opacity = conjFactor * magFactor
          } catch {
            // 视星等计算失败静默跳过
          }
        }
      }
      // ─── OPT-17：地球日心位置循环外提取一次，伽利略卫星/小行星/彗星共用 ───
      // 地球日心位置对所有天体都相同，避免在三个独立 if 块中重复调用 HelioVector(Earth)
      // 节省 ~10 次/帧的 HelioVector 调用（每次 50-100μs，共 500μs-1ms/帧）
      // 仅在至少一个下游需要时才提取（lazy 计算）
      // [DISABLED 2026-07-27] 小行星带已禁用，移除 asteroidInst 判断
      // [DISABLED 2026-07-28] 彗星已禁用，移除 cometUpdaters 判断
      const needEarthHelio = (moonSprites.length === 4 && _reusedMoonVec)
      const earthHelio = needEarthHelio ? AE.HelioVector(AE.Body.Earth, simDate) : null
      // ─── 伽利略卫星（木卫 1-4）实时位置 ───
      // JupiterMoons 返回 jovicentric EQJ 向量（AU）
      // 卫星地心向量 = (木星日心 + jovicentric) - 地球日心
      // 用 EquatorFromVector 转 RA/Dec（J2000），与恒星参考系一致
      if (moonSprites.length === 4 && _reusedMoonVec && earthHelio) {
        try {
          const earth = earthHelio
          const jup = AE.HelioVector(AE.Body.Jupiter, simDate)
          const moons = AE.JupiterMoons(simDate)
          const moonStates = [moons.io, moons.europa, moons.ganymede, moons.callisto]
          for (let i = 0; i < 4; i++) {
            const ms = moonStates[i]
            _reusedMoonVec.x = jup.x + ms.x - earth.x
            _reusedMoonVec.y = jup.y + ms.y - earth.y
            _reusedMoonVec.z = jup.z + ms.z - earth.z
            _reusedMoonVec.t = jup.t  // AstroTime 复用，jup.t 已是 AstroTime
            const moonEq = AE.EquatorFromVector(_reusedMoonVec)
            const mv = raDecXYZ(moonEq.ra, moonEq.dec, R)
            moonSprites[i].position.set(mv.x, mv.y, mv.z)
            moonSprites[i].visible = true
          }
        } catch {
          // 卫星位置计算失败静默跳过
        }
      }
      // ─── 土星环 uSunDirWorld / uPlanetCenter 每帧更新（P1 优化：world-space） ───
      // 注意：sunLight 和 tiltGroup 都是 skyGroup 的子节点，其 .position 是 skyGroup-local 坐标
      // 而 shader 中的 vWorldPos 是世界坐标，必须统一用世界坐标
      // 否则 skyGroup 旋转后（applyAstroRotation/rotateX/Y/Z），光照方向会偏离真实太阳-土星几何
      // 与 OPT-16（line 2785-2789）保持一致：用 getWorldPosition 获取世界坐标
      if (ringUpdaters.length > 0 && sunLightRef) {
        for (const { ringMat, tiltGroup } of ringUpdaters) {
          sunLightRef.getWorldPosition(_reusedSunWorld)
          tiltGroup.getWorldPosition(_reusedRingWorld)
          _reusedSunDir.copy(_reusedSunWorld).sub(_reusedRingWorld).normalize()
          ;(ringMat.uniforms.uSunDirWorld.value as Vector3).copy(_reusedSunDir)
          ;(ringMat.uniforms.uPlanetCenter.value as Vector3).copy(_reusedRingWorld)
        }
      }
      // ─── OPT-9 大气层 uSunDirWorld 每帧更新（太阳与行星都在运动） ───
      // 注意：sunLight 和 tiltGroup 都是 skyGroup 的子节点，其 .position 是 skyGroup-local 坐标
      // 而 shader 中的 uSunDirWorld 是世界坐标，必须用 getWorldPosition 统一
      // 否则 skyGroup 旋转后（applyAstroRotation），大气光照方向会偏离真实太阳-行星几何
      // P1 修复：与土星环（ringUpdaters）和 OPT-16 阴影保持一致，使用 world-space
      if (atmosphereUpdaters.length > 0 && sunLightRef) {
        sunLightRef.getWorldPosition(_reusedSunWorld)
        for (const { atmoMat, planetName } of atmosphereUpdaters) {
          const updater = planetUpdaters.find(u => u.bodyName === planetName)
          if (!updater) continue
          updater.tiltGroup.getWorldPosition(_reusedRingWorld)
          _reusedSunDir.copy(_reusedSunWorld).sub(_reusedRingWorld).normalize()
          ;(atmoMat.uniforms.uSunDirWorld.value as Vector3).copy(_reusedSunDir)
        }
      }
      // ─── OPT-16 土星环阴影 uniforms 每帧更新（太阳与土星都在运动） ───
      // 注意：sunLight 是 skyGroup 的子节点（line 1135），其 .position 是 skyGroup-local 坐标
      // 而 vWorldPos/uRingCenterWorld/uRingNormalWorld 都是世界坐标，必须统一用世界坐标
      // 否则 skyGroup 旋转后（applyAstroRotation/rotateX/Y/Z），阴影方向会偏离真实太阳-土星几何
      if (saturnShadowUpdaters.length > 0 && sunLightRef) {
        for (const su of saturnShadowUpdaters) {
          // 太阳世界坐标（必须用 getWorldPosition，不能用 .position）
          sunLightRef.getWorldPosition(su.uSunWorldPos.value)
          // 土星世界坐标
          su.tiltGroup.getWorldPosition(su.uRingCenterWorld.value)
          // 环法向量：tiltGroup 局部 Y 轴转世界坐标（transformDirection 不归一化，需补 normalize 防未来 scale 引入）
          su.uRingNormalWorld.value.set(0, 1, 0).transformDirection(su.tiltGroup.matrixWorld).normalize()
        }
      }
      // ─── 小行星实时位置（每帧重算，与行星一致） ───
      // [DISABLED 2026-07-27] 小行星带已禁用，整段更新代码注释
      // 8 颗小行星每日移动 0.21-0.33°，不更新会明显偏离真实位置
      // 用同步版本避免每帧动态 import；位置失败静默跳过
      // OPT-17：复用循环外提取的 earthHelio，避免每颗小行星重复调用 HelioVector(Earth)
      // if (asteroidInst && asteroidInst.visible && earthHelio) {
      //   const astR = SPHERE_RADIUS * 0.95
      //   for (let i = 0; i < ASTEROIDS.length; i++) {
      //     const ast = ASTEROIDS[i]
      //     const pos = getAsteroidPositionSync(AE, ast, simDate, earthHelio)
      //     if (!pos) continue
      //     const v = raDecXYZ(pos.ra, pos.dec, astR)
      //     asteroidDummy.position.set(v.x, v.y, v.z)
      //     // 大小按视星等反比（与初始化一致）
      //     const size = Math.max(0.5, 2.5 - (ast.mag - 5.9) * 0.4)
      //     asteroidDummy.scale.set(size, size, size)
      //     // 自转倾角保持静态（与初始化一致）
      //     asteroidDummy.rotation.set(
      //       (ast.number * 0.7) % Math.PI,
      //       (ast.number * 1.3) % (2 * Math.PI),
      //       (ast.number * 0.5) % Math.PI,
      //     )
      //     asteroidDummy.updateMatrix()
      //     asteroidInst.setMatrixAt(i, asteroidDummy.matrix)
      //   }
      //   asteroidInst.instanceMatrix.needsUpdate = true
      // }
      // ─── [DISABLED 2026-07-28] 彗星实时位置 + 拖尾更新已禁用 ───
      /* 彗星系统已禁用，保留代码以备未来恢复
      // ─── OPT-10 彗星实时位置 + 拖尾更新（每帧重算） ───
      // 彗星高偏心率轨道，位置变化显著，必须每帧重算
      // 拖尾方向 = 反太阳方向（cometTailDirection 计算）
      // 拖尾长度按 sunDist 反比：近日点附近最长（物理真实，参考真实彗星观测）
      if (cometUpdaters.length > 0 && AE) {
        // OPT-14：太阳赤道坐标缓存（太阳 RA/Dec 每天变化 <1°，无需每帧重算）
        // 缓存策略：timeScale<=100 时每 60 帧（~1s）更新；timeScale>100 时每帧更新（加速时太阳位置变化快）
        const needRefresh = timeScale > 100 || (frameCount - _sunCacheFrame) >= 60
        if (needRefresh) {
          try {
            // B0-2 修复：ofdate=false（J2000），与行星/恒星参考系统一
            const sunEq = AE.Equator(AE.Body.Sun, simDate, _reusedObserver, false, false)
            _sunRaCache = sunEq.ra
            _sunDecCache = sunEq.dec
            _sunCacheFrame = frameCount
          } catch { // 太阳位置失败时拖尾方向退化为准
          }
        }
        const sunRa = _sunRaCache
        const sunDec = _sunDecCache
        const cometR = SPHERE_RADIUS * 0.92
        for (const cu of cometUpdaters) {
          const pos = getCometPositionSync(AE, cu.comet, simDate, earthHelio || undefined)
          if (!pos) {
            cu.nucleus.visible = false
            if (cu.tail) cu.tail.visible = false
            continue
          }
          cu.nucleus.visible = true
          const v = raDecXYZ(pos.ra, pos.dec, cometR)
          cu.nucleus.position.set(v.x, v.y, v.z)
          // 拖尾更新（仅 high/medium tier）
          if (cu.tail && cu.tailPositions.length > 0) {
            cu.tail.visible = true
            const tailDir = cometTailDirection(pos.ra, pos.dec, sunRa, sunDec)
            // 拖尾长度：近日点（sunDist 小）拖尾长，远日点拖尾短
            // 物理模型：tail_length ∝ 1/sunDist^1.5（简化版）
            const baseLen = 25.0
            const tailLen = baseLen / Math.max(0.3, Math.pow(pos.sunDist, 1.5))
            const N = cu.tailPositions.length / 3
            // OPT-14：复用 Vector3，避免每帧 new（2 彗星 × 60fps = 120 对象/秒）
            _reusedTailEnd.set(
              v.x + tailDir.dx * tailLen,
              v.y + tailDir.dy * tailLen,
              v.z + tailDir.dz * tailLen,
            )
            // 沿拖尾方向分布 N 个粒子，alpha 从 1.0 线性衰减到 0
            for (let i = 0; i < N; i++) {
              const t = N > 1 ? i / (N - 1) : 0
              // 加少量随机扰动让拖尾更自然（基于 i 确定性扰动，避免每帧抖动）
              // 注意：JS 的 % 对负数保留符号，需用 fract(x) = x - floor(x) 确保 [0,1)
              // OPT-14：预计算 sin 值，避免重复调用；内联 fract 避免函数对象创建
              const s1 = Math.sin(i * 12.9898) * 43758.5453
              const s2 = Math.sin(i * 78.233) * 43758.5453
              const s3 = Math.sin(i * 23.171) * 43758.5453
              const jx = (s1 - Math.floor(s1) - 0.5) * 0.5 * t
              const jy = (s2 - Math.floor(s2) - 0.5) * 0.5 * t
              const jz = (s3 - Math.floor(s3) - 0.5) * 0.5 * t
              cu.tailPositions[i * 3]     = v.x + (_reusedTailEnd.x - v.x) * t + jx
              cu.tailPositions[i * 3 + 1] = v.y + (_reusedTailEnd.y - v.y) * t + jy
              cu.tailPositions[i * 3 + 2] = v.z + (_reusedTailEnd.z - v.z) * t + jz
              cu.tailAlphas[i] = (1.0 - t) * 0.9
            }
            ;(cu.tail.geometry.attributes.position as BufferAttribute).needsUpdate = true
            ;(cu.tail.geometry.attributes.aAlpha as BufferAttribute).needsUpdate = true
            if (cu.tailMat) (cu.tailMat.uniforms.uTime.value as number) = simTimeMs / 1000
          }
        }
      }
      */ // [END DISABLED] 彗星位置更新
    }
    for (const mesh of planetMeshes) {
      const ud = mesh.userData as { rotationPeriod?: number }
      if (ud.rotationPeriod) {
        // 每秒转 360/period 度（period 单位小时）；基础加速 60 倍便于肉眼观察
        // timeScale>60 时改用对数缩放，避免高速下行星自转眩晕（timeScale=1000→有效 120×）
        const rotScale = timeScale <= 60 ? timeScale : 60 * (1 + Math.log10(timeScale / 60))
        const degPerMs = 360 / (ud.rotationPeriod * 3600 * 1000) * 60
        mesh.rotation.y += degPerMs * deltaMs * rotScale * Math.PI / 180
      }
    }
    // OPT-2：太阳颗粒 shader uTime 更新（基于 simTimeMs，timeScale 加速时颗粒漂移也加速）
    // 使用 simTimeMs 而非 _now，确保 timeScale=1000 时颗粒演化可见
    if (sunSurfaceMat) {
      (sunSurfaceMat.uniforms.uTime.value as number) = simTimeMs / 1000
    }
    // ─── 阶段 3 P2-2：流星雨粒子更新 ───
    // 每小时刷新一次活跃流星雨列表（基于模拟时间，加速时也能正确切换季节）
    if (_now - lastShowerRefresh > 3600 * 1000) refreshShowers(new Date(simTimeMs))
    // OPT-25：更新流星拖尾和头部光晕的 uTime uniform
    const meteorTime = simTimeMs / 1000
    if (meteorTrailMat) (meteorTrailMat.uniforms.uTime.value as number) = meteorTime
    if (meteorHeadMat) (meteorHeadMat.uniforms.uTime.value as number) = meteorTime
    if (meteorTrailLines && maxParticles > 0) {
      const TRAIL_SEGMENTS = 8
      const posAttr = meteorTrailLines.geometry.attributes.position as BufferAttribute
      const colAttr = meteorTrailLines.geometry.attributes.color as BufferAttribute
      const posArr = posAttr.array as Float32Array
      const colArr = colAttr.array as Float32Array
      // 清空顶点（避免残留）
      posArr.fill(0)
      colArr.fill(0)
      let writeIdx = 0  // 顶点写入位置
      // OPT-25：head points 写入索引（独立于拖尾 writeIdx）
      let headIdx = 0
      const headPosArr = meteorHeadPosAttr ? meteorHeadPosAttr.array as Float32Array : null
      const headSizeArr = meteorHeadSizeAttr ? meteorHeadSizeAttr.array as Float32Array : null
      const headColorArr = meteorHeadColorAttr ? meteorHeadColorAttr.array as Float32Array : null
      for (let i = 0; i < maxParticles; i++) {
        const p = meteorParticles[i]
        // 激活粒子：更新位置 + 寿命
        if (p.active) {
          p.life -= deltaMs / 1000
          if (p.life <= 0) {
            p.active = false
            continue
          }
          // 位置更新（速度 × deltaMs，缩放以适应天球尺度）
          p.pos.x += p.vel.x * deltaMs * 0.01
          p.pos.y += p.vel.y * deltaMs * 0.01
          p.pos.z += p.vel.z * deltaMs * 0.01
          // 拖尾：先 shift 历史点（k=N→1），再写入新位置到 trail[0]
          // 顺序不能反：若先写 trail[0] 再 shift，shift 会把新点复制到 trail[1]
          for (let k = TRAIL_SEGMENTS - 1; k > 0; k--) {
            p.trail[k * 3]     = p.trail[(k - 1) * 3]
            p.trail[k * 3 + 1] = p.trail[(k - 1) * 3 + 1]
            p.trail[k * 3 + 2] = p.trail[(k - 1) * 3 + 2]
          }
          p.trail[0] = p.pos.x; p.trail[1] = p.pos.y; p.trail[2] = p.pos.z
          if (p.trailLen < TRAIL_SEGMENTS) p.trailLen++
          // 写入拖尾线段（每段 2 个顶点）
          const alpha = p.life / p.maxLife  // 寿命衰减
          for (let k = 0; k < p.trailLen - 1 && writeIdx + 1 < posArr.length / 3; k++) {
            posArr[writeIdx * 3]     = p.trail[k * 3]
            posArr[writeIdx * 3 + 1] = p.trail[k * 3 + 1]
            posArr[writeIdx * 3 + 2] = p.trail[k * 3 + 2]
            colArr[writeIdx * 3]     = p.color.r * alpha
            colArr[writeIdx * 3 + 1] = p.color.g * alpha
            colArr[writeIdx * 3 + 2] = p.color.b * alpha
            writeIdx++
            posArr[writeIdx * 3]     = p.trail[(k + 1) * 3]
            posArr[writeIdx * 3 + 1] = p.trail[(k + 1) * 3 + 1]
            posArr[writeIdx * 3 + 2] = p.trail[(k + 1) * 3 + 2]
            colArr[writeIdx * 3]     = p.color.r * alpha * 0.3
            colArr[writeIdx * 3 + 1] = p.color.g * alpha * 0.3
            colArr[writeIdx * 3 + 2] = p.color.b * alpha * 0.3
            writeIdx++
          }
          // OPT-25：写入头部光晕点（每颗激活流星一个点）
          if (headPosArr && headSizeArr && headColorArr && headIdx < maxParticles) {
            headPosArr[headIdx * 3]     = p.pos.x
            headPosArr[headIdx * 3 + 1] = p.pos.y
            headPosArr[headIdx * 3 + 2] = p.pos.z
            // aSize 按寿命衰减：出现时大（alpha≈1），消失时小（alpha≈0）
            // 基准 12.0 让光晕比小行星（基准 6.0）更醒目，符合流星头部亮度
            headSizeArr[headIdx] = 12.0 * alpha
            headColorArr[headIdx * 3]     = p.color.r
            headColorArr[headIdx * 3 + 1] = p.color.g
            headColorArr[headIdx * 3 + 2] = p.color.b
            headIdx++
          }
        } else if (activeShowers.length > 0) {
          // 真实 ZHR 速率：spawn 概率 = 总有效 ZHR / 2000，封顶 0.15
          // 英仙座 ZHR=100 → 0.05/帧 ≈ 3 颗/秒；双子座 ZHR=120 → 0.06/帧
          // 视觉增强倍数让流星雨肉眼可见（真实 ZHR=100 实际每秒仅 0.028 颗）
          const totalZHR = activeShowers.reduce((s, sh) => s + sh.zhr * sh.intensity, 0)
          const spawnProb = Math.min(0.15, totalZHR / 2000)
          if (Math.random() < spawnProb) spawnMeteor(p)
        }
      }
      posAttr.needsUpdate = true
      colAttr.needsUpdate = true
      meteorTrailLines.geometry.setDrawRange(0, writeIdx)
      // OPT-25：更新 head points 的 drawRange 和 needsUpdate
      if (meteorHeadPoints && meteorHeadPosAttr && meteorHeadSizeAttr && meteorHeadColorAttr) {
        meteorHeadPoints.geometry.setDrawRange(0, headIdx)
        meteorHeadPosAttr.needsUpdate = true
        meteorHeadSizeAttr.needsUpdate = true
        meteorHeadColorAttr.needsUpdate = true
      }
    }
    // 内核连线呼吸动画
    if (kernelLinesGroup.visible) {
      const kernelBreath = (Math.sin(_now * 0.002) + 1) * 0.5
      for (const child of kernelLinesGroup.children) {
        if (child instanceof LineSegments) {
          const mat = child.material as LineBasicMaterial
          mat.opacity = 0.35 + kernelBreath * 0.45
        }
      }
    }
    // OPT-26：标签距离 LOD（仅 labelLODDistance > 0 时启用）
    // 每帧检查每个标签的父对象到相机的世界距离，超过阈值则隐藏
    // isMajor=true 的标签（行星/Sun/Moon）不受距离 LOD 影响，始终显示
    // 复用 _lodVec 避免 GC，~15 个标签 × distanceTo ≈ 15μs/帧，可忽略
    if (renderParams.labelLODDistance > 0 && labelLODItems.length > 0) {
      const threshold = renderParams.labelLODDistance
      for (const item of labelLODItems) {
        if (item.isMajor) continue  // 主要标签始终显示
        item.parent.getWorldPosition(_lodVec)
        const dist = camera.position.distanceTo(_lodVec)
        // 加 0.1 滞后区避免临界值闪烁（参考 OPT 调研 D3 hysteresis）
        if (dist > threshold + 0.1) {
          item.label.visible = false
        } else if (dist < threshold - 0.1) {
          item.label.visible = true
        }
      }
    }
    // 星名标注：靠近视角中心时显示名称（平滑淡入淡出）
    if (starNameLabels.size > 0) {
      camera.getWorldDirection(_camDir)
      const thresholdRad = cfg.nameLabelFovDeg * D2R
      const innerRad = thresholdRad * 0.55  // 完全可见区
      const outerRad = thresholdRad          // 完全隐藏区
      const fadeRange = outerRad - innerRad
      const centerCons = new Set<string>()  // 靠近中心的星星所属星座
      for (const [starId, label] of starNameLabels) {
        const star = starById.get(starId)
        if (!star) continue
        _starDir.set(star.x, star.y, star.z).applyMatrix4(skyGroup.matrixWorld).normalize()
        const angle = Math.acos(Math.max(-1, Math.min(1, _camDir.dot(_starDir))))
        // 与星名显示相同条件：在 thresholdRad 内就收集星座
        if (angle < thresholdRad && star.con) centerCons.add(star.con)
        // 平滑过渡：inner 以内 opacity=1，outer 以外 opacity=0，中间线性插值
        const target = angle <= innerRad ? 1 : angle >= outerRad ? 0 : 1 - (angle - innerRad) / fadeRange
        const cur = starNameOpacities.get(starId) ?? 0
        const next = cur + (target - cur) * 0.12 // 帧间 lerp
        starNameOpacities.set(starId, next)
        if (next > 0.005) {
          if (!label.visible) label.visible = true
          ;(label.element.firstChild as HTMLElement).style.opacity = String(next)
        } else if (label.visible) {
          label.visible = false
          ;(label.element.firstChild as HTMLElement).style.opacity = '0'
        }
      }
      // 靠近视角中心时自动显示星座连线
      // 同时包含 hover 星星的星座，确保 hover 时其他连线不消失
      if (hoveredStarId !== -1) {
        const hoveredStar = starById.get(hoveredStarId)
        if (hoveredStar?.con) centerCons.add(hoveredStar.con)
      }
      for (const [abbr, grp] of constellationLineGroups) {
        grp.targetOpacity = centerCons.has(abbr) ? cfg.constellationOpacity : 0
      }
      for (const [abbr, el] of constellationLabelEls) {
        el.style.opacity = centerCons.has(abbr) ? String(cfg.constellationLabelOpacity) : '0'
      }
    }
    // OPT-28：沉浸模式下跳过 labelRenderer.render()，节省 DOM 操作开销
    if (labelsVisible) {
      labelRenderer.render(scene, camera)
    } else {
      // 隐藏所有 CSS2DObject 的 DOM 元素（labelRenderer 不调用时不会自动隐藏）
      lrEl.style.display = 'none'
    }
    // 用 composer 替代 renderer.render，自动应用 Bloom + Vignette + ACES
    composer.render()
    // OPT-27：?debug 模式下每 500ms 更新一次 FPS/draw calls/标签数
    // 每 500ms 而非每帧更新，避免 DOM 操作影响测量准确性
    if (debugEl) {
      debugFrameCount++
      const now = performance.now()
      if (now - debugLastUpdate >= 500) {
        const dt = now - debugLastUpdate
        debugFps = Math.round((debugFrameCount * 1000) / dt)
        debugFrameCount = 0
        debugLastUpdate = now
        const info = renderer.info
        const visibleLabels = labelLODItems.filter(i => i.label.visible).length
        const tier = gpuCap.tier
        const mem = info.memory
        const render = info.render
        debugEl.textContent =
          `FPS: ${debugFps}\n` +
          `tier: ${tier}  labelMode: ${renderParams.labelMode}\n` +
          `draw calls: ${render.calls}  triangles: ${render.triangles}\n` +
          `geometries: ${mem.geometries}  textures: ${mem.textures}\n` +
          `labels: ${visibleLabels}/${labelLODItems.length}  timeScale: ${timeScale}x\n` +
          `bloom: ${bloomDisabled ? 'OFF (watchdog)' : (bloomPass ? 'ON' : 'N/A')}`
      }
    }
    // OPT-36：FPS watchdog 自适应降级
    // 仅对启用了 bloom 的场景生效（Low/Fallback tier 无 bloom，无需降级）
    if (bloomPass && !bloomDisabled) {
      fpsWatchdogFrames++
      const now = performance.now()
      if (fpsWatchdogStart === 0) fpsWatchdogStart = now
      const elapsed = now - fpsWatchdogStart
      if (elapsed >= FPS_WATCHDOG_WINDOW_MS) {
        const avgFps = (fpsWatchdogFrames * 1000) / elapsed
        if (avgFps < FPS_WATCHDOG_THRESHOLD) {
          composer.removePass(bloomPass)
          bloomPass.enabled = false
          bloomDisabled = true
          console.warn(`[OPT-36] FPS watchdog: avg ${avgFps.toFixed(1)} FPS < ${FPS_WATCHDOG_THRESHOLD}, bloom 已关闭`)
        }
        fpsWatchdogFrames = 0
        fpsWatchdogStart = now
      }
    }
  }
  animate()
  if (!observer) camera.rotation.set(rotX, rotY, 0, 'YXZ')

  return {
    camera,
    zoomIn()  { userFov = Math.max(FOV_MIN, userFov - 5); camera.fov = userFov; },
    zoomOut() { userFov = Math.min(FOV_MAX, userFov + 5); camera.fov = userFov; },
    // 设置时间加速倍率（1=真实时间，100=加速 100 倍观察行星运动）
    setTimeScale(scale: number) { timeScale = Math.max(1, Math.min(10000, Math.round(scale))); },
    // 获取当前时间倍率
    getTimeScale() { return timeScale; },
    // OPT-28：切换标签显示（沉浸模式）
    toggleLabels() {
      labelsVisible = !labelsVisible
      // 立即同步 DOM 显示状态，避免等待下一帧 animate 造成 16ms 视觉延迟
      // OPT-32 审核修复：原实现仅在 labelsVisible=true 时设置 display=''，
      // 切换为 false 时依赖 animate 循环的 else 分支设置 display='none'，
      // 导致 UI 状态与视觉状态有 1 帧延迟
      lrEl.style.display = labelsVisible ? '' : 'none'
      return labelsVisible
    },
    // issue #34：切换所有星座连线常驻显示
    // - 切换 showAllConstellations 状态
    // - 立即应用新可见性（无需等待 hover）
    // - 返回切换后的状态
    toggleConstellations() {
      cfg.showAllConstellations = !cfg.showAllConstellations
      // 立即应用：如果当前有 hover 星座，按 hover 高亮；否则按 idle 显示
      // 此处无法访问 hoveredStarId（在 pointermove 闭包内），所以统一按 null 处理
      // 当用户下次 hover 时会自动通过 applyConstellationVisibility 重新计算
      if (cfg.showAllConstellations) {
        for (const grp of constellationLineGroups.values()) {
          grp.targetOpacity = cfg.constellationIdleOpacity
        }
      } else {
        for (const grp of constellationLineGroups.values()) grp.targetOpacity = 0
        for (const el of constellationLabelEls.values()) el.style.opacity = '0'
      }
      return cfg.showAllConstellations
    },
    // issue #34：运行时更新星空显示配置（部分覆盖）
    // - 合并 patch 到 cfg
    // - 若涉及连线颜色，立即更新材质 color
    // - 若涉及 idle opacity 且 showAllConstellations=true，立即更新 targetOpacity
    updateDisplayConfig(patch: Partial<StarDisplayConfig>) {
      const oldShowAll = cfg.showAllConstellations
      const oldLineColor = cfg.constellationLineColor
      const oldGlowColor = cfg.constellationGlowColor
      const oldLabelColor = cfg.constellationLabelColor
      Object.assign(cfg, patch)
      // 连线颜色变更：立即更新所有材质 color
      if (cfg.constellationLineColor !== oldLineColor) {
        for (const grp of constellationLineGroups.values()) {
          ;(grp.main.material as LineMaterial).color.setHex(cfg.constellationLineColor)
        }
      }
      if (cfg.constellationGlowColor !== oldGlowColor) {
        for (const grp of constellationLineGroups.values()) {
          ;(grp.glow.material as LineMaterial).color.setHex(cfg.constellationGlowColor)
        }
      }
      // 线宽变更
      if (cfg.constellationLineWidth !== undefined) {
        for (const grp of constellationLineGroups.values()) {
          ;(grp.main.material as LineMaterial).linewidth = cfg.constellationLineWidth
        }
      }
      if (cfg.constellationGlowWidth !== undefined) {
        for (const grp of constellationLineGroups.values()) {
          ;(grp.glow.material as LineMaterial).linewidth = cfg.constellationGlowWidth
        }
      }
      // 标签颜色变更：立即更新所有 el color
      if (cfg.constellationLabelColor !== oldLabelColor) {
        for (const el of constellationLabelEls.values()) {
          el.style.color = cfg.constellationLabelColor
        }
      }
      // 星名标注颜色/字体/偏移变更
      const nameLabelStyleChanged =
        cfg.nameLabelColor !== patch.nameLabelColor ||
        cfg.nameLabelFontSize !== patch.nameLabelFontSize ||
        cfg.nameLabelOffsetPx !== patch.nameLabelOffsetPx
      if (nameLabelStyleChanged) {
        for (const label of starNameLabels.values()) {
          const inner = label.element.firstChild as HTMLElement
          inner.style.color = cfg.nameLabelColor
          inner.style.fontSize = `${cfg.nameLabelFontSize}px`
          inner.style.transform = `translateY(calc(-100% + ${cfg.nameLabelOffsetPx}px))`
        }
      }
      // tooltip 偏移变更
      if (cfg.tooltipOffsetPx !== patch.tooltipOffsetPx) {
        tooltipInner.style.setProperty('--tt-offset', `${cfg.tooltipOffsetPx}px`)
      }
      // showAllConstellations 状态变更：立即应用可见性
      if (cfg.showAllConstellations !== oldShowAll) {
        if (cfg.showAllConstellations) {
          for (const grp of constellationLineGroups.values()) {
            grp.targetOpacity = cfg.constellationIdleOpacity
          }
        } else {
          for (const grp of constellationLineGroups.values()) grp.targetOpacity = 0
          for (const el of constellationLabelEls.values()) el.style.opacity = '0'
        }
      } else if (cfg.showAllConstellations) {
        // showAll 状态下 idle opacity 变更：更新非 hover 的连线
        for (const grp of constellationLineGroups.values()) {
          // 仅更新当前 target 为 idle opacity 的连线（即非 hover 高亮的）
          // 简化：全部重设为 idle，下次 hover 时会自动覆盖
          grp.targetOpacity = cfg.constellationIdleOpacity
        }
      }
    },
    setObserver,
    setStarStatsCache(cache) {
      cache.forEach((v, k) => statsCache.set(k, v))
      updateStoryGlows(cache)
    },
    updateHorizonRotation(lat: number | undefined, lng: number | undefined) {
      // 已禁用：天球回归默认不旋转
      // if (lat == null || lng == null) {
      //   skyGroup.matrix.identity()
      //   return
      // }
      // const lstHours = ((gmstHours(new Date()) + lng / 15) % 24 + 24) % 24
      // const lstRad = lstHours / 24 * Math.PI * 2
      // const latRad = lat * D2R
      // const ry = lstRad - Math.PI / 2
      // const rx = Math.PI / 2 - latRad
      // const cy = Math.cos(ry), sy = Math.sin(ry)
      // const cx = Math.cos(rx), sx = Math.sin(rx)
      // const m = new Matrix4()
      // m.set(
      //   cy,      -sx*sy,  cx*sy,  0,
      //   0,        cx,      sx,     0,
      //   -sy,     -sx*cy,  cx*cy,  0,
      //   0,        0,        0,     1,
      // )
      // skyGroup.matrix.copy(m)
    },
    rotateX(rad: number) {
      // 绕世界 X 轴（东西方向线）旋转天球，正角 = 北极星向南倒
      // OPT-30：复用 _rotMat 避免 new Matrix4()（用户拖拽时高频调用）
      skyGroup.matrix.multiply(_rotMat.makeRotationX(rad))
    },
    rotateY(rad: number) {
      // 绕世界 Y 轴（天极方向）旋转天球，正角 = 星星东升西落
      skyGroup.matrix.multiply(_rotMat.makeRotationY(rad))
    },
    rotateZ(rad: number) {
      // 绕世界 Z 轴（前后方向）旋转天球，正角 = 北极星向右倒
      skyGroup.matrix.multiply(_rotMat.makeRotationZ(rad))
    },
    resetRotation() {
      skyGroup.matrix.identity()
    },
    rotate(radX: number, radY: number, radZ: number) {
      // 顺序：先 X（纬度），再 Y（恒星时），最后 Z（几乎不用）
      // 每个轴都是本地坐标系累积（post-multiply）
      // OPT-30：复用 _rotMat，makeRotation* 每次重置矩阵为单位+旋转，安全复用
      if (radX !== 0) skyGroup.matrix.multiply(_rotMat.makeRotationX(radX))
      if (radY !== 0) skyGroup.matrix.multiply(_rotMat.makeRotationY(radY))
      if (radZ !== 0) skyGroup.matrix.multiply(_rotMat.makeRotationZ(radZ))
    },
    setRotation(radX: number, radY: number, radZ: number) {
      skyGroup.matrix.identity()
      if (radX !== 0) skyGroup.matrix.multiply(_rotMat.makeRotationX(radX))
      if (radY !== 0) skyGroup.matrix.multiply(_rotMat.makeRotationY(radY))
      if (radZ !== 0) skyGroup.matrix.multiply(_rotMat.makeRotationZ(radZ))
    },
    applyAstroRotation(latDeg: number, lonDeg: number, date: Date = new Date()) {
      const jd = dateToJD(date)
      const lstDegVal = lstDeg(jd, lonDeg)
      const D2R = Math.PI / 180
      const lstRad = lstDegVal * D2R

      // M = Rx(90°−lat) · Ry(π/2 − LST)
      // Step 1: 绕世界Y(天极)旋转 π/2−LST → 春分点归位，LST↑ → 星西移
      // Step 2: 绕世界X 旋转 90°−lat → 北极星抬高到纬度高度
      skyGroup.matrix.identity()
      skyGroup.matrix.multiply(new Matrix4().makeRotationY(Math.PI / 2 - lstRad))
      skyGroup.matrix.premultiply(new Matrix4().makeRotationX((90 - latDeg) * D2R))
    },
    setKernelLines(lines: { from: { x: number; y: number; z: number }; to: { x: number; y: number; z: number } }[]) {
      // 清除旧连线
      while (kernelLinesGroup.children.length > 0) {
        kernelLinesGroup.remove(kernelLinesGroup.children[0])
      }
      if (lines.length === 0) {
        kernelLinesGroup.visible = false
        return
      }
      // 主连线（淡金虚线）
      const v: number[] = []
      for (const line of lines) {
        v.push(line.from.x, line.from.y, line.from.z, line.to.x, line.to.y, line.to.z)
      }
      const geom = new BufferGeometry()
      geom.setAttribute('position', new BufferAttribute(new Float32Array(v), 3))
      const mat = new LineDashedMaterial({
        color: 0xffcc66,
        dashSize: 2,
        gapSize: 1.5,
        transparent: true,
        opacity: 0.55,
        depthTest: true,
        depthWrite: false,
      })
      const segs = new LineSegments(geom, mat)
      segs.computeLineDistances()
      kernelLinesGroup.add(segs)
      // 发光层
      const glowMat = new LineBasicMaterial({
        color: 0xffd98a,
        transparent: true,
        opacity: 0.25,
        blending: AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      })
      const glowGeom = new BufferGeometry()
      glowGeom.setAttribute('position', new BufferAttribute(new Float32Array(v), 3))
      const glowSegs = new LineSegments(glowGeom, glowMat)
      glowSegs.scale.setScalar(1.005)
      kernelLinesGroup.add(glowSegs)
      kernelLinesGroup.visible = true
    },
    focusOnStar(x: number, y: number, z: number) {
      // OPT-23：split-timing tween 三通道（旋转 / FOV / 位移）
      // 参考 celestiary/web camera.js + Stellarium StelMovementMgr
      // 旋转 [0, 0.58] / FOV [0.25, 0.83] / 位移 [0.42, 1.0]，重叠期 [0.42, 0.58] 防"卡顿"
      // 恒星不移动，无需 recalcTarget；FOV 从当前值缩到 35°，位移沿视线拉近 1.2×

      // 打断进行中的 tween，避免新旧 tween 竞争写入 camera.quaternion 导致抖动
      if (activeTweenId !== null) {
        cancelAnimationFrame(activeTweenId)
        activeTweenId = null
      }

      const starLocal = new Vector3(x, y, z)
      const starWorld = starLocal.clone().applyMatrix4(skyGroup.matrixWorld)

      const startQuat = camera.quaternion.clone()
      const startPos = camera.position.clone()
      const startFov = camera.fov

      // Roll 保留：用当前相机四元数旋转 (0,1,0) 作为 up 提示，避免 lookAt 翻滚地平线
      // （celestiary 关键技巧：直接 lookAt 会用世界 up，倾斜相机会突兀摆正）
      const worldUp = new Vector3(0, 1, 0).applyQuaternion(startQuat)
      const dummyCam = camera.clone()
      dummyCam.up.copy(worldUp)
      dummyCam.lookAt(starWorld)
      const endQuat = dummyCam.quaternion.clone()

      // 终态位移：沿视线方向拉近 1.2×（distance × 0.83），下限 80 防穿过恒星
      const dirToStar = starWorld.clone().sub(startPos).normalize()
      const currentDist = startPos.distanceTo(starWorld)
      const targetDist = Math.max(currentDist * 0.83, 80)
      const endPos = starWorld.clone().sub(dirToStar.multiplyScalar(targetDist))

      const totalMs = 1200
      const rotEnd = 0.58, fovStart = 0.25, fovEnd = 0.83, posStart = 0.42, posEnd = 1.0
      const startTime = performance.now()

      function animStep(now: number) {
        if (disposed) { activeTweenId = null; return }
        const elapsed = now - startTime
        const t = Math.min(elapsed / totalMs, 1)

        // 通道 A：旋转 [0, rotEnd]，easeInOutCubic
        const rotT = t < rotEnd ? t / rotEnd : 1
        camera.quaternion.copy(startQuat).slerp(endQuat, easeInOutCubic(rotT))

        // 通道 B：FOV [fovStart, fovEnd]，easeOutQuart
        if (t > fovStart) {
          const fovT = Math.min((t - fovStart) / (fovEnd - fovStart), 1)
          camera.fov = startFov + (35 - startFov) * easeOutQuart(fovT)
          camera.updateProjectionMatrix()
        }

        // 通道 C：位移 [posStart, posEnd]，easeInOutQuint
        if (t > posStart) {
          const posT = Math.min((t - posStart) / (posEnd - posStart), 1)
          camera.position.lerpVectors(startPos, endPos, easeInOutQuint(posT))
        }

        if (t < 1) {
          activeTweenId = requestAnimationFrame(animStep)
        } else {
          activeTweenId = null
          // 同步拖拽基准，确保动画结束后用户拖拽不跳变
          rotY = camera.rotation.y - baseRotY
          rotX = camera.rotation.x - baseRotX + 0.3
          // 同步 userFov，确保后续 wheel/pinch 缩放从动画结束值开始
          userFov = camera.fov
        }
      }
      activeTweenId = requestAnimationFrame(animStep)
    },
    // ═══ 行星特写：focusOnPlanet → TWEENING → CLOSEUP（状态机入口） ═══
    // 飞到 CLOSEUP_INIT_RATIO × size 距离，FOV 缩到 CLOSEUP_FOV，末态进入 CLOSEUP 模式
    // CLOSEUP 模式下相机每帧跟随行星（animate 循环实现），wheel 调 dist 而非 FOV
    focusOnPlanet(bodyName: string) {
      const found = planetUpdaters.find(u => u.bodyName === bodyName)
      if (!found) return
      const updater = found

      // 幂等守卫：已在 CLOSEUP 同一行星，不重启 tween（counterexample: 重复点击）
      if (closeupState === 'CLOSEUP' && closeupTarget?.updater === updater) return

      // 打断旧 tween（counterexample: EXITING 中点击新星 → cancel exit + 重启 TWEENING）
      if (activeTweenId !== null) {
        cancelAnimationFrame(activeTweenId)
        activeTweenId = null
      }

      // 防御性恢复：若从 CLOSEUP/EXITING 进入，先恢复 near/halo 避免状态泄漏
      if (closeupTarget?.haloSprite) closeupTarget.haloSprite.visible = true
      camera.near = DEFAULT_NEAR
      camera.updateProjectionMatrix()

      // 查行星 size 算目标距离（直接从 updater 取，避免依赖动态 import 闭包中的 planets）
      const planetSize = updater.size
      // 初始距离 = size × CLOSEUP_INIT_RATIO，下限 size + 0.5 防穿模
      const targetDist = Math.max(planetSize * CLOSEUP_INIT_RATIO, planetSize + 0.5)

      // 隐藏目标 halo（特写中盘面已可见，halo 糊屏）
      const haloSprite = updater.haloSprite ?? null
      if (haloSprite) haloSprite.visible = false

      closeupState = 'TWEENING'
      closeupTarget = { updater, dist: targetDist, haloSprite, size: planetSize }

      const startQuat = camera.quaternion.clone()
      const startPos = camera.position.clone()
      const startFov = camera.fov

      // 终态重算：每帧重读 tiltGroup.position，动态跟踪移动中的行星
      function recalcTarget(): { endQuat: import('three').Quaternion; endPos: import('three').Vector3 } | null {
        const pos = updater.tiltGroup.position
        const local = new Vector3(pos.x, pos.y, pos.z)
        const world = local.clone().applyMatrix4(skyGroup.matrixWorld)

        const wup = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion)
        const dummy = camera.clone()
        dummy.up.copy(wup)
        dummy.lookAt(world)
        const eq = dummy.quaternion.clone()

        // 相机位置 = 行星世界坐标 - 朝向 × targetDist
        const dir = world.clone().sub(startPos).normalize()
        const ep = world.clone().sub(dir.multiplyScalar(targetDist))
        return { endQuat: eq, endPos: ep }
      }

      const init = recalcTarget()
      if (!init) {
        // 恢复并退出
        if (haloSprite) haloSprite.visible = true
        closeupState = 'IDLE'
        closeupTarget = null
        return
      }
      const initEndQuat = init.endQuat
      const initEndPos = init.endPos

      const totalMs = 1200
      const rotEnd = 0.58, fovStart = 0.25, fovEnd = 0.83, posStart = 0.42, posEnd = 1.0
      const startTime = performance.now()

      function animStep(now: number) {
        if (disposed) { activeTweenId = null; return }
        const elapsed = now - startTime
        const t = Math.min(elapsed / totalMs, 1)

        const cur = recalcTarget()
        const curEndQuat = cur ? cur.endQuat : initEndQuat
        const curEndPos = cur ? cur.endPos : initEndPos

        const rotT = t < rotEnd ? t / rotEnd : 1
        camera.quaternion.copy(startQuat).slerp(curEndQuat, easeInOutCubic(rotT))

        if (t > fovStart) {
          const fovT = Math.min((t - fovStart) / (fovEnd - fovStart), 1)
          camera.fov = startFov + (CLOSEUP_FOV - startFov) * easeOutQuart(fovT)
          camera.updateProjectionMatrix()
        }

        if (t > posStart) {
          const posT = Math.min((t - posStart) / (posEnd - posStart), 1)
          camera.position.lerpVectors(startPos, curEndPos, easeInOutQuint(posT))
        }

        if (t < 1) {
          activeTweenId = requestAnimationFrame(animStep)
        } else {
          activeTweenId = null
          // 进入 CLOSEUP：设 near 平面、同步拖拽基准
          camera.near = CLOSEUP_NEAR
          camera.updateProjectionMatrix()
          closeupState = 'CLOSEUP'
          rotY = camera.rotation.y - baseRotY
          rotX = camera.rotation.x - baseRotX + 0.3
          userFov = camera.fov
        }
      }
      activeTweenId = requestAnimationFrame(animStep)
    },
    // 退出特写：飞回原点 (0,0,0)，FOV 回 DEFAULT_FOV，末态恢复 near/halo → IDLE
    // 触发场景：关闭详情面板
    exitCloseup() {
      if (closeupState === 'IDLE') return
      if (activeTweenId !== null) {
        cancelAnimationFrame(activeTweenId)
        activeTweenId = null
      }
      closeupState = 'EXITING'

      const startPos = camera.position.clone()
      const startQuat = camera.quaternion.clone()
      const startFov = camera.fov
      const endPos = new Vector3(0, 0, 0)
      const endFov = DEFAULT_FOV
      // 末态朝向：重置到基础朝向
      const endQuat = new Quaternion().setFromEuler(new Euler(baseRotX + 0.3, baseRotY, 0, 'YXZ'))

      const totalMs = 1200
      const rotEnd = 0.58, fovStart = 0.25, fovEnd = 0.83, posStart = 0.42, posEnd = 1.0
      const startTime = performance.now()

      function animStep(now: number) {
        if (disposed) { activeTweenId = null; return }
        const elapsed = now - startTime
        const t = Math.min(elapsed / totalMs, 1)

        const rotT = t < rotEnd ? t / rotEnd : 1
        camera.quaternion.copy(startQuat).slerp(endQuat, easeInOutCubic(rotT))

        if (t > fovStart) {
          const fovT = Math.min((t - fovStart) / (fovEnd - fovStart), 1)
          camera.fov = startFov + (endFov - startFov) * easeOutQuart(fovT)
          camera.updateProjectionMatrix()
        }

        if (t > posStart) {
          const posT = Math.min((t - posStart) / (posEnd - posStart), 1)
          camera.position.lerpVectors(startPos, endPos, easeInOutQuint(posT))
        }

        if (t < 1) {
          activeTweenId = requestAnimationFrame(animStep)
        } else {
          activeTweenId = null
          // 恢复 IDLE：near 平面、halo 可见性、清空 closeupTarget
          camera.near = DEFAULT_NEAR
          camera.updateProjectionMatrix()
          if (closeupTarget?.haloSprite) closeupTarget.haloSprite.visible = true
          closeupState = 'IDLE'
          closeupTarget = null
          rotY = 0
          rotX = 0
          userFov = camera.fov
        }
      }
      activeTweenId = requestAnimationFrame(animStep)
    },
    highlightStar(x: number, y: number, z: number) {
      const starLocal = new Vector3(x, y, z)
      const starWorld = starLocal.clone().applyMatrix4(skyGroup.matrixWorld)
      locateHighlight.position.copy(starWorld)
      locateHighlight.visible = true
      ;(locateHighlight.material as SpriteMaterial).opacity = 0.9
      locateHighlight.scale.set(25, 25, 1)
      locateHighlightUntil = performance.now() + 2000
    },
    dispose() {
      // P1-1：完整资源释放
      disposed = true
      abortController.abort()  // 一次性移除所有 addEventListener
      cancelAnimationFrame(af)
      // 清除长悬浮计时器，防止 dispose 后回调触发父组件 onStarHoverLong
      if (hoverLongTimer) { clearTimeout(hoverLongTimer); hoverLongTimer = null }
      // OPT-23：cancel 进行中的 focus tween，防止 disposed 后访问已销毁的 camera/skyGroup
      if (activeTweenId !== null) {
        cancelAnimationFrame(activeTweenId)
        activeTweenId = null
      }
      // 清理特写状态机：恢复 near 平面 + halo 可见性（防御性，避免状态泄漏）
      closeupState = 'IDLE'
      closeupTarget = null
      lrEl.remove()
      ttStyle.remove()
      // OPT-27：移除 debug 监控 DOM
      if (debugEl) debugEl.remove()
      // 移除 tooltipEl DOM（被 CSS2DObject 包装后加入 scene）
      if (tooltipEl.parentNode) tooltipEl.parentNode.removeChild(tooltipEl)
      // issue #116：清理移动端准星 DOM + 样式 + FOV 动画
      cancelAnimationFrame(snapFovRafId)
      if (crosshairEl && crosshairEl.parentNode) crosshairEl.parentNode.removeChild(crosshairEl)
      if (crosshairStyle) crosshairStyle.remove()
      // 释放 GPU 资源（geometry/material/texture）
      // scene.clear() 只移除场景图引用，不释放 GPU 内存
      scene.traverse((obj) => {
        const mesh = obj as Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        const mat = mesh.material
        const releaseMatTextures = (m: unknown) => {
          const mm = m as { dispose?: () => void; uniforms?: Record<string, { value?: unknown }> }
          mm.dispose?.()
          // 释放材质直接属性上的纹理（MeshBasicMaterial.map / MeshPhongMaterial.map 等）
          Object.values(m as object).forEach(v => {
            if (v && typeof v === 'object' && 'isTexture' in v && 'dispose' in v) {
              (v as { dispose: () => void }).dispose()
            }
          })
          // [P1-1 修复 2026-07-27] ShaderMaterial uniforms 中的纹理不会被 Object.values(mat) 遍历到
          // 需显式进入 uniforms.{name}.value 释放，否则太阳/土星环等纹理每次卸载都泄漏
          // 原代码只补充了流星头纹理（texCache.get(8)），遗漏了 sunMat.uMap 和 ringMat.uMap
          const uniforms = mm.uniforms
          if (uniforms && typeof uniforms === 'object') {
            Object.values(uniforms).forEach(u => {
              const v = u?.value
              if (v && typeof v === 'object' && 'isTexture' in v && 'dispose' in v) {
                (v as { dispose: () => void }).dispose()
              }
            })
          }
        }
        if (Array.isArray(mat)) {
          mat.forEach(releaseMatTextures)
        } else if (mat) {
          releaseMatTextures(mat)
        }
      })
      // CSS2DRenderer 在 three.js r170 没有 dispose() 方法（源码仅有 getSize/render/setSize）
      // DOM 清理由 lrEl.remove()（line 3230）完成，CSS2DObject 的 'removed' 事件会同步清理
      // 旧代码用 `as unknown as { dispose: () => void }` 强制断言调用，运行时抛 TypeError
      // 导致后续 composer/bloomPass/renderer/forceContextLoss/scene.clear/texCache 全部成为死代码
      // [P0-1 修复 2026-07-27] 删除该不存在的 dispose() 调用，恢复后续清理链
      //
      // 释放后处理 passes 的内部资源
      // EffectComposer.dispose() 仅释放 renderTarget1/2 + copyPass，不释放用户添加的 passes
      // UnrealBloomPass 持有 11 个 WebGLRenderTarget + 8 个 material，ShaderPass/OutputPass 各持 1 material + 1 fsQuad
      // 不显式释放会导致 SPA 导航时 GPU 显存泄漏
      composer.passes.forEach(p => {
        const fn = (p as { dispose?: () => void }).dispose
        if (typeof fn === 'function') fn.call(p)
      })
      // OPT-36 修复：watchdog 可能已从 composer.passes 移除 bloomPass，需显式释放避免 11 个 renderTarget 泄漏
      // dispose() 幂等，即使仍在 passes 中重复调用也安全
      if (bloomPass) bloomPass.dispose()
      // 释放后处理资源（composer 内部 renderTarget）
      composer.dispose()
      renderer.dispose()
      // 强制丢失 WebGL 上下文，同步归还 GPU 上下文槽位给浏览器
      // 参考：fossasia/visdom PR #1519 (2026-06) 证实 dispose() 单独不释放 GPU 槽位
      // Safari 上未释放的上下文可能在页面切换后触发整会话 WebGL 崩坏（WebKit Bug 289601）
      renderer.forceContextLoss()
      scene.clear()
      // OPT-33：释放 texCache 中的共享 CanvasTexture
      // scene.traverse 只释放材质直接属性（如 mat.map）上的纹理，
      // ShaderMaterial uniforms 中的纹理（如 uMap.value）不会被 Object.values(mat) 遍历到
      // [P0-1 修复 2026-07-27] 补充：太阳/土星环 ShaderMaterial uniforms 中的纹理也在此释放
      // （P1-1：原代码遗漏这两个 ShaderMaterial uniforms 纹理，导致每次卸载泄漏 2 个 GPU 纹理）
      texCache.forEach(t => t.dispose())
      texCache.clear()
    },
    // issue #124：主动释放准星吸附（供外部「凝听星语」按钮点击后调用）
    releaseSnap,
  }
}
