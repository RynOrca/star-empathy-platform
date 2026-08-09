<template>
  <div class="ca-wrap">
    <!-- 顶部 LIVE 标识条（全局显示） -->
    <div class="ca-hero-strip">
      <div class="ca-hero-left">
        <Sparkles :size="13" class="ca-hero-spark" />
        <span class="ca-hero-label">AI 星笺解读</span>
        <span class="ca-hero-sub">· 基于 {{ displayStoryCount }} 则心事的聚合凝视</span>
      </div>
      <span class="ca-hero-badge"
        :class="hasError ? 'is-error' : tooFewStories ? 'is-standby' : isLoading ? 'is-loading' : 'is-live'">
        {{ hasError ? '失败' : tooFewStories ? '待生成' : isLoading ? '生成中' : 'LIVE' }}
      </span>
    </div>

    <!-- 全局错误条：API 失败时显示（带重试按钮） -->
    <div v-if="hasError" class="ca-error-strip">
      <div class="ca-error-left">
        <AlertTriangle :size="13" class="ca-error-icon" />
        <span class="ca-error-label">解读加载失败</span>
        <span class="ca-error-msg">{{ collAnalysis.error.value }}</span>
      </div>
      <button class="ca-error-retry" @click="onRetryAnalysis">
        <RotateCcw :size="11" />
        重试
      </button>
    </div>

    <!-- ═══════════════════════════════════════════════════════════
         ① 星辰归属 · 这组星的品质（独立三态 panel）
         ═══════════════════════════════════════════════════════════ -->
    <section class="panel-wrapper ca-hero-panel">
      <div class="panel-head">
        <Sparkles :size="10" class="pw-icon pw-purple" />
        <span class="pw-title">星辰归属 · 这组星的品质</span>
        <span class="pw-count">{{
          hasReal
            ? `${storyCount} 则心事 · ${starBelongings.length} 颗星 · 刚刚更新`
            : tooFewStories ? '未生成' : '生成中'
        }}</span>
      </div>

      <!-- 真实态：星辰星图 + 右栏 4小指标 + 光谱 + 星座Top -->
      <div v-if="hasReal" class="ca-hero-body ca-hero-body-stats">
        <!-- 左：【只有星辰归属黑色星空板块 .ca-starmap-wrap】（其他信息全部移到右栏！） -->
        <div class="ca-h-left-block">
          <div class="ca-starmap-wrap ca-h-starmap-wrap">
            <svg v-if="starMapData.stars.length > 0" :viewBox="`0 0 ${MAP_W} ${MAP_H}`"
              class="ca-starmap-svg" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient :id="'skyGrad'" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="rgba(10,10,30,0.15)" />
                  <stop offset="100%" stop-color="rgba(10,10,30,0)" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" :width="MAP_W" :height="HORIZON_Y" fill="url(#skyGrad)" />
              <circle v-for="(bg, i) in bgStars" :key="'bg'+i" :cx="bg.x" :cy="bg.y" :r="bg.r"
                fill="#fff" :opacity="bg.opacity" />
              <line :x1="0" :y1="HORIZON_Y" :x2="MAP_W" :y2="HORIZON_Y"
                stroke="rgba(134,168,255,0.25)" stroke-width="0.5" stroke-dasharray="4 3" />
              <rect x="0" :y="HORIZON_Y" :width="MAP_W" :height="MAP_H - HORIZON_Y" fill="rgba(0,0,0,0.25)" />
              <text x="14" :y="HORIZON_Y - 3" class="ca-sm-compass" fill="rgba(255,255,255,0.3)">N</text>
              <text :x="MAP_W * 0.25 - 3" :y="HORIZON_Y - 3" class="ca-sm-compass" fill="rgba(255,255,255,0.2)">E</text>
              <text :x="MAP_W * 0.5 - 3" :y="HORIZON_Y - 3" class="ca-sm-compass" fill="rgba(255,255,255,0.3)">S</text>
              <text :x="MAP_W * 0.75 - 3" :y="HORIZON_Y - 3" class="ca-sm-compass" fill="rgba(255,255,255,0.2)">W</text>
              <text :x="MAP_W - 14" :y="HORIZON_Y - 3" class="ca-sm-compass" fill="rgba(255,255,255,0.3)">N</text>
              <text :x="MAP_W / 2" y="8" text-anchor="middle" class="ca-sm-compass" fill="rgba(255,255,255,0.15)">天顶</text>
              <line v-for="(l, i) in starMapData.lines" :key="'l'+i"
                :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2"
                :stroke="l.color" stroke-width="0.4" opacity="0.18" stroke-dasharray="2 2" />
              <g v-for="s in starMapData.stars" :key="s.id"
                class="ca-sm-star"
                :class="{
                  active: hoveredStarId === s.id,
                  dimmed: hoveredStarId !== null && hoveredStarId !== s.id,
                  below: !s.aboveHorizon,
                }"
                @mouseenter="hoveredStarId = s.id"
                @mouseleave="hoveredStarId = null">
                <circle :cx="s.x" :cy="s.y" :r="s.radius * 3" :fill="s.color" opacity="0.06" />
                <circle :cx="s.x" :cy="s.y" :r="s.radius * 1.8" :fill="s.color" opacity="0.14" />
                <circle :cx="s.x" :cy="s.y" :r="s.radius" :fill="s.color" opacity="0.9">
                  <animate attributeName="opacity" :values="`0.7;1;0.7`" :dur="3 + (s.id % 3) + 's'"
                    repeatCount="indefinite" />
                </circle>
                <circle :cx="s.x" :cy="s.y" :r="s.radius * 0.35" fill="#fff" opacity="0.85" />
                <template v-if="s.showLabel && hoveredStarId === null">
                  <text :x="s.x" :y="s.labelY" text-anchor="middle" class="ca-sm-label" :fill="s.color">{{ s.name }}</text>
                  <text :x="s.x" :y="s.labelY + (s.labelAbove ? -4 : 7)" text-anchor="middle" class="ca-sm-count">{{ s.count }}篇</text>
                </template>
                <template v-if="hoveredStarId === s.id">
                  <text :x="s.x" :y="s.labelY" text-anchor="middle" class="ca-sm-label ca-sm-label-hover" :fill="s.color">{{ s.name }}</text>
                  <text :x="s.x" :y="s.labelY + (s.labelAbove ? -4 : 7)" text-anchor="middle" class="ca-sm-count ca-sm-count-hover">
                    {{ s.count }}篇 · {{ s.aboveHorizon ? '地平线上' : '地平线下' }} · alt {{ Math.round(s.alt) }}°
                  </text>
                </template>
              </g>
            </svg>
            <div v-else class="ca-stars-empty">故事尚未挂上星辰</div>
            <div v-if="starBelongings.length > 0" class="ca-sm-legend">
              <span class="ca-sm-legend-item"><i class="ca-sm-dot"></i>大小=故事数</span>
              <span class="ca-sm-legend-item"><i class="ca-sm-dash"></i>星座连线</span>
              <span v-if="starMapData.belowHorizon > 0" class="ca-sm-legend-item ca-sm-below">
                {{ starMapData.aboveHorizon }}↑ / {{ starMapData.belowHorizon }}↓
              </span>
            </div>
          </div>
        </div>

        <!-- 右：【所有其他信息全部堆到这里！】：指标 → 星辰速览(从左移来) → 光谱色 → 星座Top+标签云 -->
        <div class="ca-h-right-block">
          <!-- ① 四小顶栏指标：每星故事数 / 平均星等 / 地平比例 / 最亮星  -->
          <div class="ca-h-ss-quad">
            <div class="ca-h-ss-q">
              <div class="ca-hs-k">每星心事</div>
              <div class="ca-hs-v" style="color:#ffd98a">{{ starStatistics.avg || '—' }}</div>
              <div class="ca-hs-sub">篇 / 星</div>
            </div>
            <div class="ca-h-ss-q">
              <div class="ca-hs-k">平均星等</div>
              <div class="ca-hs-v" style="color:#caa7ff">m{{ starStatistics.avgMag }}</div>
              <div class="ca-hs-sub">越小越亮</div>
            </div>
            <div class="ca-h-ss-q">
              <div class="ca-hs-k">地平线</div>
              <div class="ca-hs-v" style="color:#86a8ff">{{ starStatistics.horizonPct }}%</div>
              <div class="ca-hs-sub">{{ starStatistics.sm.aboveHorizon }}↑/{{ starStatistics.sm.belowHorizon }}↓</div>
            </div>
            <div class="ca-h-ss-q">
              <div class="ca-hs-k">最亮星</div>
              <div class="ca-hs-v" :style="{color: starStatistics.brightest?.color ?? '#ffd98a'}">
                m{{ starStatistics.brightest?.mag ?? '—' }}
              </div>
              <div class="ca-hs-sub">{{ starStatistics.brightest?.name ?? '—' }}</div>
            </div>
          </div>

          <!-- ② 星辰分布速览：从左栏移过来！ -->
          <div v-if="starBelongings.length > 0" class="ca-h-stardust">
            <div class="ca-hsd-grid">
              <div class="ca-hsd-cell">
                <div class="ca-hsd-k">恒星总数</div>
                <div class="ca-hsd-v" style="color:#ffd98a">{{ starBelongings.length }}</div>
                <div class="ca-hsd-sub">跨 {{ new Set(starBelongings.map(x => x.con)).size }} 个星座</div>
              </div>
              <div class="ca-hsd-cell">
                <div class="ca-hsd-k">故事总数</div>
                <div class="ca-hsd-v" style="color:#caa7ff">{{ starBelongTotal }}</div>
                <div class="ca-hsd-sub">平均 {{ starStatistics.avg }} 篇/星</div>
              </div>
              <div class="ca-hsd-cell ca-hsd-cell-wide">
                <div class="ca-hsd-k">最亮 α 星</div>
                <div class="ca-hsd-bright">
                  <span class="ca-hsd-bright-color" :style="{background: starStatistics.brightest?.color ?? '#ffd98a', boxShadow: `0 0 5px ${starStatistics.brightest?.color ?? '#ffd98a'}`}"></span>
                  <span class="ca-hsd-bright-name" :style="{color: starStatistics.brightest?.color ?? '#ffd98a'}">
                    {{ starStatistics.brightest?.name ?? '—' }}
                  </span>
                  <span class="ca-hsd-bright-con">{{ starStatistics.brightest?.con ?? '' }}</span>
                  <span class="ca-hsd-bright-mag">m{{ starStatistics.brightest?.mag ?? '—' }}</span>
                </div>
              </div>
              <div class="ca-hsd-cell ca-hsd-cell-wide">
                <div class="ca-hsd-k">光谱主流</div>
                <div class="ca-hsd-specbar">
                  <span v-for="s in spectralSummary" :key="s.type" class="ca-hsd-spec-seg"
                    :style="{width: s.pct + '%', background: s.color, boxShadow: `inset 0 0 3px ${s.color}55`}">
                  </span>
                </div>
                <div class="ca-hsd-spec-label">
                  <span v-for="s in spectralSummary.slice(0, 3)" :key="s.type" class="ca-hsd-spec-item" :style="{color: s.color}">
                    {{ s.type }} {{ s.pct }}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- ③ 星座 Top3 + 星群品质标签 -->
          <div class="ca-h-ss-section ca-h-ss-bottom">
            <div class="ca-hs-k ca-h-ss-sec-k">星座 / 星群气质</div>
            <div class="ca-h-ss-cons">
              <template v-if="starStatistics.topCons.length > 0">
                <span v-for="(c, i) in starStatistics.topCons" :key="c.con" class="ca-h-ss-con">
                  <i class="ca-h-ss-con-rank"
                    :style="{ background: ['#ffd98a','#caa7ff','#86a8ff'][i] }">{{ i+1 }}</i>
                  <span class="ca-h-ss-con-name">{{ c.con }}</span>
                  <span class="ca-h-ss-con-pct">{{ c.pct }}%</span>
                </span>
              </template>
              <span v-else class="ca-h-ss-empty">—</span>
            </div>
            <div class="ca-h-ss-tags">
              <template v-if="starStatistics.brightest">
                <span class="ca-h-ss-tag ca-h-ss-tag-gold">
                  最亮·{{ starStatistics.brightest.name }}
                </span>
              </template>
              <template v-if="starStatistics.dimmest">
                <span class="ca-h-ss-tag ca-h-ss-tag-blue">
                  最暗·{{ starStatistics.dimmest.name }} m{{ starStatistics.dimmest.mag }}
                </span>
              </template>
              <span v-if="starStatistics.avgMag < 3.5" class="ca-h-ss-tag ca-h-ss-tag-gold2">整体明亮</span>
              <span v-else class="ca-h-ss-tag ca-h-ss-tag-purple">整体清疏</span>
              <span v-if="starStatistics.horizonPct >= 60" class="ca-h-ss-tag ca-h-ss-tag-green">多在地平线上·可见</span>
              <span v-else class="ca-h-ss-tag ca-h-ss-tag-dim">藏于地平线下·私密</span>
            </div>
          </div>
        </div>
      </div>

      <!-- tooFew：空态 -->
      <div v-else-if="tooFewStories" class="persona-empty empty-scant">
        <div class="pe-icon-wrap pe-scant">
          <BookDashed :size="14" />
        </div>
        <div class="pe-text">
          <div class="pe-title">星笺故事不足</div>
          <div class="pe-sub">当前 <b>{{ displayStoryCount }}</b> 条故事，累计 3 条后 AI 将为这卷星笺生成「星辰归属 · 星图」</div>
        </div>
      </div>

      <!-- loading：骨架屏 -->
      <div v-else class="persona-empty empty-loading">
        <div class="pe-icon-wrap pe-loading">
          <Sparkle :size="14" class="spin-slow" />
        </div>
        <div class="pe-text">
          <div class="pe-title">星辰归属星图生成中…</div>
          <div class="pe-sub">正在从 {{ displayStoryCount }} 则心事中聚合星名、星座连线与星品信息</div>
        </div>
        <div class="skeleton-lines">
          <span class="sk-line sk-1"></span>
          <span class="sk-line sk-2"></span>
          <span class="sk-line sk-3"></span>
        </div>
      </div>
    </section>



    <!-- ═══ 1. 夜观手记 / 钞本题记（按 tone 切换标题） ═══ -->
    <section class="panel-wrapper ca-night-notes">
      <div class="panel-head">
        <Sparkles :size="10" class="pw-icon pw-blue" />
        <span class="pw-title">{{ isAncientTone ? '钞本题记' : '夜观手记' }}</span>
        <span class="pw-count">{{
          hasReal
            ? (isAncientTone
                ? `${nightSky.phase} · ${nightSky.term} · 凡 ${storyCount} 首`
                : `${nightSky.phase} · ${nightSky.term} · ${storyCount} 处光斑`)
            : tooFewStories ? '未生成' : '生成中'
        }}</span>
      </div>

      <div v-if="hasReal" class="ca-persona-body">
        <!-- 左：夜观小册笺卷（不再有星格/天文参数，改成夜的五个小条：时跨/夜温/风向/见月/云量） -->
        <div class="ca-scroll-card ca-sc-night">
          <div class="sc-corner sc-tl"></div>
          <div class="sc-corner sc-tr"></div>
          <div class="sc-corner sc-bl"></div>
          <div class="sc-corner sc-br"></div>

          <div class="sc-top">
            <div class="sc-collection">{{ nightSky.name }}</div>
            <div class="sc-name-han">{{ persona.hanName }}</div>
          </div>

          <!-- 夜观小册 SVG：迷你夜空剖面（月眉+银河微带+地平+1盏灯），不再是卷轴 -->
          <svg viewBox="0 0 120 120" class="sc-svg sc-svg-night">
            <!-- 背景天色渐变：入夜→子夜 -->
            <defs>
              <linearGradient id="nightMini" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stop-color="#0b0d2a" />
                <stop offset="100%" stop-color="#1f2046" />
              </linearGradient>
              <linearGradient id="galMini" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="rgba(202,167,255,0.0)" />
                <stop offset="50%" stop-color="rgba(202,167,255,0.5)" />
                <stop offset="100%" stop-color="rgba(255,217,138,0.0)" />
              </linearGradient>
            </defs>
            <rect x="8"  y="24" width="104" height="76" rx="4" fill="url(#nightMini)"
              stroke="rgba(134,168,255,0.25)" stroke-width="0.6" />
            <!-- 银河斜带 -->
            <rect x="8"  y="30" width="104" height="18" fill="url(#galMini)" transform="rotate(-8 60 40)" opacity="0.8" />
            <!-- 背景散星 -->
            <circle v-for="(s, i) in bgStars.slice(0,12)" :key="'psn'+i"
              :cx="8 + (s.x % 104)" :cy="26 + (s.y % 72)" :r="s.r * 0.7" fill="#fff" :opacity="s.opacity * 0.9" />
            <!-- 残月蛾眉（月相22%） -->
            <g transform="translate(96, 46)">
              <circle cx="0" cy="0" r="6.5" fill="rgba(245,240,228,0.9)" />
              <circle cx="2" cy="-1.2" r="6.1" fill="url(#nightMini)" />
            </g>
            <!-- 3 颗光斑（心事缩影） -->
            <circle cx="34" cy="68" r="2" fill="#ffd98a" opacity="0.95" style="filter: drop-shadow(0 0 2px #ffd98a)" />
            <circle cx="56" cy="56" r="1.5" fill="#caa7ff" opacity="0.9" style="filter: drop-shadow(0 0 1.5px #caa7ff)" />
            <circle cx="76" cy="80" r="1.3" fill="#95f0c0" opacity="0.9" style="filter: drop-shadow(0 0 1.5px #95f0c0)" />
            <!-- 地平线剪影 + 一盏窗灯（=孤灯） -->
            <path d="M8 92 L 0 92 L 0 100 L 120 100 L 120 92 L 112 92 L 106 84 L 96 88 L 88 80 L 78 86 L 68 78 L 58 86 L 46 82 L 36 88 L 24 84 L 16 90 Z"
              fill="#05060f" />
            <rect x="60" y="86" width="2.2" height="2.2" fill="rgba(255,217,138,0.85)" style="filter: drop-shadow(0 0 1px #ffd98a)" />
          </svg>

          <!-- 【天空本色】夜的五条小参数（替换RA/Dec/m/ly天文条）：时跨/夜温/风向/见月/云量 -->
          <div class="sc-astro sc-astro-night">
            <div class="sc-astro-row">
              <span class="sc-astro-k">时</span>
              <span class="sc-astro-v sc-astro-v-vg">{{ nightSky.timeSpanStart }} ~{{ nightSky.timeSpanEnd }}</span>
            </div>
            <div class="sc-astro-row">
              <span class="sc-astro-k">温</span>
              <span class="sc-astro-v" style="color: #86a8ff">{{ nightSky.meteoAt(1).v.split(' ')[0] }}</span>
            </div>
            <div class="sc-astro-row">
              <span class="sc-astro-k">风</span>
              <span class="sc-astro-v" style="color: #caa7ff">{{ nightSky.meteoAt(2).v.split(' ')[0] }}</span>
            </div>
            <div class="sc-astro-row">
              <span class="sc-astro-k">月</span>
              <span class="sc-astro-v" style="color: #ffd98a">{{ nightSky.moonIllum }}</span>
            </div>
          </div>
        </div>

        <!-- 右：手记文字 / 钞本叙录（按 tone 切换文案，古代版不出现“你坐到X时/心事灯火”等现代语境） -->
        <div class="ca-persona-text">
          <!-- 观夜简介条：古代版 → 「钞本叙录·凡例」；现代版 → 「当夜观览·开篇」 -->
          <div class="ca-pt-intro ca-pt-intro-night">
            <component :is="CloudSun" :size="10" />
            <span v-if="isAncientTone">
              {{ nightSky.season }} · {{ nightSky.timeSpan }} · 都 {{ storyCount }} 首
            </span>
            <span v-else>
              {{ nightSky.season }} · {{ nightSky.timeSpan }} · 共收 {{ storyCount }} 则心事
            </span>
          </div>

          <!-- ancient: 钞本叙录口吻（“右《xx》一编，都xx首...”） -->
          <template v-if="isAncientTone">
            <p class="ca-pt-para first">
              <span class="ca-han-hl">{{ nightSky.name }}</span>
              {{ persona.suggestIntro }}
            </p>
            <p class="ca-pt-para">
              {{ persona.paragraphs[0] }}
            </p>
            <p class="ca-pt-para">
              {{ persona.paragraphs[1] }}
            </p>
          </template>

          <!-- modern: 原陪伴口吻，但把硬编码「8处心事」「月是一弯蛾眉...槐花」这些露馅点全部替换为动态 -->
          <template v-else>
            <p class="ca-pt-para first">
              这一夜叫<span class="ca-han-hl">「{{ persona.hanName }}」</span>——
              从 <b style="color: #ffd98a">{{ nightSky.timeSpanStart }}</b>
              到 <b style="color: #86a8ff">{{ nightSky.timeSpanEndLong || nightSky.timeSpanEnd }}</b>，
              共 {{ storyCount }} 则心事，像星点一样浮在夜空里。
              {{ persona.paragraphs[0] }}
            </p>
            <p class="ca-pt-para">
              {{ persona.paragraphs[1] }}
            </p>
          </template>

          <!-- ===== 【那一夜·五大气象维度】一行5列紧凑小卡（原5行横条太高，改成扁平方块网格） ===== -->
          <div class="ca-pt-meteo-five ca-meteo-compact">
            <div class="ca-mc-title">
              <component :is="MoonStar" :size="9" />
              <span>那一夜 · 五大气象</span>
            </div>
            <div class="ca-mc-grid">
              <!-- 五个气象小卡：icon点 + 中文名 + 具体数值/描述 + 底部英文小字 -->
              <div
                v-for="(m, i) in fiveMeteo"
                :key="m.k"
                class="ca-mc-item"
                :style="{ '--mc': m.color } as Record<string, string>"
              >
                <span class="ca-mc-dot"></span>
                <div class="ca-mc-text">
                  <span class="ca-mc-k">{{ m.k }}</span>
                  <!-- 具体数值：按 i 对应 nightSky.meteo 或月相（越界安全封装） -->
                  <span class="ca-mc-v">
                    {{ nightSky.weatherValueAt(i as 0|1|2|3|4) }}
                  </span>
                  <span class="ca-mc-en">{{ m.en }}</span>
                </div>
                <!-- 百分比小横条（极短，只做装饰不占高） -->
                <div class="ca-mc-bar">
                  <div class="ca-mc-fill" :style="{ width: (persona.dimensions[i]?.percent ?? 50) + '%' }"></div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- tooFew 空态 -->
      <div v-else-if="tooFewStories" class="persona-empty empty-scant">
        <div class="pe-icon-wrap pe-scant"><BookDashed :size="14" /></div>
        <div class="pe-text">
          <div class="pe-title">星笺故事不足</div>
          <div class="pe-sub">当前 <b>{{ displayStoryCount }}</b> 条故事，累计 3 条后 AI 生成「夜观手记 · 月色与气象」</div>
        </div>
      </div>
      <!-- loading 骨架屏 -->
      <div v-else class="persona-empty empty-loading">
        <div class="pe-icon-wrap pe-loading"><Sparkle :size="14" class="spin-slow" /></div>
        <div class="pe-text">
          <div class="pe-title">夜观手记生成中…</div>
          <div class="pe-sub">正在从 {{ displayStoryCount }} 则心事中聚合月相、节气、夜温与五大气象</div>
        </div>
        <div class="skeleton-lines">
          <span class="sk-line sk-1"></span>
          <span class="sk-line sk-2"></span>
          <span class="sk-line sk-3"></span>
        </div>
      </div>
    </section>



    <!-- ═══ 2. AI 选本·代表故事 + 钞本年代/心事时间轨迹（双栏：左=纵向列表，右=轨迹，保持原滚动方向） ═══ -->
    <div class="ca-night-track-wrap">
      <!-- 左：AI 选本·代表故事（取代原「夜色流转」，纵向卡片列表，走原 y 滚动；视觉对齐共鸣榜 + 情绪洞察） -->
      <section class="panel-wrapper ca-night-flow ca-night-flow-left ca-night-flow-stories">
        <div class="panel-head">
          <BookOpen :size="10" class="pw-icon pw-gold" />
          <span class="pw-title">{{ isAncientTone ? 'AI 选本·代表钞本' : 'AI 选本·代表心事' }}</span>
          <span class="pw-count">{{
            hasReal
              ? (isAncientTone ? `钞取 ${storyCards.length} 篇` : `精选 ${storyCards.length} 篇`)
              : tooFewStories ? '未生成' : '生成中'
          }}</span>
        </div>

        <!-- 真实态：1 列纵向卡片（4 条，保持原 y 轴滚动；每条 = rank + 星名/作者 + AI 推荐语 + 节选 + 日期/标签） -->
        <div v-if="hasReal" class="ca-emotion-body ca-night-scroll ca-story-scroll">
          <div class="ca-story-grid">
            <article
              v-for="(s, i) in storyCards"
              :key="i"
              class="ca-story-item"
              :style="{ '--accent': s.color, '--cs-idx': i } as Record<string, string | number>"
            >
              <!-- 左侧色条 + rank（对标共鸣榜 ca-rank-item::before + ca-rank-no） -->
              <div class="ca-story-side">
                <span class="ca-story-rank" :class="`ca-story-rank-${i + 1}`">{{ s.rank }}</span>
              </div>

              <!-- 主体：标题/作者 → AI 推荐语（1 句简短） → 节选内容 → 日期/标签 -->
              <div class="ca-story-body">
                <div class="ca-story-head">
                  <span class="ca-story-starnav">{{ s.starName }}</span>
                  <span class="ca-story-author" v-if="s.author">{{ s.author }}</span>
                </div>

                <!-- AI 推荐语：✨ 荐： + trimReason 清洗输出（强制剥掉 Top1/次选等排名臭词，就算 DB 旧缓存也干净），超短一句话道神韵，无排名字眼 -->
                <div class="ca-story-reason">
                  <Sparkles :size="8" class="ca-story-reason-icon" />
                  <span class="ca-story-reason-prefix">荐：</span>
                  <span class="ca-story-reason-text">{{ trimReason(s.reason, s.tags?.[0]) }}</span>
                </div>

                <!-- 节选内容（推荐语之后，3 行截断：跟「共鸣榜 TopN summary」视觉一致） -->
                <p class="ca-story-excerpt">{{ s.text }}</p>

                <div class="ca-story-foot">
                  <span class="ca-story-date" v-if="s.date">
                    <CalendarClock :size="8" class="ca-story-foot-icon" />
                    {{ s.date }}
                  </span>
                  <div class="ca-story-tags" v-if="s.tags?.length">
                    <span v-for="(t, ti) in s.tags.slice(0, 2)" :key="ti" class="ca-story-tag">#{{ t }}</span>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>

        <!-- tooFew 空态（复用共鸣榜同一套） -->
        <div v-else-if="tooFewStories" class="persona-empty empty-scant">
          <div class="pe-icon-wrap pe-scant"><BookDashed :size="14" /></div>
          <div class="pe-text">
            <div class="pe-title">星笺故事不足</div>
            <div class="pe-sub">当前 <b>{{ displayStoryCount }}</b> 条故事，累计 3 条后 AI 为你挑选{{ isAncientTone ? '代表篇什' : '代表故事' }}</div>
          </div>
        </div>
        <!-- loading 骨架（复用共鸣榜同一套 skeleton） -->
        <div v-else class="persona-empty empty-loading">
          <div class="pe-icon-wrap pe-loading"><Sparkle :size="14" class="spin-slow" /></div>
          <div class="pe-text">
            <div class="pe-title">{{ isAncientTone ? 'AI 正在钞取代表篇什…' : 'AI 正在挑选代表故事…' }}</div>
            <div class="pe-sub">按共鸣度排序、兼顾情绪覆盖，从 {{ displayStoryCount }} 则中选篇</div>
          </div>
          <div class="skeleton-lines">
            <span class="sk-line sk-1"></span>
            <span class="sk-line sk-2"></span>
            <span class="sk-line sk-3"></span>
          </div>
        </div>
      </section>

      <!-- 右：钞本年代·气脉流转 / 心事投递时间轨迹（保留，不变） -->
      <section class="panel-wrapper ca-night-side-track">
        <div class="panel-head">
          <Clock3 :size="10" class="pw-icon pw-purple" />
          <span class="pw-title">{{ isAncientTone ? '钞本年代·气脉流转' : '心事投递时间轨迹' }}</span>
          <span class="pw-count">{{
            hasReal
              ? (isAncientTone ? `${heroStars.length} 篇 · 连线=钞次先后` : `${heroStars.length} 段 · 连线=时间轨迹`)
              : tooFewStories ? '未生成' : '生成中'
          }}</span>
        </div>

        <!-- 真实态：轨迹图 + 图例 + 4统计 + 说明 -->
        <div v-if="hasReal" class="ca-emotion-body ca-track-body">
          <div class="ca-emo-right ca-emo-side-track ca-track-inner">
            <svg viewBox="0 0 420 280" class="ca-et-svg" preserveAspectRatio="xMidYMid meet">
              <defs>
                <radialGradient id="hSkyBg2" cx="50%" cy="40%" r="80%">
                  <stop offset="0%" stop-color="#111438" />
                  <stop offset="100%" stop-color="#0a0b1f" />
                </radialGradient>
                <radialGradient id="hGlowGold2" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="rgba(255,217,138,0.85)" />
                  <stop offset="100%" stop-color="rgba(255,217,138,0)" />
                </radialGradient>
                <radialGradient id="hGlowBlue2" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="rgba(134,168,255,0.85)" />
                  <stop offset="100%" stop-color="rgba(134,168,255,0)" />
                </radialGradient>
                <radialGradient id="hGlowPurple2" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="rgba(202,167,255,0.85)" />
                  <stop offset="100%" stop-color="rgba(202,167,255,0)" />
                </radialGradient>
                <radialGradient id="hGlowGreen2" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="rgba(154,230,180,0.85)" />
                  <stop offset="100%" stop-color="rgba(154,230,180,0)" />
                </radialGradient>
              </defs>

              <!-- 背景 + 银河斜带 -->
              <rect width="420" height="280" fill="url(#hSkyBg2)" rx="6" />
              <ellipse cx="210" cy="140" rx="195" ry="60" fill="rgba(202,167,255,0.055)" transform="rotate(-16 210 140)" />
              <ellipse cx="210" cy="145" rx="160" ry="36" fill="rgba(134,168,255,0.035)" transform="rotate(-16 210 145)" />

              <!-- 背景星点 60 颗 -->
              <g opacity="0.92">
                <circle v-for="(s, i) in deepSkyStars.slice(0, 60)" :key="'dss2'+i"
                  :cx="(s.x / 320) * 420"
                  :cy="(s.y / 200) * 260 + 10"
                  :r="s.r * 0.82"
                  fill="#ffffff"
                  :opacity="s.opacity * 0.78" />
              </g>

              <!-- 星点=心事/钞本篇目（按时间/钞次排序）+ 标签 -->
              <g v-for="(p, i) in heroStars" :key="'hs2'+i">
                <circle :cx="Math.round(p.x * 420 / 360)" :cy="Math.round(p.y * 280 / 220)" :r="p.r * 1.05"
                  :fill="'url(#hGlow' + p.gid + '2)'" opacity="0.82">
                  <animate attributeName="r" :values="((p.r*2.4*1.05))+';'+((p.r*2.9+0.8)*1.05)+';'+((p.r*2.4*1.05))"
                    :dur="(3.1 + i*0.32) + 's'" repeatCount="indefinite" />
                </circle>
                <circle :cx="Math.round(p.x * 420 / 360)" :cy="Math.round(p.y * 280 / 220)" :r="p.r * 1.05"
                  :fill="p.fill" opacity="0.98" />
                <text v-if="p.label" :x="Math.round(p.x * 420 / 360) + p.r * 1.05 + 6"
                  :y="Math.round(p.y * 280 / 220) + 3"
                  font-size="7.8" fill="rgba(240,240,255,0.62)"
                  font-family="'SF Mono', 'JetBrains Mono', 'Menlo', monospace">
                  {{ p.label }}
                </text>
              </g>

              <!-- 坐标轴 -->
              <g fill="rgba(220,220,240,0.38)" font-family="SF Mono, Menlo, monospace" font-size="8">
                <template v-if="isAncientTone">
                  <text x="10"  y="270">戌初</text>
                  <text x="140" y="270">子正</text>
                  <text x="268" y="270">寅正</text>
                  <text x="375" y="270">卯末</text>
                  <text x="6" y="18"   opacity="0.6">气之扬</text>
                  <text x="6" y="258"  opacity="0.6">气之沉</text>
                  <text x="10" y="145"  opacity="0.28" font-size="7">气脉轴</text>
                  <text x="200" y="278" opacity="0.28" font-size="7" text-anchor="middle">钞次先后</text>
                </template>
                <template v-else>
                  <text x="10"  y="270">20:00</text>
                  <text x="140" y="270">00:00</text>
                  <text x="268" y="270">04:00</text>
                  <text x="375" y="270">06:00</text>
                  <text x="6" y="18"   opacity="0.6">+ 情绪</text>
                  <text x="6" y="258"  opacity="0.6">− 情绪</text>
                  <text x="10" y="145"  opacity="0.28" font-size="7">情绪轴</text>
                  <text x="200" y="278" opacity="0.28" font-size="7" text-anchor="middle">时间轴 · 投递时刻</text>
                </template>
              </g>

              <!-- 星群轮廓线（按时间/钞次顺序连接） -->
              <polyline
                :points="heroStars.map(p => `${Math.round(p.x*420/360)},${Math.round(p.y*280/220)}`).join(' ')"
                fill="none" stroke="rgba(255,217,138,0.25)" stroke-width="0.8"
                stroke-dasharray="2 3" stroke-linecap="round"
                style="filter: drop-shadow(0 0 2px rgba(255,217,138,0.2))" />
            </svg>
            <div class="ca-et-legend">
              <template v-if="isAncientTone">
                <span><i style="background:#ffd98a"></i>金 · 雅正</span>
                <span><i style="background:#caa7ff"></i>紫 · 幽忧</span>
                <span><i style="background:#86a8ff"></i>蓝 · 清远</span>
                <span><i style="background:#9ae6b4"></i>绿 · 冲淡</span>
                <span class="ca-h-legend-note">· 连线=钞次先后</span>
              </template>
              <template v-else>
                <span><i style="background:#ffd98a"></i>暖色 · 喜悦/思念</span>
                <span><i style="background:#caa7ff"></i>紫 · 柔软/低落</span>
                <span><i style="background:#86a8ff"></i>蓝 · 平静/释然</span>
                <span><i style="background:#9ae6b4"></i>绿 · 释然/新生</span>
                <span class="ca-h-legend-note">· 连线=时间轨迹</span>
              </template>
            </div>

            <!-- 4 小格统计：从后端动态 heroStats 拉（古代/现代两套文案在后端生成） -->
            <div class="ca-et-stats">
              <div v-for="(s, i) in heroStats.slice(0, 4)" :key="'etst'+i"
                class="ca-et-stat"
                :class="{
                  'ca-et-stat-gold':   i % 4 === 0,
                  'ca-et-stat-purple': i % 4 === 1,
                  'ca-et-stat-blue':   i % 4 === 2,
                  'ca-et-stat-green':  i % 4 === 3,
                }">
                <span class="ca-es-k">{{ s.k }}</span>
                <span class="ca-es-v" v-html="s.v"></span>
                <span class="ca-es-sub">{{ s.sub }}</span>
              </div>
            </div>

            <!-- 底部一句话说明条：按 tone 切 -->
            <p class="ca-et-note">
              <component :is="Sparkles" :size="9" class="ca-et-note-icon" />
              <template v-if="isAncientTone">
                {{ nightSky.timeSpan.split('·')[0].trim() }} · 凡 {{ storyCount }} 首，以钞次为序，气脉由下而上，由沉而扬。
              </template>
              <template v-else>
                从 20:00 到 06:00，共 {{ storyCount }} 则心事 —— 连线是心事出现的顺序，越靠上=情绪越亮。
              </template>
            </p>
          </div>
        </div>

        <!-- tooFew：空态（所有框都要显示，只是内部提示不够） -->
        <div v-else-if="tooFewStories" class="persona-empty empty-scant">
          <div class="pe-icon-wrap pe-scant"><BookDashed :size="14" /></div>
          <div class="pe-text">
            <div class="pe-title">星笺故事不足</div>
            <div class="pe-sub">当前 <b>{{ displayStoryCount }}</b> 条故事，累计 3 条后 AI 画出「投递时刻 × 情绪」的时间轨迹</div>
          </div>
        </div>

        <!-- loading：骨架屏 -->
        <div v-else class="persona-empty empty-loading">
          <div class="pe-icon-wrap pe-loading"><Sparkle :size="14" class="spin-slow" /></div>
          <div class="pe-text">
            <div class="pe-title">心事时间轨迹生成中…</div>
            <div class="pe-sub">正在按投递时辰串起 {{ displayStoryCount }} 则心事的星群轨迹线</div>
          </div>
          <div class="skeleton-lines">
            <span class="sk-line sk-1"></span>
            <span class="sk-line sk-2"></span>
            <span class="sk-line sk-3"></span>
          </div>
        </div>
      </section>
    </div>





    <!-- ═══ 4. 时辰热力 / 气脉十二时 → 星河下改为「卷目疏」 ═══ -->
    <section class="panel-wrapper ca-hour">
      <div class="panel-head">
        <template v-if="!isGalaxy">
          <Clock3 :size="10" class="pw-icon pw-purple" />
          <span class="pw-title">{{ isAncientTone ? '气脉十二时' : '时辰热力' }}</span>
          <span class="pw-count">{{
            hasReal
              ? (isAncientTone
                  ? `盛时 ${DIZHI_PER_2H[peakHour] ?? '子'} · 衰时 ${DIZHI_PER_2H[lowHour] ?? '寅'}`
                  : `高峰 ${pad(peakHour)}:00 · 低谷 ${pad(lowHour)}:00`)
              : tooFewStories ? '未生成' : '生成中'
          }}</span>
        </template>
        <template v-else>
          <BookText :size="10" class="pw-icon" style="color: #E8B86D" />
          <span class="pw-title">卷目疏</span>
          <span class="pw-count">{{
            hasReal || scrollBooks.length
              ? `共 ${scrollBooks.length} 卷 · ${scrollBooks.reduce((s, b) => s + b.count, 0)} 则`
              : tooFewStories ? '未生成' : '生成中'
          }}</span>
        </template>
      </div>

      <!-- ═════════════════════ 非星河：气脉十二时/时辰热力（原结构保留） ═════════════════════ -->
      <!-- 真实态：珠子热力图 + 十二地支轴 + 高峰低谷洞察 -->
      <div v-if="!isGalaxy && hasReal" class="ca-hour-body">
        <div class="ca-hour-beads">
          <span
            v-for="(v, h) in hourly"
            :key="h"
            class="ca-bead"
            :style="{
              background: beadColor(v),
              width: beadSize(v) + 'px',
              height: beadSize(v) + 'px',
              boxShadow: v > 8 ? `0 0 8px ${beadColor(v)}88` : 'none',
            }"
            :title="`${h}:00 — ${v} 条`"
          ></span>
        </div>
        <div class="ca-hour-axis">
          <span>子</span><span>丑</span><span>寅</span><span>卯</span>
          <span>辰</span><span>巳</span><span>午</span><span>未</span>
          <span>申</span><span>酉</span><span>戌</span><span>亥</span>
        </div>
        <div class="ca-hour-insights">
          <template v-if="isAncientTone">
            <div class="ca-hi ca-hi-peak">
              <span class="ca-hi-prefix">盛时</span>
              <span class="ca-hi-time">{{ DIZHI_PER_2H[peakHour] }}时 · {{ pad(peakHour) }}-{{ pad((peakHour+2)%24) }}</span>
              <span class="ca-hi-count">集中 {{ peakPct }}%</span>
              <p class="ca-hi-desc">{{ `${DIZHI_PER_2H[peakHour] ?? '子'}时气聚，诸篇什多出于是；或月在梧桐，或灯明窗下，兴会所至，辄复成咏。` }}</p>
            </div>
            <div class="ca-hi ca-hi-low">
              <span class="ca-hi-prefix">衰时</span>
              <span class="ca-hi-time">{{ DIZHI_PER_2H[lowHour] }}时 · {{ pad(lowHour) }}-{{ pad((lowHour+2)%24) }}</span>
              <span class="ca-hi-count">仅 {{ lowPct }}%</span>
              <p class="ca-hi-desc">{{ `${DIZHI_PER_2H[lowHour] ?? '寅'}时声希，卷轴阒然；意兴既阑，天机亦息，俟乎东方之既白。` }}</p>
            </div>
          </template>
          <template v-else>
            <div class="ca-hi ca-hi-peak">
              <span class="ca-hi-prefix">高峰</span>
              <span class="ca-hi-time">{{ hourRangeText(peakHour) }}</span>
              <span class="ca-hi-count">{{ peakPct }}% 投递集中</span>
              <p class="ca-hi-desc">{{ `${DIZHI_PER_2H[peakHour] ?? '子'}时最盛——白天没说完的话，总在这一两个小时里，借着夜色写下来。` }}</p>
            </div>
            <div class="ca-hi ca-hi-low">
              <span class="ca-hi-prefix">低谷</span>
              <span class="ca-hi-time">{{ hourRangeText(lowHour) }}</span>
              <span class="ca-hi-count">仅 {{ lowPct }}% 故事</span>
              <p class="ca-hi-desc">{{ `${DIZHI_PER_2H[lowHour] ?? '卯'}时最静——人们多半已睡着，或已开始了新的一天；昨夜的心事，有的随晨光散了。` }}</p>
            </div>
          </template>
        </div>
      </div>

      <!-- tooFew：空态（非星河） -->
      <div v-else-if="!isGalaxy && tooFewStories" class="persona-empty empty-scant">
        <div class="pe-icon-wrap pe-scant"><BookDashed :size="14" /></div>
        <div class="pe-text">
          <div class="pe-title">星笺故事不足</div>
          <div class="pe-sub">当前 <b>{{ displayStoryCount }}</b> 条故事，累计 3 条后 AI 画出「子丑寅卯…」十二时辰热力珠</div>
        </div>
      </div>

      <!-- loading：骨架屏（非星河） -->
      <div v-else-if="!isGalaxy" class="persona-empty empty-loading">
        <div class="pe-icon-wrap pe-loading"><Sparkle :size="14" class="spin-slow" /></div>
        <div class="pe-text">
          <div class="pe-title">时辰热力生成中…</div>
          <div class="pe-sub">正在从 {{ displayStoryCount }} 则心事中聚合 24 时辰投递高峰</div>
        </div>
        <div class="skeleton-lines">
          <span class="sk-line sk-1"></span>
          <span class="sk-line sk-2"></span>
          <span class="sk-line sk-3"></span>
        </div>
      </div>

      <!-- ═════════════════════ 星河合集：卷目疏（真实/loading/tooFew） ═════════════════════ -->
      <!-- 真实态：主卷 2 大卡片预览 + 次卷条目条柱 -->
      <div v-else-if="hasReal || scrollBooks.length > 0" class="scroll-body">
        <!-- 主卷：两列大卡片 -->
        <div class="scroll-head-cards">
          <div
            v-for="b in scrollBooksTop2"
            :key="b.name"
            class="scroll-card"
            :style="{ '--sc': b.color }"
          >
            <div class="sc-banner">
              <component :is="b.icon" :size="14" class="sc-icon" />
              <div class="sc-head-text">
                <span class="sc-name">{{ b.name }}</span>
                <span class="sc-tag">{{ b.tag }}</span>
              </div>
              <span class="sc-count">{{ b.count }} 则</span>
            </div>
            <ul class="sc-tops">
              <li
                v-for="t in b.topStories"
                :key="t.id"
                class="sc-top-item"
                @click="$emit('story-click', { id: t.id })"
              >
                <span class="sc-top-title">{{ t.title }}</span>
                <span class="sc-top-sub">
                  <span v-if="t.author" class="sc-top-author">{{ t.author }}</span>
                  <span v-if="t.resonance > 0" class="sc-top-res">{{ t.resonance }} 共鸣</span>
                </span>
              </li>
              <li v-if="!b.topStories.length" class="sc-top-item sc-top-empty">本卷卷首篇目待补。</li>
            </ul>
          </div>
        </div>
        <!-- 次卷：横向条柱列表（>2 的其余卷） -->
        <div v-if="scrollBooks.length > 2" class="scroll-other">
          <div class="so-title">
            <BookMarked :size="9" />
            <span>其余 {{ scrollBooks.length - 2 }} 卷</span>
          </div>
          <div class="so-list">
            <div
              v-for="b in scrollBooks.slice(2)"
              :key="b.name"
              class="so-row"
              :style="{ '--sc': b.color }"
            >
              <component :is="b.icon" :size="9" class="so-icon" />
              <span class="so-name">{{ b.name }}</span>
              <span class="so-tag">{{ b.tag }}</span>
              <div class="so-bar"><span class="so-fill"></span></div>
              <span class="so-count">{{ b.count }} 则</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 星河：tooFew 空态 -->
      <div v-else-if="tooFewStories" class="persona-empty empty-scant">
        <div class="pe-icon-wrap pe-scant"><BookText :size="14" /></div>
        <div class="pe-text">
          <div class="pe-title">卷轴尚未展开</div>
          <div class="pe-sub">当前 <b>{{ displayStoryCount }}</b> 则故事，累计 3 则后按体裁与源流拆卷，编排为《卷目疏》</div>
        </div>
      </div>

      <!-- 星河：loading 骨架 -->
      <div v-else class="persona-empty empty-loading">
        <div class="pe-icon-wrap pe-loading"><Scroll :size="14" class="spin-slow" /></div>
        <div class="pe-text">
          <div class="pe-title">卷目疏缮写中…</div>
          <div class="pe-sub">正按体裁与文化源流为 {{ displayStoryCount }} 则故事拆卷归类</div>
        </div>
        <div class="skeleton-lines">
          <span class="sk-line sk-1"></span>
          <span class="sk-line sk-2"></span>
          <span class="sk-line sk-3"></span>
        </div>
      </div>
    </section>



    <!-- ═══ 5. 共鸣榜 + 情感轨迹（双栏，情感轨迹替换原关键词云）═══ -->
    <div class="ca-duo">
      <!-- 共鸣榜 -->
      <section class="panel-wrapper ca-rank">
        <div class="panel-head">
          <Flame :size="10" class="pw-icon" style="color: #ffb877" />
          <span class="pw-title">共鸣榜</span>
          <span class="pw-count">{{
            hasReal ? `Top ${rankList.length}` : tooFewStories ? '未生成' : '生成中'
          }}</span>
        </div>

        <!-- 真实态：共鸣 Top3 列表 -->
        <div v-if="hasReal" class="ca-rank-body">
          <article
            v-for="(r, i) in rankList"
            :key="r.id"
            class="ca-rank-item"
            @click="$emit('story-click', r)"
          >
            <div class="ca-rank-no" :class="`ca-rank-no-${i + 1}`">{{ i + 1 }}</div>
            <div class="ca-rank-main">
              <div class="ca-rank-title">
                {{ r.title }}
                <span v-if="r.author" class="ca-rank-author">{{ r.author }}</span>
              </div>
              <div class="ca-rank-summary">{{ r.summary }}</div>
            </div>
            <div class="ca-rank-res">
              <Heart :size="11" />
              <span>{{ r.resonance }}</span>
            </div>
          </article>
        </div>

        <!-- tooFew 空态 -->
        <div v-else-if="tooFewStories" class="persona-empty empty-scant">
          <div class="pe-icon-wrap pe-scant"><BookDashed :size="14" /></div>
          <div class="pe-text">
            <div class="pe-title">星笺故事不足</div>
            <div class="pe-sub">当前 <b>{{ displayStoryCount }}</b> 条故事，累计 3 条后 AI 排出 Top3 共鸣榜</div>
          </div>
        </div>

        <!-- loading 骨架 -->
        <div v-else class="persona-empty empty-loading">
          <div class="pe-icon-wrap pe-loading"><Sparkle :size="14" class="spin-slow" /></div>
          <div class="pe-text">
            <div class="pe-title">共鸣榜生成中…</div>
            <div class="pe-sub">正在按共鸣值排序 {{ displayStoryCount }} 则心事</div>
          </div>
          <div class="skeleton-lines">
            <span class="sk-line sk-1"></span>
            <span class="sk-line sk-2"></span>
            <span class="sk-line sk-3"></span>
          </div>
        </div>
      </section>

      <!-- 情感轨迹（从原独立全宽位移入双栏，限高滚动+渐隐+展开） -->
      <section class="panel-wrapper ca-trajectory">
        <div class="panel-head">
          <Route :size="10" class="pw-icon pw-green" />
          <span class="pw-title">情感轨迹</span>
          <span class="pw-count">{{
            hasReal
              ? (hasReal ? `${trajectory.length} 则` : '')
              : tooFewStories ? '未生成' : '生成中'
          }}</span>
          <button
            v-if="hasReal && trajectory.length > 3"
            class="ca-traj-toggle"
            @click="trajExpanded = !trajExpanded"
          >{{ trajExpanded ? '收起' : '展开' }}</button>
        </div>

        <!-- 真实态：轨迹时间线 -->
        <div v-if="hasReal" class="ca-traj-scroll" :class="{ expanded: trajExpanded }">
          <div class="ca-traj-body">
            <div class="ca-traj-line"></div>
            <div
              v-for="(p, i) in trajectory"
              :key="i"
              class="ca-traj-node"
              :style="{ '--node-color': p.color } as Record<string, string>"
            >
              <div class="ca-traj-dot" :style="{ background: p.color, boxShadow: `0 0 8px ${p.color}aa` }"></div>
              <div class="ca-traj-card">
                <div class="ca-traj-head">
                  <span class="ca-traj-emo" :style="{ color: p.color }">{{ p.emotion }}</span>
                  <span class="ca-traj-date">{{ p.date }}</span>
                </div>
                <div class="ca-traj-title">{{ p.title }}</div>
                <div class="ca-traj-snippet">{{ p.snippet }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- tooFew 空态 -->
        <div v-else-if="tooFewStories" class="persona-empty empty-scant">
          <div class="pe-icon-wrap pe-scant"><BookDashed :size="14" /></div>
          <div class="pe-text">
            <div class="pe-title">星笺故事不足</div>
            <div class="pe-sub">当前 <b>{{ displayStoryCount }}</b> 条故事，累计 3 条后 AI 串联情感时间线</div>
          </div>
        </div>

        <!-- loading 骨架 -->
        <div v-else class="persona-empty empty-loading">
          <div class="pe-icon-wrap pe-loading"><Sparkle :size="14" class="spin-slow" /></div>
          <div class="pe-text">
            <div class="pe-title">情感轨迹生成中…</div>
            <div class="pe-sub">正在按时间串联 {{ displayStoryCount }} 则心事的情绪节点</div>
          </div>
          <div class="skeleton-lines">
            <span class="sk-line sk-1"></span>
            <span class="sk-line sk-2"></span>
            <span class="sk-line sk-3"></span>
          </div>
        </div>
      </section>
    </div>



    <!-- 底部说明（设计预览标记）-->
    <div class="ca-foot-note">
      <Info :size="11" />
      <span>AI 解读内容由 agent 根据合集中的心事实时聚合生成。</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef, type Component } from 'vue'
