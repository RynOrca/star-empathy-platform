<template>
  <div class="cp-wrap">
    <!-- 选择行：下拉 + 当前选中态 -->
    <div ref="triggerRef" class="cp-select" :class="{ active: open }" @click="toggleOpen">
      <span v-if="!hasSelection" class="cp-placeholder">请选择合集…</span>
      <template v-else-if="mode === 'existing' && selectedId">
        <span class="cp-dot" :style="{ background: selectedColor }"></span>
        <Library :size="11" class="cp-icon" />
        <!-- ═══ [合集名 + icon + 可见性中文字] 同一小组紧贴，和右侧 arrow 分离 ═══ -->
        <span class="cp-cur-title">
          <span class="cp-cur-name">{{ selectedName }}</span>
          <span class="cp-vis-tag cp-vis-tag--sm" :class="visClass(selectedCollection?.visibility)">
            <Globe v-if="selectedCollection?.visibility === 'public'" :size="9" />
            <Ghost v-else-if="selectedCollection?.visibility === 'anonymous'" :size="9" />
            <Galaxy v-else-if="selectedCollection?.visibility === 'galaxy'" :size="9" />
            <Lock v-else :size="9" />
            <span>{{ visLabel(selectedCollection?.visibility) }}</span>
          </span>
        </span>
      </template>
      <template v-else-if="mode === 'new'">
        <Plus :size="11" class="cp-icon" />
        <!-- ═══ 新建模式同样：名字紧跟 icon+中文字 ═══ -->
        <span class="cp-cur-title">
          <span class="cp-cur-name">新建：{{ newName || '未命名' }}</span>
          <span class="cp-vis-tag cp-vis-tag--sm" :class="visClass(newVisibility)">
            <Globe v-if="newVisibility === 'public'" :size="9" />
            <Ghost v-else-if="newVisibility === 'anonymous'" :size="9" />
            <Galaxy v-else-if="newVisibility === 'galaxy'" :size="9" />
            <Lock v-else :size="9" />
            <span>{{ visLabel(newVisibility) }}</span>
          </span>
        </span>
      </template>
      <ChevronDown :size="12" class="cp-arrow" />
    </div>

    <!-- 下拉面板：Teleport 到 body，避免被父容器 overflow 裁剪（StoryForm 里的 sf-body overflow-y:auto / sf-sheet overflow:hidden 都会裁） -->
    <Teleport to="body">
      <Transition name="cp-drop">
        <div v-if="open" ref="panelRef" class="cp-panel" :style="panelStyle">
          <!-- ══════ 新建合集 · 永久置顶（包括按钮+输入框+公开/匿名/星河/私密选项） ══════ -->
          <div class="cp-group cp-new-group cp-sticky">
            <div class="cp-group-title cp-group-title-accent">新建合集</div>
            <button
              type="button"
              class="cp-opt"
              :class="{ on: mode === 'new' }"
              @click="mode = 'new'"
            >
              <Plus :size="11" class="cp-icon" />
              <span class="cp-opt-name">新建合集</span>
            </button>
            <Transition name="cp-expand">
              <div v-if="mode === 'new'" class="cp-new-form">
                <input
                  ref="newInputRef"
                  v-model="newName"
                  class="cp-new-input"
                  placeholder="合集名称（如：夏夜独白）"
                  maxlength="40"
                  @keydown.enter.prevent
                />
                <div class="cp-visi">
                  <button
                    type="button"
                    class="cp-visi-btn"
                    :class="{ on: newVisibility === 'public' }"
                    @click="newVisibility = 'public'"
                    title="公开：所有人可见"
                  >
                    <Globe :size="10" />
                    <span>公开</span>
                  </button>
                  <button
                    type="button"
                    class="cp-visi-btn"
                    :class="{ on: newVisibility === 'anonymous' }"
                    @click="newVisibility = 'anonymous'"
                    title="匿名：故事发布后不显示发布者（合集的私密性=故事的私密性）"
                  >
                    <Ghost :size="10" />
                    <span>匿名</span>
                  </button>
                  <button
                    type="button"
                    class="cp-visi-btn"
                    :class="{ on: newVisibility === 'galaxy' }"
                    @click="newVisibility = 'galaxy'"
                    title="星河：跨合集漫游池可见（星穹金）"
                  >
                    <Galaxy :size="10" />
                    <span>星河</span>
                  </button>
                  <button
                    type="button"
                    class="cp-visi-btn"
                    :class="{ on: newVisibility === 'private' }"
                    @click="newVisibility = 'private'"
                    title="私有：仅自己可见"
                  >
                    <Lock :size="10" />
                    <span>私有</span>
                  </button>
                </div>
              </div>
            </Transition>
          </div>

          <!-- ══════ 已有合集 · 列表区（滚动时不会带跑上方置顶的新建区） ══════ -->
          <div v-if="collections.length" class="cp-group cp-list">
            <div class="cp-group-title">我的合集（全部可见）</div>
            <button
              v-for="c in collections"
              :key="c.id"
              type="button"
              class="cp-opt"
              :class="{ on: mode === 'existing' && selectedId === c.id }"
              @click="chooseExisting(c.id)"
            >
              <span class="cp-dot" :style="{ background: c.coverColor || '#E8B86D' }"></span>
              <Library :size="11" class="cp-icon" />
              <!-- ══════ [合集名 + icon + 可见性中文字] 作为一个紧贴的小组，和 count 两端分离 ══════ -->
              <span class="cp-opt-title">
                <span class="cp-opt-name">{{ c.name }}</span>
                <!-- ══ icon + 中文字紧跟名字后面（小组内 gap 2px → 真正贴着标题） ══ -->
                <span class="cp-vis-tag cp-vis-tag--list" :class="visClass(c.visibility)">
                  <Globe v-if="c.visibility === 'public'" :size="9" />
                  <Ghost v-else-if="c.visibility === 'anonymous'" :size="9" />
                  <Galaxy v-else-if="c.visibility === 'galaxy'" :size="9" />
                  <Lock v-else :size="9" />
                  <span>{{ visLabel(c.visibility) }}</span>
                </span>
              </span>
              <span class="cp-opt-count">{{ c.storyCount }}</span>
            </button>
          </div>
          <!-- 空状态：没有任何合集 -->
          <div v-else class="cp-group cp-list">
            <div class="cp-group-title">我的合集（空）</div>
            <div class="cp-opt cp-opt-empty">还没有合集，在上方新建第一个吧。</div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, reactive, nextTick } from 'vue'
