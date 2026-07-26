import {
  Scene, PerspectiveCamera, WebGLRenderer,
  Points, BufferGeometry, BufferAttribute, PointsMaterial, CanvasTexture,
  Line, LineBasicMaterial, LineDashedMaterial, LineSegments,
  AdditiveBlending, Color, Mesh, MeshBasicMaterial, MeshPhongMaterial,
  SphereGeometry, RingGeometry, BackSide, DoubleSide,
  Raycaster, Vector2, Sprite, SpriteMaterial, Vector3, Group, AmbientLight, Matrix4,
  TextureLoader, PointLight, ShaderMaterial, LoadingManager,
  ACESFilmicToneMapping,
  InstancedMesh, Object3D,
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
import { SPHERE_RADIUS, DEFAULT_FOV, FOV_MIN, FOV_MAX } from '../utils/constants'
import { dateToJD, lstDeg, orientationEuler, eclipticToRaDecJD, getAsteroidPosition, getAsteroidPositionSync } from '../utils/astro'
// 阶段 3 P2：小行星 + 流星雨 + GPU 检测
import { ASTEROIDS } from '../data/asteroids'
import { getActiveShowers, type MeteorShower } from '../data/meteorShowers'
import { detectGPU, getRenderParams } from '../utils/gpuDetect'

// ─── 星表 ───
interface CatStar { id: number; name: string | null; ra: number; dec: number; mag: number; color: string; con: string; x: number; y: number; z: number }
interface CatData { stars: CatStar[]; lines: [number, number][] }
import rawCatalog from '../data/stars.json'
import newLinesData from '../data/new_lines.json'
import constellationLabels from '../data/constellation_labels.json'
const CAT = rawCatalog as unknown as CatData

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

export interface SkyAPI {
  camera: PerspectiveCamera
  zoomIn: () => void
  zoomOut: () => void
  dispose: () => void
  setObserver: (obs: ObserverLoc | null) => void
  setStarStatsCache: (cache: Map<number, { stories: number; resonance: number; views: number; favorites: number }>) => void
  updateHorizonRotation: (lat: number | undefined, lng: number | undefined) => void
}

export function useSky(
  canvas: HTMLCanvasElement,
  options?: {
    onStarClick?: (starId: number) => void
    onStarHover?: (starId: number | null) => void
    onPlanetClick?: (name: string, nameCN: string) => void
    observerLat?: number
    observerLng?: number
  }
): SkyAPI {
  const scene = new Scene()

  // 用于统一移除所有事件监听器（dispose 时一次性 abort）
  const abortController = new AbortController()
  // 标志位：异步加载（如行星模块）在 dispose 后应提前返回，避免泄漏
  let disposed = false

  // ═══ 天球组（用于地平旋转） ═══
  const skyGroup = new Group()
  scene.add(skyGroup)

  scene.add(new AmbientLight(0xffffff, 0.5))

  const planetMeshes: Mesh[] = []

  // ═══ 行星实时位置更新器（参考 NASA Eyes / Stellarium：每帧重算位置） ═══
  // astronomy-engine Equator() 单次 ~50-100μs，9 颗行星 × 60fps ≈ 3-5% CPU，可接受
  // 闭包缓存 AE 模块避免重复动态 import；planetUpdaters 存 tiltGroup 引用 + body 名
  type PlanetUpdater = { tiltGroup: Group; bodyName: string }
  const planetUpdaters: PlanetUpdater[] = []
  // 伽利略卫星（木卫 1-4）Sprite 引用，每帧更新位置
  const moonSprites: Sprite[] = []
  // 土星环更新器：每帧重算 uSunDirLocal（太阳方向在 ring 局部坐标系的表示）
  type RingUpdater = { ringMat: ShaderMaterial; axialTilt: number }
  const ringUpdaters: RingUpdater[] = []
  // 小行星 InstancedMesh 引用，每帧更新位置（实时模拟运动）
  let asteroidInst: InstancedMesh | null = null
  const asteroidDummy = new Object3D()
  // 复用对象，避免每帧 new 导致 GC 压力（行星/卫星/土星环更新共用）
  const _reusedObserver = { latitude: 0, longitude: 0, height: 0 } as unknown as import('astronomy-engine').Observer
  const _reusedSunDir = new Vector3()
  let _reusedMoonVec: import('astronomy-engine').Vector | null = null
  let AE: typeof import('astronomy-engine') | null = null
  let bodyMapRef: Record<string, string> | null = null
  let observerForPlanets: { lat: number; lng: number } | null = null
  // 太阳光源位置（每帧跟随太阳 tiltGroup 更新）
  let sunLightRef: PointLight | null = null
  // 模拟时间倍率（1=实时；可外部设为加速倍率用于演示）
  let timeScale = 1
  // 模拟时间（毫秒），按 timeScale 累积；初始为真实时间
  let simTimeMs = Date.now()

  const camera = new PerspectiveCamera(DEFAULT_FOV, canvas.clientWidth/canvas.clientHeight, 0.5, SPHERE_RADIUS*3)
  camera.position.set(0,0,0)

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.setSize(canvas.clientWidth, canvas.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(new Color('#070816'))
  // P0-1: ACES Filmic 色调映射，让色彩更电影感（亮部不死白，暗部有细节）
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0

  // ═══ GPU 能力检测（必须在后处理之前，决定 bloom/vignette 是否启用） ═══
  // 静默自适应：根据用户/部署端机器的 GPU 能力自动分级，无需手动配置
  const gpuCap = detectGPU(canvas)
  const renderParams = getRenderParams(gpuCap.tier)

  // ═══ 后处理管线：Bloom + Vignette + ACES 输出 ═══
  // UnrealBloomPass：让所有发光物体（星星、太阳、银河）自动获得真实辉光
  // VignetteShader：暗角效果，让画面更聚焦
  // OutputPass：自动应用 ACES + sRGB 转换（无需手动设 outputColorSpace）
  // GPU 分级：high/medium 启用 bloom，low/fallback 关闭以保 FPS
  const composer = new EffectComposer(renderer)
  composer.setSize(canvas.clientWidth, canvas.clientHeight)
  composer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  composer.addPass(new RenderPass(scene, camera))
  const bloomPass = renderParams.bloom ? new UnrealBloomPass(
    new Vector2(canvas.clientWidth, canvas.clientHeight),
    0.65,   // strength：辉光强度
    0.6,    // radius：辉光扩散半径
    0.0,    // threshold：阈值 0 让所有发光物体都参与
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

  // ═══ 星星分层 ═══
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
    const pts = new Points(g, new PointsMaterial({
      size: sz, map: texCache.get(sz)!, blending: AdditiveBlending,
      depthWrite: false, depthTest: true, transparent: true, vertexColors: true, sizeAttenuation: true,
    }))
    pts.userData.tierIndex = t
    starPointsRefs.push(pts)
    skyGroup.add(pts)
  }

  // ═══ P0-5：亮星十字光芒（diffraction spikes） ═══
  // 给前 3 层（mag <= 1.8）的亮星叠加十字光芒纹理
  // - 1 等以上的星肉眼可见十字芒，是被相机/眼镜折射后形成的视觉现象
  // - 用独立的 Points 层 + spike 纹理 + AdditiveBlending，配合 Bloom 形成真实星芒
  // - 颜色继承自原星色（vertexColors 与白 spike 相乘）
  const SPIKE_TEX = spikeTex(128)
  const spikeTiers = [
    { tier: 0, size: 44, opacity: 0.95 },  // 天狼、老人等极亮星
    { tier: 1, size: 32, opacity: 0.75 },  // 织女、五车二等亮星
    { tier: 2, size: 22, opacity: 0.50 },  // 1 等左右星
  ]
  for (const cfg of spikeTiers) {
    const b = bins[cfg.tier]; if (b.pos.length === 0) continue
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(b.pos), 3))
    g.setAttribute('color', new BufferAttribute(new Float32Array(b.col), 3))
    const pts = new Points(g, new PointsMaterial({
      size: cfg.size, map: SPIKE_TEX, blending: AdditiveBlending,
      depthWrite: false, depthTest: true, transparent: true,
      vertexColors: true, sizeAttenuation: true, opacity: cfg.opacity,
    }))
    pts.renderOrder = 5  // 在普通星点之上、UI 元素之下
    skyGroup.add(pts)
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

  // ═══ 有故事的星星：呼吸辉光（同款 bloomTex，复用 hoverGlow 的方式） ═══
  const storyGlows: { sprite: Sprite; phase: number; period: number }[] = []
  function updateStoryGlows(cache: Map<number, { stories: number; resonance: number; views: number; favorites: number }>) {
    const existing = new Set<number>()
    for (const sg of storyGlows) existing.add(sg.sprite.userData.starId as number)
    for (const [starId, stats] of cache) {
      if (stats.stories === 0) continue
      if (existing.has(starId)) continue
      const star = stars[starId]
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

  // ═══ 星座连线 ═══
  {
    const allLines: [number, number][] = [...(CAT.lines || []), ...(newLinesData as [number, number][])]
    if (allLines.length) {
      const v: number[] = []
      for (const [a,b] of allLines) { if (a<n&&b<n) { const sa=stars[a],sb=stars[b]; v.push(sa.x,sa.y,sa.z,sb.x,sb.y,sb.z) } }
      const lg = new BufferGeometry(); lg.setAttribute('position', new BufferAttribute(new Float32Array(v), 3))
      // main — muted slate
      skyGroup.add(new LineSegments(lg, new LineBasicMaterial({ color:0x6677aa, transparent:true, opacity:0.28, depthTest:true, depthWrite:false })))
      // warm-gold glow pass underneath
      const vg = v.slice()
      const lg2 = new BufferGeometry(); lg2.setAttribute('position', new BufferAttribute(new Float32Array(vg), 3))
      const glow = new LineSegments(lg2, new LineBasicMaterial({
        color:0xffd98a, transparent:true, opacity:0.12, blending:AdditiveBlending, depthWrite:false, depthTest:false,
      }))
      glow.scale.setScalar(1.003)
      skyGroup.add(glow)
    }
  }

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

  // ═══ 黄道 (虚线, 当日真黄赤交角, 整圆、下半被地平面挡) ═══
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
    const mat = new LineDashedMaterial({
      color: 0xcc8844,
      dashSize: 2.5,
      gapSize: 1.5,
      transparent: true,
      opacity: 0.55,
      depthTest: true,
      depthWrite: false,
    })
    const line = new Line(g, mat)
    ;(line.userData as { basePos?: Float32Array }).basePos = new Float32Array(base)
    line.computeLineDistances()
    skyGroup.add(line)
    eclipticLine = line
  }

  // ═══ 真实银河全景贴图（ESO eso0932a，天球内壁，混合方案） ═══
  // ribbon 仍保留作为银心高亮层（在更内层，加性混合）
  {
    const texLoader = new TextureLoader()
    const mwTex = texLoader.load('/textures/skybox/milky_way.jpg')
    mwTex.colorSpace = 'srgb'
    // ESO 银河贴图原点是银道面水平，需要旋转使其与项目赤道系对齐
    // 银心方向 RA≈17h45m，把贴图水平偏移使银心落在正确位置
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
    // 旋转贴图使银河带与现有 ribbon 对齐（银心 RA≈17h45m ≈ 266°）
    mwMesh.rotation.y = -(17 + 45/60) / 24 * Math.PI * 2
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

    // P1-2：星云粒子层（深空点缀）
    // 沿银河带随机分布低不透明度彩色粒子云，模拟发射星云（M42 猎户座大星云等）
    // 配合 Bloom 形成柔和的深空彩雾，增加纵深感
    {
      const NEBULA_COUNT = 280
      const nebulaPos: number[] = []
      const nebulaCol: number[] = []
      // 星云色板：青蓝、紫、粉红、橙红、青绿（典型发射星云颜色）
      const nebulaColors: [number, number, number][] = [
        [0.45, 0.65, 1.0],  // 蓝（反射星云）
        [0.80, 0.45, 1.0],  // 紫
        [1.00, 0.55, 0.75], // 粉红（Hα 发射）
        [1.00, 0.65, 0.45], // 橙红（Hα +尘埃）
        [0.55, 1.00, 0.80], // 青绿（OIII）
      ]
      for (let i = 0; i < NEBULA_COUNT; i++) {
        // 沿银道面随机分布（银经 0~360°），银纬 ±6° 内
        const l = Math.random() * 360
        const b = (Math.random() - 0.5) * 12  // 银纬 ±6°
        const { ra, dec } = galacticToRaDec(l)
        // 在 ra/dec 基础上叠加银纬偏移（简化：直接在球面上小范围偏移）
        const decOff = b * D2R
        const p = raDecXYZ(ra, dec + decOff / D2R, SPHERE_RADIUS * 0.999)
        // 加微小随机扰动（让粒子云不完全在球面上）
        const jitter = 6
        nebulaPos.push(
          p.x + (Math.random() - 0.5) * jitter,
          p.y + (Math.random() - 0.5) * jitter,
          p.z + (Math.random() - 0.5) * jitter,
        )
        const col = nebulaColors[Math.floor(Math.random() * nebulaColors.length)]
        nebulaCol.push(col[0], col[1], col[2])
      }
      const nebulaGeo = new BufferGeometry()
      nebulaGeo.setAttribute('position', new BufferAttribute(new Float32Array(nebulaPos), 3))
      nebulaGeo.setAttribute('color', new BufferAttribute(new Float32Array(nebulaCol), 3))
      // 复用 glowTex 生成柔软的圆形粒子
      const nebulaTex = glowTex('white', 64)
      const nebulaPts = new Points(nebulaGeo, new PointsMaterial({
        size: 18,
        map: nebulaTex,
        blending: AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        transparent: true,
        vertexColors: true,
        sizeAttenuation: true,
        opacity: 0.32,
      }))
      nebulaPts.renderOrder = 2
      skyGroup.add(nebulaPts)
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

  // ═══ 星座名称标签 ═══
  {
    for (const cl of constellationLabels) {
      const el = document.createElement('div')
      el.textContent = cl.label
      el.style.cssText = [
        'color:rgba(102,119,170,0.6)',
        'font-family:"Inter","Microsoft YaHei",system-ui,sans-serif',
        'font-size:10px',
        'font-weight:300',
        'letter-spacing:0.12em',
        'white-space:nowrap',
        'pointer-events:none',
      ].join(';')
      const label = new CSS2DObject(el)
      label.position.set(cl.x, cl.y, cl.z)
      skyGroup.add(label)
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
  tooltipEl.innerHTML = `
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
  // 注入 tooltip 样式
  const ttStyle = document.createElement('style')
  ttStyle.textContent = `
    .star-tooltip {
      font-family:"Inter","Microsoft YaHei",system-ui,sans-serif;
      font-size:11px; color:#c8c2d8;
      background:rgba(12,12,28,0.92);
      padding:8px 12px; border-radius:8px;
      border:1px solid rgba(255,255,255,0.06);
      backdrop-filter:blur(8px);
      white-space:nowrap; pointer-events:none;
      opacity:0; transition:opacity 0.15s;
      line-height:1;
      margin-top: 1rem;
    }
    .star-tooltip .tt-name {
      font-size:13px; font-weight:600;
      color:#ffd98a; margin-bottom:6px;
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
  {
    const mouse = new Vector2()
    const _v = new Vector3()
    const _w = new Vector3()
    const DRAG_THRESHOLD = 5
    let clickDrag = false
    let hoveredStarId = -1
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

    // tooltip 内容更新函数
    let _lastStatsKey = ''
    function updateTooltipContent(starId: number) {
      const star = stars[starId]
      if (!star) return
      const nameEl = tooltipEl.querySelector('.tt-name') as HTMLElement
      const vals = tooltipEl.querySelectorAll('.tt-val') as NodeListOf<HTMLElement>
      const rh = Math.floor(star.ra)
      const rm = Math.floor((star.ra - rh) * 60)
      const ds = star.dec >= 0 ? '+' : '-'
      const dd = Math.floor(Math.abs(star.dec))
      const dm = Math.floor((Math.abs(star.dec) - dd) * 60)
      nameEl.textContent = star.name || `${rh}h${String(rm).padStart(2,'0')}m · ${ds}${dd}°${String(dm).padStart(2,'0')}′`
      const stats = statsCache.get(star.id)
      vals[0].textContent = stats ? String(stats.stories) : '0'
      vals[1].textContent = stats ? String(stats.resonance) : '0'
      vals[2].textContent = stats ? String(stats.views) : '0'
      vals[3].textContent = stats ? String(stats.favorites) : '0'
      _lastStatsKey = `${starId}:${stats?.stories ?? ''}:${stats?.resonance ?? ''}:${stats?.views ?? ''}:${stats?.favorites ?? ''}`
      // tooltip + hoverGlow 位置（通过 skyGroup.matrixWorld 变换到世界坐标）
      const sn = starNormMap.get(starId)
      if (sn) {
        _w.set(sn.nx * SPHERE_RADIUS, sn.ny * SPHERE_RADIUS, sn.nz * SPHERE_RADIUS).applyMatrix4(skyGroup.matrixWorld)
        tooltipLabel.position.set(_w.x, _w.y - 50, _w.z)
        hoverGlow.position.set(_w.x, _w.y, _w.z)
      }
      tooltipEl.style.opacity = '1'
      hoverGlow.visible = true
      hoverGlowTargetOpacity = 0.95
      options?.onStarHover?.(starId)
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

      // 悬浮检测（节流 80ms）
      const now = performance.now()
      if (now - hoverCheckTimer < 80) return
      hoverCheckTimer = now

      // 用屏幕投影找最近的星（考虑 skyGroup 旋转）
      skyGroup.updateMatrixWorld()
      camera.updateMatrixWorld()
      camera.updateProjectionMatrix()
      let bestDist = Infinity
      let bestId = -1
      let bestNx = 0, bestNy = 0, bestNz = 0
      for (const sn of allStarNorms) {
        _v.set(sn.nx * SPHERE_RADIUS, sn.ny * SPHERE_RADIUS, sn.nz * SPHERE_RADIUS).applyMatrix4(skyGroup.matrixWorld).project(camera)
        if (_v.z > 1) continue // 在相机后面
        const dx = _v.x - mouse.x
        const dy = _v.y - mouse.y
        const d = dx*dx + dy*dy
        if (d < bestDist) { bestDist = d; bestId = sn.id; bestNx = sn.nx; bestNy = sn.ny; bestNz = sn.nz }
      }
      // 阈值
      if (bestDist < 0.0015 && bestId !== -1) {
        if (bestId !== hoveredStarId) {
          hoveredStarId = bestId
          updateTooltipContent(bestId)
        } else {
          // 同一颗星：检查 stats 是否有更新
          refreshTooltipStats(bestId)
        }
      } else if (hoveredStarId !== -1) {
        hoveredStarId = -1
        tooltipEl.style.opacity = '0'
        hoverGlowTargetOpacity = 0
        options?.onStarHover?.(null)
      }
    }, { signal: abortController.signal })
    canvas.addEventListener('pointerup', (e) => {
      if (disposed) return
      if (clickDrag) return // 是拖动不是点击
      if (hoveredStarId !== -1) {
        options?.onStarClick?.(hoveredStarId)
      }
      // 检测行星点击
      if (hoveredStarId === -1 && planetMeshes.length) {
        const rect = canvas.getBoundingClientRect()
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
        const raycaster = new Raycaster()
        raycaster.setFromCamera(mouse, camera)
        raycaster.params.Points!.threshold = 8
        const hits = raycaster.intersectObjects(planetMeshes)
        if (hits.length) {
          const pm = hits[0].object as Mesh
          const pd = pm.userData as { planetName: string; planetNameCN: string }
          if (pd.planetName) {
            options?.onPlanetClick?.(pd.planetName, pd.planetNameCN)
          }
        }
      }
    }, { signal: abortController.signal })
  }

  // ═══ 地平旋转（赤道坐标 → 地平坐标） ═══
  // 根据 LST 和纬度旋转 skyGroup 使天球正确对齐地平
  // 旋转顺序：先绕 Y 轴（将 RA=LST 子午线转到 -Z/南方），再绕 X 轴（使 NCP 高度 = 纬度）
  // 必须手动构建旋转矩阵 M = Rx(rotX) * Ry(rotY)（先 Y 后 X）
  {
    const lat = options?.observerLat
    const lng = options?.observerLng
    if (lat == null || lng == null) {
      // 没有经纬度时不做地平旋转，保持赤道坐标
      skyGroup.matrixAutoUpdate = false
      skyGroup.matrix.identity()
    } else {
      const lstHours = ((gmstHours(new Date()) + lng / 15) % 24 + 24) % 24
      const lstRad = lstHours / 24 * Math.PI * 2
      const latRad = lat * D2R
      const ry = lstRad - Math.PI / 2  // 绕 Y 的旋转角
      const rx = Math.PI / 2 - latRad  // 绕 X 的旋转角
      const cy = Math.cos(ry), sy = Math.sin(ry)
      const cx = Math.cos(rx), sx = Math.sin(rx)
      // M = Rx * Ry (column-major for THREE.js Matrix4)
      const m = new Matrix4()
      m.set(
        cy,      -sx*sy,  cx*sy,  0,
        0,        cx,      sx,     0,
        -sy,     -sx*cy,  cx*cy,  0,
        0,        0,        0,     1,
      )
      skyGroup.matrixAutoUpdate = false
      skyGroup.matrix.copy(m)
    }
  }

  // ═══ 相机 ═══
  let baseRotX = 0.3, baseRotY = 0                 // 由 observer/lst 算出的「基础朝向」
  let dragging = false, px = 0, py = 0, rotY = 0, rotX = 0.3
  let userFov = DEFAULT_FOV
  let observer: ObserverLoc | null = null
  let lstRefDeg = 0                                 // 设定 observer 时的 LST，用于实时自转

  /** 根据当前地点+真实时刻刷新基础朝向 */
  function applyObserverRotation(now = new Date()) {
    if (!observer) return
    const jd = dateToJD(now)
    const lst = lstDeg(jd, observer.lon)
    const euler = orientationEuler(observer.lat, lst)
    baseRotX = euler.rotX
    baseRotY = euler.rotY
    lstRefDeg = lst
    camera.rotation.set(baseRotX + rotX - 0.3, baseRotY + rotY, 0, 'YXZ')
  }

  function setObserver(obs: ObserverLoc | null) {
    observer = obs
    if (obs) applyObserverRotation()
  }

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; px = e.clientX; py = e.clientY; canvas.setPointerCapture(e.pointerId)
  }, { signal: abortController.signal })
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return
    rotY += (e.clientX - px) * 0.004
    rotX += (e.clientY - py) * 0.004
    rotX = Math.max(-Math.PI*0.48, Math.min(Math.PI*0.48, rotX))
    if (!observer) camera.rotation.set(rotX, rotY, 0, 'YXZ')
    px = e.clientX; py = e.clientY
  }, { signal: abortController.signal })
  canvas.addEventListener('pointerup', (e) => { dragging = false; canvas.releasePointerCapture(e.pointerId) }, { signal: abortController.signal })

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault()
    userFov = Math.max(FOV_MIN, Math.min(FOV_MAX, userFov + e.deltaY * 0.05))
    camera.fov = userFov
    camera.updateProjectionMatrix()
  }, { passive: false, signal: abortController.signal })

  window.addEventListener('resize', () => {
    camera.aspect = canvas.clientWidth / canvas.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(canvas.clientWidth, canvas.clientHeight)
    labelRenderer.setSize(canvas.clientWidth, canvas.clientHeight)
    // 同步更新 composer 尺寸，避免 Bloom 模糊错位
    composer.setSize(canvas.clientWidth, canvas.clientHeight)
    if (bloomPass) bloomPass.setSize(canvas.clientWidth, canvas.clientHeight)
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
    const sunLight = new PointLight(0xffeecc, 1.8, 0, 0)
    sunLight.position.set(0, 0, 0)
    skyGroup.add(sunLight)
    sunLightRef = sunLight  // 供 animate 循环每帧跟随太阳位置

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
      // 注册到 planetUpdaters，供 animate 循环每帧重算位置（实时模拟运动）
      planetUpdaters.push({ tiltGroup, bodyName: planet.name })

      // 行星球体（64×32 分段）
      const geo = new SphereGeometry(planet.size, 64, 32)
      const tex = texLoader.load(planet.texture)
      tex.colorSpace = 'srgb'
      // 太阳用 MeshBasicMaterial（自发光，不受光照影响）；其他用 MeshPhongMaterial
      const isSun = planet.name === 'Sun'
      const mat = isSun
        ? new MeshBasicMaterial({ map: tex })
        : new MeshPhongMaterial({
            map: tex,
            shininess: 5,
            specular: 0x222222,
          })
      const mesh = new Mesh(geo, mat)
      tiltGroup.add(mesh)
      mesh.userData = {
        planetName: planet.name,
        planetNameCN: planet.nameCN,
        rotationPeriod: planet.rotationPeriod,
      }
      planetMeshes.push(mesh)

      // ═══ 伽利略卫星（木卫 1-4）：实时位置模拟 ═══
      // astronomy-engine JupiterMoons() 返回 jovicentric EQJ 向量（AU）
      // 每帧构造卫星地心向量 = (木星日心 + jovicentric) - 地球日心，用 EquatorFromVector 转 RA/Dec
      // 4 颗卫星：Io(1.2)/Europa(1.0)/Ganymede(1.4)/Callisto(1.3)，颜色按真实反照率
      if (planet.name === 'Jupiter') {
        const galileanMoons = [
          { name: 'Io', nameCN: '木卫一', color: '#fff5d8', size: 1.2 },
          { name: 'Europa', nameCN: '木卫二', color: '#e8e0d0', size: 1.0 },
          { name: 'Ganymede', nameCN: '木卫三', color: '#d8c8a8', size: 1.4 },
          { name: 'Callisto', nameCN: '木卫四', color: '#a89888', size: 1.3 },
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
          // 卫星标签：挂到 sprite（自动跟随位置）
          const moonEl = document.createElement('div')
          moonEl.textContent = moon.nameCN
          moonEl.style.cssText = 'color:#a8d8ff;font-size:9px;background:rgba(7,8,22,0.5);padding:0 4px;border-radius:6px;white-space:nowrap;opacity:0.75'
          const moonLabel = new CSS2DObject(moonEl)
          moonLabel.position.set(0, 1.5, 0)
          moonSprite.add(moonLabel)
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

      // P0-3：行星大气层光晕（菲涅尔 shader）
      // 给有大气的行星加边缘光晕，营造厚实感
      if (planet.atmosphere) {
        const atmoGeo = new SphereGeometry(planet.size * 1.08, 64, 32)
        const atmoMat = new ShaderMaterial({
          uniforms: {
            uColor: { value: new Color(planet.atmosphere.color) },
            uIntensity: { value: planet.atmosphere.intensity },
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
              // 菲涅尔：越靠近边缘越亮
              float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 2.5);
              gl_FragColor = vec4(uColor, fresnel * uIntensity);
            }
          `,
          transparent: true,
          blending: AdditiveBlending,
          side: BackSide,
          depthWrite: false,
        })
        tiltGroup.add(new Mesh(atmoGeo, atmoMat))
      }

      // 土星环：ShaderMaterial，含本影 + 透射 + 冰粒散射（参考 Solar-Wanderer）
      // ring 挂到 tiltGroup（自动跟随土星公转），uSunDirLocal 每帧由 animate 循环更新
      if (planet.ringTexture) {
        const ringTex = texLoader.load(planet.ringTexture)
        ringTex.colorSpace = 'srgb'
        const innerR = planet.size * 1.4
        const outerR = planet.size * 2.3
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
            uSunDirLocal: { value: new Vector3(1, 0, 0) },  // 每帧由 animate 更新
            uTint: { value: new Color(0xddc8a0) },
          },
          vertexShader: `
            varying vec2 vUv;
            varying vec3 vLocalPos;
            void main() {
              vUv = uv;
              vLocalPos = position;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform sampler2D uMap;
            uniform float uPlanetR;
            uniform vec3 uSunDirLocal;
            uniform vec3 uTint;
            varying vec2 vUv;
            varying vec3 vLocalPos;
            void main() {
              // 采样环纹理（1D 径向条带）
              vec4 tex = texture2D(uMap, vec2(vUv.x, 0.5));
              vec3 col = tex.rgb * uTint;

              // ring 局部坐标系下环法向量为 (0,0,1)
              vec3 N = vec3(0.0, 0.0, 1.0);
              float ndl = dot(N, uSunDirLocal);

              // 受光面反射
              float lit = max(ndl, 0.0);
              // 背光面透射（冰粒散射）
              float trans = pow(max(-ndl, 0.0), 0.7) * 0.35;
              // 掠射散射（边缘亮）
              float graz = 0.45 * (1.0 - abs(ndl));

              float intensity = lit + trans + graz;
              col *= 0.4 + intensity * 0.8;

              // 行星本影：行星中心在 ring 局部坐标系原点 (0,0,0)
              vec3 toRing = vLocalPos;
              float along = dot(toRing, uSunDirLocal);
              float perp = length(toRing - along * uSunDirLocal);
              float shadow = smoothstep(uPlanetR * 0.985, uPlanetR * 1.02, perp);
              if (along < 0.0) col *= 0.2 + 0.8 * shadow;

              gl_FragColor = vec4(col, tex.a * 0.95);
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
        // 注册到 ringUpdaters，供 animate 循环每帧更新 uSunDirLocal
        ringUpdaters.push({ ringMat, axialTilt: planet.axialTilt ?? 0 })
      }

      // 标签：挂到 tiltGroup（自动跟随行星公转，无需每帧手动更新位置）
      const el = document.createElement('div')
      el.textContent = planet.nameCN
      el.style.cssText = 'color:#ffd98a;font-size:11px;background:rgba(7,8,22,0.6);padding:1px 6px;border-radius:8px;border:1px solid rgba(255,217,138,0.2);backdrop-filter:blur(4px);white-space:nowrap'
      const label = new CSS2DObject(el)
      // 局部坐标：从行星中心沿径向向外偏移 size+6
      label.position.set(0, planet.size + 6, 0)
      tiltGroup.add(label)
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
  // GPU 检测：低端设备跳过 InstancedMesh，用 Points 降级
  // （gpuCap/renderParams 已在 composer 前声明，此处复用）
  // Fallback 策略：InstancedMesh 位置计算失败时自动降级为 Points，避免 visible=false 永不显示

  // 共用：异步计算 8 颗小行星地心视位置
  const asteroidPositionsPromise = Promise.all(ASTEROIDS.map(ast => getAsteroidPosition(ast)))

  // 共用：降级为 Points 渲染（用于低端设备或 InstancedMesh 失败时）
  function renderAsteroidsAsPoints(positions: Array<{ ra: number; dec: number; distance: number } | null>) {
    if (disposed) return
    const posArr: number[] = []
    const colArr: number[] = []
    ASTEROIDS.forEach((ast, idx) => {
      const p = positions[idx]
      if (!p) return
      const v = raDecXYZ(p.ra, p.dec, SPHERE_RADIUS * 0.95)
      posArr.push(v.x, v.y, v.z)
      const [r, g, b] = hexRGB(ast.color)
      colArr.push(r, g, b)
    })
    if (posArr.length === 0) return
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(posArr), 3))
    g.setAttribute('color', new BufferAttribute(new Float32Array(colArr), 3))
    const mat = new PointsMaterial({
      size: 3, map: texCache.get(8) ?? glowTex('white', 32),
      blending: AdditiveBlending, depthWrite: false, depthTest: true,
      transparent: true, vertexColors: true, sizeAttenuation: true,
    })
    skyGroup.add(new Points(g, mat))
  }

  if (renderParams.instancedMesh && gpuCap.instanced) {
    // 高/中端：InstancedMesh，8 颗小行星单 draw call
    const astGeo = new IcosahedronGeometry(1.2, 0)
    const astMat = new MeshBasicMaterial({ vertexColors: true })
    const inst = new InstancedMesh(astGeo, astMat, ASTEROIDS.length)
    inst.instanceMatrix.setUsage(0x88E8)  // DYNAMIC_DRAW
    inst.frustumCulled = false
    inst.visible = false  // 异步计算位置前隐藏，避免 8 颗堆叠在天球中心
    skyGroup.add(inst)
    asteroidInst = inst  // 供 animate 循环每帧更新位置

    const dummy = new Object3D()
    asteroidPositionsPromise.then(positions => {
      if (disposed) return
      let validCount = 0
      ASTEROIDS.forEach((ast, idx) => {
        const pos = positions[idx]
        if (!pos) return
        validCount++
        const v = raDecXYZ(pos.ra, pos.dec, SPHERE_RADIUS * 0.95)
        dummy.position.set(v.x, v.y, v.z)
        // 大小按视星等反比：mag 5.9 → 1.5, mag 8.2 → 0.6
        const size = Math.max(0.5, 2.5 - (ast.mag - 5.9) * 0.4)
        dummy.scale.set(size, size, size)
        // 随机自转倾角（静态，不动画以省 GPU）
        dummy.rotation.set(
          (ast.number * 0.7) % Math.PI,
          (ast.number * 1.3) % (2 * Math.PI),
          (ast.number * 0.5) % Math.PI,
        )
        dummy.updateMatrix()
        inst.setMatrixAt(idx, dummy.matrix)
        const [r, g, b] = hexRGB(ast.color)
        inst.setColorAt(idx, new Color(r, g, b))
      })
      if (validCount === 0) {
        // 所有位置计算失败：降级为 Points
        console.warn('[useSky] 小行星位置全部失败，降级为 Points')
        skyGroup.remove(inst)
        astGeo.dispose(); astMat.dispose()
        renderAsteroidsAsPoints(positions)
        return
      }
      inst.instanceMatrix.needsUpdate = true
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true
      inst.visible = true
    }).catch(err => {
      console.error('[useSky] 小行星 InstancedMesh 渲染失败，降级为 Points', err)
      skyGroup.remove(inst)
      astGeo.dispose(); astMat.dispose()
      asteroidPositionsPromise.then(renderAsteroidsAsPoints)
    })
  } else {
    // 低端降级：用 Points 渲染小行星（无立体感但省 GPU）
    asteroidPositionsPromise.then(renderAsteroidsAsPoints)
      .catch(err => console.error('[useSky] 小行星降级渲染失败', err))
  }

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
  const meteorTrailLines: LineSegments | null = maxParticles > 0 ? (() => {
    // 拖尾用 LineSegments：每个粒子 8 段 = 16 个顶点
    const TRAIL_SEGMENTS = 8
    const totalVerts = maxParticles * TRAIL_SEGMENTS * 2
    const positions = new Float32Array(totalVerts * 3)
    const colors = new Float32Array(totalVerts * 3)
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(positions, 3))
    g.setAttribute('color', new BufferAttribute(colors, 3))
    const mat = new LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.85,
      blending: AdditiveBlending, depthWrite: false, depthTest: true,
    })
    const lines = new LineSegments(g, mat)
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

  // ═══ 渲染 ═══
  let af = 0
  let hoverGlowTargetOpacity = 0
  let lstSyncAccum = 0
  let lastFrameTime = performance.now()
  function animate() {
    af = requestAnimationFrame(animate)
    camera.updateProjectionMatrix()

    // 实时恒星漂移：按真实恒星时与基础 LST 的差修正 rotY
    if (observer) {
      lstSyncAccum += 16
      if (lstSyncAccum >= 5000) {
        lstSyncAccum = 0
        const jd = dateToJD(new Date())
        const cur = lstDeg(jd, observer.lon)
        let d = cur - lstRefDeg
        if (d > 180) d -= 360
        if (d < -180) d += 360
        baseRotY = -(cur / 15) * D2R
        lstRefDeg = cur
      }
      // 基础朝向 + 用户拖动偏移
      camera.rotation.set(
        baseRotX + (rotX - 0.3),
        baseRotY + rotY,
        0,
        'YXZ',
      )
      // 每日同步一次黄道顶点（岁差 + 真黄赤交角年变化，约 0.003°/年）
      eclipticRefreshAccum += 16
      if (eclipticRefreshAccum > 1000 * 60 * 60 * 24 && eclipticLine) {
        eclipticRefreshAccum = 0
        const now = new Date()
        const v: number[] = []
        for (let i = 0; i <= 360; i++) {
          const { ra, dec } = eclipticToRaDecJD(i, now)
          const p = raDecXYZ(ra, dec, SPHERE_RADIUS)
          v.push(p.x, p.y, p.z)
        }
        const next = new Float32Array(v)
        ;(eclipticLine.userData as { basePos: Float32Array }).basePos = next
        eclipticLine.geometry.setAttribute('position', new BufferAttribute(next, 3))
        eclipticLine.geometry.computeBoundingSphere()
        eclipticLine.computeLineDistances()
      }
    }
    // hover glow opacity lerp
    const sm = hoverGlow.material as SpriteMaterial
    sm.opacity += (hoverGlowTargetOpacity - sm.opacity) * 0.2
    if (sm.opacity < 0.01 && hoverGlowTargetOpacity === 0) {
      sm.opacity = 0
      hoverGlow.visible = false
    }
    // 有故事的星：呼吸辉光动画
    const _now = performance.now()
    for (const sg of storyGlows) {
      const t = ((_now + sg.phase * 1000) % sg.period) / sg.period
      const breath = (Math.sin(t * Math.PI * 2 - Math.PI / 2) + 1) * 0.5
      ;(sg.sprite.material as SpriteMaterial).opacity = 0.15 + breath * 0.55
    }
    // 行星自转（14-A §4）：rotationPeriod 单位为小时，负值表示逆向自转
    const deltaMs = _now - lastFrameTime
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
          const eq = AE.Equator(body, simDate, _reusedObserver, true, false)
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
      // ─── 伽利略卫星（木卫 1-4）实时位置 ───
      // JupiterMoons 返回 jovicentric EQJ 向量（AU）
      // 卫星地心向量 = (木星日心 + jovicentric) - 地球日心
      // 用 EquatorFromVector 转 RA/Dec（J2000），与恒星参考系一致
      if (moonSprites.length === 4 && _reusedMoonVec) {
        try {
          const earth = AE.HelioVector(AE.Body.Earth, simDate)
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
      // ─── 土星环 uSunDirLocal 每帧更新（太阳与土星都在运动） ───
      // 太阳方向在 skyGroup 局部坐标系 = sunPos - saturnPos
      // 转 ring 局部坐标系：先撤销 tiltGroup 的 z 轴倾角，再撤销 ring 的 x 轴 90° 旋转
      if (ringUpdaters.length > 0 && sunLightRef) {
        // 找到土星 tiltGroup 的当前位置（即土星 planetUpdater 的 tiltGroup）
        const saturnUpdater = planetUpdaters.find(u => u.bodyName === 'Saturn')
        if (saturnUpdater) {
          const sunPos = sunLightRef.position
          const satPos = saturnUpdater.tiltGroup.position
          _reusedSunDir.set(sunPos.x - satPos.x, sunPos.y - satPos.y, sunPos.z - satPos.z).normalize()
          for (const { ringMat, axialTilt } of ringUpdaters) {
            // 撤销 tiltGroup 的 z 轴旋转（axialTilt）
            const tiltRad = axialTilt * Math.PI / 180
            const cosT = Math.cos(-tiltRad), sinT = Math.sin(-tiltRad)
            // 撤销 ring 的 x 轴 90° 旋转
            const ringRotX = Math.PI / 2
            const cosX = Math.cos(-ringRotX), sinX = Math.sin(-ringRotX)
            // 先撤销 z 轴倾角：x'=x*cos+y*cos, y'=-x*sin+y*cos, z'=z
            const x1 = _reusedSunDir.x * cosT + _reusedSunDir.y * sinT
            const y1 = -_reusedSunDir.x * sinT + _reusedSunDir.y * cosT
            const z1 = _reusedSunDir.z
            // 再撤销 x 轴 90°：y''=y*cos-z*sin, z''=y*sin+z*cos
            const x2 = x1
            const y2 = y1 * cosX - z1 * sinX
            const z2 = y1 * sinX + z1 * cosX
            ;(ringMat.uniforms.uSunDirLocal.value as Vector3).set(x2, y2, z2).normalize()
          }
        }
      }
      // ─── 小行星实时位置（每帧重算，与行星一致） ───
      // 8 颗小行星每日移动 0.21-0.33°，不更新会明显偏离真实位置
      // 用同步版本避免每帧动态 import；位置失败静默跳过
      if (asteroidInst && asteroidInst.visible) {
        const astR = SPHERE_RADIUS * 0.95
        for (let i = 0; i < ASTEROIDS.length; i++) {
          const ast = ASTEROIDS[i]
          const pos = getAsteroidPositionSync(AE, ast, simDate)
          if (!pos) continue
          const v = raDecXYZ(pos.ra, pos.dec, astR)
          asteroidDummy.position.set(v.x, v.y, v.z)
          // 大小按视星等反比（与初始化一致）
          const size = Math.max(0.5, 2.5 - (ast.mag - 5.9) * 0.4)
          asteroidDummy.scale.set(size, size, size)
          // 自转倾角保持静态（与初始化一致）
          asteroidDummy.rotation.set(
            (ast.number * 0.7) % Math.PI,
            (ast.number * 1.3) % (2 * Math.PI),
            (ast.number * 0.5) % Math.PI,
          )
          asteroidDummy.updateMatrix()
          asteroidInst.setMatrixAt(i, asteroidDummy.matrix)
        }
        asteroidInst.instanceMatrix.needsUpdate = true
      }
    }
    for (const mesh of planetMeshes) {
      const ud = mesh.userData as { rotationPeriod?: number }
      if (ud.rotationPeriod) {
        // 每秒转 360/period 度（period 单位小时）；加速 60 倍便于肉眼观察
        const degPerMs = 360 / (ud.rotationPeriod * 3600 * 1000) * 60
        mesh.rotation.y += degPerMs * deltaMs * Math.PI / 180
      }
    }
    // ─── 阶段 3 P2-2：流星雨粒子更新 ───
    // 每小时刷新一次活跃流星雨列表（基于模拟时间，加速时也能正确切换季节）
    if (_now - lastShowerRefresh > 3600 * 1000) refreshShowers(new Date(simTimeMs))
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
    }
    labelRenderer.render(scene, camera)
    // 用 composer 替代 renderer.render，自动应用 Bloom + Vignette + ACES
    composer.render()
  }
  animate()
  if (!observer) camera.rotation.set(rotX, rotY, 0, 'YXZ')

  return {
    camera,
    zoomIn()  { userFov = Math.max(FOV_MIN, userFov - 5); },
    zoomOut() { userFov = Math.min(FOV_MAX, userFov + 5); },
    setObserver,
    setStarStatsCache(cache) {
      cache.forEach((v, k) => statsCache.set(k, v))
      updateStoryGlows(cache)
    },
    updateHorizonRotation(lat: number | undefined, lng: number | undefined) {
      if (lat == null || lng == null) {
        skyGroup.matrix.identity()
        return
      }
      const lstHours = ((gmstHours(new Date()) + lng / 15) % 24 + 24) % 24
      const lstRad = lstHours / 24 * Math.PI * 2
      const latRad = lat * D2R
      const ry = lstRad - Math.PI / 2
      const rx = Math.PI / 2 - latRad
      const cy = Math.cos(ry), sy = Math.sin(ry)
      const cx = Math.cos(rx), sx = Math.sin(rx)
      const m = new Matrix4()
      m.set(
        cy,      -sx*sy,  cx*sy,  0,
        0,        cx,      sx,     0,
        -sy,     -sx*cy,  cx*cy,  0,
        0,        0,        0,     1,
      )
      skyGroup.matrix.copy(m)
    },
    dispose() {
      // P1-1：完整资源释放
      disposed = true
      abortController.abort()  // 一次性移除所有 addEventListener
      cancelAnimationFrame(af)
      lrEl.remove()
      ttStyle.remove()
      // 移除 tooltipEl DOM（被 CSS2DObject 包装后加入 scene）
      if (tooltipEl.parentNode) tooltipEl.parentNode.removeChild(tooltipEl)
      // 释放 GPU 资源（geometry/material/texture）
      // scene.clear() 只移除场景图引用，不释放 GPU 内存
      scene.traverse((obj) => {
        const mesh = obj as Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        const mat = mesh.material
        if (Array.isArray(mat)) {
          mat.forEach(m => {
            m.dispose()
            // 释放材质引用的纹理
            Object.values(m).forEach(v => {
              if (v && typeof v === 'object' && 'isTexture' in v && 'dispose' in v) {
                (v as { dispose: () => void }).dispose()
              }
            })
          })
        } else if (mat) {
          mat.dispose()
          Object.values(mat).forEach(v => {
            if (v && typeof v === 'object' && 'isTexture' in v && 'dispose' in v) {
              (v as { dispose: () => void }).dispose()
            }
          })
        }
      })
      ;(labelRenderer as unknown as { dispose: () => void }).dispose()
      // 释放后处理资源（composer 内部 renderTarget）
      composer.dispose()
      renderer.dispose()
      scene.clear()
    },
  }
}
