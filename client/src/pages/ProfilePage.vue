<template>
  <div class="profile-page">
    <!-- 保留 canvas 不删除 -->
    <canvas ref="canvasRef" class="sky-bg pd-sky-canvas"></canvas>
    <div v-if="!loaded" class="loading">...</div>
    <template v-else>
      <!-- 1. Topbar 固定导航 -->
      <header class="pd-topbar">
        <button class="pd-back-btn pd-action-btn" @click="goBack">
          <span class="pd-roman">Ⅰ</span><span class="pd-action-sep">·</span><span class="pd-action-label">返航</span>
        </button>
        <div class="pd-brand">STARRY · DOME</div>
        <!-- PC 端：4 个独立按钮 -->
        <div class="pd-actions pd-actions-pc">
          <button class="pd-back-btn pd-action-btn" @click="startEditSig">
            <span class="pd-roman">Ⅱ</span><span class="pd-action-sep">·</span><span class="pd-action-label">题刻</span>
          </button>
          <button class="pd-back-btn pd-action-btn" @click="clearAndClosePwdModal(); showPwdModal = true">
            <span class="pd-roman">Ⅲ</span><span class="pd-action-sep">·</span><span class="pd-action-label">密钥</span>
          </button>
          <button class="pd-back-btn pd-action-btn pd-logout-trigger" @click="showLogoutModal = true">
            <span class="pd-roman">Ⅳ</span><span class="pd-action-sep">·</span><span class="pd-action-label">离开</span>
          </button>
        </div>
        <!-- 移动端：单设置按钮触发弹窗 -->
        <button class="pd-back-btn pd-action-btn pd-settings-trigger" @click="showSettingsModal = true">
          <span class="pd-roman">Ⅱ Ⅲ Ⅳ</span>
        </button>
      </header>

      <!-- 移动端设置弹窗（题刻/密钥/离开） -->
      <div v-if="showSettingsModal" class="pd-modal-mask" @click.self="showSettingsModal = false">
        <div class="pd-modal-panel pd-modal-sm pd-settings-sheet">
          <header class="pd-modal-head">
            <h3>· STELLAR SETTINGS ·</h3>
            <button type="button" class="pd-modal-close" aria-label="关闭" @click="showSettingsModal = false">×</button>
          </header>
          <main class="pd-modal-body pd-settings-list">
            <button class="pd-settings-item" @click="showSettingsModal = false; startEditSig()">
              <span class="pd-roman">Ⅱ</span><span class="pd-action-sep">·</span><span class="pd-settings-item-label">题刻签名</span>
            </button>
            <button class="pd-settings-item" @click="showSettingsModal = false; clearAndClosePwdModal(); showPwdModal = true">
              <span class="pd-roman">Ⅲ</span><span class="pd-action-sep">·</span><span class="pd-settings-item-label">重铸密钥</span>
            </button>
            <button class="pd-settings-item pd-settings-leave" @click="showSettingsModal = false; showLogoutModal = true">
              <span class="pd-roman">Ⅳ</span><span class="pd-action-sep">·</span><span class="pd-settings-item-label">离开星穹</span>
            </button>
          </main>
        </div>
      </div>

      <!-- 2. Hero 区 100vh -->
      <section class="pd-hero">
        <div class="pd-moon">
          <div class="pd-moon-disk">
            <div class="moon-mare moon-mare-a"></div>
            <div class="moon-mare moon-mare-b"></div>
            <div class="moon-mare moon-mare-c"></div>
          </div>
        </div>
        <div class="pd-hero-text">
          <p class="pd-hero-role">✦ WEAVER OF NIGHT STORIES ✦</p>
          <h1 class="pd-hero-name">{{ user?.username }}</h1>
          <div class="pd-hero-band">{{ sigText || 'Starry Dome · 星穹纺织者 · 夜语记录人' }}</div>
          <div class="pd-hero-joined">
            <span class="pd-gold-sep">◆</span>
            <span>星穹纺织者</span>
            <span class="pd-gold-sep">◆</span>
            <span>加入星空 {{ daysAgo }} 天</span>
            <span class="pd-gold-sep">◆</span>
          </div>
          <div class="pd-hero-email">
            <span class="pd-gold-sep">◆</span>
            <span>{{ user?.email || '未绑定邮箱（无法找回密钥）' }}</span>
          </div>
        </div>
        <div class="pd-scroll-hint">
          <span>Scroll · 向下滚动开启回忆</span>
          <span class="pd-scroll-line"></span>
        </div>
      </section>

      <!-- 3. Timeline Section -->
      <section class="pd-timeline-section" id="pd-timeline">
        <div class="pd-section-head">
          <h2>我的回忆 · TIMELINE</h2>
          <p>—— 每一颗被点亮的星，都是我曾驻足的夜晚 ——</p>
        </div>

        <div class="pd-stats">
          <div class="pd-stat">
            <div class="stat-num">{{ stats.storyCount }}</div>
            <div class="stat-label">Stories</div>
          </div>
          <div class="pd-stat">
            <div class="stat-num">{{ stats.totalResonance }}</div>
            <div class="stat-label">Resonance In</div>
          </div>
          <div class="pd-stat">
            <div class="stat-num">{{ stats.resonanceGivenCount }}</div>
            <div class="stat-label">Resonance Out</div>
          </div>
          <div class="pd-stat">
            <div class="stat-num">{{ stats.favoriteCount }}</div>
            <div class="stat-label">Favorites</div>
          </div>
        </div>

        <nav class="pd-timeline" aria-label="个人故事时间轴" v-if="stories.length > 0">
          <div class="pd-t-items">
            <article
              v-for="(s, i) in stories.slice(0, visibleCount)"
              :key="s.id"
              class="pd-t-item"
              :class="i % 2 === 0 ? 'left' : 'right'"
              :aria-label="storyAriaLabel(s, i)"
              role="article"
              :style="{ animationDelay: Math.min(i * 30, 200) + 'ms' }"
            >
              <div class="pd-t-node" aria-hidden="true">
                <span class="pd-t-date-month">{{ formatMDParts(s.createdAt).month }}</span>
                <div class="pd-t-star"></div>
                <span class="pd-t-date-day">{{ formatMDParts(s.createdAt).day }}</span>
              </div>
              <button class="pd-t-card" type="button" @click="openStory(s)"
                @mouseenter="onCardEnter" @mouseleave="onCardLeave">
                <div class="pd-t-head">
                  <h3 class="pd-t-title">{{ s.title || '未命名故事' }}</h3>
                  <span v-if="getStoryPrimaryStar(s)" class="pd-t-star-tag" @click.stop="goToStar(getStoryPrimaryStar(s)!.id)">
                    {{ getStoryPrimaryStar(s)!.name }}<em v-if="getStoryPrimaryStar(s)!.con"> · {{ getStoryPrimaryStar(s)!.con }}</em><strong v-if="getStoryPrimaryStar(s)!.extraCount > 0"> +{{ getStoryPrimaryStar(s)!.extraCount }}</strong>
                  </span>
                </div>
                <p class="pd-t-body">{{ s.content }}</p>
                <div class="pd-t-foot">
                  <span v-if="s.tag" class="pd-t-tag" :class="'tag-' + s.tag">{{ s.tag }}</span>
                  <span class="pd-t-res">{{ s.resonanceCount || 0 }} 共鸣</span>
                </div>
              </button>
            </article>
          </div>
        </nav>
        <div v-else class="pd-empty">
          <div class="pd-empty-orb" aria-hidden="true">✧</div>
          <h4 class="pd-empty-title">还没有故事，</h4>
          <p class="pd-empty-sub">去星空投递一颗属于你的星 →</p>
          <button class="pd-back-btn" @click="router.push('/sky')">前往星空</button>
        </div>

        <div v-if="loadingMore" class="pd-bottom-hint">加载中...</div>
        <div v-else-if="!hasMore && stories.length>0 && visibleCount>=stories.length" class="pd-bottom-hint">✦ ✦ ✦ 已经到底了</div>

        <div class="pd-expand-wrap">
          <button v-if="visibleCount < stories.length" class="pd-btn-expand" @click="expandStories">展开更多故事</button>
          <button v-else-if="hasMore" class="pd-btn-expand" @click="loadAndExpandNext5">加载并展开下一组</button>
        </div>
      </section>

      <section id="pd-constellation" class="pd-constellation-section" aria-label="我的私人星座">
        <div class="pd-const-wrap">
          <p class="pd-const-title">· MY · PERSONAL · CONSTELLATION ·</p>
          <h3 class="pd-const-name">纺织者之线 Weaver's Thread</h3>
          <p class="pd-const-sub">— 由 {{ Math.min(stories.length, 12) }} 则心事编织的私人星座，独属于你 —</p>
          <template v-if="stories.length === 0">
            <div class="pd-empty">
              <div class="pd-empty-orb" aria-hidden="true">✧</div>
              <h4 class="pd-empty-title">还没有编织出星座，</h4>
              <p class="pd-empty-sub">先去时间轴投递一些故事，再来看看它们的连接。</p>
            </div>
          </template>
          <template v-else>
            <svg class="pd-constellation-svg" viewBox="0 0 500 360" preserveAspectRatio="xMidYMid meet" role="img" :aria-label="`私人星座图，包含 ${Math.min(stories.length, 12)} 颗恒星，${constellationLines().length} 条编织线（时间+共星）`">
              <defs>
                <radialGradient id="pd-const-bg" cx="50%" cy="50%">
                  <stop offset="0%" stop-color="rgba(255,217,138,0.05)"/>
                  <stop offset="100%" stop-color="transparent"/>
                </radialGradient>
                <!-- 时间主链：白金色渐变 -->
                <linearGradient id="pd-const-time-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#ffd98a"/>
                  <stop offset="100%" stop-color="#caa7ff"/>
                </linearGradient>
                <!-- 01 号"起针"标记（纺织的起点箭头） -->
                <marker id="pd-const-pin" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 Z" fill="#ffd98a" opacity="0.7"/>
                </marker>
              </defs>

              <rect width="500" height="360" fill="url(#pd-const-bg)"/>
              <!-- 椭圆轨道 guides（紫色虚线圈，营造天球感） -->
              <ellipse class="pd-const-guide" cx="250" cy="180" rx="220" ry="160" />
              <ellipse class="pd-const-guide" cx="250" cy="180" rx="180" ry="130" />
              <ellipse class="pd-const-guide" cx="250" cy="180" rx="140" ry="100" />

              <!-- 下层：共星支线（纬线，紫虚脉冲）→ 先画，避免盖过时间主线 -->
              <g class="pd-const-lines pd-const-lines-echo">
                <line
                  v-for="(l, i) in constellationLines().filter(l => l.kind === 'echo')"
                  :key="'cl-echo-' + i"
                  class="pd-const-line pd-const-line-echo"
                  :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2"
                />
              </g>
              <!-- 上层：时间主链（经线，白金色实线，开放链） -->
              <g class="pd-const-lines pd-const-lines-time">
                <line
                  v-for="(l, i) in constellationLines().filter(l => l.kind === 'time')"
                  :key="'cl-time-' + i"
                  class="pd-const-line pd-const-line-time"
                  :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2"
                  :marker-start="i === 0 ? 'url(#pd-const-pin)' : undefined"
                />
              </g>

              <!-- 装饰小星 -->
              <circle cx="60"  cy="200" r="1"   fill="rgba(255,255,255,0.5)"/>
              <circle cx="460" cy="50"  r="0.8" fill="rgba(255,255,255,0.5)"/>
              <circle cx="80"  cy="330" r="1.2" fill="rgba(255,217,138,0.4)"/>
              <circle cx="450" cy="230" r="0.8" fill="rgba(255,255,255,0.4)"/>

              <!-- 顶层：故事节点（核心星紫色描边+星名标签，普通星金色描边） -->
              <g class="pd-const-nodes">
                <g
                  v-for="(m, i) in constellationNodeMeta()"
                  :key="'cn-' + m.index"
                  class="pd-const-node"
                  :class="{ 'is-core': m.isCore }"
                  tabindex="0"
                  role="button"
                  :aria-label="`跳转至第 ${m.index + 1} 则故事：${stories[m.index]?.title || '未命名故事'}${m.starName ? '（挂于' + m.starName + '）' : ''}`"
                  @click="scrollToStory(m.index)"
                  @keyup.enter="scrollToStory(m.index)"
                  @keyup.space.prevent="scrollToStory(m.index)"
                >
                  <circle
                    class="pd-const-node-shape"
                    :cx="constellationNodes()[m.index].x"
                    :cy="constellationNodes()[m.index].y"
                    :r="m.isCore ? 6.2 : 5"
                    :style="{ animationDelay: (m.index * 0.4) + 's' }"
                  />
                  <text
                    class="pd-const-node-idx"
                    :x="constellationNodes()[m.index].x"
                    :y="constellationNodes()[m.index].y - 14"
                  >{{ String(m.index + 1).padStart(2, '0') }}</text>
                  <!-- 所有挂在星表星上的故事，下方都标注星名 + 星座（核心驻足星用紫，普通用金） -->
                  <text
                    v-if="m.starName"
                    class="pd-const-node-sname"
                    :class="{ 'is-core': m.isCore }"
                    :x="constellationNodes()[m.index].x"
                    :y="constellationNodes()[m.index].y + 22"
                  >{{ m.starName }}<tspan class="pd-const-node-scon" v-if="m.starConstellation"> · {{ m.starConstellation }}</tspan></text>
                </g>
              </g>
            </svg>
          </template>
        </div>
      </section>

      <section id="pd-favorites" class="pd-favorites-section" aria-label="我的收藏星空">
        <h3 class="pd-favorites-title">FAVORITES · GALLERY · 私人星展</h3>
        <template v-if="favorites.length === 0">
          <div class="pd-empty">
            <div class="pd-empty-orb" aria-hidden="true">♡</div>
            <h4 class="pd-empty-title">还没有收藏的恒星，</h4>
            <p class="pd-empty-sub">在时间轴上点 ❤ 收藏一颗星，它会出现在这里。</p>
          </div>
        </template>
        <template v-else>
          <div class="pd-gallery" role="list">
            <article
              v-for="(f, i) in favorites"
              :key="f.id"
              class="pd-gal-card"
              :class="'gal-' + ((i % 4) + 1)"
              role="listitem"
              tabindex="0"
              :aria-label="`恒星收藏卡：${f.title || '未命名收藏'}，恒星 ${f.starName || ''}，共鸣 ${f.resonanceCount || 0}，按 Enter 详情，按 Delete 取消收藏`"
              @click="goToStarWithCheck(f.starCatalogId, f.id)"
              @keyup.enter="goToStarWithCheck(f.starCatalogId, f.id)"
              @mouseenter="onCardEnter" @mouseleave="onCardLeave"
              @keyup.delete.prevent="unfavorite(f.id)"
            >
              <button
                type="button"
                class="pd-gal-close"
                aria-label="取消收藏"
                @click.stop="unfavorite(f.id)"
                @keyup.enter.stop.prevent="unfavorite(f.id)"
              >×</button>
              <div class="pd-gal-img" aria-hidden="true">{{ galaxyIcon(f.starName) }}</div>
              <div class="pd-gal-name">{{ f.title || f.starName || '无名星' }}</div>
              <div class="pd-gal-sub">
                {{ f.starConstellation || '未知星座' }} · {{ f.starName || '' }}<br>
                <template v-if="f.content">{{ f.content.slice(0, 22) }}{{ f.content.length > 22 ? '…' : '' }}</template>
                <template v-else>♡ {{ f.resonanceCount || 0 }} 共鸣 · {{ formatMD(f.createdAt || '') }}</template>
              </div>
            </article>
          </div>
        </template>
      </section>

      <!-- 签名 inline 编辑器 -->
      <div v-if="editingSig" class="pd-sign-inline">
        <label class="pd-sign-label">✦ 编辑你的个性签名 ✦</label>
        <input ref="sigInputRef" v-model="sigDraft" maxlength="30"
          @keydown.enter="saveSig" @keydown.escape="editingSig = false"
          class="pd-sign-input" placeholder="写一行签名..." />
        <button type="button" class="pd-btn-primary" @click="saveSig">保存</button>
        <button type="button" class="pd-back-btn" @click="editingSig = false">取消</button>
      </div>

      <!-- 修改密码弹窗 -->
      <div v-if="showPwdModal" class="pd-modal-mask" @click.self="clearAndClosePwdModal">
        <div class="pd-modal-panel">
          <header class="pd-modal-head">
            <h3>· STELLAR · VAULT · 修改星穹之钥 ·</h3>
            <button type="button" class="pd-modal-close" aria-label="关闭" @click="clearAndClosePwdModal">×</button>
          </header>
          <main class="pd-modal-body">
            <div class="pd-modal-form-row">
              <label class="pd-modal-label">旧 密 码</label>
              <input v-model="oldPwd" type="password" class="pd-modal-input" placeholder="输入旧密码" />
            </div>
            <div class="pd-modal-form-row">
              <label class="pd-modal-label">新 密 码</label>
              <input v-model="newPwd" type="password" class="pd-modal-input" placeholder="6~50 个字符" minlength="6" maxlength="50" />
            </div>
            <div class="pd-modal-form-row">
              <label class="pd-modal-label">确 认 新 密 码</label>
              <input v-model="confirmPwd" type="password" class="pd-modal-input" placeholder="再次输入新密码" />
            </div>
            <p v-if="pwdError" class="pwd-error">{{ pwdError }}</p>
          </main>
          <footer class="pd-modal-foot">
            <button type="button" class="pd-back-btn" @click="clearAndClosePwdModal">取消</button>
            <button type="button" class="pd-btn-primary" @click="updatePassword" :disabled="pwdLoading">
              {{ pwdLoading ? '修改中...' : '确认修改' }}
            </button>
          </footer>
          <p class="pwd-forgot-link" @click="goForgotPassword">忘了旧密码？去 HomePage 找回</p>
        </div>
      </div>

      <!-- 退出登录确认弹窗 -->
      <div v-if="showLogoutModal" class="pd-modal-mask" @click.self="showLogoutModal = false">
        <div class="pd-modal-panel pd-modal-sm">
          <header class="pd-modal-head">
            <h3>· 确认离开星穹 ·</h3>
            <button type="button" class="pd-modal-close" aria-label="关闭" @click="showLogoutModal = false">×</button>
          </header>
          <main class="pd-modal-body">
            <p class="pd-modal-hint">退出后需重新登录才能查看你的故事与星座。<br />未保存的草稿将随星风消散。</p>
          </main>
          <footer class="pd-modal-foot">
            <button type="button" class="pd-back-btn" @click="showLogoutModal = false">留在星空</button>
            <button type="button" class="pd-btn-danger" @click="handleLogout" :disabled="logoutLoading">
              {{ logoutLoading ? '正在离开...' : '确认退出' }}
            </button>
          </footer>
        </div>
      </div>

      <!-- 故事详情弹窗 -->
      <div v-if="activeStory" class="pd-modal-mask" @click.self="activeStory = null">
        <div class="pd-modal-panel pd-story-panel">
          <header class="pd-modal-head">
            <div class="pd-story-head-title">
              <h3>{{ activeStory.title || '未命名故事' }}</h3>
              <span v-if="activeStory.tag" class="pd-t-tag" :class="'tag-' + activeStory.tag">{{ activeStory.tag }}</span>
            </div>
            <button type="button" class="pd-modal-close" aria-label="关闭" @click="activeStory = null">×</button>
          </header>
          <main class="pd-modal-body">
            <div class="pd-story-meta-row">
              <template v-if="getStoryStarIds(activeStory).length">
                <button
                  v-for="cid in getStoryStarIds(activeStory)"
                  :key="cid"
                  class="pd-story-meta-star"
                  @click="goToStar(cid)"
                >
                  ✦ {{ getStarName(cid) }}
                </button>
              </template>
              <span class="pd-story-meta-date">{{ formatDate(activeStory.createdAt) }}</span>
              <span class="pd-story-meta-res">♡ {{ activeStory.resonanceCount || 0 }}</span>
              <span v-if="activeStory.location" class="pd-story-meta-loc">◎ {{ activeStory.location }}</span>
            </div>
            <div class="pd-modal-divider"></div>
            <div class="pd-story-content">
              <img v-if="activeStory.imageUrl" :src="activeStory.imageUrl" class="pd-story-image" alt="故事图片" />
              {{ activeStory.content }}
            </div>
          </main>
          <footer class="pd-modal-foot">
            <button type="button" class="pd-back-btn" @click="resonateStory">共鸣 +1</button>
            <button type="button" class="pd-btn-danger" @click="activeStoryId = activeStory?.id ?? null; showDeleteConfirm = true">删除此故事</button>
          </footer>
        </div>
      </div>

      <!-- 删除确认弹窗 -->
      <div v-if="showDeleteConfirm" class="pd-modal-mask" @click.self="showDeleteConfirm = false">
        <div class="pd-modal-panel" style="width: 400px;">
          <header class="pd-modal-head">
            <h3>· 摘取故事 · REMOVE ·</h3>
            <button type="button" class="pd-modal-close" aria-label="关闭" @click="showDeleteConfirm = false">×</button>
          </header>
          <main class="pd-modal-body">
            <p class="pd-delete-text">要把「{{ activeStory?.title || '这则故事' }}」送回星穹吗？此操作不可撤销。</p>
          </main>
          <footer class="pd-modal-foot">
            <button type="button" class="pd-back-btn" @click="showDeleteConfirm = false" :disabled="deletingStory">取消</button>
            <button type="button" class="pd-btn-danger" @click="confirmDelete" :disabled="deletingStory">
              {{ deletingStory ? '删除中...' : '确认摘取' }}
            </button>
          </footer>
        </div>
      </div>

      <!-- Gold flash banner -->
      <Transition name="pd-flash">
        <div v-if="flash" class="pd-flash-banner" :class="flash.tone" role="status" aria-live="polite">
          <span>{{ flash.text }}</span>
        </div>
      </Transition>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Star } from 'lucide-vue-next'