import { Library, Lock, Plus, ChevronDown, Globe, Ghost, Sparkles } from 'lucide-vue-next'
const Galaxy = Sparkles
import { useCollections, type Collection, type CollectionVisibility } from '../composables/useCollections'

export type Mode = 'none' | 'existing' | 'new'
export type ColVisLabel = 'public' | 'private' | 'anonymous' | 'galaxy'

/* ══ 可见性 → 中文字标签（合集名后/顶部选中行都用） ══ */
function visLabel(v: unknown): string {
  switch (v) {
    case 'public': return '公开'
    case 'anonymous': return '匿名'
    case 'galaxy': return '星河'
    case 'private': return '私有'
    default: return '公开'
  }
}
/* ══ 可见性 → 胶囊修饰类（控制 4 档颜色：蓝/蓝灰/金/紫灰锁） ══ */
function visClass(v: unknown): string {
  switch (v) {
    case 'public': return 'cp-vis-tag--public'
    case 'anonymous': return 'cp-vis-tag--anon'
    case 'galaxy': return 'cp-vis-tag--galaxy'
    case 'private': return 'cp-vis-tag--private'
    default: return 'cp-vis-tag--public'
  }
}

const props = defineProps<{
  modelValue: { collectionId?: number; collectionName?: string; visibility?: CollectionVisibility } | null
}>()
const emit = defineEmits<{ 'update:modelValue': [v: { collectionId?: number; collectionName?: string; visibility?: CollectionVisibility } | null] }>()

const { list, fetchList } = useCollections()
const collections = computed<Collection[]>(() => list.value)

const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const newInputRef = ref<HTMLInputElement | null>(null)
const open = ref(false)
const mode = ref<Mode>('none')
const selectedId = ref<number | null>(null)
const newName = ref('')
const newVisibility = ref<CollectionVisibility>('public')

