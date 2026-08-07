<template>
  <div class="folio-detail-page">
    <!-- 背景（同 FolioSquare 夜色银河） -->
    <div class="fdp-bg" aria-hidden="true">
      <div class="fdp-bg-milky"></div>
      <div class="fdp-bg-stars"></div>
    </div>

    <!-- 顶部导航栏（sticky） -->
    <header class="fdp-top">
      <div class="fdp-top-left">
        <button type="button" class="fdp-back" @click="goBack" aria-label="返回书局">
          <ChevronLeft :size="16" />
        </button>
        <button type="button" class="fdp-pill fdp-pill-link" @click="goSquare">
          <BookMarked :size="11" />
          <span>穹庭书局</span>
        </button>
        <span class="fdp-sep">/</span>
        <span class="fdp-crumb-title">{{ titleCrumb }}</span>
      </div>
      <div class="fdp-top-right">
        <button
          type="button"
          class="fdp-pill fdp-pill-warm"
          @click="goSquare"
          v-if="detail?.visibility !== 'galaxy' || true"
        >
          <Sparkles :size="11" />
          <span>🌌 更多星笺</span>
        </button>
        <button type="button" class="fdp-icon-btn" @click="reloadDetail" aria-label="刷新">
          <RotateCcw :size="12" />
        </button>
        <button type="button" class="fdp-icon-btn" @click="goSky" aria-label="回天际">
          <Orbit :size="12" />
        </button>
      </div>
    </header>

    <main class="fdp-main">
      <!-- 加载中 -->
      <div v-if="loading && !detail" class="fdp-loading-wrap">
        <div class="fdp-loading">
          <Sparkles :size="18" class="spin-slow" style="color: #ffd98a" />
          <span>卷轴展卷中…</span>
        </div>
      </div>

      <!-- 404 -->
      <div v-else-if="notFound" class="fdp-empty">
        <BookDashed :size="30" />
        <h2>这册星笺不在卷目之中</h2>
        <p>它可能已被作者改为私密，或从未存在。</p>
        <button type="button" class="fs-btn fs-btn-warm" style="margin-top: 12px" @click="goSquare">← 回到穹庭书局</button>
      </div>

      <!-- 详情：直接嵌入 CollectionDetail 组件
           用 fdp-content-wrap 强制取消它原本的 overlay fixed 定位（用 :deep 覆盖） -->
      <div v-else class="fdp-content-wrap" :key="refreshNonce">
        <CollectionDetail
          :collection-id="collectionId"
          :collections="[]"
          :current-user-id="userId"
          :is-owner="isOwner"
          :refresh-nonce="refreshNonce"
          @close="goSquare"
          @story-click="onStoryClick"
          @edit="onWantEditDenied"
          @delete="onWantEditDenied"
          @collection-switch="onSwitch"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ChevronLeft, Sparkles, RotateCcw, Orbit, BookMarked, BookDashed, X, AlertTriangle,
} from 'lucide-vue-next'
import CollectionDetail from '../components/CollectionDetail/index.vue'
import type { Collection } from '../composables/useCollections'
import { authFetch, authHeaders, useAuth } from '../stores/auth'

const props = defineProps<{
  /** 路由 /folios/:id 的合集 id */
  id: string | number
}>()
const { user: authUser } = useAuth()

const route = useRoute()
const router = useRouter()
const idFromRoute = computed<number>(() => {
  const raw = typeof props.id === 'number' ? props.id : route.params.id
  const n = Number(raw)
  return Number.isFinite(n) ? Math.floor(n) : NaN
})

/* 当前用户 id（判断 isOwner 用；未登录 = null） */
const userId = computed<number | null>(() => authUser.value?.id ?? null)
const collectionId = computed<number | null>(() => isNaN(idFromRoute.value) ? null : idFromRoute.value)
const loading = ref(false)
const notFound = ref(false)
const detail = ref<Collection | { id: number; visibility?: string; name?: string; userId?: number } | null>(null)
const isOwner = ref(false)
const refreshNonce = ref(0)

const titleCrumb = computed(() => {
  if (detail.value && detail.value.name) return detail.value.name
  if (notFound.value) return '未找到卷目'
  return '开卷…'
})

async function loadDetailMeta() {
  if (collectionId.value == null) { notFound.value = true; return }
  loading.value = true
  notFound.value = false
  detail.value = null
  try {
    const res = await authFetch(`/api/collections/${collectionId.value}`, { headers: authHeaders() })
    const json = await res.json()
    if (res.status === 404) { notFound.value = true; return }
    if (!res.ok) throw new Error(json.message || '加载失败')
    const d = json.data
    detail.value = d
    isOwner.value = !!userId.value && !!d && Number(d.userId) === Number(userId.value)
    // 更新浏览器 title
    try { if (d?.name) document.title = `${d.name} · 星笺穹庭书局` } catch { /* ignore */ }
  } catch (_e) {
    notFound.value = true
  } finally {
    loading.value = false
  }
}