import { useParticleSky } from '../composables/useParticleSky'
import { useAuth, authFetch } from '../stores/auth'
import catalogData from '../data/stars.json'
import { constellationNames } from '../data/starInfo'

const PAGE_SIZE = 20
const VISIBLE_STEP = 5

const router = useRouter()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const { logout } = useAuth()
// 解构出 pause/resume：卡片 hover 时暂停 canvas，把主线程完整让给 CSS transition 跑 0.5s
const { pause: pauseSky, resume: resumeSky } = useParticleSky(canvasRef)
// hover 计数器（防止鼠标在多张卡片间快速移动时 canvas 被反复 pause/resume）
let hoverCount = 0
function onCardEnter() { if (hoverCount++ === 0) pauseSky() }
function onCardLeave() { if (--hoverCount <= 0) { hoverCount = 0; resumeSky() } }

interface FavoriteItem {
  id: number
  starCatalogId?: number
  starName?: string
  starConstellation?: string
  title?: string
  content?: string
  resonanceCount?: number
  createdAt?: string
}
const loaded = ref(false)
const user = ref<{ id: number; username: string; email: string; signature: string; createdAt: string } | null>(null)
const stories = ref<any[]>([])
const favorites = ref<FavoriteItem[]>([])
const stats = ref({ storyCount: 0, totalResonance: 0, resonanceGivenCount: 0, favoriteCount: 0 })
const activeStory = ref<any>(null)