/* ═══════ Teleport + fixed 坐标计算（绕开父级 overflow 裁剪） ═══════ */
const panelStyle = reactive<{
  position: 'fixed'
  top?: string
  bottom?: string
  left?: string
  width?: string
  maxHeight?: string
  zIndex: number
}>({ position: 'fixed', zIndex: 9999 })

function syncPanelPosition() {
  if (!triggerRef.value) return
  const r = triggerRef.value.getBoundingClientRect()
  const below = window.innerHeight - r.bottom - 12
  const above = r.top - 12
  // 整个下拉面板最大不超过 420px（滚动），避免合辑多的时候占满整屏
  const PANEL_CEILING = 420
  // 优先在下方展示；下方空间不足（<260）且上方更宽裕 → 向上翻
  // 阈值从 180 提高到 260，确保下方有足够空间显示完整选项列表
  const flip = below < 260 && above > below
  delete panelStyle.top
  delete panelStyle.bottom
  if (flip) {
    panelStyle.bottom = `${Math.max(8, window.innerHeight - r.top + 6)}px`
    panelStyle.maxHeight = `${Math.max(240, Math.min(above - 8, PANEL_CEILING))}px`
  } else {
    panelStyle.top = `${r.bottom + 6}px`
    panelStyle.maxHeight = `${Math.max(280, Math.min(below, PANEL_CEILING))}px`
  }
  // 左右防溢出
  const left = Math.max(8, Math.min(r.left, window.innerWidth - r.width - 8))
  panelStyle.left = `${left}px`
  panelStyle.width = `${Math.min(r.width, window.innerWidth - 16)}px`
}

/* ═══════ 外部点击关闭 & 滚动/缩放同步位置 ═══════ */
function onDocMouseDown(e: MouseEvent) {
  if (!open.value) return
  const t = e.target as Node | null
  if (!t) return
  // 点在 trigger 或 panel 内就不关；用 ref 直接判断自己的实例，避免多实例时 querySelector 选错
  if (triggerRef.value?.contains(t)) return
  if (panelRef.value?.contains(t)) return
  open.value = false
}
function onScrollOrResize() {
  if (open.value) syncPanelPosition()
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) open.value = false
}

watch(open, (v) => {
  if (v) {
    nextTick(() => {
      syncPanelPosition()
      document.addEventListener('mousedown', onDocMouseDown)
      document.addEventListener('keydown', onKey)
      window.addEventListener('resize', onScrollOrResize)
      // 捕获阶段 → 任何内部滚动容器（sf-body 等）的 scroll/wheel/touchmove 也能收到
      window.addEventListener('scroll', onScrollOrResize, true)
      window.addEventListener('wheel', onScrollOrResize, { passive: true, capture: true })
      window.addEventListener('touchmove', onScrollOrResize, { passive: true, capture: true })
    })
  } else {
    document.removeEventListener('mousedown', onDocMouseDown)
    document.removeEventListener('keydown', onKey)
    window.removeEventListener('resize', onScrollOrResize)
    window.removeEventListener('scroll', onScrollOrResize, true)
    window.removeEventListener('wheel', onScrollOrResize, true)
    window.removeEventListener('touchmove', onScrollOrResize, true)
  }
})

onBeforeUnmount(() => {
  open.value = false
})

onMounted(() => { fetchList().catch(() => {}) })

const selectedCollection = computed(() => collections.value.find((c) => c.id === selectedId.value) || null)
const selectedName = computed(() => selectedCollection.value?.name || '')
const selectedColor = computed(() => selectedCollection.value?.coverColor || '#E8B86D')
const hasSelection = computed(() => mode.value !== 'none')

function toggleOpen() {
  open.value = !open.value
}

function chooseNone() {
  mode.value = 'none'
  selectedId.value = null
  newName.value = ''
  emit('update:modelValue', null)
  open.value = false
}
function chooseExisting(id: number) {
  mode.value = 'existing'
  selectedId.value = id
  newName.value = ''
  // ══ 合集私密性 = 故事私密性 ══
  //    选已有合集时，把该合集的 visibility 一起放进 modelValue emit，
  //    这样外部 StoryForm 能直接拿到 visibility → 派生前 body.isAnonymous / 传 collectionVisibility。
  const c = collections.value.find((x) => x.id === id)
  emit('update:modelValue', { collectionId: id, visibility: c?.visibility })
  open.value = false
}