function reloadDetail() {
  refreshNonce.value++
  loadDetailMeta()
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/folios')
}
function goSquare() { router.push('/folios') }
function goSky() { router.push('/sky') }

/**
 * 详情页内点击故事：
 *  - 优先回到 /sky 并在 search 挂 ?storyId=xxx 打开 StarDetail + 高亮该故事
 *  - 但目前 SkyPage 还不支持 URL query 定位故事（P2 TODO），先直接跳 /sky
 *  - 如果故事挂在 collection 下的 overlay 内部，它原本会 emit story-click，
 *    SkyPage 自己用 overlay 开 StoryDetailModal，这里我们就不让 modal 再弹，
 *    直接跳天际，保留预期。
 */
function onStoryClick(_s: any) { goSky() }

/** 广场详情页，不允许就地从该页编辑（入口在个人主页），闪个提示即可 */
function onWantEditDenied(_c: any) {
  // 若用户 isOwner=true，让编辑流程直接跳回个人主页开对应合集；否则静默忽略
  if (isOwner.value) router.push({ path: '/profile', hash: `#pd-collections?focus=${collectionId.value}` })
}

/** 切换合集（一般情况 collections=[]，切换按钮不显示；以防万一） */
function onSwitch(cid: number) { router.push(`/folios/${cid}`) }

onMounted(loadDetailMeta)
// 路由 params/:id 变化时 reload
watch(idFromRoute, () => {
  refreshNonce.value++
  loadDetailMeta()
})
</script>

<style scoped>
.folio-detail-page {
  position: relative;
  min-height: 100vh;
  width: 100%;
  background:
    radial-gradient(1200px 600px at 85% -10%, rgba(82, 88, 150, 0.22), transparent 60%),
    radial-gradient(900px 520px at 5% 5%, rgba(183, 136, 98, 0.14), transparent 60%),
    linear-gradient(180deg, #0b0b1a 0%, #0a0b1c 42%, #0b0b1a 100%);
  color: #f0f0fa;
  font-family: inherit;
  overflow-x: hidden;
}

/* ── 背景（复用 FolioSquare 风格，减少动画量保证详情阅读不抖） ── */
.fdp-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.fdp-bg-milky {
  position: absolute; top: -10vh; right: -10vw;
  width: 120vw; height: 120vh;
  background:
    radial-gradient(400px 300px at 30% 40%, rgba(255, 234, 184, 0.045), transparent 60%),
    radial-gradient(500px 300px at 80% 80%, rgba(138, 127, 206, 0.05), transparent 60%);
  filter: blur(18px);
}
.fdp-bg-stars {
  position: absolute; inset: 0;
  background-image:
    radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,0.55), transparent 50%),
    radial-gradient(1px 1px at 120px 80px, rgba(255,255,255,0.45), transparent 50%),
    radial-gradient(1.2px 1.2px at 260px 200px, rgba(255, 229, 168, 0.6), transparent 50%),
    radial-gradient(1px 1px at 380px 120px, rgba(255,255,255,0.35), transparent 50%),
    radial-gradient(1px 1px at 520px 280px, rgba(189, 208, 255, 0.55), transparent 50%),
    radial-gradient(1px 1px at 680px 40px, rgba(255,255,255,0.5), transparent 50%);
  background-repeat: repeat;
  background-size: 800px 320px;
  opacity: 0.45;
}

/* ── 顶部 Bar ── */
.fdp-top {
  position: fixed; top: 0; left: 0; right: 0; z-index: 50;
  display: flex; align-items: center; justify-content: space-between; gap: 14px;
  padding: 10px 20px;
  backdrop-filter: blur(12px);
  background: linear-gradient(180deg, rgba(10,11,28,0.8) 0%, rgba(10,11,28,0.44) 80%, rgba(10,11,28,0) 100%);
  border-bottom: 0.5px solid rgba(255,255,255,0.05);
}
.fdp-top-left, .fdp-top-right { display: flex; align-items: center; gap: 10px; min-width: 0; }
.fdp-back {
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 50%;
  background: rgba(255,255,255,0.04);
  border: 0.5px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.78);
  cursor: pointer;
  transition: background .15s, transform .15s;
}
.fdp-back:hover { background: rgba(255, 217, 138, 0.12); color: #ffe5a8; transform: translateX(-1px); }
.fdp-pill {
  display: inline-flex; align-items: center; gap: 5px;
  height: 30px; padding: 0 12px;
  border-radius: 100px;
  font-family: inherit; font-size: 0.72rem;
  cursor: pointer;
  transition: background .15s, transform .12s;
}
.fdp-pill:active { transform: scale(0.97); }
.fdp-pill-link {
  background: rgba(255,255,255,0.04);
  border: 0.5px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.78);
}
.fdp-pill-link:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.94); }
.fdp-pill-warm {
  background: rgba(255, 217, 138, 0.12);
  border: 0.5px solid rgba(255, 217, 138, 0.28);
  color: #ffe5a8;
}
.fdp-pill-warm:hover { background: rgba(255, 217, 138, 0.2); }
.fdp-icon-btn {
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 50%;
  background: rgba(255,255,255,0.04);
  border: 0.5px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.72);
  cursor: pointer;
  transition: background .15s, color .15s;
}
.fdp-icon-btn:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.92); }
.fdp-sep {
  color: rgba(255,255,255,0.24);
  font-size: 0.8rem;
  padding: 0 2px;
}
.fdp-crumb-title {
  font-size: 0.78rem;
  color: rgba(255, 229, 168, 0.94);
  letter-spacing: 0.05em;
  max-width: 48vw;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── 主内容 ── */
.fdp-main {
  position: relative;
  z-index: 1;
  width: min(1260px, 100%);
  margin: 0 auto;
  padding: 58px 16px 80px;
}
.fdp-loading-wrap {
  display: flex; align-items: center; justify-content: center;
  min-height: 58vh;
}
.fdp-loading {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 14px 24px;
  border-radius: 16px;
  background: rgba(255,255,255,0.03);
  border: 0.5px solid rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.6);
  font-size: 0.82rem;
  letter-spacing: 0.05em;
}
.spin-slow { animation: fdp-spin 1.6s linear infinite; }
@keyframes fdp-spin { to { transform: rotate(360deg); } }