const editingSig = ref(false)
const sigDraft = ref('')
const sigInputRef = ref<HTMLInputElement | null>(null)

// ─── 修改密码 ───
const showPwdModal = ref(false)
const pwdLoading = ref(false)
const pwdError = ref('')
const oldPwd = ref('')
const newPwd = ref('')
const confirmPwd = ref('')

// ─── 退出登录 ───
const showLogoutModal = ref(false)
const logoutLoading = ref(false)
// 移动端设置弹窗
const showSettingsModal = ref(false)

async function handleLogout() {
  logoutLoading.value = true
  try {
    await logout()
  } finally {
    logoutLoading.value = false
    showLogoutModal.value = false
    router.push('/')
  }
}

// 忘了旧密码 → 退出后回首页走找回流程
async function goForgotPassword() {
  clearAndClosePwdModal()
  await logout()
  router.push('/')
}

async function updatePassword() {
  pwdError.value = ''
  if (!oldPwd.value || !newPwd.value || !confirmPwd.value) {
    pwdError.value = '请填写所有字段'
    return
  }
  if (newPwd.value !== confirmPwd.value) {
    pwdError.value = '两次输入的新密码不一致'
    return
  }
  if (newPwd.value.length < 6) { pwdError.value = '新密码至少 6 个字符'; return }
  if (newPwd.value.length > 50) { pwdError.value = '新密码不能超过 50 个字符'; return }
  const token = getToken()
  if (!token) return
  pwdLoading.value = true
  try {
    const res = await fetch('/api/auth/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ oldPassword: oldPwd.value, newPassword: newPwd.value }),
    })
    const json = await res.json()
    if (res.ok) {
      showFlash('✦ 密码已更换 · 星穹之锁已重铸 ✦', 'success')
      newPwd.value = ''
      confirmPwd.value = ''
      oldPwd.value = ''
      showPwdModal.value = false
    } else {
      pwdError.value = json.message || '修改失败'
    }
  } catch {
    pwdError.value = '网络错误，请重试'
  } finally {
    pwdLoading.value = false
  }
}

function clearAndClosePwdModal() {
  showPwdModal.value = false
  oldPwd.value = ''
  newPwd.value = ''
  confirmPwd.value = ''
  pwdError.value = ''
}

const currentPage = ref(0)
const hasMore = ref(true)
const loadingMore = ref(false)

// ─── Task3 预留引用 ───
const visibleCount = ref(VISIBLE_STEP)
function expandStories() {
  const oldCount = visibleCount.value
  visibleCount.value = Math.min(oldCount + VISIBLE_STEP, stories.value.length)
  nextTick(() => {
    const selector = `.pd-t-item:nth-child(${oldCount + 1})`
    const el = document.querySelector(selector) as HTMLElement | null
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}
async function loadAndExpandNext5() {
  await loadNextPage()
  visibleCount.value = Math.min(visibleCount.value + VISIBLE_STEP, stories.value.length)
}

// ─── Constellation scroll helper (Task4) ───
function scrollToStory(i: number) {
  if (i < 0 || i >= stories.value.length) return
  // 点击节点时：若目标故事当前不在 visibleCount 范围内，先扩展到包含它
  if (visibleCount.value <= i) {
    visibleCount.value = Math.min(Math.ceil((i + 1) / VISIBLE_STEP) * VISIBLE_STEP, stories.value.length)
  }
  nextTick(() => {
    const el = document.querySelector(`.pd-t-item:nth-child(${i + 1})`) as HTMLElement | null
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // gold flash focus
      el.classList.add('pd-story-flash')
      setTimeout(() => el.classList.remove('pd-story-flash'), 1400)
    }
  })
}

// ─── Favorites helpers (Task5) ───
async function goToStarWithCheck(starCatalogId: number | undefined, favId: number) {
  if (!starCatalogId) {
    console.warn('[Profile] 收藏记录缺少 catalog_star_id:', favId)
    return
  }
  router.push({ path: '/sky', query: { star: String(starCatalogId) } })
}

// ─── Gold Flash feedback (Task6) ───
const flash = ref<{ text: string; tone: 'success' | 'error' | 'info' } | null>(null)
let flashTimer: ReturnType<typeof setTimeout> | null = null
function showFlash(text: string, tone: 'success' | 'error' | 'info' = 'success') {
  flash.value = { text, tone }
  if (flashTimer) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => {
    flash.value = null
    flashTimer = null
  }, 2600)
}

async function resonateStory() {
  const id = activeStory.value?.id
  if (id == null) return
  try {
    const res = await fetch(`/api/stars/${id}/resonate`, { method: 'POST' })
    if (res.ok) {
      activeStory.value = { ...activeStory.value!, resonanceCount: (activeStory.value!.resonanceCount || 0) + 1 }
      const idx = stories.value.findIndex(s => s.id === id)
      if (idx >= 0) stories.value[idx].resonanceCount = (stories.value[idx].resonanceCount || 0) + 1
      showFlash('✦ 共鸣已传向那颗星 ✦', 'success')
    }
  } catch { showFlash('共鸣失败', 'error') }
}

const sigText = computed(() => user.value?.signature || '')
const daysAgo = computed(() => {
  if (!user.value) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(user.value.createdAt).getTime()) / 86400000))
})

function formatDate(d: string) { if (!d) return ''; return d.slice(0, 16).replace('T', ' ') }

interface CatalogStarLite { name: string; con: string; mag: number; color: string }
const starLookup = new Map<number, CatalogStarLite>()
for (const s of catalogData.stars) starLookup.set(s.id, { name: s.name || `${s.con || ''} #${s.id}`, con: s.con || '', mag: s.mag, color: s.color || '#fff' })
function getStarName(id: number) { return starLookup.get(id)?.name || `星星 #${id}` }
function getStarCon(id: number) { const c = starLookup.get(id)?.con; return c ? (constellationNames[c] || c) : '' }
function getStarMag(id: number) { return starLookup.get(id)?.mag ?? null }
function getStarColor(id: number) { return starLookup.get(id)?.color || '#ffffff' }

function goToStar(starId: number) { router.push({ path: '/sky', query: { star: String(starId) } }) }

async function unfavorite(favoriteId: number) {
  const token = getToken()
  if (!token) return
  const f = favorites.value.find(x => x.id === favoriteId)
  const starId = f?.starCatalogId
  try {
    if (starId != null) {
      const res = await fetch(`/api/catalog/stars/${starId}/favorite`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
    }
    favorites.value = favorites.value.filter(x => x.id !== favoriteId)
    stats.value.favoriteCount = favorites.value.length
  } catch {}
}

// ─── TimeLine Helpers ───
function getStoryPrimaryStar(s: any): { id: number; name: string; con: string; extraCount: number } | null {
  const ids = getStoryStarIds(s)
  if (!ids.length) return null
  const first = ids[0]
  return { id: first, name: getStarName(first), con: getStarCon(first), extraCount: Math.max(0, ids.length - 1) }
}
function formatMD(d: string) {
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return d.slice(5,10).replace('-',' / ')
  return `${String(dt.getMonth()+1).padStart(2,'0')} / ${String(dt.getDate()).padStart(2,'0')}`
}
// 移动端专用：拆分为月/日两行，月份在上，日期在下
function formatMDParts(d: string): { month: string; day: string } {
  if (!d) return { month: '', day: '' }
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) {
    const [m, dd] = d.slice(5, 10).split('-')
    return { month: m || '', day: dd || '' }
  }
  return {
    month: String(dt.getMonth() + 1).padStart(2, '0'),
    day: String(dt.getDate()).padStart(2, '0'),
  }
}
function storyAriaLabel(s: any, i: number) {
  const when = formatDate(s.createdAt)
  const starName = getStoryPrimaryStar(s)?.name ?? '无名星'
  const title = s.title || '未命名故事'
  return `第 ${i+1} 则故事：${title}，于 ${when} 挂在 ${starName}，共鸣 ${s.resonanceCount || 0}`
}

