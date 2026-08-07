<template>
  <div class="cg-wrap">
    <!-- 顶部操作条：标题 + 新建按钮 -->
    <div class="cg-bar">
      <span class="cg-bar-count">共 {{ collections.length }} 个合集</span>
      <button type="button" class="cg-new-btn" @click="$emit('create')">
        <Plus :size="12" />
        <span>新建星笺</span>
      </button>
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && collections.length === 0" class="cg-empty">
      <Library :size="22" class="cg-empty-icon" />
      <p class="cg-empty-title">还没有星笺</p>
      <p class="cg-empty-sub">把散落的故事收进合集，让它们彼此呼应。</p>
    </div>

    <!-- 网格 -->
    <div v-else class="cg-grid">
      <article
        v-for="c in collections"
        :key="c.id"
        class="cg-card"
        :class="{ private: c.visibility === 'private', anonymous: c.visibility === 'anonymous', galaxy: c.visibility === 'galaxy' }"
        @click="$emit('open', c)"
      >
        <!-- 顶部色带 + 操作 -->
        <div class="cg-card-top">
          <span class="cg-dot" :style="{ background: c.coverColor || '#E8B86D' }"></span>
          <div class="cg-card-actions" @click.stop>
            <button type="button" class="cg-act" aria-label="编辑" @click="$emit('edit', c)">
              <Pencil :size="11" />
            </button>
            <button type="button" class="cg-act cg-act-danger" aria-label="删除" @click="$emit('delete', c)">
              <Trash2 :size="11" />
            </button>
          </div>
        </div>

        <!-- 标题 + 可见性 -->
        <div class="cg-card-head">
          <h4 class="cg-name">{{ c.name }}</h4>
          <span v-if="c.visibility === 'private'" class="cg-tag cg-tag-private">
            <Lock :size="9" />
            <span>私有</span>
          </span>
          <span v-else-if="c.visibility === 'anonymous'" class="cg-tag cg-tag-anonymous">
            <Ghost :size="9" />
            <span>匿名</span>
          </span>
          <span v-else-if="c.visibility === 'galaxy'" class="cg-tag cg-tag-galaxy">
            <Galaxy :size="9" />
            <span>星河</span>
          </span>
          <span v-else class="cg-tag cg-tag-public">
            <Globe :size="9" />
            <span>公开</span>
          </span>
        </div>

        <!-- 描述 -->
        <p v-if="c.description" class="cg-desc">{{ c.description }}</p>
        <p v-else class="cg-desc is-empty">尚无描述</p>

        <!-- 底部：故事数 + 时间 -->
        <div class="cg-card-foot">
          <span class="cg-foot-count">
            <Library :size="10" />
            <span>{{ c.storyCount ?? 0 }} 则故事</span>
          </span>
          <span class="cg-foot-date">{{ formatDate(c.updatedAt || c.createdAt) }}</span>
        </div>
      </article>
    </div>

    <!-- 加载态 -->
    <div v-if="loading" class="cg-loading">加载中…</div>
    <p v-if="error" class="cg-error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { Plus, Library, Lock, Globe, Pencil, Trash2, Ghost, Sparkles } from 'lucide-vue-next'
const Galaxy = Sparkles
import type { Collection } from '../composables/useCollections'

defineProps<{
  collections: Collection[]
  loading?: boolean
  error?: string | null
}>()

defineEmits<{
  create: []
  open: [collection: Collection]
  edit: [collection: Collection]
  delete: [collection: Collection]
}>()

/** 紧凑日期：YYYY-MM-DD → MM/DD；带时间则只取日期部分 */
function formatDate(s: string | null | undefined): string {
  if (!s) return ''
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return ''
  return `${m[2]}/${m[3]}`
}
</script>

<style scoped>
.cg-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── 顶部操作条 ── */
.cg-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px;
}
.cg-bar-count {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.38);
  letter-spacing: 0.04em;
}
.cg-new-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 100px;
  background: rgba(255, 217, 138, 0.08);
  border: 0.5px solid rgba(255, 217, 138, 0.22);
  color: #ffe5a8;
  font-family: inherit;
  font-size: 11.5px;
  cursor: pointer;
  transition: background .15s ease, transform .15s ease;
}
.cg-new-btn:hover { background: rgba(255, 217, 138, 0.14); transform: translateY(-0.5px); }
.cg-new-btn:active { transform: scale(0.97); }

/* ── 网格 ── */
.cg-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

/* ── 卡片 ── */
.cg-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 14px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.018);
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: background .18s ease, border-color .18s ease, transform .18s ease;
  animation: cgIn .25s ease-out both;
}
.cg-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateY(-1px);
}
.cg-card.private {
  border-color: rgba(255, 255, 255, 0.04);
  background: rgba(255, 255, 255, 0.012);
}
@keyframes cgIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.cg-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cg-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 6px currentColor;
  opacity: 0.9;
}
.cg-card-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity .15s ease;
}
.cg-card:hover .cg-card-actions { opacity: 1; }
.cg-act {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  border: 0.5px solid rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  transition: background .15s ease, color .15s ease;
}
.cg-act:hover { background: rgba(255, 255, 255, 0.09); color: rgba(255, 255, 255, 0.85); }
.cg-act-danger:hover { background: rgba(255, 107, 138, 0.12); color: #ff6b8a; }

.cg-card-head {
  display: flex;
  align-items: center;
  gap: 6px;
}
.cg-name {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--ink, #f4f4f8);
  line-height: 1.3;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cg-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 6px;
  border-radius: 100px;
  font-size: 9.5px;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}
.cg-tag-private, .cg-private-tag {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.42);
  border: 0.5px solid rgba(255, 255, 255, 0.07);
}
.cg-tag-public, .cg-public-tag {
  background: rgba(149, 240, 192, 0.07);
  color: var(--star-green, #95f0c0);
  border: 0.5px solid rgba(149, 240, 192, 0.18);
}
.cg-tag-anonymous {
  background: rgba(169, 189, 255, 0.08);
  color: rgba(169, 189, 255, 0.92);
  border: 0.5px solid rgba(169, 189, 255, 0.22);
}
.cg-tag-galaxy {
  background: rgba(232, 184, 109, 0.10);
  color: rgba(255, 229, 168, 0.96);
  border: 0.5px solid rgba(232, 184, 109, 0.28);
}

.cg-desc {
  margin: 0;
  font-size: 0.76rem;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.4em;
}
.cg-desc.is-empty { color: rgba(255, 255, 255, 0.26); font-style: italic; }

.cg-card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
  padding-top: 8px;
  border-top: 0.5px dashed rgba(255, 255, 255, 0.06);
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.36);
}
.cg-foot-count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.cg-foot-date {
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
}

/* ── 空状态 ── */
.cg-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 36px 20px;
  text-align: center;
}
.cg-empty-icon { color: rgba(255, 255, 255, 0.18); }
.cg-empty-title {
  margin: 4px 0 0;
  font-size: 0.86rem;
  color: rgba(255, 255, 255, 0.6);
}
.cg-empty-sub {
  margin: 0;
  font-size: 0.76rem;
  color: rgba(255, 255, 255, 0.34);
}

/* ── 加载/错误 ── */
.cg-loading, .cg-error {
  text-align: center;
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.42);
  padding: 16px 0;
}
.cg-error { color: #ff6b8a; }

/* ── 响应式：移动端单列 ── */
@media (max-width: 640px) {
  .cg-grid {
    grid-template-columns: 1fr;
  }
}
</style>
