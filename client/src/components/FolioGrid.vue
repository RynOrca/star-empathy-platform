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
  color: var(--muted);
  letter-spacing: 0.04em;
  font-weight: 500;
}
/* 对齐 sc-resonate-btn：暖胶囊按钮（扁平，无光辉） */
.fg-new-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 14px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--accent-subtle) 0%, rgba(255, 217, 138, 0.14) 100%);
  border: 1px solid var(--accent-border);
  color: var(--accent);
  font-family: var(--font);
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  transition: transform var(--transition-fast), background var(--transition-normal), border-color var(--transition-normal), box-shadow var(--transition-normal);
}
.fg-new-btn:hover {
  transform: translateY(-0.5px);
  box-shadow: 0 6px 20px rgba(255, 217, 138, 0.15);
  border-color: rgba(255, 217, 138, 0.3);
}
.fg-new-btn:active { transform: scale(0.97); }

/* ── 网格：3 种密度 ── */
.fg-grid {
  display: grid;
  gap: 14px;
}
.fg-grid-cozy    { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
.fg-grid-compact { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
.fg-grid-roomy   { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }

/* ── 卡片：极简扁平（块面 + 轻阴影；无 1px 硬边、无左侧色条装饰）
   背景层级：bg-elevated → hover surface-hover，靠颜色差与阴影区分，不画边。 */
.fg-card {
  --fg-c: var(--accent);
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 18px 18px 16px;
  border-radius: var(--radius-xl);
  background: var(--bg-elevated);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.24);
  cursor: pointer;
  transition: transform var(--transition-normal), background var(--transition-normal), box-shadow var(--transition-normal);
  animation: fgIn .25s var(--ease-out) both;
  position: relative;
  overflow: hidden;
  color: var(--ink);
}
.fg-card:hover {
  transform: translateY(-1px);
  background: var(--surface-hover);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.34);
}
.fg-card.private {
  background: var(--bg-overlay);
  opacity: 0.85;
  filter: saturate(0.6);
}
.fg-card.galaxy { background: linear-gradient(180deg, rgba(255, 217, 138, 0.07) 0%, var(--bg-elevated) 60%); }
.fg-card.anonymous { background: linear-gradient(180deg, rgba(202, 167, 255, 0.07) 0%, var(--bg-elevated) 60%); }
@keyframes fgIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.fg-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
/* 色点：缩小为装饰性小点，不抢色条的戏 */
.fg-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  opacity: 0.7;
  display: none; /* 色条已承担色指示，隐藏 dot 去冗余 */
}
.fg-card-actions {
  display: flex;
  gap: 4px;
}
.fg-card-actions:not(.fg-actions-passive) {
  opacity: 0;
  transition: opacity var(--transition-fast);
}
.fg-card:hover .fg-card-actions:not(.fg-actions-passive) { opacity: 1; }
.fg-act {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--radius-sm);
  background: var(--overlay-04);
  color: var(--ink-secondary);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.fg-act:hover { background: var(--overlay-08); color: var(--ink); }
.fg-act-danger:hover { background: var(--error-subtle); color: var(--error); }
.fg-actions-passive { color: var(--muted); }

.fg-card-head {
  display: flex;
  align-items: center;
  gap: 6px;
}
.fg-name {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.3;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: 0.01em;
}
/* 可见性 chip：对齐 StoryDetailCard.sc-type-chip，但去 0.5px 边框改纯块面 */
.fg-tag {
  display: inline-flex;
  align-items: center;
  gap: 3.5px;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.02em;
  line-height: 1.4;
  flex-shrink: 0;
}
.fg-tag-private, .fg-private-tag {
  background: var(--overlay-04);
  color: var(--muted-light);
}
.fg-tag-public, .fg-public-tag {
  background: rgba(149, 240, 192, 0.09);
  color: var(--star-green);
}
.fg-tag-anonymous {
  background: rgba(202, 167, 255, 0.12);
  color: var(--star-purple);
}
.fg-tag-galaxy {
  background: var(--accent-subtle);
  color: var(--accent);
}

/* 作者信息行：对齐 sc-author，纯色块无边框 */
.fg-owner {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  align-self: flex-start;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-size: 10.5px;
  color: var(--ink-secondary);
  background: var(--overlay-04);
  letter-spacing: 0.03em;
  font-weight: 500;
  max-width: 100%;
  overflow: hidden;
}
.fg-owner.anonymous {
  color: var(--star-purple);
  background: rgba(202, 167, 255, 0.12);
}
.fg-owner span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fg-desc {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--ink-secondary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 3.2em;
}
.fg-desc.is-empty { color: var(--muted); opacity: 0.7; font-style: italic; }

/* 底部 meta：纯块面（无边框），色阶做区分 */
.fg-card-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 2px;
  padding: 10px 12px;
  background: var(--overlay-04);
  border-radius: var(--radius-md);
  font-size: 11px;
  color: var(--muted);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.fg-foot-count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.fg-foot-res {
  display: inline-flex;
  align-items: center;
  gap: 3.5px;
  color: var(--star-red);
  font-weight: 600;
}
.fg-foot-date {
  margin-left: auto;
  opacity: 0.85;
}

/* ── 空状态：纯块面，无1px硬边 ── */
.fg-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 40px 20px;
  text-align: center;
  border-radius: var(--radius-xl);
  background: var(--bg-elevated);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.2);
}
.fg-empty-icon { color: var(--muted); opacity: 0.5; }
.fg-empty-title {
  margin: 6px 0 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
}
.fg-empty-sub {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
  max-width: 420px;
}

/* ── 加载/错误 ── */
.fg-loading, .fg-error {
  text-align: center;
  font-size: 12px;
  color: var(--muted);
  padding: 16px 0;
  font-weight: 500;
}
.fg-error { color: var(--error); }

/* ── 响应式：移动端单列 ── */
@media (max-width: 640px) {
  .fg-grid-cozy, .fg-grid-compact, .fg-grid-roomy {
    grid-template-columns: 1fr;
  }
}
</style>