// ─── Constellation helpers (方案 C：时间主链 + 共星支线) ───
// 节点坐标：沿椭圆分布（0.35 rad 偏移避免"第一名"正对右方）
function constellationNodes() {
  const items = stories.value.slice(0, 12)
  const n = items.length
  const rx = 180, ry = 130, cx = 250, cy = 180
  return items.map((_, i) => ({
    index: i,
    x: cx + rx * Math.cos((i / n) * Math.PI * 2 + 0.35),
    y: cy + ry * Math.sin((i / n) * Math.PI * 2 + 0.35),
  }))
}
// 节点元信息：返回每颗星"挂在哪颗 catalogStarId 上 + 是否多次驻足(共星)"
// 用于 SVG 模板画"紫色描边高亮驻足星 + 下方写星名"
function constellationNodeMeta() {
  const items = stories.value.slice(0, 12)
  // 统计每颗 catalogStarId 出现次数
  const counter = new Map<number, number>()
  items.forEach(s => {
    const ids = getStoryStarIds(s)
    if (ids[0] != null) counter.set(ids[0], (counter.get(ids[0]) || 0) + 1)
  })
  return items.map((s, i) => {
    const ids = getStoryStarIds(s)
    const cid = ids[0]
    const isCore = cid != null && (counter.get(cid) || 0) >= 2
    return {
      index: i,
      catalogStarId: cid,
      starName: cid != null ? getStarName(cid) : '',
      starConstellation: cid != null ? getStarCon(cid) : '',
      isCore,   // 同一颗星挂了 ≥2 则为"驻足星"，画紫色高亮 + 星名
    }
  })
}
// 方案 C：两层线（开放形状 — 参考真实星座的开放构图）
//   — 经（时间主链）：0 → 1 → 2 → … → N-1，依时间顺序走，**首尾不闭合**
//   — 纬（共星支线）：每对挂在同一颗 catalogStarId 上的故事之间画一条脉冲紫色虚线
type Line = { x1:number; y1:number; x2:number; y2:number; kind:'time'|'echo' }
function constellationLines(): Line[] {
  const limitedStories = stories.value.slice(0, 12)
  const n = limitedStories.length
  if (n < 2) return []
  const nodes = constellationNodes()
  const out: Line[] = []
  // 1) 时间主链：i → i+1（开放链：最后一颗不再回第一颗）
  for (let i = 0; i < n - 1; i++) {
    const a = nodes[i], b = nodes[i+1]
    out.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, kind: 'time' })
  }
  // 2) 共星支线：按 starId 分组，组内每对 story 画一条 echo 线
  const byStar = new Map<number, number[]>()
  limitedStories.forEach((s, i) => {
    const ids = getStoryStarIds(s)
    if (ids[0] == null) return
    if (!byStar.has(ids[0])) byStar.set(ids[0], [])
    byStar.get(ids[0])!.push(i)
  })
  for (const group of byStar.values()) {
    if (group.length < 2) continue
    // 每对画一条；但当一组 >= 3 时，只画"相邻出现对 + 首尾对"（避免蛛网太乱）
    if (group.length >= 3) {
      for (let k = 0; k < group.length; k++) {
        const a = nodes[group[k]], b = nodes[group[(k + 1) % group.length]]
        out.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, kind: 'echo' })
      }
    } else {
      const a = nodes[group[0]], b = nodes[group[1]]
      out.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, kind: 'echo' })
    }
  }
  return out
}

// ─── Favorites gal-img icon helper ───
const galaxyIcons = ['♁','☾','✧','❋','✦','★','☆','◈','◊','☉']
function galaxyIcon(name?: string) {
  if (!name) return '✧'
  // 按名字 hash 一个稳定的图标
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return galaxyIcons[h % galaxyIcons.length]
}

function getToken() { return localStorage.getItem('token') }

async function loadNextPage() {
  if (!hasMore.value || loadingMore.value) return
  const token = getToken()
  if (!token) return
  loadingMore.value = true
  try {
    const nextPage = currentPage.value + 1
    const res = await fetch(`/api/profile/stories?page=${nextPage}&limit=${PAGE_SIZE}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    if (res.ok && json.data) {
      const items = json.data.items ?? json.data ?? []
      stories.value = [...stories.value, ...items]
      currentPage.value = json.data.page ?? nextPage
      hasMore.value = (json.data.page ?? nextPage) < (json.data.totalPages ?? 1)
      // 统计数据由 /api/profile/stats 提供，这里不再客户端累加
    }
  } catch (e) { console.error('加载故事页失败:', e) }
  finally { loadingMore.value = false }
}

async function startEditSig() {
  sigDraft.value = user.value?.signature || ''
  editingSig.value = true
  await nextTick()
  sigInputRef.value?.focus()
}

async function saveSig() {
  const v = sigDraft.value.trim()
  if (!v || v === user.value?.signature) return
  const token = getToken()
  if (!token) return
  try {
    const r = await fetch('/api/auth/signature', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ signature: v }),
    })
    const j = await r.json()
    if (r.ok && user.value) {
      user.value.signature = j.data.signature
      showFlash('✦ 签名已更新 · 织进了月面 ✦', 'success')
      editingSig.value = false
      sigDraft.value = sigText.value
    } else {
      showFlash(j.message || '签名更新失败', 'error')
    }
  } catch (e) {
    showFlash('签名更新失败 · 网络异常', 'error')
  }
}

function openStory(s: any) { activeStory.value = s }
function goBack() { router.push('/sky') }

// 获取故事关联的星名列表
function getStoryStarIds(story: any): number[] {
  if (story.catalogStarIds?.length) return story.catalogStarIds
  if (story.catalogStarId) return [story.catalogStarId]
  return []
}
function getStoryStarNames(story: any): string[] {
  return getStoryStarIds(story).map(id => getStarName(id))
}

// ─── 删除故事 ───
const showDeleteConfirm = ref(false)
const activeStoryId = ref<number | null>(null)
const deletingStory = ref(false)

async function confirmDelete() {
  if (activeStoryId.value == null) return
  const token = getToken()
  if (!token) return
  deletingStory.value = true
  try {
    const res = await fetch(`/api/stories/${activeStoryId.value}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      stories.value = stories.value.filter(x => x.id !== activeStoryId.value)
      const removedCount = activeStory.value?.resonanceCount || 0
      stats.value.storyCount = Math.max(0, stats.value.storyCount - 1)
      stats.value.totalResonance = Math.max(0, stats.value.totalResonance - removedCount)
      activeStory.value = null
      showDeleteConfirm.value = false
      showFlash('✦ 故事已摘取，回到了星海 ✦', 'info')
    } else {
      const json = await res.json()
      showFlash(json.message || '删除失败', 'error')
    }
  } catch {
    showFlash('网络错误，请重试', 'error')
  } finally {
    deletingStory.value = false
  }
}

// 每次进入页面时重新加载所有数据
async function loadProfileData() {
  // 重置所有状态，确保数据是全新的
  loaded.value = false
  user.value = null
  stories.value = []
  favorites.value = []
  stats.value = { storyCount: 0, totalResonance: 0, resonanceGivenCount: 0, favoriteCount: 0 }
  currentPage.value = 0
  hasMore.value = true
  loadingMore.value = false
  activeStory.value = null
  visibleCount.value = VISIBLE_STEP

  const token = getToken()
  if (!token) { router.push('/'); return }
  try {
    const [meRes, firstPageRes, favRes, linesRes, statsRes] = await Promise.all([
      authFetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
      authFetch(`/api/profile/stories?page=1&limit=${PAGE_SIZE}`, { headers: { Authorization: `Bearer ${token}` } }),
      authFetch('/api/profile/favorites', { headers: { Authorization: `Bearer ${token}` } }),
      authFetch('/api/profile/kernel-lines', { headers: { Authorization: `Bearer ${token}` } }),
      authFetch('/api/profile/stats', { headers: { Authorization: `Bearer ${token}` } }),
    ])
    const meJson = await meRes.json()
    if (meRes.ok) user.value = meJson.data
    const firstJson = await firstPageRes.json()
    if (firstPageRes.ok && firstJson.data) {
      const items = firstJson.data.items ?? firstJson.data ?? []
      stories.value = items
      currentPage.value = firstJson.data.page ?? 1
      hasMore.value = (firstJson.data.page ?? 1) < (firstJson.data.totalPages ?? 1)
    }
    // kernel-lines 预预留（将来如需要服务端连线）
    try { await linesRes.json() } catch { /* 静默 */ }
    const favJson = await favRes.json()
    if (favRes.ok && Array.isArray(favJson.data)) {
      // 后端返回的是 catalog_star_id: number[]，需要用 starLookup 填充星名/星座等字段
      favorites.value = (favJson.data as number[]).map((cid) => {
        const star = starLookup.get(cid)
        return {
          id: cid,
          starCatalogId: cid,
          starName: star?.name || `星星 #${cid}`,
          starConstellation: star ? (constellationNames[star.con] || star.con) : '',
          resonanceCount: 0,
          createdAt: '',
        } as FavoriteItem
      })
    }
    // 使用后端聚合统计（准确计数，不受分页影响）
    const statsJson = await statsRes.json()
    if (statsRes.ok && statsJson.data) {
      stats.value.storyCount = statsJson.data.storyCount ?? 0
      stats.value.totalResonance = statsJson.data.totalResonance ?? 0
      stats.value.resonanceGivenCount = statsJson.data.resonanceGivenCount ?? 0
      stats.value.favoriteCount = statsJson.data.favoriteCount ?? favorites.value.length ?? 0
    } else {
      stats.value.favoriteCount = favorites.value.length
    }
  } catch (e) { console.error('加载失败', e) }
  loaded.value = true
}

onMounted(() => {
  loadProfileData()
})

onBeforeUnmount(() => {
  if (flashTimer) clearTimeout(flashTimer)
})
</script>

<style scoped>
/* ════════════════════════════════════════════════════════════════
   Style D · 叙事沉浸式 — 严格对齐 designs/prototypes/style-d.html
   保留 canvas 背景（用户要求不删除）
   ════════════════════════════════════════════════════════════════ */

.profile-page {
  /* —— 严格复刻 style-d.html 的设计 token —— */
  --pd-gold: #ffd98a;
  --pd-gold-soft: rgba(255, 217, 138, 0.45);
  --pd-gold-line: rgba(255, 217, 138, 0.18);
  --pd-text-pri: #e8e4ff;
  --pd-text-sec: #a9a3c7;
  --pd-text-dim: rgba(255, 217, 138, 0.5);
  --pd-border: rgba(255, 217, 138, 0.18);
  --pd-border-hot: rgba(255, 217, 138, 0.5);
  --pd-bg-card: rgba(16, 18, 40, 0.6);
  --pd-bg-card-hot: rgba(26, 28, 54, 0.8);
  --pd-bg-0: #05060f;
  --pd-font-deco: "Cinzel", "Noto Serif SC", "Songti SC", "Microsoft YaHei", serif;
  --pd-font-serif: "Noto Serif SC", "Songti SC", "Cinzel", "Microsoft YaHei", serif;
  --pd-font-cormorant: "Cormorant Garamond", "Cinzel", "Noto Serif SC", serif;
  /* —— 动画：完全与 style-d 一致的曲线与时长（集中在一处方便迭代）
     cubic-bezier(.2,.9,.3,1) → 起点快 / 中间慢 / 终点快 → 平滑有弹性 */
  --pd-hover-ease: cubic-bezier(.2,.9,.3,1);
  --pd-hover-dur: 0.5s;
}

.profile-page {
  width: 100%;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  font-family: var(--pd-font-serif);
  font-weight: 300;
  color: var(--pd-text-pri);
  background: var(--pd-bg-0);
}

/* 保留 canvas 背景 */
.sky-bg.pd-sky-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  pointer-events: none;
  opacity: 0.6;
}

/* 顶层视差星层（CSS 层叠，叠加在 canvas 之上但不抢戏） */
.profile-page::before,
.profile-page::after {
  content: "";
  position: fixed;
  top: -20%;
  left: -20%;
  right: -20%;
  bottom: -20%;
  width: 140%;
  height: 140%;
  z-index: 0;
  pointer-events: none;
  opacity: 0.5;
}

