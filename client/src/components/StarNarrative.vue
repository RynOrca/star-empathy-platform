<template>
  <div class="narrative-section">
    <!-- 加载中：骨架 -->
    <div v-if="loading" class="narrative-loading">
      <div class="shimmer-line shimmer-title"></div>
      <div class="shimmer-line"></div>
      <div class="shimmer-line"></div>
      <div class="shimmer-line shimmer-short"></div>
    </div>

    <!-- 错误 -->
    <div v-else-if="error" class="narrative-error">
      <span class="error-text">叙事生成失败</span>
      <button class="retry-btn" @click="$emit('retry')">重试</button>
    </div>

    <!-- 加载完成：展示 Markdown 渲染叙事 -->
    <div v-else-if="content" class="narrative-content">
      <div class="narrative-body" v-html="renderedContent"></div>
    </div>

    <!-- 静默：未开始 -->
    <div v-else class="narrative-idle">
      <span class="hint-text">正在连接星空叙事者…</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'

const props = defineProps<{
  content: string | null
  loading: boolean
  error: string | null
  cached: boolean
}>()

defineEmits<{
  retry: []
}>()

// 配置 marked 渲染选项
marked.setOptions({
  breaks: true,
  gfm: true,
})

const renderedContent = computed(() => {
  if (!props.content) return ''
  return marked.parse(props.content) as string
})
</script>

<style scoped>
.narrative-section {
  padding: 24px 28px;
}

/* ── 加载骨架 ── */
.narrative-loading {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.shimmer-line {
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.03) 25%,
    rgba(255, 255, 255, 0.06) 50%,
    rgba(255, 255, 255, 0.03) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.8s ease-in-out infinite;
  width: 85%;
}
.shimmer-title { width: 60%; height: 18px; }
.shimmer-short { width: 50%; }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── 错误 ── */
.narrative-error {
  display: flex;
  align-items: center;
  gap: 10px;
}
.error-text {
  font-size: 0.78rem;
  color: var(--muted-light);
}
.retry-btn {
  padding: 3px 10px;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--accent);
  font-size: 0.75rem;
  font-family: var(--font);
  cursor: pointer;
  transition: background 0.15s;
}
.retry-btn:hover {
  background: var(--accent-subtle);
}

/* ── 叙事内容（Markdown 渲染） ── */
.narrative-content {
  position: relative;
}

/* ── Markdown 样式 ── */
.narrative-body :deep(h1) {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 16px;
  line-height: 1.5;
  letter-spacing: 0.02em;
}

.narrative-body :deep(p) {
  font-size: 0.84rem;
  line-height: 1.85;
  color: var(--ink-secondary);
  margin: 0 0 12px;
}

.narrative-body :deep(blockquote) {
  margin: 14px 0;
  padding: 10px 16px;
  border-left: 3px solid var(--accent);
  background: rgba(255, 255, 255, 0.03);
  border-radius: 0 6px 6px 0;
}

.narrative-body :deep(blockquote p) {
  font-size: 0.88rem;
  color: var(--accent);
  font-style: italic;
  margin: 0;
  line-height: 1.7;
}

.narrative-body :deep(strong) {
  color: var(--ink);
  font-weight: 600;
}

.narrative-body :deep(em) {
  color: var(--star-purple);
}

/* ── 闲置 ── */
.narrative-idle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 0;
}
.hint-text {
  font-size: 0.78rem;
  color: var(--muted-light);
  opacity: 0.5;
}
</style>