// mode/newName/newVisibility 变化时同步 emit（新建模式）
// ══ 关键修复：用户在输入框里中间删到空、打了再删、或填一半先留空，都**绝不 emit null**！
//    否则外部 StoryForm 的 watch(modelValue) 会把 mode 直接回写为 'none'，新建表单瞬间消失，用户体验爆炸。
//    只要 mode === 'new'，就 emit 一个带 `collectionName` 字段的对象（哪怕是空串），
//    保留"用户当前在新建模式中"这个语义，不触发外部的"未选 → 重置内部状态"逻辑。
watch([mode, newName, newVisibility], () => {
  if (mode.value === 'new') {
    emit('update:modelValue', {
      collectionName: newName.value, // 直接 emit 原值（不 trim），空串也算"正在填新建名"
      visibility: newVisibility.value,
    })
    // ══ 体验补点：切到新建模式后立刻把焦点放进输入框，不要让用户再点一下
    nextTick(() => {
      syncPanelPosition()
      newInputRef.value?.focus()
    })
  }
})

// 外部重置（如 StoryForm 的 submit 成功后 resetForm）
watch(() => props.modelValue, (v) => {
  // ══ 只有外部显式传了 null（真·要清空）时才重置为 none 模式；
  //    如果外部传的是 { collectionName: ''/任意字符串 }（新建模式中间态），
  //    保持 mode === 'new' + 不要把 newName 强清掉，保留用户输入到一半的内容。
  if (v === null || v === undefined) {
    if (mode.value !== 'none') {
      mode.value = 'none'
      selectedId.value = null
      newName.value = ''
    }
  } else if (v.collectionId && v.collectionId !== selectedId.value) {
    mode.value = 'existing'
    selectedId.value = v.collectionId
    newName.value = ''
  } else if ('collectionName' in v) {
    // 新建模式：从外部同步 name/visibility，但**只在有差异时才覆盖**，
    // 避免把新输入进来的字符冲掉（用户刚输入一个字符 → emit → 外部 v-model 回来了 → 立刻覆盖）
    mode.value = 'new'
    selectedId.value = null
    if (typeof v.collectionName === 'string' && v.collectionName !== newName.value) {
      newName.value = v.collectionName
    }
    if (v.visibility && v.visibility !== newVisibility.value) {
      newVisibility.value = v.visibility
    }
  }
}, { immediate: true })
</script>

<style scoped>
.cp-wrap { position: relative; width: 100%; }

.cp-select {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 11px 14px;
  background: rgba(255, 255, 255, 0.028);
  border: 0.5px solid rgba(255, 255, 255, 0.05);
  border-radius: 11px;
  cursor: pointer;
  transition: all .18s ease;
  font-size: 13.5px;
  color: rgba(255, 255, 255, 0.88);
}
.cp-select:hover { border-color: rgba(255, 255, 255, 0.12); background: rgba(255, 255, 255, 0.04); }
.cp-select.active { border-color: rgba(255, 217, 138, 0.28); background: rgba(255, 217, 138, 0.035); }
.cp-placeholder { color: rgba(255, 255, 255, 0.36); }
/* 顶部行的箭头永远贴最右，靠下面的 margin-left:auto 管，名字不再强制列宽 */
.cp-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.cp-icon { color: rgba(255, 255, 255, 0.5); flex-shrink: 0; }
.cp-arrow { margin-left: auto; color: rgba(255, 255, 255, 0.34); transition: transform .18s ease; flex-shrink: 0; }
.cp-select.active .cp-arrow { transform: rotate(180deg); }

/* ══ [合集名 + icon + 可见性中文字] 紧贴小组 wrapper ══
   flex: 0 1 auto → 绝对不占多余空间，多宽就是多宽，不会"伸满中间"
   这样它和左边 Library icon 之间的 8px 父 gap 是图标到标题的距离，
   标题内部（名 ↔ 可见性）空 5px 空隙（不贴成一坨，也不表格空一大段）。
   右边 count 用 margin-left:auto 直接贴最右，跟它没关系 → 不再三列表格 */