.profile-page::before {
  background-image:
    radial-gradient(0.6px 0.6px at 12% 18%, rgba(255,255,255,0.7), transparent 60%),
    radial-gradient(0.6px 0.6px at 35% 55%, rgba(255,255,255,0.55), transparent 60%),
    radial-gradient(0.6px 0.6px at 65% 28%, rgba(255,255,255,0.6), transparent 60%),
    radial-gradient(0.6px 0.6px at 82% 70%, rgba(255,255,255,0.5), transparent 60%),
    radial-gradient(0.6px 0.6px at 22% 85%, rgba(255,255,255,0.5), transparent 60%),
    radial-gradient(0.6px 0.6px at 48% 10%, rgba(255,255,255,0.45), transparent 60%),
    radial-gradient(0.6px 0.6px at 92% 42%, rgba(255,255,255,0.45), transparent 60%),
    radial-gradient(0.6px 0.6px at 8% 42%, rgba(255,255,255,0.4), transparent 60%);
  animation: pd-parallax-slow 120s linear infinite;
}

.profile-page::after {
  background-image:
    radial-gradient(1px 1px at 18% 30%, rgba(255,217,138,0.55), transparent 60%),
    radial-gradient(1px 1px at 72% 50%, rgba(255,255,255,0.55), transparent 60%),
    radial-gradient(1px 1px at 40% 75%, rgba(202,167,255,0.5), transparent 60%),
    radial-gradient(1px 1px at 88% 18%, rgba(255,255,255,0.45), transparent 60%),
    radial-gradient(1px 1px at 10% 68%, rgba(255,255,255,0.4), transparent 60%);
  animation: pd-parallax-medium 80s linear infinite;
}

@keyframes pd-parallax-slow { from{transform:translateY(0);} to{transform:translateY(-300px);} }
@keyframes pd-parallax-medium { from{transform:translateY(0);} to{transform:translateY(-500px);} }

@keyframes pd-node-glow {
  0%,100% { transform: scale(0.9); opacity:0.7; }
  50% { transform: scale(1.2); opacity:1; }
}

@keyframes pd-edge-glow {
  0%,100% { stroke: rgba(255,217,138,0.25); }
  50% { stroke: rgba(255,217,138,0.55); }
}

@keyframes pd-scroll-line {
  0%,100% { opacity:0.3; transform: scaleY(0.6); transform-origin: top; }
  50% { opacity:1; transform: scaleY(1); }
}

@keyframes pd-fade-up {
  0% { transform: translateY(24px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}

@keyframes pd-moon-glow {
  0%, 100% {
    box-shadow:
      inset -30px -20px 80px rgba(0,0,0,0.35),
      0 0 120px rgba(255,240,200,0.35),
      0 0 240px rgba(255,220,160,0.2);
  }
  50% {
    box-shadow:
      inset -30px -20px 80px rgba(0,0,0,0.35),
      0 0 160px rgba(255,240,200,0.45),
      0 0 300px rgba(255,220,160,0.28);
  }
}

@keyframes pd-story-flash-kf {
  0% { outline: 2px solid transparent; box-shadow: none; }
  15% { outline: 2px solid var(--pd-gold); box-shadow: 0 0 20px -4px var(--pd-gold-soft), 0 0 40px -8px var(--pd-gold-soft); }
  100% { outline: 2px solid transparent; box-shadow: none; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
  }
  /* —— 关键：严格与 style-d 保持一致 ——
     style-d 原型里没有 reduced-motion 过渡禁用，所以 ProfilePage 里
     .pd-t-card / .pd-gal-card 保持原生 transition 不被覆盖。
     此前 * + transition: none !important 导致任何 reduced-motion 系统(如 Windows "显示动画"关闭)
     下卡片 hover 完全无过渡，这就是用户反馈"像没过渡直接跳"的真实根因。 */
  .pd-t-card,
  .pd-t-card *,
  .pd-t-card *::before,
  .pd-t-card *::after,
  .pd-gal-card,
  .pd-gal-card *,
  .pd-gal-card *::before,
  .pd-gal-card *::after {
    transition: all var(--pd-hover-dur) var(--pd-hover-ease) !important;
  }
}

.profile-page > * {
  z-index: 1;
  position: relative;
}

.loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  font-size: 1.2rem;
  color: var(--pd-text-sec);
}

/* ═══ (a) Topbar ═══ */
.pd-topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 48px;
  background: linear-gradient(180deg, rgba(5,6,15,0.7) 0%, transparent 100%);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.pd-back-btn {
  font-family: var(--pd-font-serif);
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,217,138,0.2);
  color: #b9b4d6;
  padding: 10px 20px;
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.3s;
}

.pd-back-btn:hover {
  border-color: rgba(255,217,138,0.5);
  color: var(--pd-gold);
  background: rgba(255,217,138,0.05);
}

.pd-brand {
  font-family: var(--pd-font-deco);
  font-size: 0.85rem;
  letter-spacing: 0.3em;
  color: rgba(255,217,138,0.6);
}

.pd-actions {
  display: flex;
  gap: 10px;
}

/* 顶部罗马数字按钮 — 史诗编号风格 */
.pd-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--pd-font-serif);
  white-space: nowrap;
}
.pd-roman {
  font-family: var(--pd-font-deco);
  color: var(--pd-gold);
  font-size: 0.95rem;
  letter-spacing: 0.05em;
  opacity: 0.9;
}
.pd-action-sep {
  color: rgba(255,217,138,0.4);
  font-size: 0.75rem;
  margin: 0 1px;
}
.pd-action-label {
  font-size: 0.82rem;
  letter-spacing: 0.1em;
}
/* 退出按钮微弱警示色调 */
.pd-logout-trigger:hover {
  border-color: rgba(255,107,138,0.5);
  color: #ff8b9e;
  background: rgba(255,107,138,0.05);
}
.pd-logout-trigger:hover .pd-roman {
  color: #ff8b9e;
}
.pd-logout-trigger:hover .pd-action-sep {
  color: rgba(255,107,138,0.4);
}

/* 移动端设置按钮 — 默认隐藏，768px 以下显示 */
.pd-settings-trigger { display: none; }

/* 移动端设置弹窗列表项 */
.pd-settings-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 4px;
}
.pd-settings-item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,217,138,0.2);
  color: #b9b4d6;
  padding: 14px 18px;
  font-family: var(--pd-font-serif);
  font-size: 0.88rem;
  letter-spacing: 0.08em;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.3s;
}
.pd-settings-item:hover {
  border-color: rgba(255,217,138,0.5);
  color: var(--pd-gold);
  background: rgba(255,217,138,0.05);
}
.pd-settings-item-label { flex: 1; text-align: left; }
.pd-settings-leave {
  border-color: rgba(255,107,138,0.25);
  color: #d6a0ad;
}
.pd-settings-leave:hover {
  border-color: rgba(255,107,138,0.5);
  color: #ff8b9e;
  background: rgba(255,107,138,0.05);
}
.pd-settings-leave:hover .pd-roman { color: #ff8b9e; }

/* ═══ (b) Hero 100vh ═══ */
.pd-hero {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  overflow: hidden;
}

.pd-moon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 480px;
  height: 480px;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 35%,
    rgba(255,255,255,0.95) 0%,
    rgba(230,224,210,0.85) 20%,
    rgba(200,195,180,0.7) 40%,
    rgba(160,155,145,0.55) 65%,
    rgba(120,115,110,0.35) 85%,
    transparent 100%);
  box-shadow:
    inset -30px -20px 80px rgba(0,0,0,0.35),
    0 0 120px rgba(255,240,200,0.35),
    0 0 240px rgba(255,220,160,0.2);
  opacity: 0.95;
  animation: pd-moon-glow 6s ease-in-out infinite;
}

/* 月坑（用 ::before/::after + 一个 div 模拟 style-d.html 的双月坑） */
.pd-moon-disk { display: none; }
.pd-moon::before, .pd-moon::after {
  content: "";
  position: absolute;
  border-radius: 50%;
  background: rgba(150,140,130,0.25);
}
.pd-moon::before { width: 70px; height: 60px; top: 25%; left: 30%; filter: blur(6px); }
.pd-moon::after { width: 50px; height: 45px; top: 55%; left: 55%; filter: blur(5px); }

/* 保留 moon-mare 类（虽然 disk 隐藏了，避免引用未定义类警告） */
.moon-mare { display: none; }
.moon-mare-a, .moon-mare-b, .moon-mare-c { display: none; }

.pd-hero-text {
  position: relative;
  z-index: 3;
  text-align: center;
  padding: 0 24px;
  max-width: 900px;
}

.pd-hero-role {
  font-family: var(--pd-font-deco);
  font-size: 0.75rem;
  letter-spacing: 0.5em;
  color: rgba(255,217,138,0.7);
  margin-bottom: 20px;
}

.pd-hero-name {
  font-family: var(--pd-font-deco);
  font-size: 4.2rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: #fff;
  text-shadow: 0 0 40px rgba(5,6,15,0.9), 0 0 80px rgba(0,0,0,0.7);
  margin: 0 0 20px 0;
}

.pd-hero-band {
  display: inline-block;
  padding: 12px 36px;
  border-top: 1px solid rgba(255,217,138,0.5);
  border-bottom: 1px solid rgba(255,217,138,0.5);
  font-style: italic;
  font-size: 0.92rem;
  color: rgba(255,244,220,0.85);
  letter-spacing: 0.15em;
  text-shadow: 0 0 20px rgba(0,0,0,0.8);
}

.pd-hero-joined {
  margin-top: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: rgba(255,217,138,0.6);
  font-size: 0.78rem;
  letter-spacing: 0.12em;
}

/* Hero 邮箱行 — 复用 joined 风格，字号略小 */
.pd-hero-email {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: rgba(255,217,138,0.45);
  font-family: var(--pd-font-deco);
  font-size: 0.72rem;
  letter-spacing: 0.15em;
}

.pd-gold-sep {
  color: var(--pd-gold);
  opacity: 0.75;
}