.fdp-empty {
  margin: 14vh auto 0;
  max-width: 420px;
  text-align: center;
  padding: 32px 24px;
  border-radius: 18px;
  background: rgba(255,255,255,0.025);
  border: 0.5px solid rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.78);
}
.fdp-empty :deep(.lucide) { color: rgba(255,255,255,0.28); margin-bottom: 8px; }
.fdp-empty h2 { margin: 4px 0 6px; font-size: 1.08rem; color: rgba(255,255,255,0.9); }
.fdp-empty p { margin: 0; font-size: 0.78rem; color: rgba(255,255,255,0.44); }

/* ═══ 关键：把 CollectionDetail 原本的 Modal/Overlay 壳「拍平」为普通内容 ═══
   CollectionDetail 内部：
     PC：.pc-detail-mask + .pc-detail-modal（position:fixed 全屏）
     手机：.mobile-sheet-overlay（fixed）+ .mobile-sheet
   我们通过 :deep 把 fixed → relative/static，去掉 mask 背景/层级。 */
.fdp-content-wrap {
  position: relative;
  z-index: 1;
  padding-top: 6px;
}
.fdp-content-wrap :deep(.pc-detail-mask),
.fdp-content-wrap :deep(.mobile-sheet-overlay) {
  /* 原本是全屏半透明黑遮罩 + 居中 Modal；拍平：不显示遮罩，不弹层 */
  position: static !important;
  inset: auto !important;
  background: transparent !important;
  backdrop-filter: none !important;
  z-index: 1 !important;
  display: block !important;
  pointer-events: auto !important;
  padding: 0 !important;
}
.fdp-content-wrap :deep(.pc-detail-modal) {
  position: relative !important;
  top: auto !important;
  left: auto !important;
  right: auto !important;
  transform: none !important;
  width: 100% !important;
  max-width: 1200px !important;
  max-height: none !important;
  height: auto !important;
  margin: 0 auto !important;
  border-radius: 22px !important;
  overflow: visible !important;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35) !important;
}
/* PC: CollectionDetail 默认是左右分栏，作为详情页主内容可以更宽一些 */
.fdp-content-wrap :deep(.pc-detail-inner) {
  max-height: none !important;
  overflow: visible !important;
}
/* 详情页不需要"关闭 X 按钮"的点击感（仍保留，点击=回书局），让它颜色更协调 */
.fdp-content-wrap :deep(.close-btn),
.fdp-content-wrap :deep(.mobile-close-btn) {
  background: rgba(255,255,255,0.05) !important;
  color: rgba(255,255,255,0.62) !important;
  border: 0.5px solid rgba(255,255,255,0.08) !important;
}
.fdp-content-wrap :deep(.close-btn:hover),
.fdp-content-wrap :deep(.mobile-close-btn:hover) {
  background: rgba(255, 217, 138, 0.14) !important;
  color: #ffe5a8 !important;
  border-color: rgba(255, 217, 138, 0.26) !important;
}
/* Mobile: 改 sheet 为正常流容器 */
.fdp-content-wrap :deep(.mobile-sheet) {
  position: relative !important;
  bottom: auto !important;
  width: 100% !important;
  max-height: none !important;
  border-radius: 22px !important;
  margin: 10px auto 0 !important;
  transform: none !important;
}
.fdp-content-wrap :deep(.sheet-handle) { display: none !important; }

/* 响应式 */
@media (max-width: 720px) {
  .fdp-top { padding: 8px 12px; flex-wrap: wrap; row-gap: 6px; }
  .fdp-top-right { order: 3; width: 100%; justify-content: space-between; }
  .fdp-main { padding: 88px 10px 60px; }
  .fdp-crumb-title { max-width: 58vw; }
}
@media (max-width: 420px) {
  .fdp-crumb-title { max-width: 52vw; font-size: 0.72rem; }
  .fdp-top-left .fdp-pill-link span { display: none; }
}
</style>
