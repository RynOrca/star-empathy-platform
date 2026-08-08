import { ref, reactive, computed, onBeforeUnmount } from 'vue'
import { useSky, type StarInFrame } from './useSky'
import { useStars, type StarData } from './useStars'

/** 相机模式状态机 */
type CameraState = 'IDLE' | 'SCROLLING' | 'FLYING' | 'DETAIL_OPEN' | 'CANCEL'

/**
 * 相机模式过滤模式（互斥）：
 * - gazing 观星：故事卡片仅展示星星本身的介绍（取该星 history 故事的 content）
 * - listening 听语：故事卡片展示星星的情感故事（优先共鸣高且未看过的 user 故事）
 */
export type CameraFilterMode = 'gazing' | 'listening'

export interface CameraFilters {
  mode: CameraFilterMode
}

export interface StoryListItem {
  star: StarData
  inFrame: StarInFrame
}

/** localStorage key：记录用户在相机模式下已看过详情的故事星 ID */
const SEEN_STARS_KEY = 'camera-seen-stars'

/** 判断故事星是否未看过（localStorage 记录） */
function isStarUnseen(starId: number): boolean {
  try {
    const seen: number[] = JSON.parse(localStorage.getItem(SEEN_STARS_KEY) || '[]')
    return !seen.includes(starId)
  } catch {
    return true
  }
}

/** 标记故事星为已看 */
export function markStarSeen(starId: number): void {
  try {
    const seen: number[] = JSON.parse(localStorage.getItem(SEEN_STARS_KEY) || '[]')
    if (!seen.includes(starId)) {
      seen.push(starId)
      localStorage.setItem(SEEN_STARS_KEY, JSON.stringify(seen))
    }
  } catch {
    // localStorage 不可用时静默失败
  }
}