.cp-cur-title,
.cp-opt-title {
  display: inline-flex;
  align-items: baseline;     /* 跟名字用同一条基线，就是同一段文字 */
  gap: 5px;                  /* 名字 → 可见性标签 5px 空隙（不贴成一坨，也不表格空一大段） */
  flex: 0 1 auto;            /* 不 grow 撑满中间；允许 shrink 被挤时名字出省略号 */
  min-width: 0;              /* 允许内部 ellipsis 生效 */
  overflow: hidden;
}

/* ══ 可见性"标签"：icon + 中文字 嵌在标题里（同一段字，无框无背景） ══ */
.cp-vis-tag {
  display: inline-flex;
  align-items: baseline;     /* 跟同段文字基线对齐 */
  gap: 2px;                  /* icon ↔ 中文字 2px */
  font-weight: 500;
  letter-spacing: 0.01em;
  flex-shrink: 0;            /* 再挤也不把 icon+中文字 挤没 */
  white-space: nowrap;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 0;
  margin-left: 10px;
}
/* 列表行 / 顶部行 同一个字号 */
.cp-vis-tag--list,
.cp-vis-tag--sm { font-size: 12.5px; }
/* 4 色语义色（饱和度中等偏低，不会当独立 UI 块，就是标题中的修饰色字） */
.cp-vis-tag--public   { color: rgba(140, 214, 255, 0.76); }   /* 公开：柔蓝 */
.cp-vis-tag--anon     { color: rgba(169, 189, 255, 0.80); }   /* 匿名：柔蓝灰 */
.cp-vis-tag--galaxy   { color: rgba(232, 184, 109, 0.86); }   /* 星河：浅金 */
.cp-vis-tag--private  { color: rgba(255, 255, 255, 0.48); }   /* 私有：浅灰 */

/* ══ 标题名字：和可见性同段文字，不再有外层 max-width 列宽限制 ══ */
.cp-cur-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 0; margin-right: 0; }
.cp-opt-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-right: 0;
  margin-right: 0;
}

/* ═══ Teleport 到 body 后，不再依赖父级 relative，也不再被父容器 overflow 裁剪 ═══ */
.cp-panel {
  /* position / top / bottom / left / width / max-height / z-index 都由 panelStyle 行内绑定传入 */
  background: rgba(28, 29, 44, 0.965);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow:
    0 18px 48px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 217, 138, 0.05);
  padding: 6px;
  overflow-y: auto;
  color: var(--ink, rgba(255, 255, 255, 0.88));
  /* ══ 上一版 Teleport 到 body 后脱离了 .sf-sheet 的 font-family，body 回退到默认衬线 —— 现在显式写无衬线兜底 ══ */
  font-family:
    var(--font),
    system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Source Han Sans CN",
    sans-serif;
  font-size: 13px;
  /* 自定义滚动条：与 body 同款细条，避免 Teleport 到 body 时样式丢失 */
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 217, 138, 0.22) transparent;
}
.cp-panel::-webkit-scrollbar { width: 6px; background: transparent; }
.cp-panel::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(255, 217, 138, 0.22), rgba(202, 167, 255, 0.20));
  border-radius: 3px;
}
.cp-group { padding: 4px 0; border-top: 0.5px solid rgba(255, 255, 255, 0.05); }
.cp-group:first-of-type { border-top: none; }
/* ══ 新建合集整段（标题+按钮+输入框+4 档私密选项）永久置顶 ══
   滚动已有合集列表时，新建区始终粘在下拉面板顶部，不会被滚走。
   背景与 backdrop-filter 故意与 cp-panel 一致，并加底部细分割视觉隔离。 */
.cp-sticky {
  position: sticky;
  top: 0;
  z-index: 2;
  margin: -6px -6px 0;
  padding: 6px;
  padding-bottom: 8px;
  background: inherit;
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border-bottom: 0.5px solid rgba(255, 255, 255, 0.06);
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
}
.cp-group-title {
  padding: 6px 12px 4px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.32);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
