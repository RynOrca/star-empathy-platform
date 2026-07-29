import { ref, onMounted, onBeforeUnmount } from 'vue'

const BREAKPOINT = 768

export function useMediaQuery() {
  const isMobile = ref(false)

  let mediaQuery: MediaQueryList | null = null

  function update() {
    if (typeof window === 'undefined') return
    isMobile.value = window.matchMedia(`(max-width: ${BREAKPOINT}px)`).matches
  }

  onMounted(() => {
    mediaQuery = window.matchMedia(`(max-width: ${BREAKPOINT}px)`)
    update()
    mediaQuery.addEventListener('change', update)
  })

  onBeforeUnmount(() => {
    if (mediaQuery) {
      mediaQuery.removeEventListener('change', update)
    }
  })

  return { isMobile }
}