export function useCameraMode(sky: ReturnType<typeof useSky>, stars: ReturnType<typeof useStars>) {
  const cameraMode = ref<'normal' | 'observe'>('normal')
  const state = ref<CameraState>('IDLE')
  const activeStarId = ref<number | null>(null)
  const isAnimating = ref(false)
  const isCardOpen = ref(false)
  const activeCardStar = ref<StarData | null>(null)

  const filters = reactive<CameraFilters>({
    mode: 'listening',
  })

  const starsInFrame = ref<StarInFrame[]>([])
  const cameraZoomLevel = sky.cameraZoomLevel

  let unsubscribeFrame: (() => void) | null = null
  let throttleTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * 过滤后的取景框故事列表（按星去重：每颗星只显示一个卡片）
   * - gazing 观星：只取 history 类型故事（星星本身的介绍/神话传说）
   * - listening 听语：取 user + history 两类故事（用户情感故事优先，其次历史故事），
   *   未看过 + 共鸣高优先。同一颗星若同时有 user 和 history 故事，优先展示 user 故事。
   */
  const frameStories = computed<StoryListItem[]>(() => {
    const starMap = new Map(stars.filteredStars.value.map(s => [s.id, s]))
    // 收取景框内故事星，并按模式过滤类型
    const inFrameItems: StoryListItem[] = []
    for (const sif of starsInFrame.value) {
      const star = starMap.get(sif.starId)
      if (!star) continue
      // 观星模式只保留 history（星星介绍）；听语模式保留 user + history（情感故事优先）
      if (filters.mode === 'gazing' && star.type !== 'history') continue
      // listening 不过滤类型（user 和 history 都保留）
      inFrameItems.push({ star, inFrame: sif })
    }
    if (inFrameItems.length === 0) return []

    // 按星去重：catalogStarId 优先作为星标识，无则用故事 id
    const byStar = new Map<string, StoryListItem>()
    for (const item of inFrameItems) {
      const key = item.star.catalogStarId !== null && item.star.catalogStarId !== undefined
        ? `c${item.star.catalogStarId}`
        : `s${item.star.id}`
      const existing = byStar.get(key)
      if (!existing) {
        byStar.set(key, item)
        continue
      }
      // 同星多故事择优
      if (filters.mode === 'listening') {
        // user 故事优先于 history 故事
        if (item.star.type === 'user' && existing.star.type !== 'user') {
          byStar.set(key, item)
          continue
        }
        if (item.star.type !== 'user' && existing.star.type === 'user') continue
        // 同类型内：未看过优先，其次共鸣高
        const itemUnseen = isStarUnseen(item.star.id)
        const existUnseen = isStarUnseen(existing.star.id)
        if (itemUnseen && !existUnseen) byStar.set(key, item)
        else if (itemUnseen === existUnseen && item.star.resonanceCount > existing.star.resonanceCount) byStar.set(key, item)
      } else {
        // 观星：共鸣数高优先
        if (item.star.resonanceCount > existing.star.resonanceCount) byStar.set(key, item)
      }
    }

    const result = Array.from(byStar.values())
    if (filters.mode === 'listening') {
      // 听语模式排序：user 故事在前（未看过优先 + 共鸣降序），history 故事在后（共鸣降序）
      result.sort((a, b) => {
        const aIsUser = a.star.type === 'user'
        const bIsUser = b.star.type === 'user'
        if (aIsUser !== bIsUser) return aIsUser ? -1 : 1
        // 同类型内排序
        if (aIsUser) {
          // user 故事：未看过优先，共鸣降序
          const aUnseen = isStarUnseen(a.star.id)
          const bUnseen = isStarUnseen(b.star.id)
          if (aUnseen !== bUnseen) return aUnseen ? -1 : 1
        }
        return b.star.resonanceCount - a.star.resonanceCount
      })
    } else {
      // 观星模式：共鸣数降序
      result.sort((a, b) => b.star.resonanceCount - a.star.resonanceCount)
    }
    return result.slice(0, 50)
  })

  /** 进入相机模式 */
  function enter(): void {
    if (cameraMode.value === 'observe') return
    cameraMode.value = 'observe'
    state.value = 'IDLE'

    // 禁用移动端准星吸附与「凝听星语」按钮触发（天镜模式只允许拖动+放大）
    sky.setSnapEnabled(false)

    // 直接传 filteredStars 引用，避免创建 200+ 对象的数组（StarData 具备所需字段）
    sky.setCameraModeOverlay(true, stars.filteredStars.value as unknown as Array<{ id: number; catalogStarId: number | null; posX: number; posY: number; posZ: number }>)

    let throttling = false
    unsubscribeFrame = sky.onCameraFrame(() => {
      if (throttling) return
      throttling = true
      if (throttleTimer) clearTimeout(throttleTimer)
      throttleTimer = setTimeout(() => {
        throttling = false
        refreshStarsInFrame()
      }, 400)
    })

    // 立即刷新一次，避免首帧 400ms 延迟
    refreshStarsInFrame()
  }

  /** 退出相机模式 */
  function exit(): void {
    if (cameraMode.value === 'normal') return
    cameraMode.value = 'normal'
    state.value = 'IDLE'
    if (isCardOpen.value) closeStoryCard()
    sky.cancelFly()
    sky.setCameraModeOverlay(false)
    // 恢复移动端准星吸附与「凝听星语」按钮触发
    sky.setSnapEnabled(true)
    if (unsubscribeFrame) {
      unsubscribeFrame()
      unsubscribeFrame = null
    }
    if (throttleTimer) {
      clearTimeout(throttleTimer)
      throttleTimer = null
    }
    starsInFrame.value = []
    // 同步清辉光 boost（useSky 的 setCameraModeOverlay(false) 里也会做，这里双保险）
    sky.setFrameBoostStars([])
    activeStarId.value = null
    activeCardStar.value = null
    isAnimating.value = false
  }

  /** 刷新取景框内故事星列表 */
  function refreshStarsInFrame(): void {
    if (cameraMode.value !== 'observe') return
    // 直接传 filteredStars 引用，避免每 400ms 创建 200+ 对象的数组导致 GC 卡顿
    // getStarsInFrame 只读取 id/catalogStarId/posX/posY/posZ，StarData 具备这些字段
    starsInFrame.value = sky.getStarsInFrame(stars.filteredStars.value as unknown as Array<{ id: number; catalogStarId: number | null; posX: number; posY: number; posZ: number }>)
    // ✅ 通知 useSky：取景框内「被提到的星」（有故事 / 仅观星方向提到）统一加额外辉光 boost
    sky.setFrameBoostStars(starsInFrame.value)
  }

  /** 等待 ms */
  function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /** 点击列表卡片：居中滚动 → 飞镜头 → 打开卡片 */
  async function handleStoryClick(star: StarData, scrollToCardCenter?: (id: number) => void, isCardCentered?: (id: number) => boolean): Promise<void> {
    if (isAnimating.value) return
    const wasActive = activeStarId.value === star.id
    activeStarId.value = star.id

    const centered = isCardCentered ? isCardCentered(star.id) : true
    if (!centered) {
      closeStoryCard()
      isAnimating.value = true
      state.value = 'SCROLLING'
      scrollToCardCenter?.(star.id)
      sky.flyToStar3D(star, { zoomLevel: 3 })
      state.value = 'FLYING'
      await wait(700)
      if (cameraMode.value !== 'observe') return
      openStoryCard(star)
      state.value = 'DETAIL_OPEN'
      isAnimating.value = false
    } else {
      isAnimating.value = true
      state.value = 'FLYING'
      sky.flyToStar3D(star, { zoomLevel: 3 })
      const wasOpen = isCardOpen.value
      if (wasOpen && wasActive) {
        await wait(700)
        if (cameraMode.value !== 'observe') return
        state.value = 'DETAIL_OPEN'
        isAnimating.value = false
      } else {
        if (wasOpen) closeStoryCard()
        await wait(700)
        if (cameraMode.value !== 'observe') return
        openStoryCard(star)
        state.value = 'DETAIL_OPEN'
        isAnimating.value = false
      }
    }
  }

  /** 打开故事卡片 */
  function openStoryCard(star: StarData): void {
    activeCardStar.value = star
    isCardOpen.value = true
    // 进入详情时标记为已看（影响听语模式的"未看过"排序）
    markStarSeen(star.id)
  }

  /** 关闭故事卡片 */
  function closeStoryCard(): void {
    isCardOpen.value = false
    activeCardStar.value = null
  }

  /** 设置过滤模式（互斥：gazing / listening） */
  function setMode(mode: CameraFilterMode): void {
    filters.mode = mode
  }

  /** 设置当前活动星 ID（不触发飞镜头，仅高亮）— 供移动端单卡片切换使用 */
  function setActiveStar(starId: number): void {
    activeStarId.value = starId
  }

  onBeforeUnmount(() => {
    exit()
  })

  return {
    cameraMode,
    state,
    starsInFrame,
    frameStories,
    activeStarId,
    isAnimating,
    isCardOpen,
    activeCardStar,
    filters,
    cameraZoomLevel,
    enter,
    exit,
    handleStoryClick,
    openStoryCard,
    closeStoryCard,
    setMode,
    setActiveStar,
    refreshStarsInFrame,
  }
}