import {
  Sparkles, MoonStar, HeartPulse, Orbit, Clock3, Route, Flame, Heart,
  Feather, Info, Quote, CloudSun, Sparkle, BookDashed, AlertTriangle, RotateCcw,
  BookOpen, UserSquare2, CalendarClock, Scroll, BookText, BookMarked,
} from 'lucide-vue-next'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { getStarNameInfo } from '../../utils/starName'
import { dateToJD, lstDeg, altAz } from '../../utils/astro'
import { useLocation } from '../../composables/useLocation'
import { useCollectionAnalysis, type NightscapePayload } from '../../composables/useCollectionAnalysis'

marked.setOptions({ breaks: true, gfm: true })

const props = defineProps<{
  collectionId: number | null
  collectionName: string
  storyCount: number
  /** 合集可见性：public/private/anonymous/galaxy；星河会替换时辰/气脉相关面板为官方卷目样式 */
  visibility?: 'public' | 'private' | 'anonymous' | 'galaxy'
  /** 真实故事列表，用于共鸣榜与星辰归属（若为空则用 mock） */
  stories?: Array<{
    id: number
    title: string | null
    content: string
    resonanceCount: number
    createdAt: string
    catalogStarId?: number | null
    catalogStarIds?: number[]
    /** 作者名：历史故事=苏轼/李清照 等具体人名；用户故事可能为空或匿名 */
    creator_name?: string | null
    /** 故事类型：history=历史故事 / user=用户投稿 */
    type?: 'history' | 'user'
    /** 文化源流：中国/古希腊/阿拉伯语/近代命名/跨文化…（星河卷目分组用） */
    origin?: string | null
    tags?: string[]
  }>
  /** 可选：合集总共鸣数（不传则从 stories.reduce 计算，或 fallback 到 mock 237） */
  resonanceTotal?: number
}>()

defineEmits<{
  'story-click': [story: any]
}>()

// ─── 调用 useCollectionAnalysis（仿 StarDetail）───
const collId = toRef(props, 'collectionId')
const collAnalysis = useCollectionAnalysis(collId)

// ─── 三态开关（优先级：hasError > hasReal > tooFewStories > isLoading） ───
// 1) hasError：API 请求失败 → 全局红色 error 条 + 每个 section 内部 v-else 显示错误
// 2) hasReal：ready=true 或 _stale=true → 显示真实数据（三模块任一有值用真实，全空走computed兜底）
//    放宽：ready=true 不再死卡 nightscape，避免后端返回 ready=true 但某字段为 null 时三态死锁
// 3) tooFewStories：后端 tooFew=true 或 props.storyCount<3 → 星笺故事不足
// 4) isLoading：其余（loading=true 或 ready=false 且非 tooFew/非_stale） → 生成中骨架
const hasError = computed(() => !!collAnalysis.error.value)

const hasReal = computed(() => {
  const a = collAnalysis.analysis.value
  if (!a) return false
  // 后端 ready=true → AI 明确说生成完了，不管字段全不全都显示（computed 会兜底）
  if (a.ready) return true
  // 前端轮询超时标记（_stale=true）：强制降级显示，避免永远骨架「加载完也不自动载入」
  if (a._stale) return true
  // 兜底：三大模块至少有 2 个非空 → 视为可用内容（哪怕 ready=false，避免卡骨架）
  const nonNull = [a.persona, a.emotion, a.nightscape].filter(v => v != null).length
  return nonNull >= 2
})

const tooFewStories = computed(() => {
  if (hasError.value || hasReal.value) return false
  const fromApi = collAnalysis.analysis.value?.tooFewStories
  if (fromApi === true) return true
  if (collAnalysis.analysis.value?.ready) return false // API 明确 ready → 不为 tooFew
  if (collAnalysis.analysis.value?._stale) return false // 已降级显示 real → 不为 tooFew
  // API 未返回时用 props 兜底（可能是尚未请求到）
  return (props.storyCount ?? 0) < 3
})

const isLoading = computed(() => {
  if (hasError.value || tooFewStories.value || hasReal.value) return false
  // loading=true（首次/轮询中） OR ready=false 且后端明确说故事数>=3 且未降级 → 骨架
  if (collAnalysis.loading.value) return true
  const a = collAnalysis.analysis.value
  if (a && !a.ready && !a.tooFewStories && !a._stale) return true
  // 兜底：尚未请求到 analysis（例如轮询间隙）且 故事>=3 → 仍视为生成中（避免三态都 false 卡死）
  if (!a && (props.storyCount ?? 0) >= 3) return true
  return false
})

const displayStoryCount = computed(() => {
  const fromApi = collAnalysis.analysis.value?.storyCount
  if (typeof fromApi === 'number') return fromApi
  return props.storyCount ?? 0
})

