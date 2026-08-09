/**
 * 屏幕震动反馈（点击进入开场时）
 * 优先 navigator.vibrate(12)；不支持震动的浏览器（或异常抛出）时，
 * 给 body 加 .screen-shake 类触发 CSS 抖动 fallback。
 * 对应的 .screen-shake 关键帧动画定义在 WelcomePage.vue 的全局样式块中。
 */
export function useScreenShake() {
  let shakeTimer: ReturnType<typeof setTimeout> | null = null

  function shake() {
    // 原生震动（移动端支持时生效，桌面端静默失败）
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(12)
      }
    } catch {
      /* 忽略：不支持震动环境走 CSS fallback */
    }

    // CSS 类 fallback：重新触发抖动动画
    const body = document.body
    if (!body) return
    body.classList.remove('screen-shake')
    // 强制 reflow，确保动画能重新播放
    void body.offsetWidth
    body.classList.add('screen-shake')
    if (shakeTimer) clearTimeout(shakeTimer)
    shakeTimer = setTimeout(() => {
      body.classList.remove('screen-shake')
      shakeTimer = null
    }, 420)
  }

  return { shake }
}
