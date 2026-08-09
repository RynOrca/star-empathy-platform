<template>
  <div class="opening-hero">
    <h1 class="brand-title" :class="{ in: entered }">星语穹庭</h1>

    <div class="hero-band" :class="{ in: entered }">
      <div class="v-bar" />
      <div class="eyebrow">· STARS · EMPATHY ·</div>
      <div class="gold-line" />
    </div>

    <p class="brand-subtitle" :class="{ in: entered }">在这里，每颗星星都藏着一个秘密。</p>

    <div class="hint" :class="{ in: entered }">
      <div class="arrow" />
      <div class="cta">点击进入</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'

/**
 * 开场文案层：金描标题 + Stars Empathy 副标 + 居中「点击进入」呼吸提示
 * 挂载后加 .in 触发错落入场（标题 → 金线 → 副标 → 提示），纯展示组件。
 */
const entered = ref(false)

onMounted(async () => {
  await nextTick()
  requestAnimationFrame(() => {
    entered.value = true
  })
})
</script>

<style scoped>
.opening-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  user-select: none;
}

/* ═══ 金描标题 ═══ */
.brand-title {
  font-family: 'Cinzel', 'Noto Serif SC', serif;
  font-size: clamp(3rem, 9.5vmin, 6.8rem);
  font-weight: 500;
  letter-spacing: 0.12em;
  line-height: 1.1;
  /* 金描：金色渐变字 + 金色辉光 */
  background: linear-gradient(180deg, #ffe9bd 0%, #ffd98a 38%, #c0a678 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  filter: drop-shadow(0 0 18px rgba(255, 217, 138, 0.28))
    drop-shadow(0 0 46px rgba(0, 0, 0, 0.7));
  /* 默认完全可见，不依赖动画 */
  opacity: 1;
  transform: none;
}
.brand-title.in {
  animation: titleIn 1.3s 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
@keyframes titleIn {
  from {
    opacity: 0;
    transform: translateY(24px);
    filter: blur(8px) drop-shadow(0 0 18px rgba(255, 217, 138, 0.28))
      drop-shadow(0 0 46px rgba(0, 0, 0, 0.7));
  }
  65% {
    filter: blur(0) drop-shadow(0 0 18px rgba(255, 217, 138, 0.28))
      drop-shadow(0 0 46px rgba(0, 0, 0, 0.7));
  }
  to {
    opacity: 1;
    transform: none;
    filter: blur(0) drop-shadow(0 0 18px rgba(255, 217, 138, 0.28))
      drop-shadow(0 0 46px rgba(0, 0, 0, 0.7));
  }
}

/* ═══ 金线分隔 + 英文副标 ═══ */
.hero-band {
  margin-top: clamp(18px, 3.4vmin, 34px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  opacity: 1;
  transform: none;
}
.hero-band.in {
  animation: bandIn 1s 1s ease both;
}
@keyframes bandIn {
  from {
    opacity: 0;
    transform: scaleX(0.94);
  }
}
.v-bar {
  width: 1px;
  height: clamp(28px, 5vmin, 46px);
  background: linear-gradient(180deg, transparent, rgba(255, 217, 138, 0.6), transparent);
}
.eyebrow {
  font-family: 'Cinzel', serif;
  font-size: 0.72rem;
  letter-spacing: 0.45em;
  padding-left: 0.45em;
  color: rgba(255, 217, 138, 0.78);
}
.gold-line {
  width: clamp(180px, 34vmin, 320px);
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 217, 138, 0.45) 12%,
    rgba(255, 217, 138, 0.78) 50%,
    rgba(255, 217, 138, 0.45) 88%,
    transparent
  );
  position: relative;
}
.gold-line::before,
.gold-line::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(255, 217, 138, 0.92);
  transform: translateY(-50%);
  box-shadow: 0 0 10px rgba(255, 217, 138, 0.8);
}
.gold-line::before {
  left: 0;
}
.gold-line::after {
  right: 0;
}

/* ═══ 中文副标 ═══ */
.brand-subtitle {
  margin-top: clamp(22px, 4vmin, 44px);
  font-family: 'Noto Serif SC', serif;
  font-size: clamp(0.95rem, 1.6vmin, 1.15rem);
  font-weight: 300;
  letter-spacing: 0.2em;
  color: rgba(232, 228, 255, 0.82);
  font-style: italic;
  opacity: 1;
  transform: none;
}
.brand-subtitle.in {
  animation: subIn 1s 1.4s ease both;
}
@keyframes subIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
}

/* ═══ 点击进入提示（呼吸） ═══ */
.hint {
  margin-top: clamp(30px, 6.5vmin, 70px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(10px, 1.4vmin, 16px);
  opacity: 0.88;
  user-select: none;
  pointer-events: none;
}
.hint.in {
  animation:
    hintIn 1s 1.9s ease both,
    hintBreathe 3.2s 2.8s ease-in-out infinite;
}
@keyframes hintIn {
  from {
    opacity: 0;
  }
}
@keyframes hintBreathe {
  0%,
  100% {
    opacity: 0.3;
    transform: translateY(-1px);
  }
  50% {
    opacity: 0.98;
    transform: translateY(2px);
  }
}
.cta {
  font-family: 'Noto Serif SC', serif;
  font-size: 0.85rem;
  letter-spacing: 0.5em;
  padding-left: 0.5em;
  color: rgba(255, 217, 138, 0.86);
  display: inline-block;
  padding: 11px 24px 11px calc(0.5em + 24px);
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 217, 138, 0.28);
  border-radius: 2px;
  backdrop-filter: blur(4px);
}
.arrow {
  width: 12px;
  height: 12px;
  border-right: 1px solid rgba(255, 217, 138, 0.62);
  border-bottom: 1px solid rgba(255, 217, 138, 0.62);
  transform: rotate(45deg);
}
</style>