/** 合集语气：modern 现代陪伴 / ancient 古籍诗话（根据历史故事占比自动） */
const isAncientTone = computed(() => {
  const a = collAnalysis.analysis.value
  if (!a) return false
  if (a.tone === 'ancient') return true
  if (a.nightscape?.tone === 'ancient') return true
  return false
})

/** 全局重试按钮：重置状态 + 重新拉取 analysis */
function onRetryAnalysis() {
  collAnalysis.reset()
  collAnalysis.fetchAnalysis()
}

// ─── 从 API 返回值取值（兜底到旧 mock 避免突然空白） ───
const _p = computed(() => collAnalysis.analysis.value?.persona)
const _e = computed(() => collAnalysis.analysis.value?.emotion)
const _n = computed<NightscapePayload | null | undefined>(() => collAnalysis.analysis.value?.nightscape)

const persona = computed(() => {
  const p = _p.value
  if (isAncientTone.value) {
    // 古代版兜底：不显示现代「夜雨孤灯/每盏孤灯」陪伴口吻，改用温和古籍感表达（哪怕真实数据为空，也不违和）
    return {
      hanName: p?.hanName ?? '亭林本事',
      constellation: p?.constellation ?? `${props.collectionName ?? '合集'} · 钞本`,
      tags: p?.tags ?? ['思念', '怀旧', '独白', '夜雨', '故人'],
      quote: p?.quote ?? '「桃李春风一杯酒，江湖夜雨十年灯。」',
      suggestIntro: p?.suggestIntro ?? `这卷钞本共 ${displayStoryCount.value} 则旧文字，字里行间藏着千年前的心情——和今夜的心事一模一样。`,
      paragraphFirst: p?.paragraphs?.[0] ?? '这些句子跨越了成百上千年，但想念一个人的心、错过一件事的遗憾、被一阵风一场雨勾起的回忆——全是共通的。它们不是封存在古籍里的文字，而是活生生的、和你我一样的心情。',
      paragraphSecond: p?.paragraphs?.[1] ?? '读的时候常常会停下来：千年前的某个人，在某个和今夜差不多的雨夜里，写下过和你此刻一样的句子。原来我们都不是孤独的。',
      paragraphs: [
        p?.paragraphs?.[0] ?? '这些句子跨越了成百上千年，但想念一个人的心、错过一件事的遗憾、被一阵风一场雨勾起的回忆——全是共通的。它们不是封存在古籍里的文字，而是活生生的、和你我一样的心情。',
        p?.paragraphs?.[1] ?? '读的时候常常会停下来：千年前的某个人，在某个和今夜差不多的雨夜里，写下过和你此刻一样的句子。原来我们都不是孤独的。',
      ],
      dimensions: (p?.dimensions?.length ?? 0) >= 5 ? p!.dimensions : [
        { left: '怀念', right: '向前', percent: 72, side: 'left' as const },
        { left: '克制', right: '热烈', percent: 66, side: 'left' as const },
        { left: '独处', right: '交集', percent: 78, side: 'left' as const },
        { left: '旧事', right: '来日', percent: 60, side: 'left' as const },
        { left: '幽深', right: '明亮', percent: 55, side: 'left' as const },
      ],
    }
  }
  // 现代版兜底（原：夜雨孤灯+陪伴口吻，不变）
  return {
    hanName: p?.hanName ?? '夜雨孤灯',
    constellation: p?.constellation ?? `${props.collectionName} · 默认合集`,
    tags: p?.tags ?? ['思念', '夜雨', '独行', '回忆', '微光'],
    quote: p?.quote ?? '每一盏孤灯，都是夜里不肯睡的人。',
    suggestIntro: p?.suggestIntro ?? '这卷星笺里收着夜半醒来的低语——雨声、灯影、与不肯寄出的思念。心事在子时最稠，在卯时散去，像一缕没说完的话。',
    paragraphFirst: p?.paragraphs?.[0] ?? '它们总在夜雨最盛时落下，字里行间带着潮湿的呼吸——有的写给远方的人，有的写给回不去的某个夜晚。每一则都是点亮又按灭的灯，独自亮了很久，才被收进这卷笺里。',
    paragraphSecond: p?.paragraphs?.[1] ?? '虽然底色是思念与独行，但并非完全沉寂——从字缝里仍能看见微光：雨后的风、清晨的第一缕阳光、陌生人留下的一句话。它们像卷轴上的金粉，被轻轻一拂，就亮了起来。',
    paragraphs: [
      p?.paragraphs?.[0] ?? '它们总在夜雨最盛时落下，字里行间带着潮湿的呼吸——有的写给远方的人，有的写给回不去的某个夜晚。每一则都是点亮又按灭的灯，独自亮了很久，才被收进这卷笺里。',
      p?.paragraphs?.[1] ?? '虽然底色是思念与独行，但并非完全沉寂——从字缝里仍能看见微光：雨后的风、清晨的第一缕阳光、陌生人留下的一句话。它们像卷轴上的金粉，被轻轻一拂，就亮了起来。',
    ],
    dimensions: (p?.dimensions?.length ?? 0) >= 5 ? p!.dimensions : [
      { left: '内向',   right: '外向',   percent: 78, side: 'left'  as const },
      { left: '柔和',   right: '锋利',   percent: 34, side: 'left'  as const },
      { left: '沉静',   right: '炽烈',   percent: 62, side: 'left'  as const },
      { left: '现实',   right: '梦幻',   percent: 71, side: 'right' as const },
      { left: '慢热',   right: '热切',   percent: 57, side: 'left'  as const },
    ],
  }
})

const fiveMeteo = computed(() => {
  if (isAncientTone.value) {
    return _n.value?.fiveMeteo ?? [
      { k: '主调', en: 'Main Theme', color: '#86a8ff' },
      { k: '群贤', en: 'Top Authors', color: '#caa7ff' },
      { k: '月相', en: 'Moon Phase',  color: '#ffd98a' },
      { k: '警句', en: 'Key Words',   color: '#95f0c0' },
      { k: '共鸣', en: 'Resonance',   color: '#ff8b7d' },
    ]
  }
  return _n.value?.fiveMeteo ?? [
    { k: '夜温',   en: 'T · NIGHT',    color: '#86a8ff' },
    { k: '风向',   en: 'W · NORTHW',   color: '#caa7ff' },
    { k: '见月',   en: 'M · WANING',   color: '#ffd98a' },
    { k: '云量',   en: 'C · FOURTH',   color: '#95f0c0' },
    { k: '体感',   en: 'F · CHILL',    color: '#ff8b7d' },
  ]
})

/**
 * 防御性封装 nightSky，避免模板里直接 .split('~')[1].trim() 等链式调用崩溃
 * - timeSpan 格式「21:14 ~ 05:42」→ 自动拆 start / end（取前5字符）
 * - 若格式里不含「~」，end 兜底为空字符串，绝不调用 undefined.trim()
 * - meteo 数组越界（i >= 5）兜底返回空字符串，绝不 undefined.v
 * - 分 tone：ancient/modern 兜底 name/timeSpan/season 不一样
 */
const nightSky = computed(() => {
  const n = _n.value?.nightSky
  const ts = n?.timeSpan ?? (isAncientTone.value ? '凡 143 则 · 以夜半为多 · 亥~寅' : '21:00 ~ 05:00')
  // 用 ~ 拆，注意兼容中文「～」（全角波浪）
  const parts = ts.split(/[~～]/)
  const startRaw = (parts[0] ?? '').trim()
  const endRaw   = (parts[1] ?? '').trim()
  const start    = startRaw.split(' ')[0] ?? startRaw
  const endShort = endRaw.substring(0, 5)
  const meteoAt = (i: number) => ({ k: '', v: '', color: undefined as string | undefined, ...(n?.meteo?.[i] ?? {}) })
  const fallbackName = isAncientTone.value ? `《亭林本事》· 钞本卷一` : '《夜雨秋灯》 · 其一卷'
  const fallbackSeason = isAncientTone.value ? '夜半最密 · 群贤共钞' : '孟秋 · 八月'
  return {
    name: n?.name ?? fallbackName,
    season: n?.season ?? fallbackSeason,
    timeSpan: ts,
    timeSpanStart: start,
    timeSpanEnd: endShort,         // 取前 5 字符给模板用
    timeSpanEndLong: endRaw.substring(0, 8),
    phase: n?.phase ?? '下弦残月',
    moonAge: n?.moonAge ?? '21 日',
    moonIllum: n?.moonIllum ?? (isAncientTone.value ? '残光 26%' : '26% 残光'),
    term: n?.term ?? '立秋',
    ecliptic: n?.ecliptic ?? (isAncientTone.value ? '翼宿 · 鹑尾之次' : '翼宿 · 鹑尾'),
    termDeg: n?.termDeg ?? 135,
    meteo: n?.meteo ?? [],
    meteoAt,                       // 函数式取，越界安全
    /** 模板里 386 行要的那 5 个长 value 串 */
    weatherValueAt(i: 0 | 1 | 2 | 3 | 4): string {
      if (isAncientTone.value) {
        switch (i) {
          case 0: return meteoAt(1).v || '思念·怀旧·独白'
          case 1: return meteoAt(2).v || '苏轼·12，杜甫·8'
          case 2: return `${n?.phase ?? '下弦残月'}·${n?.moonIllum ?? '残光 26%'}`
          case 3: return meteoAt(3).v || '「夜雨·故人·灯影」'
          case 4: return meteoAt(4).v || '9339次·篇均65'
          default: return ''
        }
      }
      switch (i) {
        case 0: return meteoAt(1).v || '凉 16℃  体感 14℃'
        case 1: return meteoAt(2).v || '东北风 3 级'
        case 2: return `${n?.phase ?? '下弦残月'}·${n?.moonIllum ?? '26% 残光'}`
        case 3: return meteoAt(3).v || '四分散卷'
        case 4: return meteoAt(4).v || '5.2  可见 3842'
        default: return ''
      }
    },
    hourDots: n?.hourDots ?? [],
  }
})

const emotions = computed(() => {
  if (_e.value?.emotions && _e.value.emotions.length >= 5) return _e.value.emotions
  return [
    { name: '思念', value: 0.78, color: '#ffd98a', desc: '远方的人与未寄出的话' },
    { name: '孤独', value: 0.62, color: '#caa7ff', desc: '末班车与空荡的街' },
    { name: '释然', value: 0.41, color: '#9ae6b4', desc: '雨停后的第一缕晨光' },
    { name: '希望', value: 0.35, color: '#86a8ff', desc: '纸船顺流而下的方向' },
    { name: '共鸣', value: 0.28, color: '#ff8b7d', desc: '陌生人留下的温度' },
  ]
})

const emotionInsights = computed(() => {
  if (_n.value?.emotionInsights && _n.value.emotionInsights.length >= 5) return _n.value.emotionInsights
  return [
    { title: '<b>浓稠思念</b>，是这卷星笺的底色', pct: '42.3%', desc: '雨夜、灯影、未寄出的信是反复出现的三种意象——思念并不尖锐，更像一盏不肯熄灭的灯，温吞地亮到天明。', color: '#ffd98a' },
    { title: '<b>深夜独行</b>的孤独，紧随思念之后', pct: '33.6%', desc: '末班车、空街道、凌晨四点的台灯——它们不是悲伤的注脚，而是独自面对自己时安静的背景音。', color: '#caa7ff' },
    { title: '<b>微光释然</b>，是最意外的情绪角落', pct: '22.2%', desc: '虽然整体偏暗，但从「阳台种子」「江边走走」等片段能看见：风一吹，有些事就悄悄松了绑。', color: '#9ae6b4' },
    { title: '<b>微光希望</b>，在叙事末尾悄然抬头', pct: '18.9%', desc: '纸船顺流、种子发芽、槐花再开——时间没有直接给出答案，但它让一些事变得可以放下。', color: '#86a8ff' },
    { title: '<b>陌生人的共鸣</b>，是最轻也最暖的部分', pct: '15.1%', desc: '一句话、一个点赞、一次擦肩而过的善意——它们不解决问题，但会让某个夜晚变得没那么难熬。', color: '#ff8b7d' },
  ]
})

const emotionNarrative = computed(() => _n.value?.emotionNarrative ?? {
  dominant: '思念', dominantPct: '42.3%',
  summary: '雨夜与灯影反复出现，思念是这卷星笺的主调，多指向远方的人与未寄出的话。',
  contrast: '夜虽沉，主序却稳——就像恒星在主序阶段停留最久，你的思念也在最深处静静燃烧，虽然暗但最持久。',
  flow: '从东升（浓思）→ 中天（孤独回望）→ 西沉（释然微光），星轨虽慢，但终究划过了整个夜。',
})

/**
 * 夜色流转 · 情感回顾卡（替代原 emotionInsights）
 *  每条 = 情感名 · 占比% + 从 storyQuotes / props.stories 抽内容拼出回顾感描述
 *  不再有天文参数/时辰标签，只讲心事回顾
 */
const emotionReviewCards = computed(() => {
  const emos = emotions.value
  const quotes = storyQuotes.value
  const realStories = props.stories ?? []
  const rawInsights = emotionInsights.value

  return emos.map((e, i) => {
    const ins = rawInsights[i]
    const pctNum = Math.round(e.value * 100)
    const pct = (ins?.pct && /^\d/.test(ins.pct)) ? ins.pct : pctNum + '%'
    const quote = quotes[i] ?? quotes[i % quotes.length]
    const realStory = realStories[i] ?? realStories[i % Math.max(1, realStories.length)]

    // 抽回顾元素：标签1个 + 故事片段1句 + 星名/出处
    const tagSrc = (quote?.tags?.length ? quote.tags : (realStory?.content?.match(/[\u4e00-\u9fa5]{2,4}/g) ?? []))
    const tag = tagSrc[i % Math.max(1, tagSrc.length)] ?? e.name
    const storySnippet = (quote?.text ?? realStory?.content ?? (e as any).desc ?? '').slice(0, 18)
    const storyRef = quote?.starName ?? realStory?.title ?? `心事第 ${i + 1} 则`

    // 原描述里抽一句做回顾感，不要文艺化天文词
    const baseDesc = (ins?.desc ?? (e as any).desc ?? '').replace(/[，,]?[子丑寅卯辰巳午未申酉戌亥].{0,4}刻[，,]?/g, '').replace(/夜的第.{0,6}重/g, '')
    const firstSentence = baseDesc.split(/[。；]/)[0] || baseDesc || e.name

    return {
      name: e.name,
      pct,
      color: ins?.color ?? e.color,
      tag,
      storySnippet,
      storyRef,
      desc: `${firstSentence}。想起「${storySnippet}${storySnippet.length >= 18 ? '…' : ''}」那页（${storyRef}），#${tag} 的浓度最清晰。`,
    }
  })
})

const storyQuotes = computed(() => {
  if (_n.value?.storyQuotes && _n.value.storyQuotes.length >= 3) return _n.value.storyQuotes.map(q => ({
    ...q, astro: undefined as any,
  }))
  return [
    { rank: 'α', starName: '雨夜寄北', illus: 'moon' as const,  color: '#ffd98a', text: '把没寄出的话折成纸船，放进窗外的雨里——不知道它会漂去哪里，但至少今晚，它不用再困在我心里。', tags: ['思念', '夜雨', '纸船'], author: '匿名星客', date: '03/12 子时' },
    { rank: 'β', starName: '凌晨四点', illus: 'house' as const, color: '#caa7ff', text: '翻到那张合影，才发现你笑得比我记得的还要年轻。屋里很安静，只有我一个人，却好像听见厨房里还飘着切菜的声音。', tags: ['回忆', '家', '旧照片'], author: '夜归人', date: '03/25 丑时' },
    { rank: 'γ', starName: '江边走走', illus: 'plant' as const, color: '#9ae6b4', text: '风把帽子吹进水里，我居然笑了出来。有些东西抓不住就是抓不住，没关系——下次换一顶帽子就是了。', tags: ['释然', '风', '江边'], author: '桥上客', date: '04/30 辰时' },
  ]
})

/**
 * AI 选本·代表故事（替代夜色流转）：
 * - 基础源 = nightscape.storyQuotes（后端按共鸣度排好的 3 条）
 * - 目标 4 张 → 不够用 props.stories 按 共鸣/长度 挑 top 补齐
 * - 每张 card 字段：rank / starName / text / tags(<=3) / author / date / color
 * - tone：ancient → 作者带「出《XX》」「钞本手录」，日期带「椠本/钞藏」；modern → 匿名观星者 + 日期
 */
/**
 * 清洗推荐语：强制剥掉所有排名字眼臭词（Top1/次选/共鸣第/选第/全篇/次篇/三篇/末篇/钞取/补充 等）
 * 不管后端/缓存里是新老文案，过一遍这函数保证输出短神韵句，无排名臭词
 */
function trimReason(raw: string | undefined | null, themeWord = '心事'): string {
  if (!raw) return shortReasonFallback(themeWord, isAncientTone.value)
  let s = String(raw).trim()
  // 1) 剥掉所有「排名 + ·/：」前缀（Top1 · / 共鸣第 1 · / 选第 2 · / 次选 · / 全篇 · / 次篇 · / 三篇 · / 末篇 · / 钞取首篇 · / 补充 · / 共鸣最高 · 等）
  s = s.replace(/^(共鸣\s*Top\s*\d+|共鸣\s*第\s*\d+|选\s*第\s*\d+|Top\s*\d+|次选|第三篇|第一篇|第二篇|末篇|全篇|次篇|三篇|钞取首篇|钞取|补充|共鸣最高|全篇共鸣最高)\s*[·•\.\-\:：]\s*/i, '')
  s = s.replace(/^(选第|共鸣第|共鸣Top|Top)\s*\d*\s*[·•\.\-\:：]\s*/gi, '')
  // 2) 剥掉句中的风人之致 / 光景最真 / 作收束，最见余味 / 很多人的共鸣点 / 写XX情绪最细腻 等老臭词尾句
  s = s.replace(/[，,]?\s*(最得风人之致|光景最真|光景最真切|最见余味|很多人的共鸣点|情绪最细腻|的一段独白|写\s*\S{2,8}\s*情绪最细腻|以\S{2,10}作收束|作收束[，,]?最见余味)\s*$/gi, '')
  s = s.replace(/\s*（写[^）]*最[真实细腻戳心]{1,4}）/g, '')
  s = s.trim().replace(/^[·•\.\-\:：,，]\s*/, '').replace(/\s*[·•\.\-]$/, '')
  // 3) 共鸣数括号要保留，先切出来最后再拼回去
  const m = s.match(/（\s*\d+\s*次共鸣\s*）$/)
  const tail = m ? m[0] : ''
  if (tail) s = s.slice(0, s.length - tail.length).trim().replace(/[，,·•\.\-：:]$/, '')
  // 4) 空了/只剩括号了 → 兜底短神韵句
  if (!s) return shortReasonFallback(themeWord, isAncientTone.value) + (tail ? tail : '')
  // 5) 句子太长 → 取到第一个标点或前 12 字保证短
  if (s.length > 14) {
    const punc = s.search(/[，。,；;、\s]/)
    if (punc > 4) s = s.slice(0, punc)
    else if (s.length > 12) s = s.slice(0, 12) + '…'
  }
  return s + (tail ? tail : '')
}
/** 超短神韵句（6-10字）：trimReason 兜底 + 三分支 fallback 共用 */
function shortReasonFallback(w: string, ancient: boolean): string {
  const pool = ancient
    ? [`「${w}」最入心`, `字字切「${w}」`, `光景最真切`, `余味最长`]
    : [`「${w}」最戳`, `「${w}」最共鸣`, `深夜心情最真`, `读了会鼻酸`]
  return pool[Math.floor(Math.random() * pool.length)]
}

type StoryCard = {
  rank: string; starName: string; text: string
  tags: string[]; author: string; date: string; color: string
  reason?: string
}
const storyCards = computed<StoryCard[]>(() => {
  const rankPool = ['α', 'β', 'γ', 'δ', 'ε', 'ζ']
  const fallbackStars = ['δ · 灯下偶书', 'δ · 夜半抄录', 'δ · 灯下寄远']
  const palette = ['#ffd98a', '#caa7ff', '#9ae6b4', '#86a8ff', '#ff8b7d']

  // 先取后端 storyQuotes（带 reason）
  const base: StoryCard[] = storyQuotes.value.map((q, i) => {
    const themeWord = (q.tags?.[0]) ?? '心事'
    // 后端 reason 兜底：超短神韵句（≤10字），和后端模板对齐
    const ancientReason = [
      `「${themeWord}」最入心`,
      `字字切「${themeWord}」`,
      `光景最真切`,
      `余味最长的「${themeWord}」`,
    ]
    const modernReason = [
      `「${themeWord}」最戳`,
      `「${themeWord}」最共鸣`,
      `深夜心情最真`,
      `读了鼻酸的「${themeWord}」`,
    ]
    const fallbackPool = isAncientTone.value ? ancientReason : modernReason
    return {
      rank: q.rank ?? rankPool[i] ?? 'δ',
      starName: q.starName ?? fallbackStars[i % fallbackStars.length],
      text: (q.text ?? '').trim() || '（此处为摘录片段）',
      tags: (q.tags ?? []).slice(0, 3),
      author: q.author ?? (isAncientTone.value ? '钞本手录 · 佚名' : '匿名观星者'),
      date: q.date ?? (isAncientTone.value ? '宋元椠本' : '2026-08-05'),
      color: q.color ?? palette[i % palette.length],
      reason: (q as any).reason ?? fallbackPool[i % fallbackPool.length],
    }
  })

  // 不够 4 张 → 从 props.stories 按 resonanceCount 降序补（跳过已存在的作者+文本近似的）
  if (base.length < 4 && (props.stories?.length ?? 0) > 0) {
    const seen = new Set(base.map(b => `${b.author}|${b.text.slice(0, 20)}`))
    const pick = [...(props.stories ?? [])]
      .sort((a, b) => (b.resonanceCount ?? 0) - (a.resonanceCount ?? 0))
      .filter(r => {
        const key = `${r.creator_name ?? (isAncientTone.value ? '佚名' : '匿名')}|${(r.content ?? '').slice(0, 20)}`
        if (seen.has(key)) return false
        seen.add(key); return true
      })
      .slice(0, 4 - base.length)

    for (let i = 0; i < pick.length; i++) {
      const r = pick[i]
      const idx = base.length + i
      const raw = (r.title ? `${r.title} · ` : '') + (r.content ?? '')
      const text = raw.length > 70 ? raw.slice(0, 68) + '…' : raw
      const creator = r.creator_name ?? (isAncientTone.value ? '佚名' : '匿名观星者')
      const author = isAncientTone.value
        ? (r.type === 'history' ? `出《${creator}》` : `${creator} · 钞存`)
        : (r.creator_name ? `@${r.creator_name}` : '匿名观星者')
      const date = isAncientTone.value
        ? (r.type === 'history' ? '明钞本' : '今人钞录')
        : (r.createdAt ? r.createdAt.slice(0, 10) : '2026-08-05')
      const tagList = (r.catalogStarIds?.length ?? 0) > 0 ? [getStarNameInfo(r.catalogStarIds?.[0] ?? 0)?.name ?? ''] : []
      const themeWords = (r.content?.match(/[\u4e00-\u9fa5]{2,3}/g) ?? []).slice(0, 3)
      const tags = (tagList.length ? tagList : themeWords).slice(0, 3) || ['思念', '夜雨', '独白']
      const themeWord = tags[0] ?? '夜'
      const resN = Number(r.resonanceCount ?? 0)
      // 超短神韵句（≤10字），不点名次
      const ancientReason = [
        `「${themeWord}」最入心`,
        `字字切「${themeWord}」`,
        `光景最真切`,
        `余味最长的「${themeWord}」`,
      ]
      const modernReason = [
        `「${themeWord}」最戳`,
        `「${themeWord}」最共鸣`,
        `深夜心情最真`,
        `读了鼻酸的「${themeWord}」`,
      ]
      const pool = isAncientTone.value ? ancientReason : modernReason
      const reason = pool[idx % pool.length]
      base.push({
        rank: rankPool[idx] ?? 'δ',
        starName: fallbackStars[idx % fallbackStars.length],
        text, tags, author, date,
        color: palette[idx % palette.length],
        reason: resN > 0 ? `${reason}（${resN}次共鸣）` : reason,
      })
    }
  }

  // 还是不够 → mock 兜底（保证 4 张不塌）
  while (base.length < 4) {
    const i = base.length
    const themePair = [['思念', '夜雨'], ['怀旧', '独白'], ['故人', '灯影'], ['释然', '江岸']][i]
    const themeWord = themePair[0]
    base.push({
      rank: rankPool[i] ?? 'δ',
      starName: fallbackStars[i % fallbackStars.length],
      text: isAncientTone.value
        ? ['桃李春风一杯酒，江湖夜雨十年灯。', '思君如满月，夜夜减清辉。', '还将两行泪，遥寄海西头。', '落叶他乡树，寒灯独夜人。'][i]
        : ['有些心事，只能说给星星听。', '天亮之后，把昨夜留给昨夜。', '每一盏灯，都有它想等的人。', '风会记得槐花的香气。'][i],
      tags: themePair,
      author: isAncientTone.value ? ['出《中州集》', '钞本手录·佚名', '宋元椠本', '汲古阁藏版'][i] : ['匿名星客', '夜归人', '桥上客', '灯下听风'][i],
      date: isAncientTone.value ? ['宋元椠本', '明钞本', '汲古阁藏版', '清晖阁题款'][i] : ['03/12', '03/25', '04/30', '05/08'][i],
      color: palette[i % palette.length],
      // mock 兜底 reason：超短神韵句（≤10字）
      reason: shortReasonFallback(themeWord, isAncientTone.value),
    })
  }
  return base.slice(0, 4)
})

const heroStars = computed(() => _n.value?.heroStars ?? [
  { x: 58,  y: 150, r: 4.9, fill: '#ffd98a', gid: 'Gold'   as const, label: '20:31' },
  { x: 150, y: 52,  r: 4.6, fill: '#caa7ff', gid: 'Purple' as const, label: '01:12' },
  { x: 226, y: 130, r: 4.2, fill: '#86a8ff', gid: 'Blue'   as const, label: '03:04' },
  { x: 100, y: 110, r: 3.0, fill: '#ffd98a', gid: 'Gold'   as const },
  { x: 128, y: 170, r: 3.2, fill: '#ffb48a', gid: 'Gold'   as const },
  { x: 182, y: 92,  r: 2.9, fill: '#9ae6b4', gid: 'Green'  as const },
  { x: 252, y: 64,  r: 3.4, fill: '#ffd98a', gid: 'Gold'   as const },
  { x: 288, y: 148, r: 3.0, fill: '#caa7ff', gid: 'Purple' as const },
])

const heroStats = computed(() => _n.value?.heroStats ?? [
  { k: '心事总数', v: displayStoryCount.value, sub: '则', color: '#ffd98a' },
  { k: '累计共鸣', v: (props.resonanceTotal ?? 237), sub: '次', color: '#caa7ff' },
  { k: '平均共鸣', v: Math.round((props.resonanceTotal ?? 237) / Math.max(1, displayStoryCount.value)), sub: '则心事', color: '#86a8ff' },
  { k: '覆盖时辰', v: `${positivesCountFn(hourly.value)}/24`, sub: '段', color: '#9ae6b4' },
])

const isGalaxy = computed(() => props.visibility === 'galaxy')

/* ── 星河合集专用：卷目疏（替代气脉十二时） ──
   把合集中故事按作者/出处/首字/卷名拆成「诗卷 / 词卷 / 曲卷 / 史卷 / 星官卷 / 神话卷 / 笔记卷 / 语录卷 / 杂钞卷」等卷目 */
