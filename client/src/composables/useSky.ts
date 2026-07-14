import {
  Scene, PerspectiveCamera, WebGLRenderer,
  Points, BufferGeometry, BufferAttribute, PointsMaterial, CanvasTexture,
  Line, LineBasicMaterial, LineDashedMaterial, LineSegments,
  AdditiveBlending, Color, Mesh, MeshBasicMaterial, SphereGeometry, BackSide,
  Raycaster, Vector2, Vector3, Sprite, SpriteMaterial, DoubleSide,
} from 'three'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { SPHERE_RADIUS, DEFAULT_FOV, FOV_MIN, FOV_MAX } from '../utils/constants'
import { dateToJD, lstDeg, orientationEuler } from '../utils/astro'

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

// RA(时)/Dec(°) → 天球 3D
const D2R = Math.PI / 180
function raDecXYZ(raH: number, decD: number, R: number) {
  const ra = raH / 24 * Math.PI * 2, dec = decD * D2R, cd = Math.cos(dec)
  return { x: R * cd * Math.cos(ra), y: R * Math.sin(dec), z: -R * cd * Math.sin(ra) }
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
}

export function useSky(
  canvas: HTMLCanvasElement,
  options?: {
    onStarClick?: (starId: number) => void
    onStarHover?: (starId: number | null) => void
    live?: boolean
  }
): SkyAPI {
  const live = options?.live ?? true
  const scene = new Scene()
  const camera = new PerspectiveCamera(DEFAULT_FOV, canvas.clientWidth/canvas.clientHeight, 0.5, SPHERE_RADIUS*3)
  camera.position.set(0,0,0)

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.setSize(canvas.clientWidth, canvas.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(new Color('#070816'))

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
    scene.add(pts)
  }

  // ═══ 星座连线 ═══
  {
    const allLines: [number, number][] = [...(CAT.lines || []), ...(newLinesData as [number, number][])]
    if (allLines.length) {
      const v: number[] = []
      for (const [a,b] of allLines) { if (a<n&&b<n) { const sa=stars[a],sb=stars[b]; v.push(sa.x,sa.y,sa.z,sb.x,sb.y,sb.z) } }
      const lg = new BufferGeometry(); lg.setAttribute('position', new BufferAttribute(new Float32Array(v), 3))
      // main — muted slate
      scene.add(new LineSegments(lg, new LineBasicMaterial({ color:0x6677aa, transparent:true, opacity:0.28, depthTest:true, depthWrite:false })))
      // warm-gold glow pass underneath
      const vg = v.slice()
      const lg2 = new BufferGeometry(); lg2.setAttribute('position', new BufferAttribute(new Float32Array(vg), 3))
      const glow = new LineSegments(lg2, new LineBasicMaterial({
        color:0xffd98a, transparent:true, opacity:0.12, blending:AdditiveBlending, depthWrite:false, depthTest:false,
      }))
      glow.scale.setScalar(1.003)
      scene.add(glow)
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
    scene.add(new Line(g, new LineBasicMaterial({ color: 0x335577, transparent: true, opacity: 0.25, depthTest: true, depthWrite: false })))
  }

  // ═══ 黄道 (虚线) ═══
  {
    const v: number[] = []
    for (let i = 0; i <= 360; i++) {
      const { ra, dec } = eclipticToRaDec(i)
      const p = raDecXYZ(ra, dec, SPHERE_RADIUS)
      v.push(p.x, p.y, p.z)
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
    line.computeLineDistances()
    scene.add(line)
  }

  // ═══ 银河 ═══
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
    scene.add(mwMesh)
    // warm-gold inner band (brighter core of the ribbon)
    const core = milkyWayRibbon(SPHERE_RADIUS, 7, 360)
    const cg = new BufferGeometry()
    cg.setAttribute('position', new BufferAttribute(new Float32Array(core.verts), 3))
    cg.setIndex(core.indices)
    scene.add(new Mesh(cg, new MeshBasicMaterial({
      color: 0xffd98a, transparent: true, opacity: 0.10,
      blending: AdditiveBlending, depthWrite: false, depthTest: false, side: DoubleSide,
    })))
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
      scene.add(label)
    }
  }

  // ═══ 东南西北标注 ═══
  {
    const cardinals = [
      { text: 'N', sub: '北', x: 0, z: -1 },
      { text: 'S', sub: '南', x: 0, z: 1 },
      { text: 'E', sub: '东', x: 1, z: 0 },
      { text: 'W', sub: '西', x: -1, z: 0 },
    ]
    for (const c of cardinals) {
      const el = document.createElement('div')
      el.textContent = `${c.text} ${c.sub}`
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

  // ═══ 悬浮高亮辉光 ═══
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

    // 临时向量（避免每帧分配）
    const _v = new Vector3()

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
      // tooltip 位置
      const sn = starNormMap.get(starId)
      if (sn) {
        tooltipLabel.position.set(sn.nx * SPHERE_RADIUS, sn.ny * SPHERE_RADIUS - 50, sn.nz * SPHERE_RADIUS)
        hoverGlow.position.set(sn.nx * SPHERE_RADIUS, sn.ny * SPHERE_RADIUS, sn.nz * SPHERE_RADIUS)
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

    canvas.addEventListener('pointerdown', () => { clickDrag = false })
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

      // 用屏幕投影找最近的星
      camera.updateMatrixWorld()
      camera.updateProjectionMatrix()
      let bestDist = Infinity
      let bestId = -1
      let bestNx = 0, bestNy = 0, bestNz = 0
      for (const sn of allStarNorms) {
        _v.set(sn.nx, sn.ny, sn.nz).project(camera)
        if (_v.z > 1) continue // 在相机后面
        const dx = _v.x - mouse.x
        const dy = _v.y - mouse.y
        const d = dx*dx + dy*dy
        if (d < bestDist) { bestDist = d; bestId = sn.id; bestNx = sn.nx; bestNy = sn.ny; bestNz = sn.nz }
      }
      // 阈值：NDC 空间 0.03 ≈ 屏幕中心 1.5% 宽度
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
    })
    canvas.addEventListener('pointerup', (e) => {
      if (clickDrag) return // 是拖动不是点击
      if (hoveredStarId !== -1) {
        options?.onStarClick?.(hoveredStarId)
      }
    })
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
  })
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return
    rotY += (e.clientX - px) * 0.004
    rotX += (e.clientY - py) * 0.004
    rotX = Math.max(-Math.PI*0.48, Math.min(Math.PI*0.48, rotX))
    camera.rotation.set(rotX, rotY, 0, 'YXZ')
    px = e.clientX; py = e.clientY
  })
  canvas.addEventListener('pointerup', (e) => { dragging = false; canvas.releasePointerCapture(e.pointerId) })

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault()
    userFov = Math.max(FOV_MIN, Math.min(FOV_MAX, userFov + e.deltaY * 0.05))
    camera.fov = userFov
    camera.updateProjectionMatrix()
  }, { passive: false })

  window.addEventListener('resize', () => {
    camera.aspect = canvas.clientWidth / canvas.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(canvas.clientWidth, canvas.clientHeight)
    labelRenderer.setSize(canvas.clientWidth, canvas.clientHeight)
  })

  // ═══ 渲染 ═══
  let af = 0
  let hoverGlowTargetOpacity = 0
  let lstSyncAccum = 0
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
    }
    // hover glow opacity lerp
    const sm = hoverGlow.material as SpriteMaterial
    sm.opacity += (hoverGlowTargetOpacity - sm.opacity) * 0.2
    if (sm.opacity < 0.01 && hoverGlowTargetOpacity === 0) {
      sm.opacity = 0
      hoverGlow.visible = false
    }
    labelRenderer.render(scene, camera)
    renderer.render(scene, camera)
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
    },
    dispose() {
      cancelAnimationFrame(af)
      lrEl.remove()
      ttStyle.remove()
      ;(labelRenderer as unknown as { dispose: () => void }).dispose()
      renderer.dispose()
      scene.clear()
    },
  }
}
