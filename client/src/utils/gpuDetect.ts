/**
 * 阶段 3 P2-3：GPU 能力检测与设备分级（14-A 性能预算）
 *
 * 检测 WebGL2 / WebGL1 / GPU 厂商，返回渲染等级
 * 用于决定 InstancedMesh 是否启用、纹理分辨率、粒子数量等
 */

export type RenderTier = 'high' | 'medium' | 'low' | 'fallback'

export interface GPUCapability {
  tier: RenderTier
  webgl2: boolean
  webgl1: boolean
  vendor: string
  renderer: string
  maxTextureSize: number
  instanced: boolean    // 是否支持 InstancedMesh（WebGL2 或 ANGLE_instanced_arrays）
}

/**
 * 检测当前浏览器 GPU 能力
 * @param canvas 可选 canvas 元素，用于创建检测上下文
 * @returns GPUCapability，失败时 tier='fallback'
 */
export function detectGPU(canvas?: HTMLCanvasElement): GPUCapability {
  const fallback: GPUCapability = {
    tier: 'fallback', webgl2: false, webgl1: false,
    vendor: '', renderer: '', maxTextureSize: 0, instanced: false,
  }
  try {
    const c = canvas ?? document.createElement('canvas')
    // 优先尝试 WebGL2
    let gl: WebGL2RenderingContext | WebGLRenderingContext | null =
      c.getContext('webgl2') as WebGL2RenderingContext | null
    const isWebGL2 = !!gl
    if (!gl) {
      gl = (c.getContext('webgl') || c.getContext('experimental-webgl')) as WebGLRenderingContext | null
    }
    if (!gl) return fallback
    const isWebGL1 = !isWebGL2 && !!gl
    const dbg = gl.getExtension('WEBGL_debug_renderer_info')
    const vendor = dbg ? (gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) as string) : (gl.getParameter(gl.VENDOR) as string)
    const renderer = dbg ? (gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) as string) : (gl.getParameter(gl.RENDERER) as string)
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number
    // InstancedMesh 需要 WebGL2 或 ANGLE_instanced_arrays 扩展
    const hasInstancedExt = !!gl.getExtension('ANGLE_instanced_arrays')
    const instanced = isWebGL2 || hasInstancedExt
    // 分级
    let tier: RenderTier = 'low'
    if (isWebGL2 && instanced) {
      // 高端：WebGL2 + 支持实例化 + 纹理 ≥ 8192 + 非 SwiftShader
      const isSoftware = /swiftshader|llvmpipe|software/i.test(renderer)
      if (maxTextureSize >= 8192 && !isSoftware) tier = 'high'
      else tier = 'medium'
    } else if (isWebGL1 && instanced) {
      tier = 'medium'
    } else {
      tier = 'low'
    }
    return { tier, webgl2: isWebGL2, webgl1: isWebGL1, vendor, renderer, maxTextureSize, instanced }
  } catch (e) {
    console.warn('[gpuDetect] GPU 检测失败，降级到 fallback', e)
    return fallback
  }
}

/**
 * 根据设备分级返回渲染参数
 * 高端：64×32 球体分段 + 2k 星点 + 启用 InstancedMesh + 后处理全开
 * 中端：32×16 球体分段 + 1k 星点 + 启用 InstancedMesh + 后处理简化
 * 低端：16×12 球体分段 + 512 星点 + 关闭 InstancedMesh + 关闭后处理
 * fallback：纯 CSS 降级提示
 */
export function getRenderParams(tier: RenderTier): {
  sphereSegments: [number, number]
  starCount: number
  instancedMesh: boolean
  bloom: boolean
  vignette: boolean
  meteorParticles: number
  maxDpr: number
  antialias: boolean
  labelMode: 'all' | 'major-only' | 'none'
  labelLODDistance: number
} {
  switch (tier) {
    case 'high':   return { sphereSegments: [64, 32], starCount: 2000, instancedMesh: true,  bloom: true,  vignette: true,  meteorParticles: 60, maxDpr: 3, antialias: true,  labelMode: 'all',         labelLODDistance: 280 }
    case 'medium': return { sphereSegments: [32, 16], starCount: 1000, instancedMesh: true,  bloom: true,  vignette: false, meteorParticles: 40, maxDpr: 2, antialias: false, labelMode: 'major-only',  labelLODDistance: 200 }
    case 'low':    return { sphereSegments: [16, 12], starCount: 512,  instancedMesh: false, bloom: false, vignette: false, meteorParticles: 20, maxDpr: 1, antialias: false, labelMode: 'none',        labelLODDistance: 0 }
    case 'fallback': return { sphereSegments: [8, 6], starCount: 256,  instancedMesh: false, bloom: false, vignette: false, meteorParticles: 0,  maxDpr: 1, antialias: false, labelMode: 'none',        labelLODDistance: 0 }
  }
}