type BookMeta = { name: string; order: number; color: string; icon: Component; tag: string }
const BOOK_RULES: Array<{ test: (s: any) => boolean; meta: BookMeta }> = [
  {
    test: s => /诗|唐诗|绝句|律诗|韵|子规|巴山|夜雨寄北|登高|月下|江村|江雪/.test(s.title ?? '')
      || /李白|杜甫|王维|白居易|孟浩然|苏轼(?![文])|王安石|柳宗元|贺知章|李清照(?![词])|辛弃疾(?![词])|陆游(?![词])/.test(s.creator_name ?? '')
      || /五言|七言|《诗》/.test(s.content.slice(0, 60)),
    meta: { name: '诗卷', order: 1, color: '#E8B86D', icon: Scroll as Component, tag: '韵文·吟物' }
  },
  {
    test: s => /词|宋词|长短句|江城子|水调歌头|念奴娇|声声慢|青玉案|满江红|虞美人|蝶恋花|浣溪沙|如梦令|一剪梅/.test(s.title ?? '')
      || /苏轼(?=\s*[词《])|李清照|辛弃疾|柳永|秦观|周邦彦|晏殊|晏几道|欧阳修(?=\s*[词《])|陆游|姜夔|吴文英/.test(s.creator_name ?? ''),
    meta: { name: '词卷', order: 2, color: '#CAA7FF', icon: BookText as Component, tag: '倚声·填阕' }
  },
  {
    test: s => /曲|杂剧|传奇|戏曲|西厢|牡丹亭|桃花扇|窦娥冤|汉宫秋|梧桐雨|赵氏孤儿/.test(s.title ?? '')
      || /关汉卿|王实甫|汤显祖|孔尚任|洪昇|马致远|白朴|纪君祥/.test(s.creator_name ?? ''),
    meta: { name: '曲卷', order: 3, color: '#F4A8B8', icon: BookMarked as Component, tag: '梨园·院本' }
  },
  {
    test: s => /星官|天官|步天歌|史记·天官|晋书·天文|灵台|观星|星经|甘石|三家星|紫微垣|太微垣|天市垣|二十八宿|星宿|星野/.test(s.title ?? s.content.slice(0, 120))
      || /石申|甘德|落下闳|张衡|祖冲之|一行|郭守敬|梅文鼎|李善兰/.test(s.creator_name ?? ''),
    meta: { name: '星官卷', order: 4, color: '#7AB8F0', icon: Orbit as Component, tag: '观星·步天' }
  },
  {
    test: s => /神话|神话考|创世|补天|射日|奔月|治水|移山|填海|奥林匹斯|宙斯|阿波罗|赫拉|雅典娜|波塞冬|阿瑞斯|赫尔墨斯|狄俄倪索斯|珀耳塞福涅|太阳神|月神/.test(s.title ?? s.content.slice(0, 120))
      || /赫西俄德|荷马|奥维德|阿波罗多洛斯|埃斯库罗斯|索福克勒斯|欧里庇得斯/.test(s.creator_name ?? ''),
    meta: { name: '神话卷', order: 5, color: '#95E0C0', icon: MoonStar as Component, tag: '创世·神祇' }
  },
  {
    test: s => /史|史记|汉书|后汉书|三国志|资治通鉴|通鉴|纪事本末|编年史|本纪|列传|世家|书|志|表/.test(s.title ?? '')
      || /司马迁|班固|陈寿|司马光|范晔|裴松之|刘知几|章学诚/.test(s.creator_name ?? ''),
    meta: { name: '史卷', order: 6, color: '#FFD98A', icon: BookOpen as Component, tag: '简册·载笔' }
  },
  {
    test: s => /笔记|录异|志怪|志异|搜神|幽明|酉阳杂俎|容斋|梦溪笔谈|东京梦华|武林旧事|陶庵梦忆|阅微草堂|聊斋|子不语|世说新语|拾遗记|述异记|太平广记/.test(s.title ?? s.content.slice(0, 120))
      || /干宝|刘义庆|段成式|沈括|孟元老|周密|张岱|纪晓岚|蒲松龄|袁枚|洪迈|吴淑/.test(s.creator_name ?? ''),
    meta: { name: '笔记卷', order: 7, color: '#A8E89C', icon: Feather as Component, tag: '志怪·琐记' }
  },
  {
    test: s => /语录|论语|孟子|朱子语类|传习录|坛经|大学|中庸|近思录|菜根谭|围炉夜话|小窗幽记|幽梦影/.test(s.title ?? s.content.slice(0, 80))
      || /孔子|孟子|朱熹|王阳明|释慧能|六祖|老子|庄子|列子|荀子|韩非子|墨子|陈继儒|张潮|洪应明/.test(s.creator_name ?? ''),
    meta: { name: '语录卷', order: 8, color: '#FFB48A', icon: Quote as Component, tag: '微言·理致' }
  },
  {
    test: s => /阿拉伯|伊斯兰|阿尔·|al-|苏菲|可兰|天方|一千零一夜|卡布斯|巴努|库赛|乌姆鲁勒|穆太奈比|麦阿里/.test((s.title ?? '') + s.content.slice(0, 100) + ' ' + (s.creator_name ?? ''))
      || /大食|撒马尔罕|巴格达|大马士革|开罗|科尔多瓦|托莱多/.test(s.title ?? s.content.slice(0, 120)),
    meta: { name: '海外卷', order: 9, color: '#C09969', icon: Route as Component, tag: '天方·异闻' }
  },
]
const FALLBACK_BOOK: BookMeta = { name: '杂钞卷', order: 99, color: '#B59FD4', icon: Sparkles as Component, tag: '无类·汇存' }

function matchBook(s: any): BookMeta {
  for (const r of BOOK_RULES) if (r.test(s)) return r.meta
  return FALLBACK_BOOK
}

type ScrollBook = {
  name: string; order: number; color: string; icon: Component; tag: string;
  count: number;
  total: number;
  /** 卷内共鸣最盛 3 条故事预览 */
  topStories: { id: number; title: string; resonance: number; author?: string }[]
}
const scrollBooks = computed<ScrollBook[]>(() => {
  const real = props.stories ?? []
  if (!real.length) {
    // mock 兜底：配合 mock heroStats 的 18-24 则故事量，出一个典型卷目结构
    return [
      { name: '诗卷',   order: 1, color: '#E8B86D', icon: Scroll as Component,   tag: '韵文·吟物', count: 8,  total: 8,
        topStories: [{ id: 1, title: '夜雨寄北', resonance: 9, author: '李商隐' }, { id: 2, title: '水调歌头·明月几时有', resonance: 6, author: '苏轼' }] },
      { name: '星官卷', order: 4, color: '#7AB8F0', icon: Orbit as Component,    tag: '观星·步天', count: 5,  total: 5,
        topStories: [{ id: 3, title: '步天歌·紫微垣', resonance: 4, author: '丹元子' }, { id: 4, title: '天官书', resonance: 2, author: '司马迁' }] },
      { name: '史卷',   order: 6, color: '#FFD98A', icon: BookOpen as Component, tag: '简册·载笔', count: 4,  total: 4,
        topStories: [{ id: 5, title: '太史公自序', resonance: 3, author: '司马迁' }] },
      { name: '笔记卷', order: 7, color: '#A8E89C', icon: Feather as Component,  tag: '志怪·琐记', count: 3,  total: 3,
        topStories: [{ id: 6, title: '幽明录·夜星', resonance: 2 }] },
    ]
  }
  const groups = new Map<string, ScrollBook>()
  for (const s of real) {
    const meta = matchBook(s)
    if (!groups.has(meta.name)) groups.set(meta.name, {
      name: meta.name, order: meta.order, color: meta.color, icon: meta.icon, tag: meta.tag,
      count: 0, total: real.length, topStories: [],
    })
    const g = groups.get(meta.name)!
    g.count++
    g.topStories.push({
      id: s.id,
      title: s.title || s.content.slice(0, 16) + (s.content.length > 16 ? '…' : ''),
      resonance: s.resonanceCount ?? 0,
      author: s.creator_name || undefined,
    })
  }
  return Array.from(groups.values())
    .map(g => ({ ...g, topStories: [...g.topStories].sort((a, b) => b.resonance - a.resonance).slice(0, 3) }))
    .sort((a, b) => a.order - b.order)
})
const scrollBooksTop2 = computed(() => scrollBooks.value.slice(0, 2)) // 预览 2 大卷

const hourly = computed<number[]>(() => _n.value?.hourly ?? [2,1,1,0,0,1,3,5,4,3,2,2,4,3,2,1,2,3,4,6,9,12,8,5])
const peakHour = computed<number>(() => _n.value?.peakHour ?? 21)
const lowHour  = computed<number>(() => _n.value?.lowHour  ?? 4)
const peakText = computed<string>(() => '子时雨最盛，心事也最稠。你总在别人入睡后才点亮自己那盏灯，把白天没说完的话留给夜雨。')
const lowText  = computed<string>(() => '卯时天将明，是这卷星笺最安静的时辰。或许醒来之后，有些情绪就随晨光散了。')

function positivesCountFn(arr: number[]) { return arr.filter(v => v > 0).length }

/* ═══════════════════════════════════════════════════════════
   其余不变：星辰归属（starBelongings）/ starMapData / 共鸣榜 / 情感轨迹 / 工具函数
   依然用 mock 或 props.stories 派生，这部分后续可以继续接真实数据或继续走 agent
   ═══════════════════════════════════════════════════════════ */

function orbSize(value: number): number {
  return Math.round(40 + value * 26)
}

/** 星辰归属：从真实故事派生，聚合 catalogStarId/catalogStarIds → 星名+星座+颜色+故事数+方位
 *  【关键兜底】：如果 props.stories 为空（设计预览模式），则使用 mock 的 6 颗亮星，
 *  确保星辰归属星图 / 光谱分布 / 星座Top 等所有 v-if 都有数据，绝不整块消失
 */
const MOCK_BELONGINGS = [
  // 8 颗真实亮星（有 getStarNameInfo 数据），分别来自8个星座、不同光谱/色，让光谱条/星座Top/标签云有丰富层次
  { id: 171,   name: '危宿一',   con: '宝瓶座', color: '#ffd98a', count: 6, ra: 334.5, dec: -0.2 },   // α Aqr G2V  金黄
  { id: 169,   name: '虚宿一',   con: '宝瓶座', color: '#caa7ff', count: 4, ra: 333.8, dec: -5.0 },   // β Aqr B8III 紫蓝
  { id: 1027,  name: '天津四',   con: '天鹅座', color: '#86a8ff', count: 5, ra: 306.5, dec: 45.3 },   // α Cyg A0V  冰蓝
  { id: 603,   name: '河鼓二',   con: '天鹰座', color: '#9ae6b4', count: 3, ra: 297.7, dec: 8.9 },    // α Aql F5V  青绿
  { id: 441,   name: '织女一',   con: '天琴座', color: '#ff8b7d', count: 2, ra: 279.2, dec: 38.8 },   // α Lyr M2III 珊瑚红
  { id: 862,   name: '心宿二',   con: '天蝎座', color: '#ffb48a', count: 3, ra: 247.4, dec: -26.4 },  // α Sco K5V  暖橙
  { id: 455,   name: '贯索四',   con: '北冕座', color: '#ffe7ad', count: 2, ra: 234.9, dec: 31.0 },   // α CrB A0V  米白
  { id: 323,   name: '右枢',     con: '天龙座', color: '#b9c9ff', count: 1, ra: 211.6, dec: 64.4 },   // α Dra B9V  灰蓝
]
const starBelongings = computed<{ id: number; name: string; con: string; color: string; count: number; ra: number; dec: number }[]>(() => {
  // 从真实故事聚合 catalogStarId / catalogStarIds → 星名 + 星座 + 光谱色 + 故事数
  const map = new Map<number, number>()
  for (const s of props.stories ?? []) {
    const ids: number[] = []
    if (s.catalogStarId != null) ids.push(s.catalogStarId)
    if (Array.isArray(s.catalogStarIds)) ids.push(...s.catalogStarIds)
    for (const id of Array.from(new Set(ids))) {
      map.set(id, (map.get(id) ?? 0) + 1)
    }
  }
  if (map.size > 0) {
    return Array.from(map.entries())
      .map(([id, count]) => {
        const info = getStarNameInfo(id)
        return {
          id,
          name: info?.name ?? `星 ${id}`,
          con: info?.con ?? '',
          color: info?.color ?? '#86a8ff',
          count,
          ra: info?.ra ?? -1,
          dec: info?.dec ?? 0,
        }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
  }
  // 真实故事没有绑定星辰归属：兜底到 mock 的 6 颗亮星，确保星图不空白
  return MOCK_BELONGINGS.map(x => ({ ...x }))
})
const starBelongTotal = computed(() => starBelongings.value.reduce((a, b) => a + b.count, 0))

/** SVG 星图：用真实地平坐标(alt/az)排布，地平线居中上下对称 + hover 高亮 + 防遮挡 */
const MAP_W = 280
const MAP_H = 180
const MAP_PAD = 14          // 上下留白
const HORIZON_Y = MAP_H / 2 // 地平线居中（alt=0°）
const ZENITH_Y = MAP_PAD    // 天顶（alt=+90°）
const NADIR_Y = MAP_H - MAP_PAD // 地底（alt=-90°），与天顶对称

const { lat, lng } = useLocation()

/** hover 高亮的星 ID */
const hoveredStarId = ref<number | null>(null)

const starMapData = computed(() => {
  const stars = starBelongings.value
  if (stars.length === 0) return { stars: [], lines: [], aboveHorizon: 0, belowHorizon: 0 }

  // 观测者位置（无定位时默认北京 39.9°N 116.4°E）
  const obsLat = lat.value ?? 39.9
  const obsLng = lng.value ?? 116.4
  const now = new Date()
  const jd = dateToJD(now)
  const lst = lstDeg(jd, obsLng)
  const maxCount = Math.max(1, ...stars.map(s => s.count))

  // 计算每颗星的地平坐标并投影
  const all = stars.map((s, idx) => {
    let alt = 0, az = 0
    if (s.ra >= 0) {
      const r = altAz(s.ra, s.dec, obsLat, lst)
      alt = r.alt
      az = r.az
    } else {
      // 行星（ra=-1）：给一个中天附近默认位置
      alt = 35
      az = 180
    }

    // 方位角 0-360° → x：北在左、东、南、西、北在右（全周展开）
    const x = 14 + (az / 360) * (MAP_W - 28)
    // 高度角 → y：上下对称（+90°→ZENITH_Y, 0°→HORIZON_Y, -90°→NADIR_Y）
    const halfRange = HORIZON_Y - ZENITH_Y // 上下各 halfRange，对称
    let y: number
    if (alt >= 0) {
      y = HORIZON_Y - (alt / 90) * halfRange
    } else {
      y = HORIZON_Y + (-alt / 90) * halfRange
    }
    y = Math.max(ZENITH_Y, Math.min(NADIR_Y, y))

    const radius = 2.5 + (s.count / maxCount) * 5 // 2.5~7.5px
    // 标签位置：交替上下，避免遮挡
    const labelAbove = idx % 2 === 0
    const labelY = labelAbove ? y - radius - 4 : y + radius + 10

    return {
      ...s,
      alt,
      az,
      x,
      y,
      radius,
      labelAbove,
      labelY,
      aboveHorizon: alt >= 0,
      // 仅 top 3 故事数的星默认显示标签
      showLabel: idx < 3,
    }
  })

  // 统计地平线上下数量
  const aboveHorizon = all.filter(s => s.aboveHorizon).length
  const belowHorizon = all.length - aboveHorizon

  // 星座连线：同星座的星用最近邻连线（仅地平线上）
  const conGroups = new Map<string, typeof all>()
  for (const s of all) {
    if (!s.con || !s.aboveHorizon) continue
    if (!conGroups.has(s.con)) conGroups.set(s.con, [])
    conGroups.get(s.con)!.push(s)
  }
  const lines: { x1: number; y1: number; x2: number; y2: number; color: string }[] = []
  const seen = new Set<string>()
  for (const [, group] of conGroups) {
    if (group.length < 2) continue
    for (let i = 0; i < group.length; i++) {
      let nearest = -1, minD = Infinity
      for (let j = 0; j < group.length; j++) {
        if (i === j) continue
        const d = (group[i].x - group[j].x) ** 2 + (group[i].y - group[j].y) ** 2
        if (d < minD) { minD = d; nearest = j }
      }
      if (nearest >= 0) {
        const a = group[i], b = group[nearest]
        const key = [a.x, a.y, b.x, b.y].map(Math.round).join(',')
        if (!seen.has(key)) {
          seen.add(key)
          lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, color: a.color })
        }
      }
    }
  }

  return { stars: all, lines, aboveHorizon, belowHorizon }
})

/** 背景装饰星点（仅天空区域，确定性伪随机） */
const bgStars = Array.from({ length: 24 }, (_, i) => {
  const seed = i * 7919 + 13
  return {
    x: (seed * 13) % MAP_W,
    y: ZENITH_Y + 2 + ((seed * 17) % (HORIZON_Y - ZENITH_Y - 6)),
    r: 0.3 + ((seed % 4) * 0.25),
    opacity: 0.1 + ((seed % 6) * 0.04),
  }
})

/**
 * 【Hero 天空剖面】背景深空星点（配合 320×210 剖面尺寸）
 * 模板第74行：deepSkyStars.slice(0, 80)
 */
const deepSkyStars = Array.from({ length: 100 }, (_, i) => {
  const seed = i * 9973 + 29
  const x = (seed * 31) % 320
  const y = (seed * 19) % 200 // 留出底部地平线 10px
  // 星等差异：约 1/3 亮星（1.0~1.3px），2/3 暗星（0.3~0.7px）
  const r = (i % 3 === 0)
    ? 1.0 + ((seed % 4) * 0.08)
    : 0.3 + ((seed % 5) * 0.1)
  const opacity = (i % 3 === 0)
    ? 0.62 + ((seed % 5) * 0.045)
    : 0.12 + ((seed % 7) * 0.04)
  return { x, y, r, opacity }
})

/* ═══════════════════════════════════════════════════════════
   【星空绑定】星座迷你星图数据：合集=你的私人自定义星座
   ═══════════════════════════════════════════════════════════ */
/** 你的自定义星座（8 则心事 = 8 颗主星，按时间顺序串联成星座图案） */
type ConstellationStar = {
  name: string        // 星名（故事名）
  x: number           // 星图虚拟 X（viewBox 280×220）
  y: number           // 星图虚拟 Y
  size: number        // 星半径（= 星等换算：共鸣越多越大）
  color: string       // 星色（= 情绪色）
  mag: number         // 视星等（数字越小越亮）
  emotion: string     // 情绪标签
  resonance: number   // 共鸣数
  rank?: 'α' | 'β' | 'γ'  // 亮星编号（Top3 亮星才有）
}
const constellation = {
  name: '夜雨孤灯座',   // 拉丁名风格 = 汉名+「座」
  hanName: '夜雨孤灯',  // 四字汉名
  ra: 'RA 22h 14m',     // 赤经（虚拟，对应子时高峰期）
  dec: 'Dec +37° 21′',  // 赤纬（虚拟，北半球春夜可见）
  avgMag: 4.2,          // 平均星等（较暗星座，需凝神静视）
  distance: 412,        // 距离（光年）
  // 8 颗主星 = 8 则故事，用坐标手动排出一个「提灯 + 弯月」的星座形状
  stars: [
    { name: '雨夜寄北',  x: 52,  y: 128, size: 5.0, color: '#ffd98a', mag: 2.8, emotion: '思念', resonance: 42, rank: 'α' as const },
    { name: '一个人的地铁', x: 82, y: 96,  size: 3.2, color: '#caa7ff', mag: 4.7, emotion: '孤独', resonance: 18 },
    { name: '旧照片',    x: 112, y: 68,  size: 3.6, color: '#ffd98a', mag: 4.3, emotion: '思念', resonance: 22 },
    { name: '江边走走',  x: 148, y: 52,  size: 4.4, color: '#95f0c0', mag: 3.4, emotion: '释然', resonance: 31, rank: 'γ' as const },
    { name: '凌晨四点',  x: 184, y: 72,  size: 4.7, color: '#caa7ff', mag: 3.1, emotion: '孤独', resonance: 35, rank: 'β' as const },
    { name: '阳台的种子', x: 212, y: 102, size: 3.0, color: '#86a8ff', mag: 4.9, emotion: '希望', resonance: 15 },
    { name: '故乡的槐花', x: 230, y: 138, size: 3.8, color: '#ffd98a', mag: 4.1, emotion: '思念', resonance: 25 },
    { name: '合上这一卷', x: 214, y: 174, size: 3.4, color: '#95f0c0', mag: 4.5, emotion: '释然', resonance: 19 },
  ] as ConstellationStar[],
}

/* ═══════════════════════════════════════════════════════════
   【窗外夜景 · 生活风】Hero & 全局深夜元数据
   ═══════════════════════════════════════════════════════════ */
/**
 * 心事星点 = 卧室窗户玻璃后的夜空小星
 * 坐标区域：玻璃内 x=0~288, y=0~194（外层模板会自动加 36/24 的窗框偏移）
 * x 横向对应时间 20:00 → 06:00（左=20点，右=6点）
 * y 竖向 = 情绪高度（越靠上=情绪越亮/开心，越靠下=情绪越低落）
 * r 大小 = 共鸣数（越大越亮）
 * gid = Warm(暖黄·快乐) / Soft(柔蓝·平静) / Cozy(柔紫·思念)
 */
type WindowStar = {
  x: number; y: number; r: number; fill: string; gid: 'Warm' | 'Soft' | 'Cozy'; label?: string
}
const windowStars: WindowStar[] = []  // 已废弃（原窗外生活风），保留避免旧模板潜在引用

/** 已废弃：原窗外生活风的城市灯火（保留空数组避免模板潜在引用） */
const windowLights: { x: number; y: number; w: number; h: number; c: string }[] = []

/** 已废弃：原窗外生活风的假元数据（室温/台灯等无意义参数），保留空对象避免旧引用 */
const winMeta: Record<string, any> = {}

/* ═══════════════════════════════════════════════════════════
   Hero 新数据：天文感星点散点 + 真实合集统计
   ═══════════════════════════════════════════════════════════ */
/**
 * 星点=心事（8 颗）：
 *  x 0~360 → 对应 20:00~06:00 时间轴
 *  y 0~220 → 情绪高度（上=正/激动，下=负/低落）
 *  r 大小 → 共鸣数
 *  gid → Gold(金·喜悦/思念) / Purple(紫·柔软/低落) / Blue(蓝·平静) / Green(绿·释然)
 *  label → Top 3 带时间标签
 */
/* HeroStar type 已在前面的 computed 中用到，这里保留仅类型声明（避免未使用type警告） */
export type _HeroStarShape = { x:number; y:number; r:number; fill:string; gid:'Gold'|'Purple'|'Blue'|'Green'; label?:string }

/** 星星统计：光谱色分布 / 星等品质 / 星座Top / 地平等全部从 starBelongings 真实派生 */
const colorToSpectral: Record<string, { label:string; cn:string }> = {
  '#ffd98a': { label: 'G2V',  cn: '黄·主序星（太阳型）' },
  '#ffb48a': { label: 'K5V',  cn: '橙·冷主序' },
  '#caa7ff': { label: 'B8III',cn: '蓝紫·巨星' },
  '#86a8ff': { label: 'A0V',  cn: '蓝白·主序' },
  '#9ae6b4': { label: 'F5V',  cn: '蓝绿·主序' },
  '#95f0c0': { label: 'F2III',cn: '青绿·巨星' },
  '#ff8b7d': { label: 'M2III',cn: '红·红巨星' },
}
const starStatistics = computed(() => {
  const stars = starBelongings.value
  const total = starBelongTotal.value
  const avg = stars.length > 0 ? Math.round((total / stars.length) * 10) / 10 : 0

  // 光谱色分布：按 color 分组
  const byColor = new Map<string, number>()
  for (const s of stars) byColor.set(s.color, (byColor.get(s.color) ?? 0) + s.count)
  const spectral = Array.from(byColor.entries())
    .map(([c, n]) => ({ color: c, n, pct: total > 0 ? Math.round(n / total * 100) : 0,
      spec: colorToSpectral[c]?.label ?? 'G5V', cn: colorToSpectral[c]?.cn ?? '黄矮星' }))
    .sort((a, b) => b.n - a.n)

  // 星座 Top3
  const byCon = new Map<string, number>()
  for (const s of stars) {
    if (!s.con) continue
    byCon.set(s.con, (byCon.get(s.con) ?? 0) + s.count)
  }
  const topCons = Array.from(byCon.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([con, n]) => ({ con, n, pct: total > 0 ? Math.round(n / total * 100) : 0 }))

  // 地平线上比例 + 最亮星
  const sm = starMapData.value
  const horizonPct = stars.length > 0 ? Math.round(sm.aboveHorizon / stars.length * 100) : 0
  // 故事星等：故事数 n → 星等 m = 5 − 3·log₂(1+n)，范围约 2.0 ~ 5.0，越小越亮
  const toMag = (n: number) => Math.max(1.5, Math.round((5 - 3 * Math.log2(1 + n)) * 10) / 10)
  const brightest = stars.length > 0 ? { ...stars[0], mag: toMag(stars[0].count) } : null
  const dimmest = stars.length > 1 ? { ...stars[stars.length - 1], mag: toMag(stars[stars.length - 1].count) } : null
  const avgMag = stars.length > 0
    ? Math.round(stars.reduce((s, x) => s + toMag(x.count), 0) / stars.length * 10) / 10
    : 4.0

  return { avg, spectral, topCons, horizonPct, sm, brightest, dimmest, avgMag }
})

/** 光谱主流汇总：取 starStatistics.spectral 前4个，按百分比归一化，给左侧"星辰分布速览"的光谱条用 */
const spectralSummary = computed(() => {
  const arr = starStatistics.value.spectral.slice(0, 4)
  const total = arr.reduce((s, x) => s + x.pct, 0) || 1
  return arr.map(s => ({
    type: s.spec,
    pct: Math.round(s.pct / total * 100),
    color: s.color,
  }))
})

/* nightSky / skyFlecks 已在上方用 computed 从 API/nighscape 映射，不再需要旧 mock 常量。
   skyFlecks 模板已不再引用，但以防万一仍有遗留引用，给一个空的兜底： */
const skyFlecks: { x: number; y: number; r: number; color: string; glowId: 'Gold' | 'Purple' | 'Green' | 'Blue'; tag?: string }[] = []

/** Top3 亮星名录（α/β/γ） */
const brightStars = computed(() =>
  [...constellation.stars]
    .filter(s => s.rank)
    .sort((a, b) => a.mag - b.mag)
    .map(s => ({
      rank: s.rank!,
      name: s.name,
      mag: s.mag,
      emotion: s.emotion,
      color: s.color,
    }))
)

/** 星座连线 SVG path：把 8 颗星按时间顺序用二次贝塞尔平滑连起来（提灯弧线形状） */
const constellationLinePath = computed(() => {
  const pts = constellation.stars.map(s => [s.x, s.y] as const)
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]
    // 控制点：两点中点 + 垂直微偏（模拟星座自然弯曲）
    const cx = (x1 + x2) / 2
    const cy = (y1 + y2) / 2 + (i % 2 === 0 ? -3 : 3)
    d += ` Q ${cx} ${cy} ${x2} ${y2}`
  }
  return d
})

/** 深空背景星（20 颗随机小点，用于衬托星座） */
const deepSpaceStars = Array.from({ length: 22 }, (_, i) => {
  const seed = i * 31 + 7
  return {
    x: (seed * 41) % 280,
    y: (seed * 53) % 220,
    r: 0.3 + ((seed % 3) * 0.25),
    opacity: 0.06 + ((seed % 5) * 0.03),
  }
})

// 情感轨迹展开/收起状态：默认收起（限高滚动），展开后显示全部
const trajExpanded = ref(false)

/**
 * 情感轨迹：用后端 storyQuotes（Top 5 精选）动态生成，不再是硬编码 mock。
 * - emotion：取 tags[0] 或默认情绪词
 * - color：直接用后端分配的故事色
 * - date：古代版=钞本年代；现代版=故事记录日期
 * - title：故事首句（已由后端裁剪）
 * - snippet：tags 拼接
 */