/* 新建合集标题用金色强调，跟"我的合集"灰色标题区分等级 */
.cp-group-title-accent {
  color: rgba(255, 217, 138, 0.62);
  letter-spacing: 0.1em;
}
.cp-list {
  max-height: 100%;
}
.cp-opt {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 9px 12px;
  background: none;
  border: none;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background .12s ease;
  text-align: left;
}
.cp-opt:hover { background: rgba(255, 255, 255, 0.05); }
.cp-opt.on { background: rgba(255, 217, 138, 0.10); color: #ffe5a8; }
.cp-opt-empty { color: rgba(255, 255, 255, 0.5); cursor: default; }
/* 列表项布局：色点·Library icon → [标题格子(名字+可见性紧贴)] → 故事数(最右，margin-left:auto) */
.cp-opt .cp-icon       { color: rgba(255, 255, 255, 0.5); flex-shrink: 0; }
.cp-opt .cp-dot        { color: initial; flex-shrink: 0; } /* dot 用 style 色，不受 icon 颜色影响 */
/* ❌ 旧 max-width:42% 已经删除（它会强制名字 42% 宽，可见性被推到中间，像三列表格）
   现在由外层小组 wrapper 管理空间，长名字只在小组内自由省略号，不影响可见性位置 */
.cp-opt-count {
  margin-left: auto;     /* 有它就永远最右贴边，不用计算弹性 */
  flex-shrink: 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  font-variant-numeric: tabular-nums;
}
/* 保留旧选择器 class：cp-opt-lock（仍作为小 icon 独用时的 class，虽然目前列表里不用单个 icon 了，但兼容外部 */
.cp-opt-lock { color: rgba(255, 255, 255, 0.3); }
.cp-opt-public             { color: rgba(140, 214, 255, 0.7); }    /* 公开：蓝 globe */
.cp-opt-lock.cp-opt-anon   { color: rgba(169, 189, 255, 0.74); }   /* 匿名：灰蓝面具 */
.cp-opt-lock.cp-opt-galaxy { color: rgba(232, 184, 109, 0.86); }   /* 星河：星穹金 */
.cp-opt-lock.cp-opt-public { color: rgba(140, 214, 255, 0.7); }

.cp-new-group { /* 兼容仅 .cp-new-group 选择器路径 */ }
.cp-new-form {
  padding: 6px 8px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cp-new-input {
  width: 100%;
  box-sizing: border-box;
  padding: 9px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 0.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 9px;
  color: rgba(255, 255, 255, 0.92);
  font-family: inherit;
  font-size: 13px;
  outline: none;
}
.cp-new-input:focus { border-color: rgba(255, 217, 138, 0.28); background: rgba(255, 255, 255, 0.055); }
.cp-new-input::placeholder { color: rgba(255, 255, 255, 0.26); }
/* 4 档可见性按钮：公开/匿名/星河/私密
   flex-wrap + gap，宽度不够时 4 个会自动 2+2 换行，永远不挤字 */
.cp-visi {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.cp-visi-btn {
  flex: 1 1 calc(50% - 3px);
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px 6px;
  border-radius: 8px;
  border: 0.5px solid rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.028);
  color: rgba(255, 255, 255, 0.62);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: all .15s ease;
  white-space: nowrap;
}
.cp-visi-btn:nth-child(1).on { background: rgba(140, 214, 255, 0.10); border-color: rgba(140, 214, 255, 0.28); color: rgba(180, 228, 255, 0.96); } /* 公开蓝 */
.cp-visi-btn:nth-child(2).on { background: rgba(169, 189, 255, 0.10); border-color: rgba(169, 189, 255, 0.3); color: rgba(200, 216, 255, 0.96); } /* 匿名蓝灰 */
.cp-visi-btn:nth-child(3).on { /* 星河金 */ background: rgba(232, 184, 109, 0.12); border-color: rgba(255, 217, 138, 0.32); color: #ffe5a8; }
.cp-visi-btn:nth-child(4).on { /* 私密锁紫灰 */ background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.22); color: rgba(255, 255, 255, 0.92); }

.cp-drop-enter-active, .cp-drop-leave-active { transition: opacity .16s ease, transform .16s ease; }
.cp-drop-enter-from, .cp-drop-leave-to { opacity: 0; transform: translateY(-4px); }
.cp-expand-enter-active, .cp-expand-leave-active { transition: opacity .16s ease; }
.cp-expand-enter-from, .cp-expand-leave-to { opacity: 0; }
</style>