.pd-scroll-hint {
  position: absolute;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.7rem;
  letter-spacing: 0.3em;
  color: rgba(255,217,138,0.5);
  text-transform: uppercase;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.pd-scroll-line {
  display: block;
  width: 1px;
  height: 40px;
  background: linear-gradient(180deg, rgba(255,217,138,0.5) 0%, transparent 100%);
  animation: pd-scroll-line 2.4s ease-in-out infinite;
}

/* ═══ (c) Timeline Section ═══ */
.pd-timeline-section {
  position: relative;
  z-index: 2;
  max-width: 1120px;
  margin: 0 auto;
  padding: 80px 48px 120px;
}

.pd-section-head {
  text-align: center;
  margin-bottom: 100px;
  position: relative;
}

.pd-section-head h2 {
  font-family: var(--pd-font-deco);
  font-size: 1.8rem;
  font-weight: 500;
  letter-spacing: 0.2em;
  color: var(--pd-gold);
  margin: 0 0 14px 0;
}

.pd-section-head h2::before, .pd-section-head h2::after {
  content: "—— ";
  color: rgba(255,217,138,0.3);
  font-weight: 300;
}
.pd-section-head h2::after { content: " ——"; }

.pd-section-head p {
  font-style: italic;
  color: rgba(255,217,138,0.5);
  letter-spacing: 0.1em;
  font-size: 0.85rem;
  margin: 0;
}

/* Stats — 严格对齐 style-a.html 的 .stats/.stat-num/.stat-label */
.pd-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  text-align: center;
  max-width: 720px;
  margin: 0 auto 72px;
}

.pd-stat .stat-num {
  font-family: var(--pd-font-cormorant);
  font-size: 3.2rem;
  font-weight: 300;
  color: var(--pd-gold);
  line-height: 1;
  margin-bottom: 12px;
  text-shadow: 0 0 24px rgba(255, 217, 138, 0.25);
}

.pd-stat .stat-label {
  font-size: 0.72rem;
  letter-spacing: 0.2em;
  color: #6e6893;
  text-transform: uppercase;
}

/* Timeline */
.pd-timeline {
  position: relative;
}

.pd-timeline::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  background: linear-gradient(180deg,
    transparent 0%,
    rgba(255,217,138,0.15) 8%,
    rgba(255,217,138,0.55) 50%,
    rgba(255,217,138,0.15) 92%,
    transparent 100%);
  transform: translateX(-0.5px);
}