const trajectory = computed(() => {
  const quotes = _n.value?.storyQuotes
  if (!quotes || quotes.length === 0) {
    // 兜底：storyQuotes 缺失时给一个静态空状态，避免白屏
    return [
      { emotion: '思念', color: '#ffd98a', date: isAncientTone.value ? '钞次一' : '03/12', title: '节选·其一', snippet: '待故事更多，AI 会自动生成时间线。' },
      { emotion: '释然', color: '#9ae6b4', date: isAncientTone.value ? '钞次二' : '04/02', title: '节选·其二', snippet: '—' },
    ]
  }
  return quotes.map((q, i) => {
    const emo = (q.tags && q.tags[0]) ?? (i % 3 === 0 ? '思念' : i % 3 === 1 ? '孤独' : '释然')
    const snippetRaw = (q.tags && q.tags.length > 1)
      ? q.tags.slice(0, 3).join(' · ')
      : q.starName ?? ''
    return {
      emotion: emo,
      color: q.color ?? (['#ffd98a', '#caa7ff', '#86a8ff', '#9ae6b4', '#d5b4ff'][i % 5]),
      // ancient 版：显示钞次+钞本年代/钞者，modern 版：显示 date 字段
      date: isAncientTone.value
        ? (q.author && q.author !== '古人' ? `${q.author}` : q.date)
        : q.date,
      title: q.text.slice(0, 18) + (q.text.length > 18 ? '…' : ''),
      snippet: snippetRaw,
    }
  })
})

/** AI 总叙结构化数据（【观星手记】星空绑定版本：星图总志 + 星轨四步 + 星座神话 + 观星者手记） */
const narrative = {
  // 第一段：星图总志（原概览）
  overview: {
    title: '夜雨孤灯 · 星图总志',
    storyCount: 8,
    time: '子时中天 · 赤经 22h 天区',
    keywords: ['主序稳定', 'G型主星', '银河纬度-12°', '8星构形'],
    content:
      '本星座位于赤经 22h 14m / 赤纬 +37° 21′ 天区，共 8 颗恒星构形：α 雨夜寄北（G2V 主序）最亮，β 凌晨四点（K5V）伴其侧，γ 江边走走（F8V）位于连线末端。银纬 b = -12.4°，紧邻银河北岸，能见度约 4.2 等。夜越深，光越稳——像主序阶段的恒星，在核心静静燃烧数十亿年。',
  },
  // 第二段：星轨四步（原情绪弧线，4步：东升 → 中天 → 西沉 → 入夜）
  arc: {
    title: '星轨四步 · 地平坐标记录',
    phases: [
      {
        name: '① 东升 · 浓思出地平',
        anchor: '雨夜寄北',
        desc: '从东方地平线升起，方位角 NE 72°——刚升起来的星带着雾气，像刚写好的心事，连字都是湿的。',
        color: '#ffd98a',
        coord: { az: 'NE 72°', alt: '+18°' },
      },
      {
        name: '② 中天 · 孤独至天顶',
        anchor: '凌晨四点',
        desc: '运行至天顶最高处，方位角 180° 正南——整座城市都睡了，只有它和你对望着，高度角 +74° 最近也最远。',
        color: '#caa7ff',
        coord: { az: 'S 180°', alt: '+74°' },
      },
      {
        name: '③ 西沉 · 释然入西方',
        anchor: '江边走走',
        desc: '缓缓向西方落下，方位角 NW 288°，高度角回落 +29°——风把帽子吹进水里的那一秒，你突然就笑了，那是星在落之前最后的闪耀。',
        color: '#95f0c0',
        coord: { az: 'NW 288°', alt: '+29°' },
      },
      {
        name: '④ 入夜 · 归于星野',
        anchor: '合上这一卷',
        desc: '高度角 < 0°，隐入西北地平线之下——星没有灭，只是走到了地球的另一边，等着明天同一个子时，再从东升起。',
        color: '#86a8ff',
        coord: { az: 'NW 315°', alt: '-06°' },
      },
    ],
    summary:
      '从东升到西沉，四星轨走完一个恒星日约 23h 56m。最高点在「凌晨四点」（中天 +74°），但西沉之后的每一次东升，都会比前一天早 4 分钟——心事也是这样，今天放不下的，明天会更容易放下一点。',
  },
  // 第三段：星座神话（原独白卡 + 星官注）
  monologue: {
    tag: '《天官书》摘录',
    text: '孤独不是没有人，而是有些话找不到人说。可当我把它写下来、再挂到这颗星上的时候，我好像终于找到那个愿意听完的人了。',
    mythNote: '昔有旅人夜渡江，舟中独语，忽见北岸有灯如豆，不移不动。至晓乃悟，灯即此星也。后人以心语寄星，星辄亮一度——心语积久，遂成夜雨孤灯座。',
    author: '出自《星经通考·外篇》卷十二',
  },
  // 第四段：观星者手记（原寄语条）
  postscript: {
    tag: '🌌 观星者手记 · 给你的星',
    content:
      '这 8 颗星构成的形状，在北天会停留 2100 年——直到公元 4100 年岁差把它推到隔壁的天区。你不用急着看完，也不用急着懂，就像星不用急着烧完。只要在某个子时至丑时的夜里，你抬头还能看见它，它就已经完成了自己的使命。',
  },
}

/* ═══════════════════════════════════════════════════════════
   Computed / 工具
   ═══════════════════════════════════════════════════════════ */

/** 共鸣榜：优先用真实故事 Top3，不足则补 mock */
const rankList = computed(() => {
  const real = (props.stories ?? [])
    .slice()
    .sort((a, b) => (b.resonanceCount ?? 0) - (a.resonanceCount ?? 0))
    .slice(0, 3)
    .map(s => {
      // 作者名：有 creator_name 用它；否则古代版=佚名·钞，现代版=匿名
      let author = s.creator_name || ''
      if (!author) {
        author = isAncientTone.value ? '佚名 · 钞' : '匿名'
      }
      // 古代版作者统一：如果不是具体人名则加"·钞"
      if (isAncientTone.value && author && author !== '古人' && !author.endsWith('钞') && !author.includes('·')) {
        author = `${author} · 钞`
      }
      if (author === '古人' && isAncientTone.value) {
        author = '佚名 · 钞'
      }
      return {
        id: s.id,
        title: s.title || '未命名故事',
        summary: storySummary(s.content),
        resonance: s.resonanceCount ?? 0,
        author,
      }
    })
  if (real.length >= 3) return real
  // 不足 3 则用 mock 补足（mock 也要带 author，按 tone 切）
  const mockAncient = [
    { id: -1, title: '夜雨寄北', summary: '何当共剪西窗烛，却话巴山夜雨时。', resonance: 42, author: '李商隐 · 钞' },
    { id: -2, title: '水调歌头·明月几时有', summary: '但愿人长久，千里共婵娟。', resonance: 35, author: '苏轼 · 钞' },
    { id: -3, title: '天净沙·秋思', summary: '夕阳西下，断肠人在天涯。', resonance: 28, author: '马致远 · 钞' },
  ]
  const mockModern = [
    { id: -1, title: '雨夜寄北', summary: '把没寄出的话折成纸船，放进窗外的雨里。', resonance: 42, author: '匿名' },
    { id: -2, title: '凌晨四点', summary: '整座城市都睡了，只有我和一盏台灯还醒着。', resonance: 35, author: '匿名' },
    { id: -3, title: '故乡的槐花', summary: '又到开花的季节，只是树下的人不在了。', resonance: 28, author: '匿名' },
  ]
  const mock = isAncientTone.value ? mockAncient : mockModern
  return [...real, ...mock.slice(real.length)].slice(0, 3)
})

function storySummary(content: string): string {
  const plain = (content || '').replace(/[#*`>\-_~]/g, '').replace(/\s+/g, ' ').trim()
  return plain.length > 36 ? plain.slice(0, 36) + '…' : plain
}

const hourSum = computed(() => Math.max(1, hourly.value.reduce((a: number, b: number) => a + b, 0)))
const peakPct = computed(() => Math.max(1, Math.round(hourly.value[peakHour.value] / hourSum.value * 100)))
const lowPct  = computed(() => Math.max(0.1, Math.round(hourly.value[lowHour.value] / hourSum.value * 100 * 10) / 10))

const DIZHI_PER_2H: Record<number, string> = {
  23: '子', 0: '子', 1: '丑', 2: '丑', 3: '寅', 4: '寅', 5: '卯', 6: '卯',
  7: '辰', 8: '辰', 9: '巳', 10: '巳', 11: '午', 12: '午', 13: '未', 14: '未',
  15: '申', 16: '申', 17: '酉', 18: '酉', 19: '戌', 20: '戌', 21: '亥', 22: '亥',
}
function pad(n: number) { return n.toString().padStart(2, '0') }
function hourRangeText(h: number) {
  const d = DIZHI_PER_2H[h] ?? ''
  const end = (h + 2) % 24
  return `${d}时 · ${pad(h)}-${pad(end)}`
}

function beadColor(v: number) {
  if (v < 2) return 'rgba(255,255,255,0.12)'
  if (v < 5) return 'rgba(134,168,255,0.35)'
  if (v < 8) return 'rgba(154,230,180,0.45)'
  if (v < 11) return 'rgba(202,167,255,0.55)'
  return 'rgba(255,217,138,0.85)'
}
function beadSize(v: number) {
  return 4 + Math.min(10, Math.round(v / 1.5))
}

function tagStyle(tag: string): Record<string, string> {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h << 5) - h + tag.charCodeAt(i)
  h = Math.abs(h) % 360
  return {
    color: `hsl(${h} 62% 74%)`,
    background: `hsla(${h}, 62%, 74%, 0.08)`,
    borderColor: `hsla(${h}, 62%, 74%, 0.18)`,
  }
}
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════
   Layout
   ═══════════════════════════════════════════════════════════ */
.ca-wrap {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px 22px 24px;
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}
.ca-wrap::-webkit-scrollbar { width: 5px; }
.ca-wrap::-webkit-scrollbar-track { background: transparent; }
.ca-wrap::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }

/* 双栏 ca-duo 布局 */
.ca-duo > section { margin-top: 0; }
.ca-duo { margin-top: 0; }

/* ═══ Hero Strip ═══ */
.ca-hero-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(255, 217, 138, 0.06), rgba(202, 167, 255, 0.04));
  border: 1px solid rgba(255, 217, 138, 0.12);
  flex-shrink: 0;
}
.ca-hero-left {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}
.ca-hero-spark { color: var(--accent); flex-shrink: 0; }
.ca-hero-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.02em;
}
.ca-hero-sub {
  font-size: 0.68rem;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ca-hero-badge {
  font-size: 0.56rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  padding: 2px 7px;
  border-radius: 100px;
  background: rgba(255, 217, 138, 0.12);
  color: var(--accent);
  border: 1px solid rgba(255, 217, 138, 0.2);
  flex-shrink: 0;
}
/* hero badge 三态：live 绿 / standby 灰 / loading 紫 / error 红 */
.ca-hero-badge.is-live { background: rgba(154,230,180,0.14); color: #9ae6b4; border-color: rgba(154,230,180,0.28); }
.ca-hero-badge.is-standby { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.45); border-color: rgba(255,255,255,0.06); }
.ca-hero-badge.is-loading { background: rgba(202,167,255,0.13); color: #caa7ff; border-color: rgba(202,167,255,0.28); }
.ca-hero-badge.is-error { background: rgba(255,139,125,0.13); color: #ff8b7d; border-color: rgba(255,139,125,0.3); }

/* 全局错误条：API 失败时显示（与 hero strip 风格对齐） */
.ca-error-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(255, 139, 125, 0.06);
  border: 1px solid rgba(255, 139, 125, 0.18);
  flex-shrink: 0;
}
.ca-error-left { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; }
.ca-error-icon { color: #ff8b7d; flex-shrink: 0; }
.ca-error-label {
  font-size: 0.72rem; font-weight: 700; color: #ff8b7d;
  letter-spacing: 0.03em; flex-shrink: 0;
}
.ca-error-msg {
  font-size: 0.68rem; color: rgba(255, 210, 205, 0.7);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;
}
.ca-error-retry {
  display: inline-flex; align-items: center; gap: 4px;
  background: rgba(255, 139, 125, 0.14);
  color: #ffd2cd; border: 1px solid rgba(255, 139, 125, 0.3);
  padding: 3px 9px; border-radius: 100px;
  font-size: 0.66rem; font-weight: 600; cursor: pointer;
  transition: background .2s; flex-shrink: 0;
}
.ca-error-retry:hover { background: rgba(255, 139, 125, 0.24); }
.ca-error-retry:active { transform: translateY(1px); }

/* ═══ Card Base ═══ */
.ca-card {
  background: rgba(255, 255, 255, 0.018);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}
.ca-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 217, 138, 0.3), transparent);
}
.ca-card-head {
  display: flex;
  align-items: center;
  gap: 7px;
  padding-bottom: 9px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.ca-ch-icon { opacity: 0.85; flex-shrink: 0; }
.ca-ch-gold { color: #ffd98a; }
.ca-ch-red { color: #ff8b7d; }
.ca-ch-blue { color: #86a8ff; }
.ca-ch-purple { color: #caa7ff; }
.ca-ch-green { color: #9ae6b4; }
.ca-ch-orange { color: #ffb877; }
.ca-ch-cyan { color: #7fd4e0; }
.ca-ch-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  flex: 1;
}
.ca-ch-count {
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.22);
  letter-spacing: 0.03em;
}

/* ═══ 双栏 ═══ */
.ca-duo {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  flex-shrink: 0;
}

/* ═══ 0.5 你的那片天空（合集=整片夜空剖面：左天空SVG剖面+右天象面板）═══ */
.ca-sky-body {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(0, 1fr);
  gap: 18px;
  align-items: stretch;
}
/* 天空画布：SVG 夜空剖面（自带天色渐变/银河，不需要外层背景） */
.ca-sky-canvas {
  border-radius: 12px;
  overflow: hidden;
  /* 边框+夜色微渐变外围 */
  border: 1px solid rgba(134,168,255,0.12);
  background:
    radial-gradient(ellipse at 60% 15%, rgba(255,245,230,0.03), transparent 60%),
    radial-gradient(ellipse at 20% 90%, rgba(255,179,120,0.05), transparent 55%),
    #0a0c24;
  box-shadow:
    inset 0 0 20px rgba(11,13,42,0.7),
    inset 0 0 40px rgba(100,80,180,0.05);
  position: relative;
}
.ca-sky-canvas::before {
  /* 边角加 vignette（天空四周稍暗） */
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 55%, rgba(5,6,20,0.55) 100%);
  pointer-events: none;
  z-index: 2;
}
.ca-sky-svg {
  width: 100%;
  height: auto;
  max-height: 300px;
  position: relative;
  z-index: 1;
  display: block;
}

/* 右侧：天象属性面板（夜名/月相/节气/五大气象/时辰分布） */
.ca-sky-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
/* 顶部标题：夜名 + 副标题（甲辰春分第三夜） */
.ca-sp-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 2px 4px 8px;
  border-bottom: 1px dashed rgba(255,217,138,0.12);
}
.ca-sp-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(255,255,255,0.92);
  letter-spacing: 0.06em;
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
}
.ca-sp-sub {
  font-size: 0.6rem;
  color: rgba(255,255,255,0.32);
  letter-spacing: 0.1em;
  font-style: italic;
}
/* 天象二联卡：月相 + 节气 */
.ca-sp-phenomena {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
}
.ca-sp-phenom {
  padding: 10px 11px;
  background: rgba(255,255,255,0.015);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 9px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ca-sp-ph-k {
  font-size: 0.52rem;
  letter-spacing: 0.15em;
  color: rgba(255,255,255,0.3);
  text-transform: uppercase;
  opacity: 0.85;
}
/* 左侧图（月相/节气）+ 右侧文本 */
.ca-sp-ph-moon, .ca-sp-ph-term {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ca-sp-ph-moon-text,
.ca-sp-ph-term .ca-sp-ph-moon-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.ca-sp-ph-moon-name {
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(255,255,255,0.85);
  letter-spacing: 0.03em;
}
.ca-sp-ph-moon-pct {
  font-size: 0.58rem;
  color: rgba(255,255,255,0.38);
  letter-spacing: 0.05em;
  font-variant-numeric: tabular-nums;
}

/* 五大气象：2列3行网格 */
.ca-sp-meteo {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 9px 10px;
  background: rgba(0,0,0,0.22);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 8px;
}
.ca-sp-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 3px 5px;
  background: rgba(255,255,255,0.015);
  border-radius: 5px;
  border-left: 1.5px solid rgba(255,255,255,0.08);
}
.ca-sp-cell-k {
  font-size: 0.52rem;
  letter-spacing: 0.12em;
  color: rgba(255,255,255,0.32);
  opacity: 0.85;
}
.ca-sp-cell-v {
  font-size: 0.66rem;
  font-weight: 600;
  color: rgba(255,255,255,0.72);
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  line-height: 1.35;
}

/* 时辰分布追踪条：横向时间线（子初→卯初）*/
.ca-sp-hours {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 11px 9px;
  background:
    linear-gradient(90deg, rgba(11,13,42,0.5), rgba(42,37,64,0.4)),
    rgba(255,255,255,0.015);
  border: 1px solid rgba(255,217,138,0.08);
  border-radius: 9px;
}
.ca-sp-h-title {
  font-size: 0.54rem;
  letter-spacing: 0.12em;
  color: rgba(255,217,138,0.72);
  opacity: 0.92;
  font-weight: 500;
}
.ca-sp-h-track {
  position: relative;
  width: 100%;
  height: 18px;
  background: linear-gradient(90deg, #0b0d2a 0%, #1b1a47 50%, #2a2540 100%);
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.06);
  overflow: visible;
}
.ca-sp-h-dot {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: var(--hd);
  box-shadow: 0 0 5px var(--hd), inset 0 0 3px rgba(255,255,255,0.3);
  opacity: 0.9;
}
.ca-sp-h-scale {
  display: flex;
  justify-content: space-between;
  padding: 0 2px;
  font-size: 0.5rem;
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.3);
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
}

/* 底部注释 */
.ca-sp-foot {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 8px;
  font-size: 0.56rem;
  line-height: 1.5;
  color: var(--muted-light);
  background: rgba(134,168,255,0.025);
  border-radius: 6px;
  border: 1px dashed rgba(134,168,255,0.08);
  letter-spacing: 0.03em;
  opacity: 0.9;
}

/* ═══ 1. Persona（合集画像：笺卷小卡 + 双段解读 + 金句 + 引导 + 维度）═══ */
.ca-persona-body {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 20px;
  align-items: stretch;
  min-height: 0;
}

/* 左：笺卷小卡（参考星格画像 star-card） */
.ca-scroll-card {
  position: relative;
  background: linear-gradient(160deg, rgba(22, 12, 48, 0.9), rgba(8, 16, 38, 0.9));
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 8px;
  padding: 12px 12px 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.ca-scroll-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 35%, rgba(202,167,255,0.1), transparent 55%),
              radial-gradient(circle at 72% 82%, rgba(255,217,138,0.1), transparent 55%);
  pointer-events: none;
}
.sc-corner {
  position: absolute;
  width: 9px; height: 9px;
  border-color: rgba(255,217,138,0.45);
  border-style: solid;
  border-width: 0;
  z-index: 1;
}
.sc-tl { top: 6px; left: 6px;  border-top-width: 1px; border-left-width: 1px; }
.sc-tr { top: 6px; right: 6px; border-top-width: 1px; border-right-width: 1px; }
.sc-bl { bottom: 6px; left: 6px;  border-bottom-width: 1px; border-left-width: 1px; }
.sc-br { bottom: 6px; right: 6px; border-bottom-width: 1px; border-right-width: 1px; }
.sc-top {
  position: relative; z-index: 1;
  display: flex; flex-direction: column; gap: 2px;
  margin-bottom: 4px;
}
.sc-collection {
  font-size: 0.56rem;
  color: rgba(255,255,255,0.38);
  letter-spacing: 0.04em;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sc-name-han {
  font-size: 0.88rem;
  font-weight: 700;
  color: #ffd98a;
  letter-spacing: 0.16em;
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
  text-shadow: 0 0 8px rgba(255,217,138,0.28);
}
.sc-svg {
  width: 100%;
  flex: 1;
  min-height: 86px;
  display: block;
  position: relative; z-index: 1;
}
.sc-tags {
  position: relative; z-index: 1;
  display: flex; flex-wrap: wrap; gap: 4px;
  margin-top: 6px;
}
.sc-tag {
  padding: 1px 6px;
  font-size: 0.54rem;
  border-radius: 3px;
  background: rgba(202,167,255,0.1);
  border: 1px solid rgba(202,167,255,0.22);
  color: rgba(255,255,255,0.72);
  letter-spacing: 0.03em;
  white-space: nowrap;
}

/* 【星空绑定】笺卷卡中部：天文参数条（赤经/赤纬/视星等/光年） */
.sc-astro {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px 8px;
  padding: 5px 7px;
  margin-top: 4px;
  background: rgba(202,167,255,0.05);
  border-top: 1px solid rgba(202,167,255,0.12);
  border-bottom: 1px solid rgba(202,167,255,0.12);
}
.sc-astro-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-variant-numeric: tabular-nums;
}
.sc-astro-k {
  font-size: 0.46rem;
  color: rgba(202,167,255,0.55);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  width: 18px;
  flex-shrink: 0;
}
.sc-astro-v {
  font-size: 0.56rem;
  color: rgba(255,255,255,0.72);
  font-weight: 500;
  letter-spacing: 0.03em;
}

/* 笺卷卡底部标签：从通用标签改「主要亮星」αβγ 徽章样式 */
.sc-tags-brights {
  gap: 3px;
  margin-top: 5px;
}
.sc-tags-brights .ca-pt-kw-bright {
  font-size: 0.5rem;
  padding: 1px 6px 1px 4px;
}

/* 右：文字解读区 */
.ca-persona-text {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}
/* 【星空绑定】星区简介条（解读区首条：天文志口吻） */
.ca-pt-intro {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  padding: 4px 10px;
  font-size: 0.6rem;
  color: rgba(202, 167, 255, 0.85);
  background:
    linear-gradient(90deg, rgba(202,167,255,0.08), rgba(202,167,255,0.02)),
    rgba(255,255,255,0.01);
  border: 1px solid rgba(202,167,255,0.18);
  border-left: 2.5px solid rgba(202,167,255,0.5);
  border-radius: 0 6px 6px 0;
  letter-spacing: 0.05em;
  opacity: 0.95;
}

/* 【星空绑定】意象·亮星云：关键词 + 亮星混合标签云 */
.ca-pt-keywords {
  padding: 8px 10px;
  background: rgba(255,255,255,0.015);
  border: 1px solid rgba(255,255,255,0.045);
  border-radius: 10px;
}
.ca-pt-kw-title {
  font-size: 0.56rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
  opacity: 0.85;
  margin-bottom: 7px;
  padding-bottom: 5px;
  border-bottom: 1px dashed rgba(255,217,138,0.12);
}
.ca-pt-kw-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
/* 通用关键词标签 */
.ca-pt-kw-tag {
  font-size: 0.62rem;
  color: rgba(255,255,255,0.68);
  padding: 2px 8px;
  background: rgba(255,255,255,0.035);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 20px;
  letter-spacing: 0.03em;
}
/* 亮星徽章（α/β/γ + 星名），带情绪色发光边框 */
.ca-pt-kw-bright {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.64rem;
  font-weight: 500;
  color: rgba(255,255,255,0.88);
  padding: 2px 8px 2px 5px;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--c) 14%, transparent), rgba(255,255,255,0.015));
  border: 1px solid color-mix(in srgb, var(--c) 30%, transparent);
  border-radius: 20px;
  letter-spacing: 0.03em;
  transition: all 0.2s ease;
}
.ca-pt-kw-bright:hover {
  transform: translateY(-0.5px);
  box-shadow: 0 0 8px color-mix(in srgb, var(--c) 20%, transparent);
  border-color: color-mix(in srgb, var(--c) 55%, transparent);
}
.ca-pt-kw-rank {
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-style: italic;
  font-weight: 700;
  font-size: 0.68rem;
  color: var(--c);
  filter: drop-shadow(0 0 2px var(--c));
  line-height: 1;
  padding: 0 1px 0 2px;
}
/* 【天空本色】天空意象徽章（夜雨/江风/孤灯…）：夜色边 + 小发光，字体偏楷体偏柔 */
.ca-pt-kw-sky {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0;
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-weight: 500;
  color: rgba(255,255,255,0.86);
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--c) 10%, transparent), rgba(11,13,42,0.4));
  border: 1px solid color-mix(in srgb, var(--c) 26%, transparent);
  border-radius: 18px;
  letter-spacing: 0.04em;
  transition: all 0.22s ease;
  box-shadow:
    0 0 0 color-mix(in srgb, var(--c) 0%, transparent),
    inset 0 0 6px color-mix(in srgb, var(--c) 8%, transparent);
}
.ca-pt-kw-sky:hover {
  transform: translateY(-0.5px);
  border-color: color-mix(in srgb, var(--c) 55%, transparent);
  box-shadow: 0 0 7px color-mix(in srgb, var(--c) 18%, transparent);
}
/* 原主标签 (#独属于你 …) 的 ghost 风格：淡灰透明低调（别抢天空意象的戏） */
.ca-pt-kw-tag-ghost {
  opacity: 0.38;
  background: rgba(255,255,255,0.02);
  border-color: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.55);
  font-size: 0.56rem;
  padding: 3px 7px;
  text-shadow: none;
}
.ca-pt-kw-title-sky {
  color: #ffd98a;
  opacity: 0.92;
}
/* 观夜简介条：夜色淡边（替换原星区Orbit图标紫边） */
.ca-pt-intro-night {
  background: linear-gradient(90deg, rgba(134,168,255,0.07), rgba(255,217,138,0.04));
  border: 1px solid rgba(134,168,255,0.12);
  color: rgba(255,255,255,0.62);
}
/* 引导条：🌙 给那一夜的注脚（冷蓝→暖金） */
.ca-sw-night {
  background: linear-gradient(90deg, rgba(255,217,138,0.06), rgba(134,168,255,0.04));
  border-left: 2px solid rgba(255,217,138,0.35);
}
.ca-sw-night .ca-s-tip {
  color: rgba(255,217,138,0.82);
}

/* ===== 【那一夜·五大气象维度紧凑版】一行5列小卡网格，替代5行横条（显著降低高度） ===== */
.ca-meteo-compact {
  margin-top: 6px;
  padding: 8px 10px 10px;
  background: rgba(255,255,255,0.018);
  border: 1px solid rgba(255,255,255,0.045);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.ca-mc-title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.64rem;
  font-weight: 600;
  color: rgba(255,255,255,0.64);
  letter-spacing: 0.04em;
}
.ca-mc-title svg { color: #86a8ff; opacity: 0.88; }
.ca-mc-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
}
.ca-mc-item {
  position: relative;
  padding: 6px 7px 7px 20px;
  background: rgba(0,0,0,0.18);
  border: 1px solid color-mix(in srgb, var(--mc) 15%, transparent);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  transition: border-color 0.2s ease;
}
.ca-mc-item:hover {
  border-color: color-mix(in srgb, var(--mc) 28%, transparent);
}
.ca-mc-dot {
  position: absolute;
  left: 7px;
  top: 9px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--mc);
  box-shadow: 0 0 4px color-mix(in srgb, var(--mc) 80%, transparent);
}
.ca-mc-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.ca-mc-k {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--mc);
  font-family: "Inter", "PingFang SC", sans-serif;
}
.ca-mc-v {
  font-size: 0.60rem;
  color: rgba(240,240,255,0.76);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}
