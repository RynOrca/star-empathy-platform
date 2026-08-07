<template>
  <div class="fg-wrap">
    <!-- 顶部操作条（可控制显示） -->
    <div v-if="showActionBar" class="fg-bar">
      <span class="fg-bar-count">共 {{ collections.length }} 册星笺</span>
      <button
        v-if="editable"
        type="button"
        class="fg-new-btn"
        @click="$emit('create')"
      >
        <Plus :size="12" />
        <span>新建星笺</span>
      </button>
      <slot name="bar-right" />
    </div>

    <!-- 空状态（可自定义） -->
    <div v-if="!loading && collections.length === 0" class="fg-empty">
      <slot name="empty" :empty="true">
        <Library :size="22" class="fg-empty-icon" />
        <p class="fg-empty-title">{{ editable ? '还没有星笺' : '尚未发现星笺' }}</p>
        <p class="fg-empty-sub">
          {{ editable ? '把散落的故事收进合集，让它们彼此呼应。' : '试试切换筛选条件，或稍后再来逛逛。' }}
        </p>
      </slot>
    </div>

    <!-- 网格：可切换 3 种密度 -->
    <div v-else class="fg-grid" :class="`fg-grid-${density}`">
      <article
        v-for="c in collections"
        :key="c.id"
        class="fg-card"
        :class="{
          private: c.visibility === 'private',
          anonymous: c.visibility === 'anonymous',
          galaxy: c.visibility === 'galaxy',
          ghosted: c.visibility === 'private',
        }"
        @click="$emit('open', c)"
      >
        <!-- 顶部色带 + 操作（editable 才显示编辑删除） -->
        <div class="fg-card-top">
          <span class="fg-dot" :style="{ background: c.coverColor || '#E8B86D' }"></span>
          <div class="fg-card-actions" v-if="editable" @click.stop>
            <button type="button" class="fg-act" aria-label="编辑" @click="$emit('edit', c)">
              <Pencil :size="11" />
            </button>
            <button type="button" class="fg-act fg-act-danger" aria-label="删除" @click="$emit('delete', c)">
              <Trash2 :size="11" />
            </button>
          </div>
          <div class="fg-card-actions fg-actions-passive" v-else @click.stop>
            <slot name="card-actions" :collection="c" />
          </div>
        </div>

        <!-- 标题 + 可见性 -->
        <div class="fg-card-head">
          <h4 class="fg-name">{{ c.name }}</h4>
          <span v-if="c.visibility === 'private'" class="fg-tag fg-tag-private">
            <Lock :size="9" />
            <span>私有</span>
          </span>
          <span v-else-if="c.visibility === 'anonymous'" class="fg-tag fg-tag-anonymous">
            <Ghost :size="9" />
            <span>匿名</span>
          </span>
          <span v-else-if="c.visibility === 'galaxy'" class="fg-tag fg-tag-galaxy">
            <Galaxy :size="9" />
            <span>星河</span>
          </span>
          <span v-else class="fg-tag fg-tag-public">
            <Globe :size="9" />
            <span>公开</span>
          </span>
        </div>

        <!-- 作者信息（广场用，editable=false 时显示） -->
        <div v-if="showOwner && !editable && c.visibility !== 'private'" class="fg-owner" :class="{ anonymous: c.visibility === 'anonymous' }">
          <User :size="9" />
          <span>
            <template v-if="c.visibility === 'anonymous'">匿名观星者</template>
            <template v-else-if="c.owner">{{ c.owner.username ?? c.owner.nickname ?? c.owner.name ?? '观星者' }}</template>
            <template v-else-if="c.userId === 0">星穹守护</template>
            <template v-else>观星者 #{{ c.userId }}</template>
          </span>
        </div>

        <!-- 描述 -->
        <p v-if="c.description" class="fg-desc">{{ c.description }}</p>
        <p v-else class="fg-desc is-empty">尚无描述</p>

        <!-- 底部：故事数 + 共鸣数 + 更新日期（共鸣数有就显示） -->
        <div class="fg-card-foot">
          <span class="fg-foot-count">
            <Library :size="10" />
            <span>{{ c.storyCount ?? 0 }} 则</span>
          </span>
          <span v-if="typeof c.resonanceTotal === 'number' && c.resonanceTotal > 0" class="fg-foot-res">
            <Sparkles :size="9" />
            <span>{{ c.resonanceTotal }} 共鸣</span>
          </span>
          <span class="fg-foot-date">{{ formatDate(c.updatedAt || c.createdAt) }}</span>
        </div>
      </article>
    </div>

    <!-- 加载态 / 错误 -->
    <div v-if="loading" class="fg-loading">加载中…</div>
    <p v-if="error" class="fg-error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { Plus, Library, Lock, Globe, Pencil, Trash2, Ghost, Sparkles, User } from 'lucide-vue-next'
const Galaxy = Sparkles

export type FolioLike = {
  id: number
  name: string
  description?: string | null
  coverColor?: string | null
  visibility?: 'public' | 'private' | 'anonymous' | 'galaxy' | string | null
  storyCount?: number | null
  resonanceTotal?: number | null
  updatedAt?: string | null
  createdAt?: string | null
  userId?: number | null
  owner?: { username?: string | null; nickname?: string | null; name?: string | null } | null
}

