<template>
  <div class="narrative-section">
    <!-- 加载中：骨架 -->
    <div v-if="loading" class="narrative-loading">
      <div class="shimmer-line shimmer-long"></div>
      <div class="shimmer-line"></div>
      <div class="shimmer-line shimmer-short"></div>
    </div>

    <!-- 错误 -->
    <div v-else-if="error" class="narrative-error">
      <span class="error-text">叙事生成失败</span>
      <button class="retry-btn" @click="$emit('retry')">重试</button>
    </div>

    <!-- 加载完成：展示叙事 -->
    <div v-else-if="content" class="narrative-content">
      <p class="narrative-text">{{ content }}</p>
      <span v-if="cached" class="cache-badge">已缓存</span>
    </div>

    <!-- 静默：未开始 -->
    <div v-else class="narrative-idle">
      <span class="hint-text">正在连接星空叙事者…</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  content: string | null
  loading: boolean
  error: string | null
  cached: boolean
}>()

defineEmits<{
  retry: []
}>()
</script>

<style scoped>
.narrative-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--rule);
  min-height: 60px;
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
  width: 80%;
}
.shimmer-long { width: 95%; }
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

/* ── 叙事内容 ── */
.narrative-content {
  position: relative;
}
.narrative-text {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.85;
  color: var(--ink-secondary);
  white-space: pre-wrap;
  word-break: break-word;
}
.cache-badge {
  display: inline-block;
  margin-top: 8px;
  font-size: 0.68rem;
  color: var(--muted-light);
  opacity: 0.5;
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