.ca-mc-en {
  font-size: 0.48rem;
  letter-spacing: 0.10em;
  color: rgba(220,220,240,0.32);
  font-family: "SF Mono", "JetBrains Mono", monospace;
  line-height: 1.2;
}
.ca-mc-bar {
  position: relative;
  height: 2px;
  background: rgba(255,255,255,0.04);
  border-radius: 2px;
  overflow: hidden;
}
.ca-mc-fill {
  height: 100%;
  background: linear-gradient(90deg, color-mix(in srgb, var(--mc) 30%, transparent), var(--mc));
  border-radius: 2px;
  opacity: 0.9;
}
/* 小屏适配：5列 → 2+3 两行 */
@media (max-width: 900px) {
  .ca-mc-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 620px) {
  .ca-mc-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
/* 五大气象条：标题/字体风格小微调 */
.ca-dims-night .ca-dims-title {
  background: linear-gradient(90deg, rgba(134,168,255,0.05), rgba(202,167,255,0.04), rgba(149,240,192,0.04));
  border: 1px solid rgba(134,168,255,0.1);
  color: rgba(255,255,255,0.72);
}
.ca-dims-night .ca-dims-title .ca-dims-sub {
  color: rgba(255,255,255,0.38);
}
/* 左侧气象符号：尺寸稍大，发光色来自 --pc（保持原行星icon容器大小） */
.ca-dim-night-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background:
    radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--pc) 30%, transparent), transparent 75%),
    rgba(255,255,255,0.02);
  border: 1px solid color-mix(in srgb, var(--pc) 22%, transparent);
  filter: drop-shadow(0 0 3px color-mix(in srgb, var(--pc) 35%, transparent));
}
/* 金句卡：残灯版（灯替换双引号，夜色底） */
.ca-qc-night {
  padding: 10px 14px 10px 36px;
  background:
    linear-gradient(90deg, rgba(255,217,138,0.04), rgba(11,13,42,0.5)),
    rgba(0,0,0,0.18);
  border-left: 2px solid rgba(255,217,138,0.35);
  border-top: 1px solid rgba(134,168,255,0.08);
  border-right: 1px solid rgba(134,168,255,0.05);
  border-bottom: 1px solid rgba(202,167,255,0.05);
}
.ca-qc-night .ca-quote-mark { display: none; }
.ca-qc-lamp {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  filter: drop-shadow(0 0 4px rgba(255,217,138,0.55));
}
/* 夜观小册笺卷：细节微调 */
.ca-sc-night .sc-top { margin-bottom: 6px; }
.ca-sc-night .sc-collection { font-size: 0.58rem; color: rgba(255,217,138,0.72); }
.ca-sc-night .sc-name-han { font-size: 0.86rem; color: rgba(255,255,255,0.9); }
.ca-pt-para {
  margin: 0;
  font-size: 0.76rem;
  line-height: 1.9;
  color: rgba(255,255,255,0.68);
  text-align: justify;
}
.ca-pt-para.first {
  color: rgba(255,255,255,0.8);
  line-height: 1.95;
}
.ca-han-hl {
  color: #ffd98a;
  font-weight: 700;
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
  letter-spacing: 0.06em;
  padding: 0 2px;
}
.ca-pt-para b { color: var(--ink); font-weight: 600; }

/* 金句卡片（参考故事摘录 quote-mark 风格） */
.ca-quote-card {
  position: relative;
  padding: 10px 14px 10px 28px;
  border-radius: 6px;
  background: rgba(255, 217, 138, 0.035);
  border-left: 2px solid rgba(255, 217, 138, 0.45);
}
.ca-quote-mark {
  position: absolute;
  left: 10px;
  top: 4px;
  font-size: 1.6rem;
  font-weight: 700;
  line-height: 0.8;
  color: rgba(255, 217, 138, 0.55);
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
}
.ca-quote-text {
  display: block;
  font-size: 0.8rem;
  line-height: 1.7;
  color: #ffd98a;
  font-style: italic;
  text-shadow: 0 0 12px rgba(255,217,138,0.1);
}

/* 引导条（参考星格画像的 pt-suggest-wrap） */
.ca-suggest-wrap {
  padding-top: 2px;
  border-top: 1px dashed rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 8px;
}
.ca-s-tip {
  flex-shrink: 0;
  font-size: 0.62rem;
  color: #ffd98a;
  letter-spacing: 0.04em;
  font-weight: 600;
  background: rgba(255,217,138,0.08);
  border: 1px solid rgba(255,217,138,0.2);
  padding: 2px 9px;
  border-radius: 999px;
}
.ca-s-text {
  font-size: 0.72rem;
  color: rgba(255,255,255,0.52);
  line-height: 1.75;
}

/* 维度条卡片（包一层 + 标题） */
.ca-dims-card {
  padding: 10px 12px;
  border-radius: 6px;
  background: rgba(255,255,255,0.015);
  border: 1px solid rgba(255,255,255,0.04);
}
.ca-dims-title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.62rem;
  font-weight: 600;
  color: rgba(202,167,255,0.8);
  margin-bottom: 8px;
  letter-spacing: 0.06em;
}
.ca-dims-title svg { opacity: 0.75; }
.ca-dims {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ca-dim {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ca-dim-labels {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  font-size: 0.6rem;
  color: var(--muted);
  gap: 8px;
}
.ca-dim-labels .active { color: var(--accent); font-weight: 600; }
.ca-dim-pct {
  font-size: 0.58rem;
  font-weight: 700;
  color: rgba(255,217,138,0.7);
  font-variant-numeric: tabular-nums;
}
.ca-dim-track {
  position: relative;
  height: 4px;
  border-radius: 100px;
  background: rgba(255, 255, 255, 0.05);
}
.ca-dim-fill {
  position: absolute;
  top: 0; left: 0;
  height: 100%;
  border-radius: 100px;
  background: linear-gradient(90deg, rgba(202,167,255,0.55), rgba(255,217,138,0.55));
  transition: width 0.5s ease;
}
.ca-dim-knob {
  position: absolute;
  top: 50%;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #ffd98a;
  box-shadow: 0 0 6px rgba(255,217,138,0.65);
  transform: translate(-50%, -50%);
  transition: left 0.5s ease;
}

/* 【星空绑定】维度卡副标题（星座五曜：金木水火土 守护星格） */
.ca-dims-sub {
  margin-left: auto;
  font-size: 0.54rem;
  font-weight: 400;
  color: rgba(202,167,255,0.55);
  letter-spacing: 0.1em;
  opacity: 0.85;
}

/* 【星空绑定】星座五曜：每行 = 左行星小图标 + 右标签条+轨道（五行星对应五维） */
.ca-dims-five { gap: 9px; }
.ca-dim-five {
  flex-direction: row;
  align-items: center;
  gap: 10px;
  padding: 5px 4px;
  border-radius: 8px;
  background: rgba(255,255,255,0.012);
  transition: background 0.2s ease;
}
.ca-dim-five:hover { background: rgba(255,255,255,0.025); }
/* 行星图标（彩色发光小圆 + 光晕） */
.ca-dim-planet {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  flex-shrink: 0;
  position: relative;
  background:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,0.25), transparent 60%),
    color-mix(in srgb, var(--pc) 18%, transparent);
  box-shadow:
    inset 0 0 5px color-mix(in srgb, var(--pc) 25%, transparent),
    0 0 8px color-mix(in srgb, var(--pc) 20%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ca-dim-planet-orb {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow:
    inset -1px -1px 2px rgba(0,0,0,0.25),
    0 0 5px color-mix(in srgb, var(--pc) 45%, transparent);
  opacity: 0.92;
}
.ca-dim-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.ca-dim-labels-five {
  flex-direction: column;
  align-items: stretch;
  gap: 1px;
}
.ca-dim-ln, .ca-dim-rn {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.ca-dim-rn { justify-content: space-between; }
.ca-dim-planet-name {
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  width: 16px;
  text-align: center;
  filter: drop-shadow(0 0 2px currentColor);
}
.ca-dim-planet-en {
  font-size: 0.48rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.65;
  width: 34px;
}
.ca-dim-labels-five .active { font-size: 0.6rem; }
.ca-dim-track-five {
  height: 5px;
  background:
    linear-gradient(90deg,
      color-mix(in srgb, var(--ptc) 20%, rgba(255,255,255,0.03)),
      rgba(255,255,255,0.05));
}


/* 删除旧的未用 class */
.ca-han-name, .ca-han-sub, .ca-tags, .ca-tag, .ca-quote, .ca-intro { display: none; }

/* ═══ 2. Emotion（参考星星 AIRadarWordcloud：发光球体 + 洞察卡 + 叙事） ═══ */
.ca-emotion-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ca-emo-orbs {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  padding: 4px 2px 8px;
  min-height: 82px;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.04);
}
/* 【星空绑定】赫罗图(HR Diagram)容器：绝对定位球、XY轴标签 */
.ca-hr-diagram {
  position: relative;
  min-height: 136px;
  padding: 18px 34px 26px 40px;
  background:
    linear-gradient(180deg, rgba(134,168,255,0.05) 0%, rgba(255,139,125,0.05) 100%),
    rgba(255,255,255,0.008);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 10px;
  overflow: hidden;
}
/* Y 轴：光度 Lum（顶部→底部 暗→亮 */
.ca-hr-y {
  position: absolute;
  left: 6px;
  top: 12px;
  bottom: 22px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  pointer-events: none;
}
.ca-hr-y-top {
  writing-mode: vertical-rl;
  font-size: 0.5rem;
  color: rgba(134,168,255,0.7);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  font-weight: 600;
  transform: rotate(180deg);
  opacity: 0.8;
}
.ca-hr-y-bot {
  font-size: 0.5rem;
  color: rgba(255,139,125,0.75);
  letter-spacing: 0.15em;
  opacity: 0.7;
}
/* X 轴：光谱型 OBAFGKM + 温度 Temp */
.ca-hr-x {
  position: absolute;
  left: 40px;
  right: 10px;
  bottom: 6px;
  display: flex;
  justify-content: space-between;
  pointer-events: none;
}
.ca-hr-x-l {
  font-size: 0.5rem;
  color: rgba(134,168,255,0.7);
  letter-spacing: 0.25em;
  font-weight: 600;
  opacity: 0.85;
}
.ca-hr-x-r {
  font-size: 0.5rem;
  color: rgba(255,139,125,0.8);
  letter-spacing: 0.15em;
  opacity: 0.75;
}
/* HR 图内球体：绝对定位（相对容器，用left/bottom，用 calc() 值 */
.ca-hr-orb {
  position: absolute;
  margin: 0 !important;
  transform-origin: center bottom;
}
/* 光谱型标签徽章（HR图球体右下角浮层 */
.ca-hr-spec-tag {
  position: absolute;
  right: -6px;
  bottom: -6px;
  font-size: 0.48rem;
  font-family: 'Courier New', monospace;
  font-weight: 700;
  padding: 1px 3px;
  background: rgba(0,0,0,0.35);
  border: 1px solid;
  border-radius: 3px;
  letter-spacing: 0.05em;
  white-space: nowrap;
  backdrop-filter: blur(1.5px);
  z-index: 2;
  opacity: 0.92;
}
/* 【夜色流转】5个球 → 完全对齐 StarDetail AIRadarWordcloud.vue 的 emotion-orbs 结构：
   flex row 水平一条线，align-items:flex-end 底部对齐，space-around 均匀分布 */
.ca-night-orbs {
  display: flex;
  align-items: flex-end;    /* 和 StarDetail 一样：所有球底部对齐 */
  justify-content: space-around;
  padding: 6px 4px 8px;
  min-height: 100px;        /* StarDetail是82px，我们球稍大一点所以100px */
  border-bottom: 1px dashed rgba(255,255,255,0.04);
  flex-shrink: 0;
  width: 100%;
  background:
    linear-gradient(180deg, rgba(134,168,255,0.045) 0%, rgba(255,139,125,0.045) 100%);
  border-radius: 8px 8px 0 0;
}
/* orb 本体：完全沿用 StarDetail 的 orb 样式（scoped不共享，重写一份） */
.ca-night-orb {
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  cursor: default;
  transition: transform 0.2s ease;
}
/* orb 内部 label：名称（思念/孤独/释然等） */
.ca-no-label {
  font-size: 0.62rem;
  color: rgba(255,255,255,0.9);
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0,0,0,0.35);
  line-height: 1;
  margin-bottom: 2px;
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
}
/* orb 内部 val：数值 */
.ca-no-val {
  font-size: 0.58rem;
  color: rgba(255,255,255,0.75);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 1;
  opacity: 0.85;
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
}
/* hover 轻微上浮，StarDetail没有hover，我们保留一点反馈 */
.ca-night-orb:hover {
  transform: translateY(-3px) scale(1.07);
}

/* 洞察卡：夜色版（夜刻标签替代占比，夜属性替代恒星参数） */
.ca-ei-card-night .ca-ei-night-hour {
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  font-weight: 500;
  padding: 1.5px 5px;
  background: color-mix(in srgb, var(--c) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 32%, transparent);
  border-radius: 8px;
}
/* 夜属性行（相/云/温）风格微调 */
.ca-ei-night-meteo .ca-ei-astro-item .ca-ei-astro-k {
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
  letter-spacing: 0.04em;
  font-size: 0.5rem;
  color: rgba(255,255,255,0.3);
  margin-right: 2px;
}
/* 叙事卡：夜色版（夜·浓淡 替代主序阶段） */
.ca-emo-night-narr {
  background:
    linear-gradient(90deg, rgba(134,168,255,0.04), rgba(255,217,138,0.05)),
    rgba(255,255,255,0.005);
  border: 1px solid rgba(134,168,255,0.08);
  border-top-color: rgba(255,217,138,0.08);
}
.ca-emo-nl-label { /* 已删除：旧的夜·浓淡气泡样式 */ }
/* 叙事 icon：Sparkles 夜色发光 */
.ca-emo-night-narr .ca-emo-flow-icon {
  color: rgba(255,217,138,0.7);
  filter: drop-shadow(0 0 2px rgba(255,217,138,0.55));
}
.ca-emo-orb {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: default;
  transition: transform 0.2s;
  animation: orbFloat 4s ease-in-out infinite;
  flex-shrink: 0;
  position: relative;
}
.ca-emo-orb:nth-child(2n) { animation-delay: 0.8s; }
.ca-emo-orb:nth-child(3n) { animation-delay: 1.6s; }
.ca-emo-orb:hover { transform: scale(1.12); }
@keyframes orbFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
.ca-emo-orb-label {
  font-size: 0.64rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1;
  margin-bottom: 2px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.35);
}
.ca-emo-orb-val {
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.78);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 1;
  opacity: 0.82;
}

/* 情绪洞察卡片（替代原先明细列表，参考星星 e-para） */
.ca-emo-insights {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 2px 0;
}
.ca-ei-card {
  display: flex;
  gap: 9px;
  align-items: flex-start;
}
.ca-ei-dot {
  width: 4px; height: 4px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
  box-shadow: 0 0 5px currentColor;
}
.ca-ei-text { flex: 1; min-width: 0; }
.ca-ei-title {
  display: flex;
  align-items: baseline;
  gap: 7px;
  margin-bottom: 3px;
  font-size: 0.74rem;
  font-weight: 600;
  color: rgba(255,255,255,0.68);
  line-height: 1.55;
}
.ca-ei-title :deep(b),
.ca-ei-title :deep(strong) { color: #ffd98a; font-weight: 700; }
.ca-ei-pct {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  font-size: 0.7rem;
  margin-left: auto;
  opacity: 0.92;
}
.ca-ei-desc {
  font-size: 0.72rem;
  line-height: 1.72;
  color: rgba(255,255,255,0.42);
  text-align: justify;
}
/* ══════════ 夜色流转 · 情感回顾卡（emotionReviewCards 新样式） ══════════ */
.ca-ei-review.ca-ei-card-night {
  padding: 11px 13px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.032), rgba(255,255,255,0.008)) padding-box,
    linear-gradient(120deg, rgba(134,168,255,0.18), rgba(202,167,255,0.08)) border-box;
  border: 1px solid transparent;
}
.ca-ei-dot-review {
  margin-top: 5px;
  flex-shrink: 0;
  width: 6px;
  height: 6px;
}
.ca-ei-text-review {
  min-width: 0;
}
.ca-ei-title-review {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 0.8rem;
  color: rgba(255,255,255,0.92);
  font-weight: 600;
  margin-bottom: 6px;
}
.ca-ei-name-pct {
  color: var(--c, #fff);
  text-shadow: 0 0 4px var(--c, #ffd98a)66;
  font-weight: 700;
  letter-spacing: 0.01em;
  font-variant-numeric: tabular-nums;
}
.ca-ei-story-tag {
  font-size: 0.58rem;
  padding: 1px 6px;
  border: 1px solid;
  border-radius: 99px;
  opacity: 0.85;
  background: rgba(255,255,255,0.025);
  font-family: "Inter", "PingFang SC", sans-serif;
  letter-spacing: 0.02em;
}
.ca-ei-desc-review {
  font-size: 0.7rem;
  line-height: 1.75;
  color: rgba(255,255,255,0.50);
  text-align: left;
  word-break: break-word;
}
.ca-ei-desc-review::first-letter {
  /* 轻微的首字亮色，有回顾感像翻旧书 */
  font-weight: 600;
  color: rgba(255,217,138,0.72);
}
/* 旧的夜色时辰标签 & 天文参数栏样式（已从模板删除）置空，防止 CSS 冗余警告 + 覆盖原视觉残留 */
.ca-ei-night-hour, .ca-ei-night-meteo, .ca-ei-astro-k, .ca-ei-astro-v { display: none !important; }

/* 【星空绑定】洞察卡天文参数行（恒星类型 / 星等 / 距离光年） */
.ca-ei-astro {
  margin-top: 5px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 4px 7px;
  background: rgba(255,255,255,0.018);
  border-left: 1.5px solid currentColor;
  border-radius: 0 4px 4px 0;
  font-size: 0.6rem;
  color: rgba(255,255,255,0.52);
  font-family: 'Courier New', monospace;
  letter-spacing: 0.02em;
  opacity: 0.9;
}
.ca-ei-astro-item {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
.ca-ei-astro-k {
  font-size: 0.54rem;
  color: rgba(255,255,255,0.38);
  letter-spacing: 0.06em;
}
.ca-ei-astro-v {
  color: currentColor;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* 叙事段落（主调叙事 + 左紫条包裹） */
.ca-emo-narrative {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 9px 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.015);
  border-left: 2px solid rgba(202,167,255,0.38);
}
.ca-emo-para {
  font-size: 0.7rem;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.56);
  margin: 0;
}
.ca-emo-lead {
  font-weight: 700;
  color: #ffd98a;
  margin-right: 3px;
  letter-spacing: 0.04em;
}
.ca-emo-lead-pct {
  font-size: 0.6rem;
  font-weight: 600;
  color: #ffd98a;
  opacity: 0.72;
  margin-right: 5px;
}
.ca-emo-para-sub {
  font-size: 0.66rem;
  color: rgba(255, 255, 255, 0.42);
  line-height: 1.75;
}
.ca-emo-para-flow {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  font-size: 0.64rem;
  color: rgba(255, 139, 125, 0.65);
  font-style: italic;
  line-height: 1.7;
  margin: 0;
}
.ca-emo-flow-icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: #ff8b7d;
  opacity: 0.75;
}
/* 已删除：旧的「夜·浓淡」左上角气泡（ca-emo-ms-label） */

/* 删除旧的未用 class */
.ca-emo-list, .ca-emo-item, .ca-emo-dot, .ca-emo-item-name, .ca-emo-item-desc, .ca-emo-item-val { display: none; }

/* 天窗片段（心事摘录 ca-q*）整块 section 已从模板删除，CSS 也一并移除，避免冗余警告 */
.ca-q-body, .ca-q-list, .ca-q-item, .ca-q-rank, .ca-q-sticker, .ca-q-skywindow,
.ca-q-skywindow .ca-q-illus, .ca-q-sw-corner, .ca-q-night-head, .ca-q-night-head .ca-q-star-name,
.ca-q-sky-greek, .ca-q-night-astro, .ca-q-night-astro span i, .ca-q-illus, .ca-q-body-inner,
.ca-q-star-head, .ca-q-star-name, .ca-q-star-astro, .ca-q-star-astro-item, .ca-q-star-astro-k,
.ca-q-mark, .ca-q-text, .ca-q-meta, .ca-q-tag, .ca-q-spacer, .ca-q-author, .ca-q-date {
  display: none !important;
}

/* ═══ 3. Stars Belonging（真实地平坐标星图） ═══ */
.ca-starmap-wrap {
  position: relative;
  border-radius: 8px;
  background: radial-gradient(ellipse at 50% 30%, rgba(134, 168, 255, 0.04), rgba(10, 10, 26, 0.5));
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.03);
}
.ca-starmap-svg {
  width: 100%;
  height: auto;
  display: block;
  min-height: 140px;
}
.ca-sm-compass {
  font-size: 4px;
  font-weight: 600;
  letter-spacing: 0.05em;
  pointer-events: none;
}
.ca-sm-star {
  cursor: pointer;
  transition: opacity 0.2s;
}
/* hover 高亮：放大 + 完整标签 */
.ca-sm-star.active {
  opacity: 1;
}
.ca-sm-star.active > circle:nth-child(3) {
  filter: drop-shadow(0 0 4px currentColor);
}
/* 非 hover 星变暗 */
.ca-sm-star.dimmed {
  opacity: 0.25;
}
/* 地平线下星更暗 */
.ca-sm-star.below {
  opacity: 0.35;
}
.ca-sm-star.below.dimmed {
  opacity: 0.15;
}
.ca-sm-label {
  font-size: 5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  pointer-events: none;
}
.ca-sm-label-hover {
  font-size: 6.5px;
  font-weight: 700;
}
.ca-sm-count {
  font-size: 4px;
  fill: rgba(255, 255, 255, 0.35);
  pointer-events: none;
}
.ca-sm-count-hover {
  font-size: 5px;
  fill: rgba(255, 255, 255, 0.6);
}
.ca-sm-legend {
  display: flex;
  gap: 10px;
  padding: 5px 10px;
  font-size: 0.56rem;
  color: var(--muted-light);
  letter-spacing: 0.02em;
  border-top: 1px solid rgba(255, 255, 255, 0.03);
  background: rgba(0, 0, 0, 0.15);
  flex-wrap: wrap;
}
.ca-sm-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.ca-sm-below {
  color: rgba(255, 255, 255, 0.35);
  margin-left: auto;
}
.ca-sm-dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #ffd98a;
  box-shadow: 0 0 4px #ffd98a;
}
.ca-sm-dash {
  display: inline-block;
  width: 10px;
  height: 0;
  border-top: 1px dashed rgba(255, 255, 255, 0.3);
}
.ca-stars-empty {
  font-size: 0.7rem;
  color: var(--muted-light);
  font-style: italic;
  padding: 28px 0;
  text-align: center;
}
.ca-stars-insight {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(134, 168, 255, 0.04);
  border-left: 2px solid rgba(134, 168, 255, 0.3);
  margin-top: 4px;
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.6;
}
.ca-stars-flow-icon { color: #86a8ff; flex-shrink: 0; }

/* ═══ 4. Hour ═══ */
.ca-hour-beads {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 2px 6px;
}
.ca-bead {
  border-radius: 50%;
  flex-shrink: 0;
  transition: transform 0.15s;
}
.ca-bead:hover { transform: scale(1.6); z-index: 2; }
.ca-hour-axis {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  text-align: center;
  font-size: 0.58rem;
  color: rgba(255, 255, 255, 0.25);
  padding: 0 2px 8px;
  margin-bottom: 2px;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.04);
  letter-spacing: 0.08em;
}
.ca-hour-insights {
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.ca-hi {
  display: grid;
  grid-template-columns: auto auto 1fr;
  grid-template-rows: auto auto;
  align-items: center;
  gap: 4px 7px;
}
.ca-hi-prefix {
  grid-row: 1;
  font-size: 0.56rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 3px;
  letter-spacing: 0.06em;
}
.ca-hi-peak .ca-hi-prefix { background: rgba(255, 217, 138, 0.15); color: #ffd98a; }
.ca-hi-low .ca-hi-prefix { background: rgba(134, 168, 255, 0.15); color: #86a8ff; }
.ca-hi-time {
  grid-row: 1;
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.75);
}
.ca-hi-count {
  grid-row: 1;
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.28);
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}
.ca-hi-desc {
  grid-column: 1 / -1;
  grid-row: 2;
  margin: 0;
  padding: 7px 9px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.02);
  font-size: 0.72rem;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.48);
}

/* ═══ 星河合集：卷目疏 样式（替代气脉十二时） ═══ */
.scroll-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.scroll-head-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.scroll-card {
  --sc: #E8B86D;
  position: relative;
  border: 0.5px solid color-mix(in srgb, var(--sc) 22%, transparent);
  border-radius: 10px;
  padding: 10px 10px 9px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--sc) 6%, transparent) 0%, rgba(255,255,255,0.01) 100%);
  overflow: hidden;
  cursor: default;
}
.scroll-card::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--sc) 55%, transparent), transparent);
  opacity: 0.6;
}
.sc-banner {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 8px;
  padding-bottom: 7px;
  border-bottom: 0.5px dashed color-mix(in srgb, var(--sc) 22%, transparent);
}
.sc-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: color-mix(in srgb, var(--sc) 18%, transparent);
  color: var(--sc);
}
.sc-head-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.sc-name {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.82);
}
.sc-tag {
  font-size: 0.54rem;
  color: color-mix(in srgb, var(--sc) 75%, rgba(255,255,255,0.5));
  letter-spacing: 0.08em;
}
.sc-count {
  flex-shrink: 0;
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.4);
  font-variant-numeric: tabular-nums;
  padding: 2px 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.03);
}
.sc-tops {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sc-top-item {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  align-items: baseline;
  column-gap: 8px;
  row-gap: 1px;
  padding: 5px 6px;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.14s;
}
.sc-top-item:hover { background: color-mix(in srgb, var(--sc) 10%, transparent); }
.sc-top-title {
  grid-column: 1;
  grid-row: 1;
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.sc-top-item:hover .sc-top-title { color: var(--sc); }
.sc-top-sub {
  grid-column: 1 / -1;
  grid-row: 2;
  display: flex;
  align-items: center;
  gap: 6px;
}
.sc-top-author {
  font-size: 0.56rem;
  color: rgba(255, 255, 255, 0.36);
  letter-spacing: 0.03em;
}
.sc-top-res {
  font-size: 0.54rem;
  color: #ff8b7d;
  font-variant-numeric: tabular-nums;
  opacity: 0.9;
}
.sc-top-empty {
  cursor: default;
  font-size: 0.62rem;
  color: rgba(255, 255, 255, 0.3);
  font-style: italic;
  grid-column: 1 / -1;
  padding: 4px 6px 3px;
}

.scroll-other {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.so-title {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  align-self: flex-start;
  font-size: 0.6rem;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.45);
  padding: 2px 7px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.025);
}
.so-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.so-row {
  --sc: #E8B86D;
  display: grid;
  grid-template-columns: 18px 42px auto 1fr 36px;
  align-items: center;
  column-gap: 7px;
  padding: 4px 8px;
  border-radius: 5px;
  border: 0.5px solid color-mix(in srgb, var(--sc) 14%, transparent);
  background: color-mix(in srgb, var(--sc) 4%, transparent);
}
.so-icon {
  color: var(--sc);
  opacity: 0.8;
  justify-self: center;
}
.so-name {
  font-size: 0.64rem;
  color: rgba(255, 255, 255, 0.75);
  font-weight: 500;
  letter-spacing: 0.04em;
}
.so-tag {
  font-size: 0.52rem;
  color: color-mix(in srgb, var(--sc) 65%, rgba(255,255,255,0.5));
  letter-spacing: 0.06em;
}
.so-bar {
  position: relative;
  height: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  overflow: hidden;
  min-width: 0;
}
.so-fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 40%;
  background: linear-gradient(90deg, color-mix(in srgb, var(--sc) 60%, transparent), var(--sc));
  border-radius: 999px;
}
.so-count {
  justify-self: end;
  font-size: 0.54rem;
  color: rgba(255, 255, 255, 0.45);
  font-variant-numeric: tabular-nums;
  text-align: right;
}
@media (max-width: 640px) {
  .scroll-head-cards { grid-template-columns: 1fr; }
  .so-row { grid-template-columns: 18px 42px 1fr 32px; }
  .so-tag { display: none; }
}