defineProps<{
  collections: FolioLike[]
  loading?: boolean
  error?: string | null
  /** 是否显示"新建星笺"和每卡编辑/删除按钮（个人主页=true，广场=false） */
  editable?: boolean
  /** 是否显示顶部 bar（计数 + 新建按钮 + slot bar-right） */
  showActionBar?: boolean
  /** 是否显示作者信息行（广场用，editable=false 时生效） */
  showOwner?: boolean
  /** 卡片密度：cozy（默认，~220px 宽）/ compact（~180px）/ roomy（~280px） */
  density?: 'cozy' | 'compact' | 'roomy'
}>()

defineEmits<{
  create: []
  open: [collection: FolioLike]
  edit: [collection: FolioLike]
  delete: [collection: FolioLike]
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
.fg-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── 顶部操作条 ── */
.fg-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px;
  gap: 10px;
}
.fg-bar-count {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.38);
  letter-spacing: 0.04em;
}
.fg-new-btn {
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
.fg-new-btn:hover { background: rgba(255, 217, 138, 0.14); transform: translateY(-0.5px); }
.fg-new-btn:active { transform: scale(0.97); }

/* ── 网格：3 种密度 ── */
.fg-grid {
  display: grid;
  gap: 12px;
}
.fg-grid-cozy    { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
.fg-grid-compact { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
.fg-grid-roomy   { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }

/* ── 卡片 ── */
.fg-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 14px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.018);
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: background .18s ease, border-color .18s ease, transform .18s ease;
  animation: fgIn .25s ease-out both;
  position: relative;
}
.fg-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 217, 138, 0.14);
  transform: translateY(-1px);
}
.fg-card.private {
  border-color: rgba(255, 255, 255, 0.04);
  background: rgba(255, 255, 255, 0.012);
}
.fg-card.galaxy {
  background:
    linear-gradient(180deg, rgba(232, 184, 109, 0.06) 0%, rgba(255, 255, 255, 0.018) 55%);
  border-color: rgba(232, 184, 109, 0.18);
}
.fg-card.anonymous {
  background:
    linear-gradient(180deg, rgba(169, 189, 255, 0.05) 0%, rgba(255, 255, 255, 0.018) 55%);
  border-color: rgba(169, 189, 255, 0.14);
}
@keyframes fgIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.fg-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.fg-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 6px currentColor;
  opacity: 0.9;
}
.fg-card-actions {
  display: flex;
  gap: 4px;
}
.fg-card-actions:not(.fg-actions-passive) {
  opacity: 0;
  transition: opacity .15s ease;
}
.fg-card:hover .fg-card-actions:not(.fg-actions-passive) { opacity: 1; }
.fg-act {
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
.fg-act:hover { background: rgba(255, 255, 255, 0.09); color: rgba(255, 255, 255, 0.85); }
.fg-act-danger:hover { background: rgba(255, 107, 138, 0.12); color: #ff6b8a; }
.fg-actions-passive {
  color: rgba(255, 255, 255, 0.28);
}

.fg-card-head {
  display: flex;
  align-items: center;
  gap: 6px;
}
.fg-name {
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
.fg-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 6px;
  border-radius: 100px;
  font-size: 9.5px;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}
.fg-tag-private, .fg-private-tag {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.42);
  border: 0.5px solid rgba(255, 255, 255, 0.07);
}
.fg-tag-public, .fg-public-tag {
  background: rgba(149, 240, 192, 0.07);
  color: var(--star-green, #95f0c0);
  border: 0.5px solid rgba(149, 240, 192, 0.18);
}
.fg-tag-anonymous {
  background: rgba(169, 189, 255, 0.08);
  color: rgba(169, 189, 255, 0.92);
  border: 0.5px solid rgba(169, 189, 255, 0.22);
}
.fg-tag-galaxy {
  background: rgba(232, 184, 109, 0.10);
  color: rgba(255, 229, 168, 0.96);
  border: 0.5px solid rgba(232, 184, 109, 0.28);
}

/* 作者信息行 */
.fg-owner {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  align-self: flex-start;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.42);
  background: rgba(255, 255, 255, 0.035);
  border: 0.5px solid rgba(255, 255, 255, 0.06);
  letter-spacing: 0.03em;
  max-width: 100%;
  overflow: hidden;
}
.fg-owner.anonymous {
  color: rgba(169, 189, 255, 0.92);
  background: rgba(169, 189, 255, 0.05);
  border-color: rgba(169, 189, 255, 0.14);
}
.fg-owner span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fg-desc {
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
.fg-desc.is-empty { color: rgba(255, 255, 255, 0.26); font-style: italic; }

.fg-card-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 4px;
  padding-top: 8px;
  border-top: 0.5px dashed rgba(255, 255, 255, 0.06);
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.36);
}
.fg-foot-count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.fg-foot-res {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: #ff8b7d;
  font-variant-numeric: tabular-nums;
}
.fg-foot-date {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
}

/* ── 空状态 ── */
.fg-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 36px 20px;
  text-align: center;
}
.fg-empty-icon { color: rgba(255, 255, 255, 0.18); }
.fg-empty-title {
  margin: 4px 0 0;
  font-size: 0.86rem;
  color: rgba(255, 255, 255, 0.6);
}
.fg-empty-sub {
  margin: 0;
  font-size: 0.76rem;
  color: rgba(255, 255, 255, 0.34);
}

/* ── 加载/错误 ── */
.fg-loading, .fg-error {
  text-align: center;
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.42);
  padding: 16px 0;
}
.fg-error { color: #ff6b8a; }

/* ── 响应式：移动端单列（cozy 自动 minmax 处理，这里只加强制 1 列） ── */
@media (max-width: 640px) {
  .fg-grid-cozy, .fg-grid-compact, .fg-grid-roomy {
    grid-template-columns: 1fr;
  }
}
</style>
