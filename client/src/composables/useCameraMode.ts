import { ref, reactive, computed, onBeforeUnmount } from 'vue'
import { useSky, type StarInFrame } from './useSky'
import { useStars, type StarData } from './useStars'

/** 相机模式状态机 */
type CameraState = 'IDLE' | 'SCROLLING' | 'FLYING' | 'DETAIL_OPEN' | 'CANCEL'

export interface CameraFilters {
  new: boolean
  hot: boolean
  near: boolean
  ancient: boolean
}

export interface StoryListItem {
  star: StarData
  inFrame: StarInFrame
}

export function useCameraMode(sky: ReturnType<typeof useSky>, stars: ReturnType<typeof useStars>) {
  const cameraMode = ref<'normal' | 'observe'>('normal')
  const state = ref<CameraState>('IDLE')
  const activeStarId = ref<number | null>(null)
  const isAnimating = ref(false)
  const isCardOpen = ref(false)
  const activeCardStar = ref<StarData | null>(null)

  const filters = reactive<CameraFilters>({
    new: true,
    hot: true,
    near: false,
    ancient: false,
  })

  const starsInFrame = ref<StarInFrame[]>([])
  const cameraZoomLevel = sky.cameraZoomLevel

  let unsubscribeFrame: (() => void) | null = null

  /** 过滤后的取景框故事列表（或关系，按共鸣降序） */
  const frameStories = computed<StoryListItem[]>(() => {
    const enabledCategories = [
      filters.new && 'new',
      filters.hot && 'hot',
      filters.near && 'near',
      filters.ancient && 'ancient',
    ].filter(Boolean) as string[]

    if (enabledCategories.length === 0) return []

    const result: StoryListItem[] = []
    for (const sif of starsInFrame.value) {
      const star = stars.filteredStars.value.find(s => s.id === sif.starId)
      if (!star) continue
      if (filters.new && star.isNew) result.push({ star, inFrame: sif })
      else if (filters.hot && star.isHot) result.push({ star, inFrame: sif })
      else if (filters.near && star.isNear) result.push({ star, inFrame: sif })
      else if (filters.ancient && star.isAncient) result.push({ star, inFrame: sif })
    }
    result.sort((a, b) => b.star.resonanceCount - a.star.resonanceCount)
    return result.slice(0, 50)
  })

  /** 进入相机模式 */
  function enter(): void {
    if (cameraMode.value === 'observe') return
    cameraMode.value = 'observe'
    state.value = 'IDLE'
    sky.setCameraModeOverlay(true)

    let throttling = false
    unsubscribeFrame = sky.onCameraFrame(() => {
      if (throttling) return
      throttling = true
      setTimeout(() => {
        throttling = false
        refreshStarsInFrame()
      }, 400)
    })
  }

  /** 退出相机模式 */
  function exit(): void {
    if (cameraMode.value === 'normal') return
    cameraMode.value = 'normal'
    state.value = 'IDLE'
    if (isCardOpen.value) closeStoryCard()
    sky.cancelFly()
    sky.setCameraModeOverlay(false)
    if (unsubscribeFrame) {
      unsubscribeFrame()
      unsubscribeFrame = null
    }
    starsInFrame.value = []
    activeStarId.value = null
    isAnimating.value = false
  }

  /** 刷新取景框内故事星列表 */
  function refreshStarsInFrame(): void {
    if (cameraMode.value !== 'observe') return
    const storyStars = stars.filteredStars.value.map(s => ({
      id: s.id,
      catalogStarId: s.catalogStarId,
      posX: s.posX,
      posY: s.posY,
      posZ: s.posZ,
    }))
    starsInFrame.value = sky.getStarsInFrame(storyStars)
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
      openStoryCard(star)
      state.value = 'DETAIL_OPEN'
      isAnimating.value = false
    } else {
      isAnimating.value = true
      state.value = 'FLYING'
      sky.flyToStar3D(star, { zoomLevel: 3 })
      const wasOpen = isCardOpen.value
      if (wasOpen && wasActive) {
        isAnimating.value = false
      } else {
        if (wasOpen) closeStoryCard()
        await wait(700)
        openStoryCard(star)
        state.value = 'DETAIL_OPEN'
        isAnimating.value = false
      }
    }
  }

  /** 移动端点击气泡：直接飞镜头 → 打开卡片 */
  async function handleBubbleClick(star: StarData): Promise<void> {
    if (isAnimating.value) return
    activeStarId.value = star.id
    isAnimating.value = true
    state.value = 'FLYING'
    sky.flyToStar3D(star, { zoomLevel: 3 })
    await wait(700)
    openStoryCard(star)
    state.value = 'DETAIL_OPEN'
    isAnimating.value = false
  }

  /** 打开故事卡片 */
  function openStoryCard(star: StarData): void {
    activeCardStar.value = star
    isCardOpen.value = true
  }

  /** 关闭故事卡片 */
  function closeStoryCard(): void {
    isCardOpen.value = false
    activeCardStar.value = null
  }

  /** 设置过滤器 */
  function setFilter(key: keyof CameraFilters, value: boolean): void {
    filters[key] = value
  }

  onBeforeUnmount(() => {
    if (unsubscribeFrame) unsubscribeFrame()
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
    handleBubbleClick,
    openStoryCard,
    closeStoryCard,
    setFilter,
    refreshStarsInFrame,
  }
}