.pd-t-items {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.pd-t-item {
  position: relative;
  margin-bottom: 90px;
  display: flex;
  align-items: flex-start;
  animation: pd-fade-up 0.6s ease-out both;
}

.pd-t-item:last-child { margin-bottom: 0; }

.pd-t-item.left { justify-content: flex-start; }
.pd-t-item.right { justify-content: flex-end; }

/* Timeline node */
.pd-t-node {
  position: absolute;
  top: 26px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  /* 月-星-日 沿同一垂直中心线对齐 */
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.pd-t-date-month,
.pd-t-date-day {
  font-family: var(--pd-font-deco);
  font-size: 0.7rem;
  letter-spacing: 0.15em;
  color: rgba(255,217,138,0.7);
  line-height: 1;
}

.pd-t-star {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.pd-t-star::before {
  content: "";
  position: absolute;
  inset: -12px;
  background: radial-gradient(circle, rgba(255,217,138,0.4), transparent 70%);
  animation: pd-node-glow 3.5s ease-in-out infinite;
}

.pd-t-star::after {
  content: "✦";
  color: var(--pd-gold);
  font-size: 1.4rem;
  text-shadow: 0 0 20px rgba(255,217,138,0.8), 0 0 40px rgba(255,217,138,0.5);
  position: relative;
  z-index: 2;
}

/* Timeline card — 严格 1:1 复刻 style-d.html .t-card */
.pd-t-card {
  width: 44%;
  position: relative;
  padding: 32px 32px 28px;
  background: rgba(16,18,40,0.6);
  border: 1px solid rgba(255,217,138,0.18);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  cursor: pointer;
  transition: all var(--pd-hover-dur) var(--pd-hover-ease);
}

.pd-t-item.left .pd-t-card {
  margin-right: auto;
  border-radius: 2px 18px 18px 18px;
}

.pd-t-item.right .pd-t-card {
  margin-left: auto;
  border-radius: 18px 2px 18px 18px;
}

.pd-t-card:hover {
  border-color: rgba(255,217,138,0.5);
  background: rgba(26,28,54,0.8);
  transform: translateY(-6px);
  box-shadow:
    0 20px 60px rgba(0,0,0,0.4),
    0 0 40px rgba(255,217,138,0.1);
}

/* Card head */
.pd-t-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.pd-t-title {
  font-family: "Noto Serif SC", serif;
  font-size: 1.12rem;
  font-weight: 500;
  color: #f6f1ff;
  line-height: 1.6;
}

.pd-t-card:hover .pd-t-title { color: #ffd98a; }

.pd-t-star-tag {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  color: var(--pd-gold);
  padding: 4px 10px;
  border: 1px solid rgba(255,217,138,0.25);
  background: rgba(255,217,138,0.04);
  white-space: nowrap;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.3s;
}

.pd-t-star-tag:hover {
  background: rgba(255,217,138,0.1);
  border-color: rgba(255,217,138,0.5);
}

.pd-t-star-tag em {
  font-style: normal;
  font-size: 0.85em;
  opacity: 0.8;
}

.pd-t-star-tag strong {
  font-weight: 600;
  font-size: 0.9em;
}

/* Card body */
.pd-t-body {
  font-size: 0.85rem;
  line-height: 1.9;
  color: var(--pd-text-sec);
  font-style: italic;
  margin: 0 0 18px 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
}

/* Card foot */
.pd-t-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 14px;
  border-top: 1px solid rgba(255,217,138,0.1);
  font-size: 0.72rem;
  color: rgba(255,217,138,0.6);
}

.pd-t-tag {
  padding: 3px 10px;
  border-radius: 2px;
  border: 1px solid;
  font-size: 0.7rem;
}

/* Tag 配色 — 严格对齐 style-d.html */
.tag-思念, .tag-miss { color: #ff9eb8; border-color: rgba(255,158,184,0.3); background: rgba(255,158,184,0.05); }
.tag-愿望, .tag-wish { color: var(--pd-gold); border-color: rgba(255,217,138,0.3); background: rgba(255,217,138,0.05); }
.tag-孤独, .tag-lonely { color: #95f0c0; border-color: rgba(149,240,192,0.3); background: rgba(149,240,192,0.05); }
.tag-离别, .tag-leave { color: #caa7ff; border-color: rgba(202,167,255,0.3); background: rgba(202,167,255,0.05); }
.tag-等待 { color: #86a8ff; border-color: rgba(134,168,255,0.3); background: rgba(134,168,255,0.05); }

.pd-t-res::before { content: "♡ "; }

/* Empty state */
.pd-empty {
  text-align: center;
  padding: 80px 40px;
  max-width: 480px;
  margin: 0 auto;
}

.pd-empty-orb {
  font-size: 3rem;
  color: var(--pd-gold);
  text-shadow: 0 0 24px rgba(255,217,138,0.6);
  margin-bottom: 24px;
  animation: pd-node-glow 3.5s ease-in-out infinite;
}

.pd-empty-title {
  font-family: var(--pd-font-serif);
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--pd-text-pri);
  margin: 0 0 8px;
}

.pd-empty-sub {
  font-style: italic;
  color: var(--pd-text-sec);
  font-size: 0.88rem;
  margin: 0 0 28px;
}

/* Bottom hint + Expand button */
.pd-bottom-hint {
  text-align: center;
  color: rgba(255,217,138,0.5);
  letter-spacing: 0.2em;
  font-size: 0.72rem;
  padding: 24px 0;
}

.pd-expand-wrap {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}

.pd-btn-expand {
  padding: 12px 28px;
  border: 1px solid rgba(255,217,138,0.3);
  border-radius: 2px;
  background: rgba(255,255,255,0.04);
  color: var(--pd-gold);
  font-family: var(--pd-font-serif);
  font-size: 0.85rem;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.3s;
}

.pd-btn-expand:hover {
  border-color: rgba(255,217,138,0.5);
  color: var(--pd-gold);
  background: rgba(255,217,138,0.08);
}

/* ═══ (d) Constellation Section ═══ */
.pd-constellation-section {
  position: relative;
  z-index: 2;
  padding: 120px 48px;
  text-align: center;
}

.pd-const-wrap {
  max-width: 700px;
  margin: 0 auto;
  position: relative;
}

.pd-const-title {
  font-family: var(--pd-font-deco);
  font-size: 1rem;
  letter-spacing: 0.35em;
  color: rgba(255,217,138,0.7);
  margin: 0 0 18px 0;
}

.pd-const-name {
  font-family: var(--pd-font-serif);
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--pd-gold);
  font-style: italic;
  margin: 0 0 14px 0;
}

.pd-const-name::before, .pd-const-name::after {
  content: "「 ";
  color: rgba(255,217,138,0.4);
  font-style: normal;
  font-weight: 300;
}
.pd-const-name::after { content: " 」"; }

.pd-const-sub {
  font-size: 0.78rem;
  color: rgba(202,167,255,0.6);
  letter-spacing: 0.15em;
  font-style: italic;
  margin: 0 0 50px 0;
}

.pd-constellation-svg {
  width: 100%;
  max-width: 560px;
  height: auto;
  margin: 0 auto;
  display: block;
}

.pd-const-guide {
  fill: none;
  stroke: rgba(202,167,255,0.10);
  stroke-dasharray: 2 8;
  stroke-width: 0.8;
}

/* 三层线样式：经线（实） / 闭环（淡虚） / 纬线（紫虚+脉冲） */
.pd-const-line {
  fill: none;
  transition: opacity 0.5s ease;
}
.pd-const-line-time {
  stroke: url(#pd-const-time-grad);
  stroke-width: 1.3;
  filter: drop-shadow(0 0 4px rgba(255,217,138,0.45));
  stroke-linecap: round;
  animation: pd-time-flow 6s ease-in-out infinite;
}
.pd-const-line-time-close {
  stroke: rgba(255,217,138,0.14);
  stroke-width: 0.9;
  stroke-dasharray: 4 10;
  stroke-linecap: round;
}
.pd-const-line-echo {
  stroke: rgba(202,167,255,0.78);
  stroke-width: 1.1;
  stroke-dasharray: 6 5;
  stroke-linecap: round;
  filter: drop-shadow(0 0 6px rgba(202,167,255,0.55));
  animation: pd-echo-pulse 2.4s ease-in-out infinite;
}
@keyframes pd-time-flow {
  0%, 100% { stroke-opacity: 0.85; }
  50%      { stroke-opacity: 1; }
}
@keyframes pd-echo-pulse {
  0%, 100% { stroke-opacity: 0.55; stroke-dashoffset: 0; }
  50%      { stroke-opacity: 1;    stroke-dashoffset: -11; }
}

.pd-const-node {
  cursor: pointer;
}

.pd-const-node-shape {
  fill: var(--pd-gold);
  stroke: rgba(255,217,138,0.55);
  stroke-width: 0.8;
  filter: drop-shadow(0 0 8px rgba(255,217,138,0.85));
  animation: pd-node-glow 3s ease-in-out infinite;
  transition: r 0.3s;
}

/* 驻足星（isCore）：紫色描边 + 更亮的金色主体 */
.pd-const-node.is-core .pd-const-node-shape {
  fill: #fff2cc;
  stroke: rgba(202,167,255,0.95);
  stroke-width: 2;
  filter:
    drop-shadow(0 0 8px rgba(255,217,138,0.9))
    drop-shadow(0 0 14px rgba(202,167,255,0.7));
}

.pd-const-node:hover .pd-const-node-shape {
  fill: #fff;
  stroke: rgba(255,255,255,0.8);
  filter: drop-shadow(0 0 14px rgba(255,255,255,0.95));
}

.pd-const-node:focus-visible {
  outline: none;
}

.pd-const-node:focus-visible .pd-const-node-shape {
  fill: #fff;
  filter: drop-shadow(0 0 14px rgba(255,255,255,0.95));
}

.pd-const-node-idx {
  font-family: var(--pd-font-deco);
  font-size: 0.55rem;
  fill: rgba(255,217,138,0.7);
  letter-spacing: 0.1em;
  text-anchor: middle;
  pointer-events: none;
}

/* 节点下方的星名标签：默认金色，驻足重复点用紫色强调 */
.pd-const-node-sname {
  font-family: var(--pd-font-deco);
  font-size: 0.5rem;
  fill: rgba(255,217,138,0.82);
  letter-spacing: 0.08em;
  text-anchor: middle;
  pointer-events: none;
}
.pd-const-node-sname.is-core {
  fill: rgba(202,167,255,0.95);
  font-weight: 600;
}
.pd-const-node-scon {
  font-size: 0.42rem;
  fill: rgba(255,255,255,0.55);
  font-family: var(--pd-font-body);
  font-style: italic;
}

.pd-story-flash {
  animation: pd-story-flash-kf 1.4s ease-out forwards;
}

/* ═══ (e) Favorites Section ═══ */
.pd-favorites-section {
  position: relative;
  z-index: 2;
  padding: 80px 48px 180px;
  text-align: center;
}

.pd-favorites-title {
  font-family: var(--pd-font-deco);
  font-size: 1.1rem;
  font-weight: 500;
  letter-spacing: 0.4em;
  color: var(--pd-gold);
  margin: 0 0 60px 0;
}

.pd-favorites-title::before { content: "✦ "; color: #95f0c0; }
.pd-favorites-title::after { content: " ✦"; color: #caa7ff; }

/* —— PC 端：一行最多 5 张。之前 3 张 170px max-width:720px 太疏松 —— */
.pd-gallery {
  display: flex;
  justify-content: center;
  gap: 18px;
  flex-wrap: wrap;
  /* 5 张 150px 宽 + 4 个 gap 18px = 750 + 72 = 822px。放宽到 960px 为大屏幕留空 */
  max-width: 960px;
  margin: 0 auto;
  perspective: 1200px;
}

/* Gallery card — PC 端 5 列，每张收窄到 150px，高 216px 保持 5:7 比例 */
.pd-gal-card {
  width: 150px;
  height: 216px;
  padding: 16px 14px;
  background: rgba(16,18,40,0.7);
  border: 1px solid rgba(255,217,138,0.2);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  cursor: pointer;
  transition: all var(--pd-hover-dur) var(--pd-hover-ease);
  position: relative;
  box-shadow: 0 10px 40px rgba(0,0,0,0.4);
  outline: none;
  flex-shrink: 0;
}

/* 扩展到 gal-5：5 张卡片都有不同的初始旋转+位移，形成"随手摆放"的堆叠感 */
.pd-gal-card.gal-1 { transform: rotate(-6deg) translateY(14px); z-index: 1; }
.pd-gal-card.gal-2 { transform: rotate(3deg)  translateY(-7px); z-index: 3; }
.pd-gal-card.gal-3 { transform: rotate(-2deg) translateY(9px);  z-index: 2; }
.pd-gal-card.gal-4 { transform: rotate(5deg)  translateY(3px);  z-index: 1; }
.pd-gal-card.gal-5 { transform: rotate(-4deg) translateY(12px); z-index: 2; }

.pd-gal-card:hover {
  transform: translateY(-24px) rotate(0deg) scale(1.08) !important;
  z-index: 10 !important;
  border-color: rgba(255,217,138,0.5);
  box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 40px rgba(255,217,138,0.15);
}

.pd-gal-card:focus-visible {
  transform: translateY(-24px) rotate(0deg) scale(1.08) !important;
  z-index: 10 !important;
  border-color: rgba(255,217,138,0.5);
  box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 40px rgba(255,217,138,0.15);
}

/* gal-img 区 — 与 150x216 卡片同比缩放：原 170x240 → 现在 88% 左右 */
.pd-gal-img {
  height: 100px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.6rem;
  color: var(--pd-gold);
  background: radial-gradient(circle, rgba(255,217,138,0.12), transparent 70%);
  text-shadow: 0 0 20px rgba(255,217,138,0.6);
}

.pd-gal-name {
  font-family: var(--pd-font-serif);
  font-size: 0.85rem;
  color: #f6f1ff;
  margin-bottom: 4px;
  line-height: 1.4;
}

.pd-gal-card:hover .pd-gal-name,
.pd-gal-card:focus-visible .pd-gal-name { color: var(--pd-gold); }

.pd-gal-sub {
  font-size: 0.7rem;
  color: rgba(202,167,255,0.6);
  letter-spacing: 0.08em;
  line-height: 1.6;
}

/* gal-close button */
.pd-gal-close {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255,217,138,0.3);
  border-radius: 2px;
  background: rgba(5,6,15,0.6);
  color: rgba(255,217,138,0.7);
  font-size: 0.9rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  opacity: 0;
  transition: all 0.3s;
}

.pd-gal-card:hover .pd-gal-close,
.pd-gal-card:focus-visible .pd-gal-close,
.pd-gal-close:focus-visible {
  opacity: 1;
}

.pd-gal-close:hover {
  color: #ff6b8a;
  border-color: #ff6b8a;
  background: rgba(255,107,138,0.1);
}

/* ═══ (f) Modal Base ═══ */
.pd-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(5, 6, 15, 0.72);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pd-modal-fade-in 300ms ease-out both;
}

@keyframes pd-modal-fade-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

.pd-modal-panel {
  width: min(560px, 92vw);
  max-height: 86vh;
  overflow: auto;
  padding: 32px 28px;
  border: 1px solid var(--pd-gold);
  border-radius: 2px;
  background: rgba(16,18,40,0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 24px 80px -20px rgba(255, 217, 138, 0.25);
}

.pd-modal-panel.pd-story-panel {
  width: min(680px, 92vw);
}

.pd-modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 16px;
}

.pd-modal-head h3 {
  font-family: var(--pd-font-deco);
  font-size: 1.05rem;
  line-height: 1.4;
  color: var(--pd-gold);
  letter-spacing: 0.15em;
  margin: 0;
  font-weight: 500;
}

.pd-story-head-title {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.pd-modal-close {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255,217,138,0.3);
  border-radius: 2px;
  background: transparent;
  color: rgba(255,217,138,0.7);
  font-size: 1.3rem;
  line-height: 1;
  cursor: pointer;
  opacity: 0.7;
  transition: all 220ms ease;
  padding: 0;
}

.pd-modal-close:hover {
  color: #ff6b8a;
  border-color: #ff6b8a;
  opacity: 1;
}

.pd-modal-close:focus-visible {
  outline: 2px solid var(--pd-gold);
  outline-offset: 3px;
  opacity: 1;
}

.pd-modal-body {
  padding: 8px 0 12px;
}

.pd-modal-form-row {
  margin-bottom: 16px;
}

.pd-story-meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.pd-modal-divider {
  border-top: 1px dashed var(--pd-gold-line);
  border-bottom: 1px dashed var(--pd-gold-line);
  height: 0;
  margin: 20px 0;
  opacity: 0.7;
}

.pd-story-content {
  font-family: var(--pd-font-serif);
  font-style: italic;
  font-size: 1rem;
  line-height: 1.9;
  color: var(--pd-text-pri);
  white-space: pre-wrap;
}

.pd-story-image {
  display: block;
  max-width: 100%;
  border-radius: 2px;
  margin: 0 0 20px;
  border: 1px solid var(--pd-gold-line);
}

.pd-delete-text {
  font-family: var(--pd-font-serif);
  color: var(--pd-text-pri);
  font-size: 0.95rem;
  line-height: 1.8;
  margin: 0;
  text-align: center;
  padding: 10px 0;
}

.pd-modal-foot {
  border-top: 1px dashed var(--pd-gold-line);
  padding-top: 20px;
  margin-top: 24px;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.pd-modal-input {
  width: 100%;
  border: 1px solid rgba(255,217,138,0.3);
  padding: 10px 14px;
  border-radius: 2px;
  background: rgba(255,255,255,0.04);
  color: var(--pd-text-pri);
  font-family: var(--pd-font-serif);
  font-size: 0.92rem;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
  box-sizing: border-box;
}

.pd-modal-input:focus {
  outline: none;
  border-color: var(--pd-gold);
  box-shadow: 0 0 0 2px var(--pd-gold-soft);
}

.pd-modal-input::placeholder {
  color: rgba(255,217,138,0.4);
  opacity: 0.6;
}

.pd-modal-label {
  display: block;
  font-family: var(--pd-font-deco);
  font-size: 0.7rem;
  letter-spacing: 0.2em;
  color: var(--pd-gold);
  margin-bottom: 6px;
  opacity: 0.85;
}

.pwd-error {
  color: #ff6b8a;
  font-size: 0.82rem;
  margin: 8px 0 0;
  font-style: italic;
}

/* 改密码弹窗底部「找回」链接 */
.pwd-forgot-link {
  text-align: center;
  font-size: 0.78rem;
  color: rgba(255,217,138,0.5);
  margin-top: 14px;
  cursor: pointer;
  letter-spacing: 0.05em;
  transition: color 0.2s;
  font-family: var(--pd-font-serif);
}
.pwd-forgot-link:hover { color: var(--pd-gold); }

/* 退出确认小弹窗 */
.pd-modal-sm { max-width: 380px; }
.pd-modal-hint {
  font-family: var(--pd-font-serif);
  font-size: 0.88rem;
  line-height: 1.85;
  color: var(--pd-text-pri);
  text-align: center;
  padding: 8px 0;
  margin: 0;
}

/* Buttons */
.pd-btn-primary,
.pd-btn-danger {
  border-radius: 2px;
  padding: 10px 20px;
  font-family: var(--pd-font-serif);
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: all 220ms ease;
  border: 1px solid;
}

.pd-btn-primary {
  background: var(--pd-gold);
  color: #130d00;
  border-color: var(--pd-gold);
  font-weight: 600;
}

.pd-btn-primary:hover:not(:disabled) {
  background: #e8c374;
  border-color: #e8c374;
  box-shadow: 0 8px 24px -8px rgba(255, 217, 138, 0.5);
}

.pd-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pd-btn-danger {
  background: rgba(255, 107, 138, 0.08);
  color: #ff6b8a;
  border-color: rgba(255, 107, 138, 0.5);
}

.pd-btn-danger:hover:not(:disabled) {
  background: #ff6b8a;
  color: #130d00;
  border-color: #ff6b8a;
  box-shadow: 0 8px 24px -8px rgba(255, 107, 138, 0.5);
}

.pd-btn-danger:focus-visible {
  outline: 2px solid #ff6b8a;
  outline-offset: 3px;
}

.pd-btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Signature inline editor */
.pd-sign-inline {
  position: fixed;
  top: 72px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 60;
  padding: 10px 14px;
  border: 1px solid var(--pd-gold);
  border-radius: 2px;
  background: rgba(16,18,40,0.92);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  gap: 10px;
  align-items: center;
  box-shadow: 0 12px 40px -12px rgba(255, 217, 138, 0.3);
}

.pd-sign-label {
  font-family: var(--pd-font-deco);
  color: var(--pd-gold);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  white-space: nowrap;
}

.pd-sign-input {
  flex: 1;
  min-width: 220px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,217,138,0.3);
  border-radius: 2px;
  padding: 8px 12px;
  color: var(--pd-text-pri);
  font-family: var(--pd-font-serif);
  font-size: 0.9rem;
}

.pd-sign-input:focus {
  outline: none;
  border-color: var(--pd-gold);
  box-shadow: 0 0 0 2px var(--pd-gold-soft);
}

.pd-sign-input::placeholder {
  color: rgba(255,217,138,0.4);
  opacity: 0.6;
}

/* Story meta pills (modal) */
.pd-story-meta-star {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border: 1px solid rgba(255,217,138,0.3);
  border-radius: 2px;
  background: rgba(255,217,138,0.04);
  color: var(--pd-gold);
  font-size: 0.72rem;
  font-family: var(--pd-font-deco);
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 220ms ease;
}

.pd-story-meta-star:hover {
  background: var(--pd-gold);
  color: #130d00;
}

.pd-story-meta-res {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 2px;
  background: rgba(255, 107, 138, 0.1);
  color: #ff9eb8;
  border: 1px solid rgba(255, 107, 138, 0.3);
  font-size: 0.75rem;
}

.pd-story-meta-date {
  font-family: var(--pd-font-deco);
  font-size: 0.7rem;
  letter-spacing: 0.15em;
  color: rgba(255,217,138,0.6);
}

.pd-story-meta-loc {
  font-size: 0.75rem;
  color: var(--pd-text-sec);
  opacity: 0.75;
}

/* Gold flash banner */
.pd-flash-banner {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 300;
  padding: 14px 28px;
  border: 1px solid var(--pd-gold);
  border-radius: 999px;
  background: rgba(16,18,40,0.92);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  font-family: var(--pd-font-deco);
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  color: var(--pd-gold);
  box-shadow: 0 12px 40px -8px rgba(255, 217, 138, 0.35);
}

.pd-flash-banner.success {
  border-color: var(--pd-gold);
  background: linear-gradient(90deg, rgba(255, 217, 138, 0.12) 0%, rgba(16,18,40,0.92) 50%, rgba(255, 217, 138, 0.12) 100%);
}

.pd-flash-banner.error {
  border-color: #ff6b8a;
  color: #ff9eb8;
  background: linear-gradient(90deg, rgba(255, 107, 138, 0.12) 0%, rgba(16,18,40,0.92) 50%, rgba(255, 107, 138, 0.12) 100%);
  box-shadow: 0 12px 40px -8px rgba(255, 107, 138, 0.3);
}

.pd-flash-banner.info {
  border-color: #c49eff;
  color: #d9bfff;
  background: linear-gradient(90deg, rgba(196, 158, 255, 0.12) 0%, rgba(16,18,40,0.92) 50%, rgba(196, 158, 255, 0.12) 100%);
  box-shadow: 0 12px 40px -8px rgba(196, 158, 255, 0.3);
}

.pd-flash-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

.pd-flash-enter-active {
  transition: opacity 240ms ease-out, transform 240ms ease-out;
}

.pd-flash-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}

.pd-flash-leave-active {
  transition: opacity 240ms ease-in, transform 240ms ease-in;
}

/* ════════════════════════════════════════════════════════════════
   Responsive — 严格对齐 style-d.html 的 @media (max-width: 768px)
   ════════════════════════════════════════════════════════════════ */
@media (max-width: 768px) {
  /* Topbar — 隐藏中央 brand，让两端按钮充分留白，避免拥挤 */
  .pd-topbar {
    padding: 14px 18px;
    gap: 12px;
  }
  .pd-brand { display: none; }
  /* 移动端：隐藏 PC 三按钮，显示单设置按钮 */
  .pd-actions-pc { display: none; }
  .pd-settings-trigger { display: inline-flex; }
  .pd-actions { gap: 6px; }
  .pd-back-btn { padding: 7px 12px; font-size: 0.72rem; letter-spacing: 0.05em; }

  /* Hero */
  .pd-moon { width: 320px; height: 320px; }
  .pd-hero-name { font-size: 2.4rem; }
  .pd-hero-role { font-size: 0.6rem; letter-spacing: 0.3em; margin-bottom: 14px; }
  .pd-hero-band { padding: 8px 20px; font-size: 0.78rem; }
  .pd-hero-joined { font-size: 0.66rem; gap: 8px; margin-top: 18px; }
  .pd-hero-email { font-size: 0.6rem; gap: 8px; margin-top: 8px; }
  .pd-scroll-hint { bottom: 36px; font-size: 0.6rem; gap: 10px; }
  .pd-scroll-line { height: 30px; }

  /* 退出/设置弹窗自适应 */
  .pd-modal-sm { max-width: 92vw; }
  .pd-modal-hint { font-size: 0.82rem; }
  .pwd-forgot-link { font-size: 0.72rem; }
  .pd-settings-item { padding: 12px 16px; font-size: 0.82rem; }

  /* Timeline section */
  .pd-timeline-section { padding: 40px 18px 80px; }
  .pd-section-head { margin-bottom: 60px; }
  .pd-section-head h2 { font-size: 1.3rem; letter-spacing: 0.12em; }
  .pd-section-head p { font-size: 0.78rem; }
  .pd-stats { grid-template-columns: repeat(2, 1fr); gap: 32px 16px; margin-bottom: 40px; }
  .pd-stat .stat-num { font-size: 2.4rem; }
  .pd-stat .stat-label { font-size: 0.62rem; letter-spacing: 0.12em; }

  /* Timeline 移动端：单列布局，轴线在左 20px，星星贴在卡片左外侧
     卡片右对齐到容器右侧，左边缘距轴线 ~28px，星星在卡片左外侧紧贴 */
  .pd-timeline::before {
    left: 20px;
    transform: none;
  }
  .pd-t-item {
    justify-content: flex-end !important;
    margin-bottom: 70px;
    padding-left: 0;
  }
  .pd-t-card {
    width: calc(100% - 50px);
    margin-left: 50px;
    margin-right: 0;
    border-radius: 14px !important;
    padding: 20px 18px;
  }
  /* 月-星-日 节点：固定在轴线中心 (left: 20px)，用 translateX(-50%) 居中
     结构与 PC 端一致：月份在上、星星中间、日期在下，沿同一垂直中心线 */
  .pd-t-node {
    left: 20px;
    top: 26px;
    transform: translateX(-50%);
  }
  .pd-t-date-month,
  .pd-t-date-day { font-size: 0.62rem; }
  .pd-t-title { font-size: 1rem; }
  .pd-t-body { font-size: 0.8rem; line-height: 1.8; -webkit-line-clamp: 3; }
  .pd-t-foot { font-size: 0.66rem; }

  /* Constellation */
  .pd-constellation-section { padding: 80px 20px 120px; }
  .pd-const-name { font-size: 1.2rem; }
  .pd-const-title { font-size: 0.78rem; letter-spacing: 0.2em; }
  .pd-const-sub { font-size: 0.7rem; margin-bottom: 32px; }
  .pd-const-legend { padding: 18px 16px; }

  /* Favorites — 移动端严格保持 grid 2 列竖直排布，不被 PC 5 列影响 */
  .pd-favorites-section { padding: 60px 18px 120px; }
  .pd-favorites-title { font-size: 0.9rem; letter-spacing: 0.2em; margin-bottom: 40px; }
  .pd-gallery {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 14px !important;
    max-width: 100% !important;
    margin: 0 !important;
    perspective: none;
  }
  .pd-gal-card {
    width: 100% !important;
    height: 200px !important;
    padding: 16px 12px !important;
    margin: 0 !important;
    flex: none;
  }
  .pd-gal-img { height: 80px; font-size: 2.2rem; margin-bottom: 10px; }
  .pd-gal-name { font-size: 0.82rem; }
  .pd-gal-sub { font-size: 0.62rem; }
  /* 移动端：严格复刻 style-d .gal-card:nth-child(n) { transform: none !important; margin: 10px }
     hover 动画走桌面端全局规则，保持与 style-d 完全一致 */
  .pd-gal-card.gal-1, .pd-gal-card.gal-2, .pd-gal-card.gal-3, .pd-gal-card.gal-4,
  .pd-gal-card.gal-5, .pd-gal-card.gal-6, .pd-gal-card.gal-7, .pd-gal-card.gal-8,
  .pd-gal-card.gal-9, .pd-gal-card.gal-10 {
    transform: none !important;
    margin: 10px !important;
    z-index: 1;
  }

  /* Modal */
  .pd-modal-panel { padding: 22px 18px; }
  .pd-modal-head h3 { font-size: 0.95rem; }
  .pd-btn-primary, .pd-btn-danger { padding: 8px 14px; font-size: 0.72rem; }

  /* Flash banner */
  .pd-flash-banner { left: 6vw; right: 6vw; transform: none; width: 88vw; text-align: center; }

  /* Sign inline */
  .pd-sign-inline { flex-wrap: wrap; max-width: 92vw; }
  .pd-sign-input { min-width: 160px; }
}

@media (max-width: 380px) {
  .pd-moon { width: 260px; height: 260px; }
  .pd-hero-name { font-size: 1.9rem; }
  .pd-hero-band { padding: 6px 14px; font-size: 0.7rem; }
  .pd-hero-email { font-size: 0.54rem; }
  .pd-stat .stat-num { font-size: 2rem; }
  .pd-stat .stat-label { font-size: 0.55rem; letter-spacing: 0.08em; }
  .pd-t-card { padding: 16px 14px; }
  .pd-t-head { flex-direction: column; align-items: flex-start; gap: 6px; }
  .pd-gal-card { width: 120px; height: 180px; padding: 12px 10px; }
  .pd-gal-img { height: 60px; font-size: 1.8rem; }
  .pd-gal-name { font-size: 0.72rem; }
  .pd-gal-sub { font-size: 0.55rem; }
  /* 极窄屏弹窗按钮纵向堆叠 */
  .pd-modal-foot { flex-direction: column; }
  .pd-modal-foot button { width: 100%; }
}
</style>