/* ═══ 5. Trajectory（限高滚动+渐隐+展开） ═══ */
.ca-traj-toggle {
  margin-left: auto;
  padding: 2px 8px;
  font-size: 0.6rem;
  color: var(--accent);
  background: rgba(255, 217, 138, 0.08);
  border: 0.5px solid rgba(255, 217, 138, 0.2);
  border-radius: 100px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
  flex-shrink: 0;
}
.ca-traj-toggle:hover { background: rgba(255, 217, 138, 0.16); }
.ca-traj-scroll {
  max-height: 210px;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
  /* 底部渐隐遮罩，提示可滚动 */
  -webkit-mask-image: linear-gradient(180deg, #000 0%, #000 calc(100% - 28px), transparent 100%);
  mask-image: linear-gradient(180deg, #000 0%, #000 calc(100% - 28px), transparent 100%);
  transition: max-height 0.3s ease;
  padding-right: 4px;
}
.ca-traj-scroll.expanded {
  max-height: 1200px;
  -webkit-mask-image: none;
  mask-image: none;
}
.ca-traj-scroll::-webkit-scrollbar { width: 3px; }
.ca-traj-scroll::-webkit-scrollbar-track { background: transparent; }
.ca-traj-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }
.ca-traj-body {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-left: 6px;
}
.ca-traj-line {
  position: absolute;
  left: 11px;
  top: 8px;
  bottom: 8px;
  width: 1px;
  background: linear-gradient(180deg, rgba(255, 217, 138, 0.4), rgba(202, 167, 255, 0.2), rgba(149, 240, 192, 0.4));
}
.ca-traj-node {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  position: relative;
}
.ca-traj-dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
  position: relative;
  z-index: 1;
  border: 2px solid var(--surface);
}
.ca-traj-card {
  flex: 1;
  min-width: 0;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition: background 0.15s, border-color 0.15s;
}
.ca-traj-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
}
.ca-traj-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 3px;
}
.ca-traj-emo {
  font-size: 0.66rem;
  font-weight: 600;
}
.ca-traj-date {
  font-size: 0.6rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.ca-traj-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 2px;
}
.ca-traj-snippet {
  font-size: 0.68rem;
  color: var(--muted);
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* ═══ 6. Rank（共鸣榜，增强发光质感） ═══ */
.ca-rank-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ca-rank-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.025), rgba(255, 255, 255, 0.008));
  border: 1px solid rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.15s, box-shadow 0.15s;
  position: relative;
  overflow: hidden;
}
.ca-rank-item::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, transparent, var(--accent), transparent);
  opacity: 0;
  transition: opacity 0.2s;
}
.ca-rank-item:hover {
  background: linear-gradient(135deg, rgba(255, 217, 138, 0.08), rgba(255, 217, 138, 0.02));
  border-color: rgba(255, 217, 138, 0.18);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 217, 138, 0.08);
}
.ca-rank-item:hover::before { opacity: 1; }
.ca-rank-no {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 700;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  position: relative;
}
.ca-rank-no-1 {
  background: radial-gradient(circle, rgba(255, 217, 138, 0.25), rgba(255, 217, 138, 0.08));
  color: #ffd98a;
  box-shadow: 0 0 8px rgba(255, 217, 138, 0.35), inset 0 0 4px rgba(255, 217, 138, 0.15);
}
.ca-rank-no-2 {
  background: radial-gradient(circle, rgba(202, 202, 220, 0.18), rgba(202, 202, 220, 0.06));
  color: #cac4dc;
  box-shadow: 0 0 6px rgba(202, 202, 220, 0.25), inset 0 0 4px rgba(202, 202, 220, 0.1);
}
.ca-rank-no-3 {
  background: radial-gradient(circle, rgba(255, 139, 125, 0.18), rgba(255, 139, 125, 0.06));
  color: #ff8b7d;
  box-shadow: 0 0 6px rgba(255, 139, 125, 0.25), inset 0 0 4px rgba(255, 139, 125, 0.1);
}
.ca-rank-main { flex: 1; min-width: 0; }
.ca-rank-title {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.ca-rank-author {
  font-size: 0.6rem;
  font-weight: 500;
  color: #caa78c;
  padding: 1px 6px;
  border-radius: 10px;
  background: rgba(255, 217, 138, 0.08);
  border: 1px solid rgba(255, 217, 138, 0.18);
  flex-shrink: 0;
  margin-left: auto;
}
.ca-rank-summary {
  font-size: 0.66rem;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ca-rank-res {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 0.68rem;
  color: #ff8b7d;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  padding: 2px 7px;
  border-radius: 100px;
  background: rgba(255, 139, 125, 0.08);
  border: 0.5px solid rgba(255, 139, 125, 0.15);
}

/* ═══ 7. AI 总叙（结构化四段：概览卡 + 弧线步点 + 独白卡 + 寄语条）═══ */
.ca-narr-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
/* 通用 section 卡：概览 + 弧线 */
.ca-narr-section {
  position: relative;
  padding: 16px 18px;
  background: rgba(255, 255, 255, 0.018);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  backdrop-filter: blur(3px);
  transition: all 0.25s ease;
}
.ca-narr-section:hover {
  background: rgba(255, 255, 255, 0.032);
  border-color: rgba(255, 217, 138, 0.2);
  transform: translateY(-0.5px);
}
/* 左金条（概览）/ 左紫条（弧线）装饰边 */
.ca-narr-overview { border-left: 2.5px solid rgba(255, 217, 138, 0.55); }
.ca-narr-arc { border-left: 2.5px solid rgba(202, 167, 255, 0.55); }

.ca-nr-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.ca-nr-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ca-nr-icon-gold {
  background: rgba(255, 217, 138, 0.12);
  color: var(--accent);
  box-shadow: 0 0 8px rgba(255, 217, 138, 0.12);
}
.ca-nr-icon-purple {
  background: rgba(202, 167, 255, 0.12);
  color: var(--star-purple);
  box-shadow: 0 0 8px rgba(202, 167, 255, 0.12);
}
/* 【星空绑定】星轨图标：蓝色 */
.ca-nr-icon-blue {
  background: rgba(134, 168, 255, 0.12);
  color: #86a8ff;
  box-shadow: 0 0 8px rgba(134, 168, 255, 0.12);
}
.ca-nr-title-wrap { display: flex; flex-direction: column; gap: 2px; }
.ca-nr-title {
  font-size: 0.86rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
  letter-spacing: 0.02em;
}
.ca-nr-sub {
  font-size: 0.62rem;
  color: var(--muted);
  letter-spacing: 0.04em;
}
.ca-nr-content {
  font-size: 0.76rem;
  line-height: 1.9;
  color: var(--ink-secondary);
  text-align: justify;
}
.ca-nr-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed rgba(255, 255, 255, 0.05);
}
.ca-nr-tag {
  font-size: 0.62rem;
  color: var(--accent);
  padding: 2px 8px;
  background: rgba(255, 217, 138, 0.06);
  border: 1px solid rgba(255, 217, 138, 0.15);
  border-radius: 20px;
  letter-spacing: 0.04em;
}
/* 【星空绑定】星图总志：观测参数卡（2行3列网格） */
.ca-nr-obs-card {
  margin: 2px 0 12px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 9px 11px;
  background: rgba(0,0,0,0.22);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 8px;
  backdrop-filter: blur(2px);
}
.ca-nr-obs-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 6px;
  background: rgba(255,255,255,0.015);
  border-radius: 4px;
  border-left: 1.5px solid rgba(255,255,255,0.08);
}
.ca-nr-obs-k {
  font-size: 0.52rem;
  letter-spacing: 0.08em;
  color: rgba(255,255,255,0.32);
  font-weight: 500;
}
.ca-nr-obs-v {
  font-size: 0.62rem;
  font-family: 'Courier New', monospace;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: rgba(255,255,255,0.72);
  letter-spacing: 0.03em;
  line-height: 1.3;
}
.ca-nr-obs-v-gold { color: var(--accent); opacity: 0.95; }
.ca-nr-obs-v-purple { color: var(--star-purple); opacity: 0.95; }

/* 情绪弧线步点图：四阶段竖向时间线 */
.ca-nr-arc-steps {
  position: relative;
  margin: 12px 0 8px;
  padding-left: 6px;
}
.ca-nr-step {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 0 0 14px 0;
}
.ca-nr-step:last-child { padding-bottom: 0; }
.ca-nr-step-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--step-color);
  box-shadow: 0 0 8px var(--step-color), 0 0 0 3px rgba(255, 255, 255, 0.025);
  margin-top: 5px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}
.ca-nr-step-line {
  position: absolute;
  left: 10px;   /* dot 中心偏上（10px宽/2） */
  top: 18px;
  bottom: -2px;
  width: 1px;
  transform: translateX(-50%);
  background: linear-gradient(180deg, var(--step-color), rgba(255,255,255,0.06));
  opacity: 0.5;
}
.ca-nr-step-body { flex: 1; min-width: 0; }
.ca-nr-step-name {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--step-color);
  letter-spacing: 0.02em;
  margin-bottom: 3px;
}
.ca-nr-step-anchor {
  display: inline-block;
  font-size: 0.64rem;
  color: rgba(255, 255, 255, 0.78);
  font-style: italic;
  margin-bottom: 4px;
  padding: 1px 7px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 4px;
  border-left: 2px solid var(--step-color);
}
.ca-nr-step-desc {
  font-size: 0.72rem;
  line-height: 1.75;
  color: var(--ink-secondary);
}
.ca-nr-summary {
  margin: 14px 0 0;
  padding: 10px 14px;
  font-size: 0.74rem;
  line-height: 1.9;
  color: rgba(202, 167, 255, 0.9);
  font-style: italic;
  background: rgba(202, 167, 255, 0.04);
  border-left: 2px solid rgba(202, 167, 255, 0.35);
  border-radius: 0 8px 8px 0;
  text-align: justify;
}
/* 【星空绑定】星轨运行：步点头部（名称 + 地平坐标） */
.ca-nr-step-name-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 3px;
}
.ca-nr-step-name-row .ca-nr-step-name { margin-bottom: 0; }
.ca-nr-step-coord {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.52rem;
  font-family: 'Courier New', monospace;
  color: rgba(255,255,255,0.38);
  letter-spacing: 0.04em;
  white-space: nowrap;
  flex-shrink: 0;
}
.ca-nr-step-coord b {
  color: var(--step-color);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  opacity: 0.95;
}
/* 星轨步点dot：外环发光 */
.ca-nr-orbit-dot {
  box-shadow:
    0 0 8px var(--step-color),
    0 0 0 3px rgba(255,255,255,0.025),
    inset 0 0 0 1.5px rgba(255,255,255,0.25);
  animation: orbit-pulse 2.8s ease-in-out infinite;
}
.ca-nr-orbit-step:nth-child(1) .ca-nr-orbit-dot { animation-delay: 0s; }
.ca-nr-orbit-step:nth-child(2) .ca-nr-orbit-dot { animation-delay: 0.7s; }
.ca-nr-orbit-step:nth-child(3) .ca-nr-orbit-dot { animation-delay: 1.4s; }
.ca-nr-orbit-step:nth-child(4) .ca-nr-orbit-dot { animation-delay: 2.1s; }
@keyframes orbit-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}
/* 星轨连线：虚线弧线感 */
.ca-nr-orbit-line {
  background:
    linear-gradient(180deg, var(--step-color) 0%, rgba(255,255,255,0.06) 100%);
  opacity: 0.5;
  border-left: 1px dashed var(--step-color);
}

/* 独白卡（参考心事摘录风格，四角装饰 + 左提灯 SVG） */
.ca-narr-monologue {
  position: relative;
  display: grid;
  grid-template-columns: 72px 1fr;
  align-items: stretch;
  gap: 12px;
  padding: 18px 20px;
  background:
    radial-gradient(ellipse at 20% 20%, rgba(255, 217, 138, 0.05), transparent 55%),
    radial-gradient(ellipse at 80% 80%, rgba(202, 167, 255, 0.05), transparent 55%),
    rgba(255, 255, 255, 0.015);
  border: 1px solid rgba(255, 217, 138, 0.12);
  border-radius: 14px;
  transition: all 0.3s ease;
  overflow: hidden;
}
.ca-narr-monologue:hover {
  border-color: rgba(255, 217, 138, 0.25);
  background-color: rgba(255, 255, 255, 0.03);
  transform: translateY(-1px);
}
.ca-nm-illus {
  width: 68px;
  height: 68px;
  align-self: center;
  justify-self: center;
  opacity: 0.92;
  filter: drop-shadow(0 0 6px rgba(255, 217, 138, 0.12));
}
.ca-nm-body { position: relative; padding-left: 8px; }
.ca-nm-mark {
  position: absolute;
  top: -6px;
  left: 0px;
  font-size: 2.2rem;
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
  color: var(--accent);
  line-height: 1;
  opacity: 0.55;
  user-select: none;
  pointer-events: none;
}
.ca-nm-text {
  margin: 0 0 12px 22px;
  font-size: 0.82rem;
  line-height: 2;
  color: rgba(255, 255, 255, 0.9);
  font-style: italic;
  text-align: justify;
  letter-spacing: 0.015em;
}
.ca-nm-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 22px;
}
.ca-nm-tag {
  font-size: 0.62rem;
  color: rgba(255, 217, 138, 0.85);
  padding: 2px 8px;
  background: rgba(255, 217, 138, 0.07);
  border: 1px solid rgba(255, 217, 138, 0.18);
  border-radius: 20px;
  letter-spacing: 0.04em;
}
.ca-nm-spacer { flex: 1; }
.ca-nm-author {
  font-size: 0.64rem;
  color: var(--muted);
  letter-spacing: 0.04em;
  font-style: italic;
}
/* 【星空绑定】星座神话：独白卡改造 */
.ca-narr-myth {
  /* 整体神话卡片背景：更偏古卷纹理 */
  background:
    radial-gradient(ellipse at 18% 15%, rgba(255, 217, 138, 0.07), transparent 60%),
    radial-gradient(ellipse at 82% 85%, rgba(202, 167, 255, 0.06), transparent 60%),
    rgba(255,255,255,0.018);
  padding-top: 26px;
  padding-bottom: 20px;
}
/* 神话标签头部（星官注印章） */
.ca-nm-myth-tag {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 9px;
  z-index: 3;
}
.ca-nm-myth-seal {
  /* 朱红印章风格：星官注 */
  display: inline-block;
  font-size: 0.58rem;
  font-weight: 800;
  color: #fff1e6;
  background: linear-gradient(135deg, #c8392d 0%, #8d2419 100%);
  padding: 2px 7px;
  border-radius: 3px;
  letter-spacing: 0.3em;
  text-indent: 0.3em;
  box-shadow:
    inset 0 0 0 0.8px rgba(255,220,210,0.55),
    0 2px 5px rgba(200,57,45,0.35);
  opacity: 0.95;
  transform: rotate(-2deg);
}
.ca-nm-myth-sub {
  font-size: 0.56rem;
  color: rgba(255,255,255,0.35);
  letter-spacing: 0.06em;
  font-style: italic;
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
}
/* 星官注释行（独白正文下方） */
.ca-nm-myth-note {
  margin: 2px 0 14px 22px;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 6px 9px;
  background: rgba(255,217,138,0.035);
  border-left: 1.8px solid rgba(202,167,255,0.4);
  border-radius: 0 5px 5px 0;
  line-height: 1.75;
}
.ca-nm-myth-note-k {
  font-size: 0.6rem;
  color: var(--star-purple);
  font-weight: 700;
  letter-spacing: 0.08em;
  flex-shrink: 0;
  padding-top: 1px;
}
.ca-nm-myth-note-v {
  font-size: 0.66rem;
  color: rgba(255,255,255,0.56);
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
  text-align: justify;
  font-style: italic;
}

/* 寄语条（引导条风格，参考画像 section 末尾） */
.ca-narr-postscript {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  margin-top: 2px;
  background:
    linear-gradient(100deg, rgba(255, 217, 138, 0.07), rgba(202, 167, 255, 0.05) 70%, transparent),
    rgba(255, 255, 255, 0.012);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-left: 2.5px solid rgba(255, 217, 138, 0.5);
  border-radius: 12px;
}
.ca-ps-tip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  font-size: 0.64rem;
  font-weight: 600;
  color: var(--accent);
  padding: 4px 8px;
  background: rgba(255, 217, 138, 0.08);
  border-radius: 6px;
  letter-spacing: 0.04em;
}
.ca-ps-text {
  font-size: 0.74rem;
  line-height: 1.95;
  color: var(--ink-secondary);
  text-align: justify;
}
/* 【星空绑定】观星者手记：寄语条 → 天文观测日志风格 */
.ca-narr-obs-log {
  position: relative;
  flex-direction: column;
  gap: 10px;
  padding: 16px 18px 14px;
  background:
    /* 像旧观测本的横纹纸 */
    repeating-linear-gradient(
      180deg,
      transparent 0,
      transparent 28px,
      rgba(134,168,255,0.05) 28px,
      rgba(134,168,255,0.05) 29px
    ),
    linear-gradient(100deg, rgba(134,168,255,0.06), rgba(255,217,138,0.05) 70%, transparent),
    rgba(255,255,255,0.015);
  border-left: 2.5px solid rgba(134,168,255,0.55);
}
.ca-obs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.ca-obs-tip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  font-size: 0.66rem;
  font-weight: 700;
  color: #86a8ff;
  padding: 5px 10px;
  background: rgba(134,168,255,0.1);
  border: 1px solid rgba(134,168,255,0.25);
  border-radius: 6px;
  letter-spacing: 0.06em;
  box-shadow: inset 0 0 5px rgba(134,168,255,0.06);
}
.ca-obs-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  flex: 1;
  min-width: 0;
  justify-content: flex-end;
}
.ca-obs-meta-item {
  display: flex;
  align-items: baseline;
  gap: 4px;
  padding: 2px 8px;
  background: rgba(0,0,0,0.25);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 4px;
}
.ca-obs-meta-k {
  font-size: 0.5rem;
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.32);
  text-transform: uppercase;
}
.ca-obs-meta-v {
  font-size: 0.56rem;
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
  color: rgba(255,255,255,0.68);
  font-style: italic;
  letter-spacing: 0.03em;
  font-weight: 500;
}
/* 手记正文：稍微加大一点缩进，像手写 */
.ca-obs-text {
  margin: 4px 0 10px;
  padding: 0 6px;
  color: rgba(255,255,255,0.72);
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 0.78rem;
  letter-spacing: 0.02em;
}
/* 手记签名落款：观字印章 + 名称日期 */
.ca-obs-sign {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px dashed rgba(255,255,255,0.05);
}
.ca-obs-sign-seal {
  /* 「观」字印章，方形朱印 */
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #c8392d 0%, #8d2419 100%);
  color: #fff1e6;
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 0.95rem;
  font-weight: 800;
  border-radius: 4px;
  transform: rotate(-3deg);
  box-shadow:
    inset 0 0 0 1.2px rgba(255,220,210,0.55),
    0 2px 6px rgba(200,57,45,0.3);
  letter-spacing: 0;
  flex-shrink: 0;
}
.ca-obs-sign-name {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-end;
}
.ca-obs-sign-name > span:first-child {
  font-size: 0.66rem;
  font-weight: 600;
  color: rgba(255,217,138,0.9);
  letter-spacing: 0.08em;
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
}
.ca-obs-sign-date {
  font-size: 0.56rem;
  color: rgba(255,255,255,0.32);
  letter-spacing: 0.08em;
  font-style: italic;
}

/* ═══ Foot Note ═══ */
.ca-foot-note {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 0.64rem;
  color: var(--muted-light);
  background: rgba(255, 255, 255, 0.015);
  border-radius: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
}

/* ═══ Responsive ═══ */
@media (max-width: 900px) {
  .ca-duo { grid-template-columns: 1fr; }
  .ca-persona-body { grid-template-columns: 1fr; gap: 14px; }
  .ca-wrap { padding: 14px 16px 20px; }
  /* 你的那片天空：移动端改单列 */
  .ca-sky-body { grid-template-columns: 1fr; gap: 12px; }
  .ca-sky-svg { max-height: 220px; }
  .ca-sp-meteo { grid-template-columns: repeat(2, 1fr); }
  /* 心事摘录：亮星独白 三列紧凑 */
  .ca-q-item { grid-template-columns: 20px 42px 1fr; gap: 8px; padding: 10px 10px; }
  .ca-q-rank { width: 18px; height: 18px; font-size: 0.62rem; margin-top: 1px; }
  .ca-q-illus { width: 42px; height: 42px; }
  .ca-q-star-head { flex-wrap: wrap; gap: 4px; }
  .ca-q-star-astro { justify-content: flex-start; flex: 1 1 100%; order: 2; }
  .ca-q-meta { flex-wrap: wrap; gap: 6px; }
  .ca-q-spacer { display: none; }
  /* 【星空绑定】星图总志：观测卡 2列 */
  .ca-nr-obs-card { grid-template-columns: repeat(2, 1fr); padding: 7px 8px; gap: 5px; }
  /* AI 总叙（观星手记）：独白卡单列 + 神话标签紧凑 */
  .ca-narr-monologue { grid-template-columns: 56px 1fr; padding: 22px 12px 14px; gap: 8px; }
  .ca-narr-myth { padding-top: 30px; }
  .ca-nm-myth-tag { flex-direction: column; gap: 3px; }
  .ca-nm-myth-sub { text-align: center; }
  .ca-nm-myth-note { margin-left: 18px; padding: 5px 7px; }
  .ca-nm-illus { width: 52px; height: 52px; }
  .ca-nm-mark { font-size: 1.7rem; }
  .ca-nm-text { margin-left: 18px; font-size: 0.78rem; }
  .ca-nm-meta { padding-left: 18px; flex-wrap: wrap; }
  .ca-nm-spacer { display: none; }
  /* 星轨运行：步点头部换行（名称+坐标） */
  .ca-nr-step-name-row { flex-wrap: wrap; }
  .ca-nr-step-coord { order: 2; flex: 1 1 100%; }
  .ca-nr-step-line { left: 10px; }
  /* 观星者手记：竖排紧凑 */
  .ca-narr-postscript { flex-direction: column; gap: 8px; padding: 12px 12px; }
  .ca-obs-header { flex-direction: column; align-items: stretch; gap: 8px; }
  .ca-obs-meta { justify-content: flex-start; }
  .ca-obs-sign { flex-wrap: wrap; }
}

/* ═══════════════════════════════════════════
   【天空本色 · 最后】那夜的天官书：四大段落夜色左边框 + 天色渐变分隔条
   ═══════════════════════════════════════════ */

/* 1. 那夜的天官书：四段落夜色左边框（入夜→子夜→黎明） */
.ca-no-overview {
  border-left: 2.5px solid #86a8ff; /* 入夜蓝 */
}
.ca-no-arc {
  border-left: 2.5px solid #caa7ff; /* 子夜紫 */
}
.ca-no-self {
  border-left: 2.5px solid #95f0c0; /* 寅卯绿 */
}
.ca-no-postscript {
  border-left: 2.5px solid #ffd98a; /* 黎明金 */
}

/* ═══════════════════════════════════════════
   Hero：星辰归属 + 星星品质（横铺双栏替代原合集星图+星辰归属双栏）
   ═══════════════════════════════════════════ */
.ca-hero-panel {
  background: rgba(255, 255, 255, 0.018);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  overflow: visible;
  margin: 0 0 4px;
  /* 【彻底移除硬编码 min-height:600px！之前为了防塌缩的补丁已经不需要，
     现在内容自然撑高（panel-head≈28 + body≈350 + padding≈30 ≈ 410px，自然而不溢出） */
  min-height: auto;
  flex-shrink: 0;
}
/* 顶部 1px 金线紫线渐变（和 StarDetail 同款） */
.ca-hero-panel::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(202,167,255,0.4), rgba(255,217,138,0.4), transparent);
  pointer-events: none;
}
/* panel-head 复用 StarDetail 同款样式（直接类名 panel-head + pw-icon + pw-title + pw-count）
   AIPersonaCard 有 scoped，这里重写保证一致 */
.ca-hero-panel .panel-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.ca-hero-panel .pw-icon     { opacity: 0.85; flex-shrink: 0; }
.ca-hero-panel .pw-purple  { color: #caa7ff; }
.ca-hero-panel .pw-gold    { color: #ffd98a; }
.ca-hero-panel .pw-green   { color: #9ae6b4; }
.ca-hero-panel .pw-blue    { color: #86a8ff; }
.ca-hero-panel .pw-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  flex: 1;
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
}
.ca-hero-panel .pw-count {
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.22);
  letter-spacing: 0.03em;
  font-family: "Inter", "PingFang SC", sans-serif;
}

/* Hero body：左星图 + 右数据 */
.ca-hero-body {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 18px;
  align-items: stretch;   /* 关键：两栏等高，grid row 高度不会被压成线 */
  min-height: 280px;     /* 兜底：整栏至少能放下一张星图 */
  grid-template-rows: 1fr;
}
/* Hero body stats：融合版 —— 左星图/右品质自然融为一体，不再两张独立card
   用一条柔和的垂直渐变分割线（代替两个硬box边界），营造统一的"一张大图"的感觉 */
.ca-hero-body-stats {
  display: grid;
  grid-template-columns: 0.95fr 1.05fr;
  gap: 24px;
  align-items: stretch;   /* 【关键】左右强制等高：右内容文字有多高，左黑块就有多高 */
  justify-items: stretch;
  min-height: auto;
  padding: 4px 0 6px;
  flex: 1;
  width: 100%;
}
/* ═══════════════════════════════════════════
   左：纯容器 + 里面只有一个黑色星空板块（.ca-starmap-wrap）
   右：纯容器 + 所有信息裸内容平铺（不做任何嵌套卡/框）
   ═══════════════════════════════════════════ */
/* 左：纯flex容器，彻底删掉ca-card卡牌背景/边框/圆角/内边距，只负责定位 */
.ca-h-left-block {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  min-width: 0;
  min-height: 0;
  height: 100%;   /* 撑满grid高度，等于右内容高度 */
}
/* 左里面的唯一元素：【黑色星空板块】 height:100% —— 跟随右内容高度响应式变化！
   flex列布局：背景(黑底)自然拉伸100%，SVG居中不变形，legend贴底。 */
.ca-h-left-block .ca-starmap-wrap {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  /* 保留本体深蓝夜空底+细边框（这就是用户说的"黑色板块"，不是嵌套框，是本体） */
  border-color: rgba(134,168,255,0.08);
  background:
    radial-gradient(ellipse at 50% 30%, rgba(202,167,255,0.045), transparent 72%),
    rgba(10,12,35,0.55);
  border-radius: 7px;
  padding: 10px 8px 8px;
}
/* 左黑块里的星图SVG：aspect-ratio保持星图比例不变形，margin: auto 0 垂直居中，上下留夜空黑底！
   = 只有黑背景拉伸，SVG文字和点不拉伸！ */
.ca-h-left-block .ca-starmap-svg {
  aspect-ratio: 420 / 300;
  width: 100%;
  height: auto;
  margin: auto 0;    /* 垂直居中，上下多余高度 = 夜空黑底空白（就是您要的"只有天空黑色背景拉伸，文字点不拉伸"） */
  display: block;
  flex-shrink: 0;
}
/* 图例（底部3个图例说明）：margin-top: auto 贴底，不随SVG居中，固定在黑板块最下方 */
.ca-h-left-block .ca-sm-legend {
  margin-top: auto;
  flex-shrink: 0;
}

/* 右：纯flex容器，彻底删掉ca-card卡牌背景/边框/圆角/内边距！信息裸内容平铺，只留 gap 控制段间距 */
.ca-h-right-block {
  display: flex;
  flex-direction: column;
  gap: 13px;  /* 信息块之间的柔和间距（指标/速览/光谱/星座） */
  min-width: 0;
  min-height: 0;
  height: auto;
}

/* 【星辰分布速览（从左移过来）】：彻底删掉独立卡的背景/边框/圆角/内边距 → 裸信息块！ */
.ca-h-stardust {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
/* 速览网格：信息密度稍增，gap缩一点，让内容紧凑 */
.ca-hsd-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px 10px;
}
.ca-hsd-cell {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ca-hsd-cell-wide {
  grid-column: 1 / -1;
}
.ca-hsd-k {
  font-size: 0.6rem;
  color: rgba(200, 200, 225, 0.42);
  letter-spacing: 0.12em;
}
.ca-hsd-v {
  font-size: 0.88rem;
  font-weight: 600;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.ca-hsd-sub {
  font-size: 0.6rem;
  color: rgba(200, 200, 225, 0.38);
}

/* 最亮α星单行 */
.ca-hsd-bright {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}
.ca-hsd-bright-color {
  display: inline-block;
  width: 9px; height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}
.ca-hsd-bright-name {
  font-size: 0.78rem;
  font-weight: 600;
}
.ca-hsd-bright-con {
  font-size: 0.62rem;
  color: rgba(200, 200, 225, 0.48);
  margin-left: 2px;
}
.ca-hsd-bright-mag {
  font-size: 0.62rem;
  color: rgba(200, 200, 225, 0.55);
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
}

/* 光谱主流条 */
.ca-hsd-specbar {
  display: flex;
  width: 100%;
  height: 7px;
  border-radius: 4px;
  overflow: hidden;
  background: rgba(255,255,255,0.03);
  margin-top: 3px;
  gap: 1px;
}
.ca-hsd-spec-seg {
  display: inline-block;
  height: 100%;
  transition: width 0.3s ease;
}
.ca-hsd-spec-label {
  display: flex;
  gap: 10px;
  margin-top: 4px;
  flex-wrap: wrap;
}
.ca-hsd-spec-item {
  font-size: 0.58rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.05em;
  opacity: 0.9;
}

/* ============ 星图容器本体 & starmap-svg 默认比例（保留，星辰归属仍使用 .ca-starmap-wrap） ============ */
.ca-starmap-wrap {
  position: relative;
  background: rgba(10,12,35,0.55);
  border: 1px solid rgba(134,168,255,0.08);
  border-radius: 7px;
  padding: 6px 4px 4px;
  min-width: 0;
}
.ca-h-starmap-wrap .ca-starmap-svg {
  width: 100%;
  height: auto;
  display: block;
}
.ca-starmap-svg {
  width: 100%;
  height: auto;
  display: block;
}
.ca-h-belong-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255,255,255,0.035);
}
.ca-h-bh-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(255,255,255,0.82);
  font-family: "Inter", "PingFang SC", sans-serif;
  flex: 1;
}
.ca-h-bh-count {
  font-size: 0.58rem;
  color: rgba(220,220,240,0.28);
  letter-spacing: 0.04em;
}

/* ============ 恢复：星星品质/统计样式（ca-h-starstats + 所有子元素） ============ */
.ca-h-starstats {
  background: rgba(255,255,255,0.016);
  border: 1px solid rgba(255,255,255,0.045);
  border-radius: 9px;
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}
.ca-h-stats-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255,255,255,0.035);
}
/* 四顶栏指标 */
.ca-h-ss-quad {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.ca-h-ss-q {
  padding: 7px 7px 6px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.035);
  border-radius: 6px;
}
.ca-h-ss-q .ca-hs-k {
  font-size: 0.54rem;
  letter-spacing: 0.1em;
  color: rgba(220,220,240,0.38);
  margin-bottom: 3px;
}
.ca-h-ss-q .ca-hs-v {
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.1;
  font-family: "Inter", "PingFang SC", sans-serif;
}
.ca-h-ss-q .ca-hs-sub {
  margin-top: 2px;
  font-size: 0.58rem;
  color: rgba(220,220,240,0.35);
  letter-spacing: 0.02em;
}
/* section 小标题 */
.ca-h-ss-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ca-h-ss-bottom { padding-top: 2px; border-top: 1px dashed rgba(255,255,255,0.04); }
.ca-h-ss-sec-k {
  margin-bottom: 0;
  font-size: 0.56rem;
  letter-spacing: 0.12em;
  color: rgba(220,220,240,0.34);
}
/* 光谱色分布条 */
.ca-h-ss-bars {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.ca-h-ss-bar {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.ca-h-ss-bar-labels {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.62rem;
}
.ca-h-ss-bar-color {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.ca-h-ss-bar-spec {
  font-weight: 700;
  font-family: "SF Mono", "JetBrains Mono", monospace;
  color: rgba(255,255,255,0.72);
  letter-spacing: 0.02em;
}
.ca-h-ss-bar-cn {
  color: rgba(220,220,240,0.42);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.ca-h-ss-bar-pct {
  font-weight: 700;
  font-family: "SF Mono", "JetBrains Mono", monospace;
  font-size: 0.6rem;
}
.ca-h-ss-bar-track {
  height: 4px;
  background: rgba(255,255,255,0.035);
  border-radius: 4px;
  overflow: hidden;
}
.ca-h-ss-bar-fill {
  height: 100%;
  border-radius: 4px;
  opacity: 0.9;
  transition: width 0.3s;
}
.ca-h-ss-empty {
  color: rgba(220,220,240,0.32);
  font-size: 0.68rem;
  text-align: center;
  padding: 10px 0;
}
/* 星座Top */
.ca-h-ss-cons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.ca-h-ss-con {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px 4px 4px;
  background: rgba(255,255,255,0.022);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 999px;
  font-size: 0.68rem;
}
.ca-h-ss-con-rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  color: #0a0b1f;
  font-weight: 800;
  font-size: 0.56rem;
  font-family: "Inter", sans-serif;
}
.ca-h-ss-con-name { color: rgba(255,255,255,0.74); font-weight: 600; }
.ca-h-ss-con-pct {
  color: rgba(220,220,240,0.4);
  font-family: "SF Mono", monospace;
  font-size: 0.6rem;
  font-weight: 700;
}
/* 星群气质标签 */
.ca-h-ss-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 6px;
}
.ca-h-ss-tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  font-family: "Inter", "PingFang SC", sans-serif;
}
.ca-h-ss-tag-gold   { background: rgba(255,217,138,0.12); color: #ffd98a; border: 1px solid rgba(255,217,138,0.2); }
.ca-h-ss-tag-gold2  { background: rgba(255,217,138,0.08); color: #f8cf7a; border: 1px solid rgba(255,217,138,0.14); }
.ca-h-ss-tag-purple { background: rgba(202,167,255,0.1); color: #caa7ff; border: 1px solid rgba(202,167,255,0.18); }
.ca-h-ss-tag-blue   { background: rgba(134,168,255,0.1); color: #86a8ff; border: 1px solid rgba(134,168,255,0.18); }
.ca-h-ss-tag-green  { background: rgba(154,230,180,0.1); color: #9ae6b4; border: 1px solid rgba(154,230,180,0.18); }
.ca-h-ss-tag-dim    { background: rgba(255,255,255,0.03); color: rgba(220,220,240,0.5); border: 1px solid rgba(255,255,255,0.06); }

/* ca-single：单栏容器（夜色流转双栏用 ca-single-double，避免 margin 出问题） */
.ca-single { margin-top: 18px; }
.ca-single > section { width: 100%; }
.ca-single-double { margin-top: 18px; }
.ca-single-double > section { width: 100%; }
.ca-night-flow-wide .ca-nt-band { min-height: 120px; }

/* 【夜色流转】双栏布局：左=夜色球+洞察+叙事(1.05)；右=心事时间轨迹(0.95) */
.ca-emotion-body-double {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 14px;
  align-items: start;
  min-width: 0;
}
.ca-emo-left {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}
.ca-emo-right {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  min-height: 0;
}
.ca-emo-side-track {
  background: rgba(255,255,255,0.016);
  border: 1px solid rgba(255,255,255,0.045);
  border-radius: 9px;
  padding: 10px 12px 12px;
}
/* 心事时间轨迹标题栏 */
.ca-et-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.035);
  font-size: 0.76rem;
  font-weight: 600;
  color: rgba(255,255,255,0.82);
  font-family: "Inter", "PingFang SC", sans-serif;
}
/* SVG：aspect-ratio 420:280 = 3:2，保证不会塌成一条线 */
.ca-et-svg {
  width: 100%;
  aspect-ratio: 420 / 280;
  height: auto;
  min-height: 220px;
  display: block;
  flex-shrink: 0;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.04);
  background: #0a0b1f;
}
/* 图例：沿用 .ca-h-legend 的样式，但用新类名 ca-et-legend */
.ca-et-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  padding: 0 2px;
  color: rgba(220,220,240,0.45);
  font-size: 0.64rem;
}
.ca-et-legend-note {
  margin-left: auto;
  color: rgba(220,220,240,0.28);
  letter-spacing: 0.03em;
}
.ca-et-legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.ca-et-legend i {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 4px currentColor;
}

/* 心事投递 · 4 小格统计（紧凑不高） */
.ca-et-stats {
  margin-top: 6px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}
.ca-et-stat {
  padding: 6px 7px 5px;
  border-radius: 6px;
  background: rgba(0,0,0,0.18);
  border: 1px solid rgba(255,255,255,0.04);
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  transition: border-color 0.2s ease, transform 0.2s ease;
}
.ca-et-stat:hover { transform: translateY(-1px); }
.ca-et-stat-gold   { border-color: rgba(255,217,138,0.15); }
.ca-et-stat-purple { border-color: rgba(202,167,255,0.15); }
.ca-et-stat-blue   { border-color: rgba(134,168,255,0.15); }
.ca-et-stat-green  { border-color: rgba(154,230,180,0.15); }
.ca-et-stat-gold:hover   { border-color: rgba(255,217,138,0.32); }
.ca-et-stat-purple:hover { border-color: rgba(202,167,255,0.32); }
.ca-et-stat-blue:hover   { border-color: rgba(134,168,255,0.32); }
.ca-et-stat-green:hover  { border-color: rgba(154,230,180,0.32); }
.ca-es-k {
  font-size: 0.52rem;
  letter-spacing: 0.08em;
  color: rgba(220,220,240,0.42);
  font-weight: 600;
  font-family: "Inter", "PingFang SC", sans-serif;
}
.ca-es-v {
  font-size: 0.78rem;
  font-weight: 700;
  font-family: "SF Mono", "JetBrains Mono", monospace;
  line-height: 1.15;
  color: rgba(250,250,255,0.86);
}
.ca-es-v span {
  font-size: 0.6rem;
  font-weight: 600;
  color: rgba(220,220,240,0.5);
  margin-left: 1px;
}
.ca-et-stat-gold   .ca-es-v { color: #ffd98a; }
.ca-et-stat-purple .ca-es-v { color: #caa7ff; }
.ca-et-stat-blue   .ca-es-v { color: #86a8ff; }
.ca-et-stat-green  .ca-es-v { color: #9ae6b4; }
.ca-es-sub {
  font-size: 0.48rem;
  letter-spacing: 0.04em;
  color: rgba(220,220,240,0.30);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* 一句话说明条 */
.ca-et-note {
  margin: 8px 1px 0;
  padding: 6px 8px;
  border-radius: 6px;
  background: linear-gradient(90deg, rgba(134,168,255,0.045), rgba(255,217,138,0.035));
  border: 1px solid rgba(134,168,255,0.08);
  font-size: 0.58rem;
  line-height: 1.55;
  color: rgba(220,220,240,0.56);
  display: flex;
  align-items: flex-start;
  gap: 6px;
}
.ca-et-note-icon {
  margin-top: 1px;
  flex-shrink: 0;
  color: rgba(255,217,138,0.8);
  filter: drop-shadow(0 0 3px rgba(255,217,138,0.25));
}
@media (max-width: 620px) {
  .ca-et-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 540px) {
  .ca-h-stats { grid-template-columns: 1fr 1fr; }
  .ca-h-ss-quad { grid-template-columns: 1fr 1fr; }
  .ca-et-svg { min-height: 180px; }
  .ca-h-left-block .ca-starmap-svg { aspect-ratio: 420 / 340; min-height: 150px; }
}

/* ===== 夜色流转 · 心事投递时间轨迹（双栏平级：右卡按内容自然高为基准；左夜色严格=右高，溢出滚动） ===== */
.ca-night-track-wrap {
  margin-top: 18px;
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 14px;
  align-items: start;    /* 行高按内容最自然的计算（=右心事轨迹的内容高） */
  min-width: 0;
}
/* 左夜色卡：拉伸到 grid 行高（=右卡的内容自然高），高度严格=右卡 */
.ca-night-flow-left {
  align-self: stretch;
  height: auto;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
/* 右心事轨迹卡：按内容自然高度（不拉伸），作为左右高度的基准 */
.ca-night-side-track {
  align-self: start;
  height: auto;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
/* 夜色body：在左卡被限制的高度里 overflow-y 滚动，超出的内容可翻 */
.ca-night-scroll {
  flex: 1 1 auto;
  height: 0;              /* 关键：配合 flex:1 + min-height:0，强制收缩后再由剩余空间撑开，保证内部溢出走滚动条 */
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  /* 精细滚动条，贴合夜色主题 */
  scrollbar-width: thin;
  scrollbar-color: rgba(134,168,255,0.22) rgba(255,255,255,0.03);
  padding-right: 4px;
  margin-right: -4px;
}
.ca-night-scroll::-webkit-scrollbar {
  width: 6px;
}
.ca-night-scroll::-webkit-scrollbar-track {
  background: rgba(255,255,255,0.02);
  border-radius: 10px;
}
.ca-night-scroll::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(134,168,255,0.24), rgba(202,167,255,0.22));
  border-radius: 10px;
}
.ca-night-scroll::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(134,168,255,0.34), rgba(202,167,255,0.30));
}
/* 左栏夜色内容撑满 */
.ca-emo-left-full {
  width: 100%;
}
/* 心事轨迹body：自然高度，不做拉伸（右卡是高度基准） */
.ca-track-body {
  flex: 0 1 auto;
  height: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.ca-track-inner {
  flex: 1 1 auto;
  /* 外面已经是ca-card，去掉原来 .ca-emo-side-track 的背景边框padding */
  background: transparent !important;
  border: none !important;
  padding: 2px 0 0 !important;
  gap: 10px;
}

/* ══════════ AI 选本·代表故事（替代夜色流转左栏，纵向·复用共鸣榜 + 情绪洞察的成熟视觉语言） ══════════ */
/* 滚动用原来的 ca-night-scroll（y 轴），不再搞横向 */
.ca-night-flow-stories .ca-story-scroll {
  overflow-y: auto;
  overflow-x: hidden;
  height: 0;
  flex: 1 1 auto;
  min-height: 0;
  padding: 2px 2px 4px;
  margin-right: -2px;
}
.ca-story-grid {
  display: grid;
  grid-template-columns: 1fr;           /* 1 列纵向，不 2×2 */
  grid-auto-rows: auto;                  /* ← 去掉 minmax(180px)：卡片高度贴合内容，不长空白 */
  gap: 10px;
}
.ca-story-item {
  --accent: #ffd98a;
  display: flex;
  flex-direction: row;
  gap: 9px;
  padding: 12px 12px 12px 0;
  border-radius: 8px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  position: relative;
  overflow: hidden;
  min-width: 0;
  /* 用 StoryDetailCard 同款设计系统 transition/ease */
  transition:
    background var(--transition-normal),
    border-color var(--transition-normal),
    transform var(--transition-fast),
    box-shadow var(--transition-normal);
  /* 入场 stagger：每条依次错峰进入（0, 50, 100, 150ms），仿 sc-enter-inner */
  animation: cs-story-enter 0.55s var(--ease-out) both;
  animation-delay: calc(var(--cs-idx, 0) * 50ms);
}
/* 入场 stagger 索引 --cs-idx 直接由模板 :style 注入，不再靠 nth-child fallback（兼容 Vue scoped 变量注入） */
@keyframes cs-story-enter {
  0%   { opacity: 0; transform: translateY(18px) scale(0.985); box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
  100% { opacity: 1; transform: translateY(0) scale(1);      box-shadow: 0 0 0 0.5px rgba(255,255,255,0.02) inset; }
}
/* 左侧色条 1px 纯色，扁平 */
.ca-story-item::before {
  content: '';
  position: absolute;
  left: 0; top: 10px; bottom: 10px;
  width: 1px;
  background: var(--accent);
  opacity: 0.55;
}
/* hover：StoryDetailCard 同款 —— 轻微上浮（-1px）+ 淡阴影（中性色不光辉）+ 微提亮边框 */
.ca-story-item:hover {
  background: rgba(255,255,255,0.035);
  border-color: rgba(255,255,255,0.10);
  transform: translateY(-1px);
  box-shadow:
    0 6px 16px rgba(0, 0, 0, 0.26),
    0 0 0 0.5px rgba(255,255,255,0.03) inset;
  /* 不搞 accent 光辉的彩色 shadow，保持扁平中性色 */
}
/* rank 圆：扁平 + StoryDetailCard 同款 hover 响应（translateY + brightness） */
.ca-story-side {
  padding: 8px 0 0 10px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.ca-story-rank {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Georgia', 'Songti SC', serif;
  font-size: 0.72rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 24%, transparent);
  box-shadow: none !important;
  /* 同款设计系统 transition，hover 时轻上浮+提亮 */
  transition: transform var(--transition-fast), filter var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast);
}
.ca-story-rank-1,
.ca-story-rank-2,
.ca-story-rank-3,
.ca-story-rank-4 {
  background: color-mix(in srgb, var(--accent) 12%, transparent) !important;
  color: var(--accent) !important;
  border: 1px solid color-mix(in srgb, var(--accent) 24%, transparent) !important;
  box-shadow: none !important;
}
.ca-story-item:hover .ca-story-rank {
  transform: translateY(-0.5px);
  filter: brightness(1.12);
  border-color: color-mix(in srgb, var(--accent) 34%, transparent) !important;
}

/* 主体：标题行 + 摘录 + 底栏（日期/标签），间距/字号复用情绪洞察 */
.ca-story-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-top: 2px;
  padding-right: 2px;
}
.ca-story-head {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 2px;
}
/* 星名（α · 雨夜寄北）：复用 ca-ei-title 字号 0.74rem，font-weight 600，颜色 68% 不透明白；StoryDetailCard 同款 hover */
.ca-story-starnav {
  font-size: 0.74rem;
  font-weight: 600;
  color: rgba(255,255,255,0.72);
  letter-spacing: 0.01em;
  line-height: 1.55;
  transition: transform var(--transition-fast), filter var(--transition-fast), color var(--transition-fast);
}
.ca-story-item:hover .ca-story-starnav {
  transform: translateY(-0.3px);
  filter: brightness(1.12);
  color: rgba(255,255,255,0.78);
}
/* 作者 pill：扁平 + StoryDetailCard 同款 hover（轻上浮 + brightness + 边框提亮） */
.ca-story-author {
  font-size: 0.6rem;
  font-weight: 500;
  color: rgba(255,255,255,0.58);
  padding: 1px 6px;
  border-radius: 10px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  margin-left: auto;
  line-height: 1.4;
  max-width: 50%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: transform var(--transition-fast), filter var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast), color var(--transition-fast);
}
.ca-story-item:hover .ca-story-author {
  transform: translateY(-0.5px);
  filter: brightness(1.1);
  border-color: rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.035);
  color: rgba(255,255,255,0.66);
}
/* 摘录：StoryDetailCard 同款 transition（hover 不截断，摘录本身不做动效）；字号 0.71rem / 行高 1.75，3 行截断 */
.ca-story-excerpt {
  margin: 0;
  font-size: 0.71rem;
  line-height: 1.75;
  color: rgba(255,255,255,0.58);
  word-break: break-word;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;                 /* 3 行截断 + 省略号，不挤爆 1 列卡片 */
  overflow: hidden;
  transition: color var(--transition-fast), transform var(--transition-fast);
}
.ca-story-item:hover .ca-story-excerpt {
  color: rgba(255,255,255,0.64);
}
/* AI 推荐语：扁平 + StoryDetailCard 同款 hover（轻上浮 + brightness + 边框提亮） */
.ca-story-reason {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  margin: 2px 0 6px;
  border-radius: 4px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  width: fit-content;
  max-width: 100%;
  transition: transform var(--transition-fast), filter var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast);
}
.ca-story-item:hover .ca-story-reason {
  transform: translateY(-0.5px);
  filter: brightness(1.1);
  border-color: rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.035);
}
.ca-story-reason-icon {
  flex-shrink: 0;
  color: rgba(255,255,255,0.52);            /* 正常灰，不太淡太看不见 */
  opacity: 1;
}
.ca-story-reason-prefix {
  font-size: 0.6rem;
  font-weight: 700;
  color: rgba(255,255,255,0.58);            /* 前缀正常灰，不晦涩 */
  letter-spacing: 0.03em;
  white-space: nowrap;
}
.ca-story-reason-text {
  font-size: 0.66rem;
  color: rgba(255,255,255,0.70);            /* 推荐语文本提亮到 70%，看得清 */
  white-space: nowrap;
  max-width: calc(100% - 30px);
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.55;
}

/* 底栏：日期 + 标签（去掉 margin-top:auto：它会把底栏压到卡片最底部，中间产生一大块长空白；现在让底栏紧跟在摘录后面） */
.ca-story-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  flex-wrap: wrap;
  padding-top: 6px;
}
.ca-story-date {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.6rem;
  color: rgba(255,255,255,0.42);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  white-space: nowrap;
  transition: color var(--transition-fast), opacity var(--transition-fast);
}
.ca-story-foot-icon { opacity: 1; flex-shrink: 0; color: rgba(255,255,255,0.32); transition: color var(--transition-fast); }
.ca-story-tags {
  display: inline-flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
/* 标签 pill：扁平 + StoryDetailCard 同款 hover（轻上浮 + brightness） */
.ca-story-tag {
  font-size: 0.58rem;
  padding: 1px 6px;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 99px;
  background: rgba(255,255,255,0.015);
  color: rgba(255,255,255,0.52);
  font-family: 'Inter', 'PingFang SC', sans-serif;
  letter-spacing: 0.02em;
  line-height: 1.5;
  transition: transform var(--transition-fast), filter var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast), color var(--transition-fast);
}
.ca-story-item:hover .ca-story-tag {
  transform: translateY(-0.5px);
  filter: brightness(1.1);
  border-color: rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.03);
  color: rgba(255,255,255,0.60);
}
.ca-story-item:hover .ca-story-foot-icon {
  color: rgba(255,255,255,0.40);
}

/* 移动端：1 列（已经是 1 列，不需要改），reason 文字可以允许 wrap，别太挤 */
@media (max-width: 820px) {
  .ca-story-grid {
    grid-auto-rows: minmax(160px, auto);
    gap: 8px;
  }
  .ca-story-excerpt { -webkit-line-clamp: 3; }
  .ca-story-reason-text { white-space: normal; max-width: 100%; }
}

/* ═══════════════════════════════════════════════════════════
   三态切换（TooFew / Loading / Real）全局卡片 + 骨架屏动画
   对齐 StarDetail AIPersonaCard / AIRadarWordcloud 的视觉
   ═══════════════════════════════════════════════════════════ */
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.spin-slow { animation: spin 4.5s linear infinite; }

/* 三态外层容器：和 ca-wrap 内其余 section 的 gap 一致 */
.ca-state-wrap { width: 100%; display: flex; flex-direction: column; }

/* 通用 panel-wrapper（三态卡片）：对齐 StarDetail 其它卡片的统一观感 */
.panel-wrapper {
  background: rgba(255, 255, 255, 0.018);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}
.panel-wrapper::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(202,167,255,0.36), transparent);
}
.panel-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.pw-icon { opacity: 0.85; flex-shrink: 0; }
.pw-green  { color: #9ae6b4; }
.pw-blue   { color: #86a8ff; }
.pw-gold   { color: #ffd98a; }
.pw-purple { color: #caa7ff; }
.pw-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  flex: 1;
  font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
.pw-count {
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.22);
  letter-spacing: 0.03em;
  font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

/* persona-empty：空态/loading 共享容器（居中 flex + 虚线边框微背景） */
.persona-empty {
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 28px 24px;
  box-sizing: border-box;
  border-radius: 8px;
  background: rgba(255,255,255,0.015);
  border: 1px dashed rgba(255,255,255,0.06);
}
/* ① 心事不足（不生成）：图标灰调 */
.empty-scant { min-height: 220px; }
.pe-icon-wrap {
  width: 44px; height: 44px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2px;
}
.pe-icon-wrap.pe-scant {
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.35);
}
/* ② 生成中（骨架屏）：图标紫色发光 */
.empty-loading { min-height: 280px; }
.pe-icon-wrap.pe-loading {
  background: rgba(202,167,255,0.12);
  color: #caa7ff;
  box-shadow: 0 0 16px rgba(202,167,255,0.18);
}
/* 文字排版 */
.pe-text {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pe-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(255,255,255,0.68);
  font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
.pe-sub {
  font-size: 0.64rem;
  color: rgba(255,255,255,0.3);
  letter-spacing: 0.02em;
  font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  max-width: 360px;
  line-height: 1.55;
}
.pe-sub b { color: rgba(255,255,255,0.45); font-weight: 600; }

/* 骨架屏：4 条 shimmer 横线 */
.skeleton-lines {
  width: 100%;
  max-width: 90%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
}
.sk-line {
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(202,167,255,0.08), rgba(202,167,255,0.18), rgba(202,167,255,0.08));
  background-size: 200% 100%;
  animation: shimmer 1.8s ease-in-out infinite;
}
.sk-line.sk-1 { width: 92%; }
.sk-line.sk-2 { width: 76%; }
.sk-line.sk-3 { width: 58%; }

/* ═══════════════════════════════════════════════════════════
   各 section 面板 min-height 兜底（保证 story<3 / loading 时框的高度与真实态接近，不会塌陷成一条线）
   每个 section 的真实态内容都较多，空态时至少接近一半的真实态高度
   ═══════════════════════════════════════════════════════════ */
/* Hero 星辰归属 + 夜观手记已有三态，高度由内部 persona-empty + flex:1 自动撑满 */

/* 心事轨迹（右栏是左右双栏的高度基准，需要显式 min-height，保证左夜色流转跟着有足够高度） */
.ca-night-side-track { min-height: 420px; }

/* 天窗片段（3 帧夜色小窗，内容比较多） */
.ca-quote-sky { min-height: 600px; }

/* 时辰热力：24 珠子 + 12 地支 + 高峰低谷双卡 */
/* ═══ 多余硬编码 min-height 已删除：让共鸣榜/时辰热力/情感轨迹跟随内容高度自适应 ═══ */
/* 旧值（已移除）： .ca-hour 340px / .ca-rank 300px / .ca-trajectory 380px */

/* 双栏：共鸣榜（Top3 列表） + 情感轨迹（时间线内容较多） */

/* 展开/收起按钮（在 panel-head 末尾） */
.ca-traj-toggle {
  font-size: 0.56rem;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(154, 230, 180, 0.1);
  border: 1px solid rgba(154, 230, 180, 0.22);
  color: rgba(154, 230, 180, 0.75);
  cursor: pointer;
  letter-spacing: 0.03em;
  font-family: 'Inter', 'PingFang SC', sans-serif;
  transition: all .2s ease;
}
.ca-traj-toggle:hover {
  background: rgba(154, 230, 180, 0.16);
  color: rgba(154, 230, 180, 0.92);
}

/* 移动端单列覆盖（原 860 块：必须放在所有双栏基础样式之后，否则同特异性被基础样式覆盖） */
@media (max-width: 860px) {
  .ca-hero-body { grid-template-columns: 1fr; }
  .ca-hero-body-stats {
    grid-template-columns: 1fr;
    min-height: auto;
    gap: 16px;
    padding: 2px 0 8px;
  }
  /* 移动端：纯容器，不需要额外padding */
  .ca-h-left-block { padding: 0; height: auto; }
  .ca-h-left-block .ca-starmap-wrap { height: auto; }
  .ca-h-right-block { padding: 0; gap: 11px; }
  .ca-emotion-body-double { grid-template-columns: 1fr; }
  /* 夜色+心事轨迹双栏 → 移动端单列 */
  .ca-night-track-wrap { grid-template-columns: 1fr; }
  .ca-night-flow-left, .ca-night-side-track { height: auto; }
  .ca-night-scroll { max-height: none; overflow-y: visible; }
}
</style>
