<template>
  <div class="ca-wrap">
    <!-- ═══ 0. 顶部标识条 ═══ -->
    <div class="ca-hero-strip">
      <div class="ca-hero-left">
        <Sparkles :size="13" class="ca-hero-spark" />
        <span class="ca-hero-label">AI 星笺解读</span>
        <span class="ca-hero-sub">· 基于 {{ storyCount }} 则心事的聚合凝视</span>
      </div>
      <span class="ca-hero-badge">DESIGN PREVIEW</span>
    </div>

    <!-- ═══ 0.5. Hero：合集星图总览 + 星辰归属置顶（对齐 StarDetail AIPersonaCard 规范）
                    左 = 星点散点图（放大：心事=星 x=时间 y=情绪 r=共鸣 color=情感色）
                    右 = 这组星的品质（光谱/星等/星座/地平，从props真实派生） ═══ -->
    <section class="panel-wrapper ca-hero-panel">
      <div class="panel-head">
        <Sparkles :size="10" class="pw-icon pw-purple" />
        <span class="pw-title">星辰归属 · 这组星的品质</span>
        <span class="pw-count">{{ storyCount }} 则心事 · {{ starBelongings.length }} 颗星 · 刚刚更新</span>
      </div>

      <div class="ca-hero-body ca-hero-body-stats">
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

          <!-- ③ 光谱色分布 -->
          <div class="ca-h-ss-section">
            <div class="ca-hs-k ca-h-ss-sec-k">光谱色分布 · SPECTRAL COLOR</div>
            <div v-if="starStatistics.spectral.length > 0" class="ca-h-ss-bars">
              <div v-for="s in starStatistics.spectral.slice(0, 4)" :key="s.spec" class="ca-h-ss-bar">
                <div class="ca-h-ss-bar-labels">
                  <span class="ca-h-ss-bar-color" :style="{ background: s.color, boxShadow: `0 0 4px ${s.color}` }"></span>
                  <span class="ca-h-ss-bar-spec">{{ s.spec }}</span>
                  <span class="ca-h-ss-bar-cn">{{ s.cn }}</span>
                  <span class="ca-h-ss-bar-pct" :style="{ color: s.color }">{{ s.pct }}%</span>
                </div>
                <div class="ca-h-ss-bar-track">
                  <div class="ca-h-ss-bar-fill" :style="{ width: s.pct + '%', background: s.color }"></div>
                </div>
              </div>
            </div>
            <div v-else class="ca-h-ss-empty">尚无归属恒星数据</div>
          </div>

          <!-- ④ 星座 Top3 + 星群品质标签 -->
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
    </section>



    <!-- ═══ 1. 夜观手记（=原合集画像，天空本色重构：笺卷卡→夜观小册+月相节气+五大天条，关键词→天空意象，维度→夜的气象五列）═══ -->
    <section class="ca-card ca-persona ca-night-notes">
      <div class="ca-card-head">
        <component :is="Sparkles" :size="12" class="ca-ch-icon ca-ch-blue" />
        <span class="ca-ch-title">夜观手记</span>
        <span class="ca-ch-count">{{ nightSky.phase }} · {{ nightSky.term }} · {{ storyCount }} 处光斑</span>
      </div>
      <div class="ca-persona-body">
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
              <span class="sc-astro-v sc-astro-v-vg">{{ nightSky.timeSpan.split(' ')[0] }} ~{{ nightSky.timeSpan.split('~')[1].trim().substring(0,5) }}</span>
            </div>
            <div class="sc-astro-row">
              <span class="sc-astro-k">温</span>
              <span class="sc-astro-v" style="color: #86a8ff">{{ nightSky.meteo[1].v.split(' ')[0] }}</span>
            </div>
            <div class="sc-astro-row">
              <span class="sc-astro-k">风</span>
              <span class="sc-astro-v" style="color: #caa7ff">{{ nightSky.meteo[2].v.split(' ')[0] }}</span>
            </div>
            <div class="sc-astro-row">
              <span class="sc-astro-k">月</span>
              <span class="sc-astro-v" style="color: #ffd98a">{{ nightSky.moonIllum }}</span>
            </div>
          </div>

          <!-- 标签：从αβγ亮星→改为天空意象徽章（夜雨/孤灯/江风/远乡…） -->
          <div class="sc-tags sc-tags-images">
            <span
              v-for="(im, i) in skyImages.slice(0, 5)"
              :key="'skyIm'+i"
              class="ca-pt-kw ca-pt-kw-sky"
              :style="{ '--c': im.color, fontSize: im.size === 'lg' ? '0.64rem' : (im.size === 'md' ? '0.58rem' : '0.52rem'), padding: im.size === 'lg' ? '3px 7px' : '2px 6px' }"
            >
              {{ im.word }}
            </span>
          </div>
        </div>

        <!-- 右：手记文字（不再是星座主人叙事，改成当夜"你"的视角：从子初坐到卯初，8处光斑散在夜里） -->
        <div class="ca-persona-text">
          <!-- 观夜简介条：从星区→改为「当夜观览·开篇」 -->
          <div class="ca-pt-intro ca-pt-intro-night">
            <component :is="CloudSun" :size="10" />
            <span>{{ nightSky.season }} · {{ nightSky.timeSpan }} · 共收 {{ storyCount }} 处光斑</span>
          </div>
          <p class="ca-pt-para first">
            这一夜叫<span class="ca-han-hl">「{{ persona.hanName }}」</span>——你从
            <b style="color: #ffd98a">{{ nightSky.timeSpan.split(' ')[0] }}</b>
            一直坐到
            <b style="color: #86a8ff">{{ nightSky.timeSpan.split('~')[1] }}</b>，
            8 处心事像灯火一样浮在夜里。
            {{ persona.paragraphFirst }}
          </p>
          <p class="ca-pt-para">
            {{ persona.paragraphSecond }}
            月是一弯蛾眉，云是四分散卷；你说话的声音很轻，像江风掠过时带起的槐花。
          </p>

          <!-- 金句卡片：引用号从 " → 改为「残灯」视觉（左上角小灯 + 夜色边） -->
          <div class="ca-quote-card ca-qc-night">
            <svg viewBox="0 0 16 16" width="18" height="18" class="ca-qc-lamp">
              <circle cx="8" cy="6" r="3.5" fill="#ffd98a" opacity="0.85" />
              <rect x="6" y="9" width="4" height="4" rx="1" fill="rgba(255,217,138,0.35)" />
            </svg>
            <span class="ca-quote-text">{{ persona.quote }}</span>
          </div>

          <!-- 关键词云：意象·亮星 → 改为「天空意象」：夜雨/江风/孤灯/远乡/独坐/槐花/种子/残卷 -->
          <div class="ca-pt-keywords">
            <div class="ca-pt-kw-title ca-pt-kw-title-sky">天空意象 · 那一夜的风物</div>
            <div class="ca-pt-kw-cloud">
              <span
                v-for="(im, i) in skyImages"
                :key="'skyImM'+i"
                class="ca-pt-kw ca-pt-kw-sky"
                :style="{ '--c': im.color, fontSize: im.size === 'lg' ? '0.74rem' : (im.size === 'md' ? '0.66rem' : '0.58rem'), padding: im.size === 'lg' ? '5px 10px' : '4px 8px' }"
              >
                {{ im.word }}
              </span>
              <!-- 同时保留主标签（#独属于你 …）但改风格为淡灰透明 -->
              <span class="ca-pt-kw ca-pt-kw-tag ca-pt-kw-tag-ghost" v-for="t in persona.tags" :key="'tag'+t">#{{ t }}</span>
            </div>
          </div>

          <!-- 引导条：📜 给这卷星笺的注脚 → 🌙 给那一夜的注脚 -->
          <div class="ca-suggest-wrap ca-sw-night">
            <span class="ca-s-tip">🌙 给那一夜的注脚</span>
            <span class="ca-s-text">{{ persona.suggestIntro }}</span>
          </div>

          <!-- ===== 【那一夜·五大气象维度】夜温/风向/见月/云量/体感 五列横条，用户说"去了很丑"必须加回来！ ===== -->
          <div class="ca-pt-meteo-five">
            <div class="ca-pt-meteo-title">
              <component :is="MoonStar" :size="9" />
              <span>那一夜·五大气象</span>
            </div>
            <div class="ca-pt-meteo-bars">
              <div
                v-for="(m, i) in fiveMeteo"
                :key="m.k"
                class="ca-pt-meteo-row"
                :style="{ '--mc': m.color } as Record<string, string>"
              >
                <span class="ca-pt-meteo-k">{{ m.k }}</span>
                <div class="ca-pt-meteo-track">
                  <div
                    class="ca-pt-meteo-fill"
                    :style="{
                      width: (persona.dimensions[i]?.percent ?? 50) + '%',
                      background: `linear-gradient(90deg, ${m.color}33, ${m.color})`,
                    }"
                  ></div>
                </div>
                <span class="ca-pt-meteo-en">{{ m.en }}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>



    <!-- ═══ 2. 夜色流转 + 心事投递时间轨迹（双栏：左=夜色流转球+洞察+叙事；右=散点时间轨迹） ═══ -->
    <div class="ca-single ca-single-double">
      <section class="ca-card ca-emotion ca-night-flow ca-night-flow-wide">
        <div class="ca-card-head">
          <component :is="MoonStar" :size="12" class="ca-ch-icon ca-ch-gold" />
          <span class="ca-ch-title">夜色流转 · 心事轨迹</span>
          <span class="ca-ch-count">子流 → 卯散 · {{ emotions.length }} 种夜色 · {{ heroStars.length }} 段轨迹</span>
        </div>
        <div class="ca-emotion-body ca-emotion-body-double">
          <!-- 左：夜色流转（5球 + 洞察卡 + 叙事） -->
          <div class="ca-emo-left">
            <!-- 发光球展示：完全对齐 StarDetail emotion-orbs 结构 → flex row 水平一条线均匀分布 -->
            <div class="emotion-orbs ca-night-orbs">
              <span
                v-for="e in emotions"
                :key="e.name"
                class="orb ca-night-orb"
                :style="{
                  width: orbSize(e.value) + 'px',
                  height: orbSize(e.value) + 'px',
                  background: `radial-gradient(circle at 35% 30%, ${e.color}ee, ${e.color}33 70%, transparent)`,
                  boxShadow: `0 0 ${10 + e.value * 16}px ${e.color}55`,
                }"
                :title="`${e.name} · ${Math.round(e.value * 100)}% · ${e.desc}`"
              >
                <span class="orb-label ca-no-label">{{ e.name }}</span>
                <span class="orb-val ca-no-val">{{ Math.round(e.value * 100) }}</span>
              </span>
            </div>

            <!-- 情绪洞察卡：夜刻头标签 + 夜色属性 -->
            <div class="ca-emo-insights">
              <div class="ca-ei-card ca-ei-card-night" v-for="(ins, i) in emotionInsights" :key="i">
                <span class="ca-ei-dot" :style="{ background: ins.color, boxShadow: `0 0 5px ${ins.color}` }"></span>
                <div class="ca-ei-text">
                  <div class="ca-ei-title" :style="`--c:${ins.color}`">
                    <span class="ca-ei-title-name" v-html="ins.title"></span>
                    <span class="ca-ei-night-hour" :style="{ color: ins.color }">
                      {{ (['子时末','丑正二刻','寅初一刻','寅正三刻'])[i] ?? '卯初初刻' }}
                    </span>
                  </div>
                  <div class="ca-ei-astro ca-ei-night-meteo">
                    <span class="ca-ei-astro-item">
                      <i class="ca-ei-astro-k">相</i>
                      <i class="ca-ei-astro-v" :style="{ color: ins.color }">{{ (['残月','残月','蛾眉','蛾眉','上弦'])[i] ?? '残月' }}</i>
                    </span>
                    <span class="ca-ei-astro-item">
                      <i class="ca-ei-astro-k">云</i>
                      <i class="ca-ei-astro-v">{{ (['3/8','4/8','2/8','4/8','1/8'])[i] ?? '3/8' }}</i>
                    </span>
                    <span class="ca-ei-astro-item">
                      <i class="ca-ei-astro-k">温</i>
                      <i class="ca-ei-astro-v">{{ ([11.4,10.8,11.2,12.1,12.9])[i] ?? 11 }}℃</i>
                    </span>
                  </div>
                  <div class="ca-ei-desc">{{ ins.desc }}</div>
                </div>
              </div>
            </div>

            <!-- 主调叙事：夜色主调 -->
            <div class="ca-emo-narrative ca-emo-night-narr">
              <p class="ca-emo-para">
                <span class="ca-emo-lead">{{ emotionNarrative.dominant }}</span>
                <span class="ca-emo-lead-pct">{{ emotionNarrative.dominantPct }}</span>
                是这一夜的底色，
                {{ emotionNarrative.summary }}
              </p>
              <p class="ca-emo-para ca-emo-para-sub">
                <i class="ca-emo-ms-label ca-emo-nl-label">夜 · 浓淡</i>
                {{ emotionNarrative.contrast }}
              </p>
              <p class="ca-emo-para ca-emo-para-flow">
                <component :is="Sparkles" :size="10" class="ca-emo-flow-icon" />
                {{ emotionNarrative.flow }}
              </p>
            </div>
          </div>

          <!-- 右：心事投递时间轨迹（原Hero左栏的散点星图缩小版，替代原星辰归属位置） -->
          <div class="ca-emo-right ca-emo-side-track">
            <div class="ca-et-head">
              <component :is="Clock3" :size="10" class="pw-icon pw-blue" />
              <span>心事投递时间轨迹</span>
            </div>
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

              <!-- 背景星点 60 颗（因为图小了，少20颗） -->
              <g opacity="0.92">
                <circle v-for="(s, i) in deepSkyStars.slice(0, 60)" :key="'dss2'+i"
                  :cx="(s.x / 320) * 420"
                  :cy="(s.y / 200) * 260 + 10"
                  :r="s.r * 0.82"
                  fill="#ffffff"
                  :opacity="s.opacity * 0.78" />
              </g>

              <!-- 星点=心事（8 颗）+ 时间标签 -->
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

              <!-- 坐标轴（20:00 → 06:00；情绪 +/−） -->
              <g fill="rgba(220,220,240,0.38)" font-family="SF Mono, Menlo, monospace" font-size="8">
                <text x="10"  y="270">20:00</text>
                <text x="140" y="270">00:00</text>
                <text x="268" y="270">04:00</text>
                <text x="375" y="270">06:00</text>
                <text x="6" y="18"   opacity="0.6">+ 情绪</text>
                <text x="6" y="258"  opacity="0.6">− 情绪</text>
                <text x="10" y="145"  opacity="0.28" font-size="7">情绪轴</text>
                <text x="200" y="278" opacity="0.28" font-size="7" text-anchor="middle">时间轴 · 投递时刻</text>
              </g>

              <!-- 星群轮廓线（按时间顺序连接 → 心事投递时间轨迹！） -->
              <polyline
                :points="heroStars.map(p => `${Math.round(p.x*420/360)},${Math.round(p.y*280/220)}`).join(' ')"
                fill="none" stroke="rgba(255,217,138,0.25)" stroke-width="0.8"
                stroke-dasharray="2 3" stroke-linecap="round"
                style="filter: drop-shadow(0 0 2px rgba(255,217,138,0.2))" />
            </svg>
            <div class="ca-et-legend">
              <span><i style="background:#ffd98a"></i>暖色 · 喜悦/思念</span>
              <span><i style="background:#caa7ff"></i>紫 · 柔软/低落</span>
              <span><i style="background:#86a8ff"></i>蓝 · 平静/释然</span>
              <span><i style="background:#9ae6b4"></i>绿 · 释然/新生</span>
              <span class="ca-h-legend-note">· 连线=时间轨迹</span>
            </div>
          </div>
        </div>
      </section>
    </div>



    <!-- ═══ 心事摘录 → 【天空本色】天窗片段（那一夜夜色里剪出来的几帧：时辰贴纸+插画窗+当夜属性）═══ -->
    <section class="ca-card ca-quote ca-quote-sky">
      <div class="ca-card-head">
        <component :is="MoonStar" :size="12" class="ca-ch-icon ca-ch-gold" />
        <span class="ca-ch-title">天窗片段</span>
        <span class="ca-ch-count">子·丑·寅·卯 · {{ storyQuotes.length }} 帧 · 心事剪成的夜色</span>
      </div>
      <div class="ca-q-body">
        <div class="ca-q-list">
          <div class="ca-q-item ca-q-item-sky" v-for="(q, i) in storyQuotes" :key="i">
            <!-- 左上：α/β/γ 亮星徽章 → 改成「时辰贴纸」（子初三刻 / 丑正二刻 / 寅初一刻） -->
            <span class="ca-q-rank ca-q-sticker" :style="{ '--c': q.color }">
              <i>{{ (['子初三刻','丑正二刻','寅初一刻'])[i % 3] }}</i>
            </span>

            <!-- 左 SVG 插画：保留月/屋/花，但套一层「夜色小窗」方形外框（把插画嵌进窗里，窗内=天色） -->
            <!-- 窗 = 4px 边框 + 内部天色渐变（夜色蓝紫） + 边角残灯点 -->
            <div class="ca-q-skywindow">
              <svg v-if="q.illus === 'moon'" viewBox="0 0 60 60" class="ca-q-illus">
                <circle cx="14" cy="18" r="1" fill="#fff" opacity="0.5" />
                <circle cx="45" cy="44" r="0.7" fill="#fff" opacity="0.4" />
                <circle cx="30" cy="10" r="0.5" fill="#fff" opacity="0.3" />
                <circle cx="50" cy="28" r="0.8" fill="#fff" opacity="0.45" />
                <path d="M42 28 a16 16 0 1 0 0 20 a12 12 0 1 1 0 -20z" fill="#ffd98a" opacity="0.62" />
              </svg>
              <svg v-else-if="q.illus === 'house'" viewBox="0 0 60 60" class="ca-q-illus">
                <circle cx="10" cy="20" r="0.7" fill="#fff" opacity="0.35" />
                <circle cx="52" cy="16" r="0.6" fill="#fff" opacity="0.3" />
                <path d="M30 14 L14 28 L18 28 L18 48 L42 48 L42 28 L46 28 Z"
                  fill="none" stroke="rgba(255,217,138,0.55)" stroke-width="1.2" stroke-linejoin="round" />
                <rect x="26" y="36" width="8" height="12" fill="none" stroke="rgba(255,217,138,0.42)" stroke-width="1" />
                <rect x="21" y="32" width="5" height="5" fill="rgba(255,217,138,0.12)" stroke="rgba(255,217,138,0.25)" stroke-width="0.6" />
                <rect x="34" y="32" width="5" height="5" fill="rgba(255,217,138,0.12)" stroke="rgba(255,217,138,0.25)" stroke-width="0.6" />
                <path d="M36 14 Q34 10 38 8 Q40 6 36 4" fill="none" stroke="rgba(202,167,255,0.45)" stroke-width="0.8" stroke-linecap="round" />
              </svg>
              <svg v-else viewBox="0 0 60 60" class="ca-q-illus">
                <circle cx="16" cy="50" r="0.7" fill="#fff" opacity="0.35" />
                <circle cx="48" cy="52" r="0.6" fill="#fff" opacity="0.3" />
                <g stroke="rgba(251,182,206,0.58)" stroke-width="0.85" fill="none">
                  <path d="M30 52 L30 20" />
                  <path d="M30 32 L18 24 M30 28 L44 18 M30 38 L22 32" />
                </g>
                <g fill="rgba(251,182,206,0.7)">
                  <circle cx="18" cy="24" r="1.5" /><circle cx="44" cy="18" r="1.3" />
                  <circle cx="22" cy="32" r="1.2" /><circle cx="38" cy="36" r="1.1" />
                  <circle cx="30" cy="18" r="1.2" /><circle cx="26" cy="26" r="1" />
                </g>
                <circle cx="20" cy="44" r="0.9" fill="rgba(251,182,206,0.55)" />
                <circle cx="40" cy="46" r="0.8" fill="rgba(251,182,206,0.48)" />
              </svg>
              <!-- 夜色窗的 4 角 窗棂点（残灯/光斑） -->
              <i class="ca-q-sw-corner tl"></i>
              <i class="ca-q-sw-corner tr"></i>
              <i class="ca-q-sw-corner bl"></i>
              <i class="ca-q-sw-corner br"></i>
            </div>

            <!-- 右：正文（顶部新增「当夜时间 + 夜属性」行，替代亮星星名+天文参数） -->
            <div class="ca-q-body-inner">
              <div class="ca-q-mark" :style="{ color: q.color }">"</div>
              <!-- 那一夜的时间 + 夜属性（残月 / 11.4℃ / 云量 3成）：替代 MAG/DIST -->
              <div class="ca-q-star-head ca-q-night-head">
                <span class="ca-q-star-name" :style="{ color: q.color }">
                  <!-- 左侧时辰名替代 α 雨夜寄北：子初三刻 + 星名（原星名保留，颜色+楷体）-->
                  <i class="ca-q-star-greek ca-q-sky-greek" :style="{ color: q.color }">
                    {{ (['子初三刻','丑正二刻','寅初一刻'])[i % 3] }}
                  </i>
                  · {{ q.starName }}
                </span>
                <span class="ca-q-star-astro ca-q-night-astro">
                  <!-- 替代 MAG/DIST/TYPE：月相 / 夜温 / 云量 -->
                  <span><i>相</i>{{ (['残月','残月','蛾眉'])[i % 3] }}</span>
                  <span><i>温</i>{{ ([11.4, 10.8, 11.6])[i % 3] }}℃</span>
                  <span><i>云</i>{{ (['3/8','4/8','2/8'])[i % 3] }}</span>
                </span>
              </div>
              <div class="ca-q-text">{{ q.text }}</div>
              <div class="ca-q-meta">
                <span class="ca-q-tag" v-for="t in q.tags" :key="t">#{{ t }}</span>
                <span class="ca-q-spacer"></span>
                <span class="ca-q-author">{{ q.author }}</span>
                <span class="ca-q-date">· {{ q.date }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>



    <!-- ═══ 4. 时辰热力 ═══ -->
    <section class="ca-card ca-hour">
      <div class="ca-card-head">
        <component :is="Clock3" :size="12" class="ca-ch-icon ca-ch-purple" />
        <span class="ca-ch-title">时辰热力</span>
        <span class="ca-ch-count">高峰 {{ pad(peakHour) }}:00 · 低谷 {{ pad(lowHour) }}:00</span>
      </div>
      <div class="ca-hour-body">
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
          <div class="ca-hi ca-hi-peak">
            <span class="ca-hi-prefix">高峰</span>
            <span class="ca-hi-time">{{ hourRangeText(peakHour) }}</span>
            <span class="ca-hi-count">{{ peakPct }}% 投递集中</span>
            <p class="ca-hi-desc">{{ peakText }}</p>
          </div>
          <div class="ca-hi ca-hi-low">
            <span class="ca-hi-prefix">低谷</span>
            <span class="ca-hi-time">{{ hourRangeText(lowHour) }}</span>
            <span class="ca-hi-count">仅 {{ lowPct }}% 故事</span>
            <p class="ca-hi-desc">{{ lowText }}</p>
          </div>
        </div>
      </div>
    </section>



    <!-- ═══ 5. 共鸣榜 + 情感轨迹（双栏，情感轨迹替换原关键词云）═══ -->
    <div class="ca-duo">
      <!-- 共鸣榜 -->
      <section class="ca-card ca-rank">
        <div class="ca-card-head">
          <component :is="Flame" :size="12" class="ca-ch-icon ca-ch-orange" />
          <span class="ca-ch-title">共鸣榜</span>
          <span class="ca-ch-count">Top {{ rankList.length }}</span>
        </div>
        <div class="ca-rank-body">
          <article
            v-for="(r, i) in rankList"
            :key="r.id"
            class="ca-rank-item"
            @click="$emit('story-click', r)"
          >
            <div class="ca-rank-no" :class="`ca-rank-no-${i + 1}`">{{ i + 1 }}</div>
            <div class="ca-rank-main">
              <div class="ca-rank-title">{{ r.title }}</div>
              <div class="ca-rank-summary">{{ r.summary }}</div>
            </div>
            <div class="ca-rank-res">
              <component :is="Heart" :size="11" />
              <span>{{ r.resonance }}</span>
            </div>
          </article>
        </div>
      </section>

      <!-- 情感轨迹（从原独立全宽位移入双栏，限高滚动+渐隐+展开） -->
      <section class="ca-card ca-trajectory">
        <div class="ca-card-head">
          <component :is="Route" :size="12" class="ca-ch-icon ca-ch-green" />
          <span class="ca-ch-title">情感轨迹</span>
          <span class="ca-ch-count">{{ trajectory.length }} 则</span>
          <button
            v-if="trajectory.length > 3"
            class="ca-traj-toggle"
            @click="trajExpanded = !trajExpanded"
          >{{ trajExpanded ? '收起' : '展开' }}</button>
        </div>
        <div class="ca-traj-scroll" :class="{ expanded: trajExpanded }">
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
      </section>
    </div>



    <!-- ═══ 8. 那夜的天官书（=原AI总叙，天空本色：夜览日志+夜半四刻+夜半自语+夜的尾注）═══ -->
    <section class="ca-card ca-narrative ca-night-book">
      <div class="ca-card-head">
        <component :is="MoonStar" :size="12" class="ca-ch-icon ca-ch-gold" />
        <span class="ca-ch-title">那夜的天官书</span>
        <span class="ca-ch-count">夜览 · 四刻 · 夜半自语 · 尾注</span>
      </div>
      <div class="ca-narr-body">
        <!-- ===== 第一段：夜览日志 · 开篇（原星图总志：观测卡→当夜的天象概览：月/节气/夜温/风/光斑数） ===== -->
        <div class="ca-narr-section ca-narr-overview ca-no-overview">
          <div class="ca-nr-head">
            <div class="ca-nr-icon ca-nr-icon-gold ca-no-icon">
              <component :is="Sparkles" :size="13" />
            </div>
            <div class="ca-nr-title-wrap">
              <div class="ca-nr-title">{{ narrative.overview.title.replace('星图总志','夜览日志') }}</div>
              <div class="ca-nr-sub">{{ nightSky.season }} · {{ nightSky.timeSpan }} · {{ storyCount }} 处心事光斑</div>
            </div>
          </div>
          <!-- 【天空本色】当夜天象概览卡（6宫格，替代赤经/赤纬/银纬天文参数） -->
          <div class="ca-nr-obs-card ca-no-obs-card">
            <div class="ca-nr-obs-item">
              <span class="ca-nr-obs-k">月相</span>
              <span class="ca-nr-obs-v ca-nr-obs-v-gold">{{ nightSky.phase }} · {{ nightSky.moonIllum }}</span>
            </div>
            <div class="ca-nr-obs-item">
              <span class="ca-nr-obs-k">节气</span>
              <span class="ca-nr-obs-v ca-nr-obs-v-purple">{{ nightSky.term }} · 黄经 {{ nightSky.ecliptic }}</span>
            </div>
            <div class="ca-nr-obs-item">
              <span class="ca-nr-obs-k">夜温</span>
              <span class="ca-nr-obs-v" style="color:#86a8ff">{{ nightSky.meteo[1].v }}</span>
            </div>
            <div class="ca-nr-obs-item">
              <span class="ca-nr-obs-k">风向</span>
              <span class="ca-nr-obs-v" style="color:#caa7ff">{{ nightSky.meteo[2].v }}</span>
            </div>
            <div class="ca-nr-obs-item">
              <span class="ca-nr-obs-k">云量</span>
              <span class="ca-nr-obs-v" style="color:#95f0c0">{{ nightSky.meteo[4].v }}</span>
            </div>
            <div class="ca-nr-obs-item">
              <span class="ca-nr-obs-k">观夜地</span>
              <span class="ca-nr-obs-v ca-nr-obs-v-gold">北纬 31.2° · 江边</span>
            </div>
          </div>
          <div class="ca-nr-content">{{ narrative.overview.content }}</div>
          <div class="ca-nr-tags">
            <!-- 关键字 → 改成天空意象 #夜雨 #孤灯 #槐花 #独坐 -->
            <span class="ca-nr-tag ca-no-tag" v-for="k in (['夜雨','孤灯','独坐','槐花','残卷'])" :key="k">#{{ k }}</span>
          </div>
        </div>

        <!-- ===== 第二段：夜半四刻（原星轨运行四步 → 子/丑/寅/卯 四节，每节=你那一夜的真实时位，带小气象属性） ===== -->
        <div class="ca-narr-section ca-narr-arc ca-no-arc">
          <div class="ca-nr-head">
            <div class="ca-nr-icon ca-nr-icon-blue">
              <component :is="Clock3" :size="13" />
            </div>
            <div class="ca-nr-title-wrap">
              <div class="ca-nr-title">夜半四刻 · 子丑寅卯</div>
              <div class="ca-nr-sub">从子初坐到卯初 · 那一夜的你在四段夜色里</div>
            </div>
          </div>
          <!-- 夜半四刻步点：步点名称=四节，坐标=当夜气象小标，anchor→最亮的那道斑 -->
          <div class="ca-nr-arc-steps ca-nr-orb-steps">
            <div
              class="ca-nr-step ca-nr-orbit-step"
              v-for="(p, i) in [
                  { name:'子初一刻', tag:'入夜浓时', color:'#86a8ff', desc:'你在灯下展开这一夜，窗外的雨刚开始落。月是一弯残眉，斜斜挂在檐西。', anchor:'雨夜寄北' },
                  { name:'子末丑初', tag:'独坐无声', color:'#caa7ff', desc:'灯花落尽一盏，你什么也没写。城市的末班车过去了，远处的江灯连成一片。', anchor:'凌晨四点' },
                  { name:'寅正时分', tag:'风过江岸', color:'#95f0c0', desc:'你走到江边，风从西北来，带着槐花的香气——忽然就不难过了。', anchor:'江边走走' },
                  { name:'卯初将晓', tag:'天色欲曙', color:'#ffd98a', desc:'东方有一点点淡白，你合上本子，把那盏残灯也留给了夜空。', anchor:'合上这一卷' }
              ]"
              :key="i"
              :style="{ '--step-color': p.color } as Record<string, string>"
            >
              <div class="ca-nr-step-dot ca-nr-orbit-dot"></div>
              <div class="ca-nr-step-body">
                <div class="ca-nr-step-name-row ca-no-step-name-row">
                  <div class="ca-nr-step-name ca-no-step-name">{{ p.name }} · <i style="color:var(--step-color); font-style:normal; font-family:'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif; letter-spacing:0.04em">{{ p.tag }}</i></div>
                  <!-- 地平坐标 → 改成「当夜三小气象」：月位置 / 夜温 / 云量 -->
                  <div class="ca-nr-step-coord ca-no-meteo">
                    <span>月位 <b>{{ (['檐西','天顶西','天中偏东','东方将白'])[i] }}</b></span>
                    <span>夜温 <b>{{ ([12,10.8,11.4,12.9])[i] }}℃</b></span>
                  </div>
                </div>
                <div class="ca-nr-step-anchor" v-if="p.anchor">最亮的光斑：「{{ p.anchor }}」</div>
                <div class="ca-nr-step-desc">{{ p.desc }}</div>
              </div>
              <div v-if="i < 3" class="ca-nr-step-line ca-nr-orbit-line"></div>
            </div>
          </div>
          <p class="ca-nr-summary">{{ narrative.arc.summary }}</p>
        </div>

        <!-- ===== 第三段：夜半自语（原星座神话独白 → 那一夜你写在夜色里的自己；星官注→夜的注；插画→夜色小卷） ===== -->
        <div class="ca-narr-monologue ca-narr-myth ca-no-self">
          <div class="sc-corner sc-tl"></div>
          <div class="sc-corner sc-tr"></div>
          <div class="sc-corner sc-bl"></div>
          <div class="sc-corner sc-br"></div>
          <!-- 星官注标签 → 改成「那夜的注」小印章 + 卷名 -->
          <div class="ca-nm-myth-tag ca-no-tag-row">
            <span class="ca-nm-myth-seal ca-no-seal">夜之注</span>
            <span class="ca-nm-myth-sub">《夜雨孤灯 · 天官书》卷三</span>
          </div>
          <!-- 左插画：星座连线图→ 换成「那一夜的夜色小卷」：天色带 + 月 + 8颗光斑连线 -->
          <svg viewBox="0 0 60 60" class="ca-nm-illus ca-no-illus">
            <!-- 背景天色横带（入夜→黎明）-->
            <defs>
              <linearGradient id="nightBandMini" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"  stop-color="#0a0c24" />
                <stop offset="50%" stop-color="#1b1a47" />
                <stop offset="100%" stop-color="#58403c" />
              </linearGradient>
            </defs>
            <rect x="2" y="18" width="56" height="24" rx="3" fill="url(#nightBandMini)" stroke="rgba(134,168,255,0.25)" stroke-width="0.5" />
            <!-- 残月蛾眉（左） -->
            <g transform="translate(10,15)">
              <circle cx="0" cy="0" r="4.2" fill="rgba(245,240,228,0.92)" />
              <circle cx="1.4" cy="-0.8" r="4" fill="url(#nightBandMini)" />
            </g>
            <!-- 8 颗心事光斑连线（夜色带里的一段曲线，5 颗点即可） -->
            <path d="M12 38 Q20 30, 28 34 T44 32 T52 30" fill="none" stroke="rgba(255,217,138,0.42)" stroke-width="0.7" stroke-dasharray="1.5 1.2" stroke-linecap="round" />
            <circle cx="12" cy="38" r="1.5" fill="#ffd98a">
              <animate attributeName="r" values="1.5;1.9;1.5" dur="2.8s" repeatCount="indefinite" />
            </circle>
            <circle cx="28" cy="34" r="1.3" fill="#caa7ff" />
            <circle cx="36" cy="32" r="1.1" fill="#95f0c0" />
            <circle cx="44" cy="32" r="1.0" fill="#86a8ff" />
            <circle cx="52" cy="30" r="1.2" fill="#ffd98a" />
            <!-- 背景散星 -->
            <circle cx="4"  cy="6"  r="0.5" fill="#fff" opacity="0.45" />
            <circle cx="54" cy="8"  r="0.4" fill="#fff" opacity="0.35" />
            <circle cx="48" cy="52" r="0.5" fill="#fff" opacity="0.42" />
            <circle cx="10" cy="54" r="0.45" fill="#fff" opacity="0.38" />
          </svg>
          <div class="ca-nm-body">
            <div class="ca-nm-mark">"</div>
            <p class="ca-nm-text">{{ narrative.monologue.text }}</p>
            <!-- 星官注释行 → 改成「夜的注语」口吻 -->
            <div class="ca-nm-myth-note">
              <span class="ca-nm-myth-note-k ca-no-note-k">夜之按：</span>
              <span class="ca-nm-myth-note-v">{{ narrative.monologue.mythNote }}</span>
            </div>
            <div class="ca-nm-meta">
              <span class="ca-nm-tag">{{ narrative.monologue.tag }}</span>
              <span class="ca-nm-spacer"></span>
              <span class="ca-nm-author">{{ narrative.monologue.author }}</span>
            </div>
          </div>
        </div>

        <!-- ===== 第四段：夜的尾注（原观星者手记 → 给那一夜最后的尾注；仪器→心之所感+青灯纸砚） ===== -->
        <div class="ca-narr-postscript ca-narr-obs-log ca-no-postscript">
          <div class="ca-obs-header">
            <span class="ca-obs-tip ca-no-tip">
              <component :is="Feather" :size="10" />
              {{ narrative.postscript.tag }}
            </span>
            <!-- 观测元数据 → 当夜的收尾气象 -->
            <div class="ca-obs-meta ca-no-meta">
              <div class="ca-obs-meta-item">
                <span class="ca-obs-meta-k">夜之程</span>
                <span class="ca-obs-meta-v">甲辰 · 春分后三夜</span>
              </div>
              <div class="ca-obs-meta-item">
                <span class="ca-obs-meta-k">所携</span>
                <span class="ca-obs-meta-v">心之所感 · 残灯一盏</span>
              </div>
              <div class="ca-obs-meta-item">
                <span class="ca-obs-meta-k">收灯时</span>
                <span class="ca-obs-meta-v">夜雨初霁 · 天将破晓</span>
              </div>
            </div>
          </div>
          <p class="ca-ps-text ca-obs-text">{{ narrative.postscript.content }}</p>
          <!-- 落款：观星者 → 改成「这一夜观你者」印章 + 签名 -->
          <div class="ca-obs-sign ca-no-sign">
            <div class="ca-obs-sign-seal ca-no-seal-sign">夜</div>
            <div class="ca-obs-sign-name">
              <span>夜雨孤灯 · 那一夜的你</span>
              <span class="ca-obs-sign-date">卯初 · 露结为霜</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 底部说明（设计预览标记）-->
    <div class="ca-foot-note">
      <component :is="Info" :size="11" />
      <span>以上为设计预览，AI 解读内容为占位示例，尚未接入生成服务。</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Sparkles, MoonStar, HeartPulse, Orbit, Clock3, Route, Flame, Heart,
  Feather, Info, Quote, CloudSun,
} from 'lucide-vue-next'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { getStarNameInfo } from '../../utils/starName'
import { dateToJD, lstDeg, altAz } from '../../utils/astro'
import { useLocation } from '../../composables/useLocation'

marked.setOptions({ breaks: true, gfm: true })

const props = defineProps<{
  collectionName: string
  storyCount: number
  /** 真实故事列表，用于共鸣榜与星辰归属（若为空则用 mock） */
  stories?: Array<{
    id: number
    title: string | null
    content: string
    resonanceCount: number
    createdAt: string
    catalogStarId?: number | null
    catalogStarIds?: number[]
  }>
  /** 可选：合集总共鸣数（不传则从 stories.reduce 计算，或 fallback 到 mock 237） */
  resonanceTotal?: number
}>()

defineEmits<{
  'story-click': [story: any]
}>()

/* ═══════════════════════════════════════════════════════════
   MOCK DATA —— 设计预览占位，后续接入 agent 时替换
   ═══════════════════════════════════════════════════════════ */

const persona = {
  hanName: '夜雨孤灯',
  constellation: '夜雨孤灯 · 默认合集',
  tags: ['思念', '夜雨', '独行', '回忆', '微光'],
  quote: '每一盏孤灯，都是夜里不肯睡的人。',
  suggestIntro: '这卷星笺里收着夜半醒来的低语——雨声、灯影、与不肯寄出的思念。心事在子时最稠，在卯时散去，像一缕没说完的话。',
  paragraphFirst:
    '它们总在夜雨最盛时落下，字里行间带着潮湿的呼吸——有的写给远方的人，有的写给回不去的某个夜晚。每一则都是点亮又按灭的灯，独自亮了很久，才被收进这卷笺里。',
  paragraphSecond:
    '虽然底色是思念与独行，但并非完全沉寂——从字缝里仍能看见微光：雨后的风、清晨的第一缕阳光、陌生人留下的一句话。它们像卷轴上的金粉，被轻轻一拂，就亮了起来。',
  dimensions: [
    { left: '内向',   right: '外向',   percent: 78, side: 'left'  as const },
    { left: '柔和',   right: '锋利',   percent: 34, side: 'left'  as const },
    { left: '沉静',   right: '炽烈',   percent: 62, side: 'left'  as const },
    { left: '现实',   right: '梦幻',   percent: 71, side: 'right' as const },
    { left: '慢热',   right: '热切',   percent: 57, side: 'left'  as const },  // 补 5 维对应 5 曜
  ],
}

/** 星座五曜：金木水火土五行星对应 5 个性格维度（中文名+英文名+代表色） */
const fivePlanets = [
  { cn: '金', en: 'Venus',   color: '#ffd98a' },   // 金星：温软→内向/外向
  { cn: '木', en: 'Jupiter', color: '#95f0c0' },   // 木星：舒展→柔和/锋利
  { cn: '水', en: 'Mercury', color: '#86a8ff' },   // 水星：流动→沉静/炽烈
  { cn: '火', en: 'Mars',    color: '#ff8b7d' },   // 火星：热情→现实/梦幻
  { cn: '土', en: 'Saturn',  color: '#caa7ff' },   // 土星：沉淀→慢热/热切
]

/** 【天空本色】合集画像：天空意象数组（替换α/β/γ亮星），从诗/故事/风物中提取
 *  size: 字大小权重，color: 字形光晕
 */
const skyImages = [
  { word: '夜雨',   size: 'md', color: '#86a8ff' },
  { word: '江风',   size: 'md', color: '#95f0c0' },
  { word: '孤灯',   size: 'lg', color: '#ffd98a' },
  { word: '远乡',   size: 'md', color: '#ffd98a' },
  { word: '独坐',   size: 'md', color: '#caa7ff' },
  { word: '槐花',   size: 'sm', color: '#ffd98a' },
  { word: '种子',   size: 'sm', color: '#86a8ff' },
  { word: '残卷',   size: 'sm', color: '#95f0c0' },
]

/** 【天空本色】合集画像：夜的五大「气象属性」（替换金木水火土五曜）
 *  对应 persona.dimensions 5维的天文重命名，每维带气象名+颜色
 */
const fiveMeteo = [
  { k: '夜温',   en: 'T · NIGHT',    color: '#86a8ff' },  // 温度：凉润
  { k: '风向',   en: 'W · NORTHW',   color: '#caa7ff' },  // 风：西北二级
  { k: '见月',   en: 'M · WANING',   color: '#ffd98a' },  // 月：残月蛾眉
  { k: '云量',   en: 'C · FOURTH',   color: '#95f0c0' },  // 云：4/8散云
  { k: '体感',   en: 'F · CHILL',    color: '#ff8b7d' },  // 体感：衣薄微寒
]


const emotions = [
  { name: '思念', value: 0.78, color: '#ffd98a', desc: '远方的人与未寄出的话' },
  { name: '孤独', value: 0.62, color: '#caa7ff', desc: '末班车与空荡的街' },
  { name: '释然', value: 0.41, color: '#95f0c0', desc: '雨停后的第一缕晨光' },
  { name: '希望', value: 0.35, color: '#86a8ff', desc: '纸船顺流而下的方向' },
  { name: '共鸣', value: 0.28, color: '#ff8b7d', desc: '陌生人留下的温度' },
]
/** 【星空绑定】情绪 → 恒星光谱型映射（O/B/A/F/G/K/M 对应温度蓝→红，温度→情绪色） */
const emotionSpectra = [
  { type: 'G2V' },  // 思念 → G型黄矮星（类似太阳，温吞思念
  { type: 'K5V' },  // 孤独 → K型橙矮星，温度稍低
  { type: 'F8V' },  // 释然 → F型黄白星，微蓝
  { type: 'A3V' },  // 希望 → A型白星，温度更高
  { type: 'M2V' },  // 共鸣 → M型红矮星，温度最低但长久
]

/** 情绪洞察卡片（参考星星 emotionGen：彩点 + 加粗高亮情绪词标题 + 百分比 + 【星空绑定】星等/光年/恒星类型参数） */
const emotionInsights = [
  {
    title: '<b>浓稠思念</b>，是这卷星笺的底色',
    pct: '42.3%',
    desc: '雨夜、灯影、未寄出的信是反复出现的三种意象——思念并不尖锐，更像一盏不肯熄灭的灯，温吞地亮到天明。',
    color: '#ffd98a',
    astro: { type: '黄矮星 G2V', mag: '2.8', dist: '148' },
  },
  {
    title: '<b>深夜独行</b>的孤独，紧随思念之后',
    pct: '33.6%',
    desc: '末班车、空街道、凌晨四点的台灯——它们不是悲伤的注脚，而是独自面对自己时安静的背景音。',
    color: '#caa7ff',
    astro: { type: '橙矮星 K5V', mag: '3.1', dist: '212' },
  },
  {
    title: '<b>微光释然</b>，是最意外的情绪角落',
    pct: '22.2%',
    desc: '虽然整体偏暗，但从「阳台种子」「江边走走」等片段能看见：风一吹，有些事就悄悄松了绑。',
    color: '#95f0c0',
    astro: { type: '黄白星 F8V', mag: '3.4', dist: '276' },
  },
  {
    title: '<b>微光希望</b>，在叙事末尾悄然抬头',
    pct: '18.9%',
    desc: '纸船顺流、种子发芽、槐花再开——时间没有直接给出答案，但它让一些事变得可以放下。',
    color: '#86a8ff',
    astro: { type: '白矮星 A3V', mag: '4.3', dist: '338' },
  },
  {
    title: '<b>陌生人的共鸣</b>，是最轻也最暖的部分',
    pct: '15.1%',
    desc: '一句话、一个点赞、一次擦肩而过的善意——它们不解决问题，但会让某个夜晚变得没那么难熬。',
    color: '#ff8b7d',
    astro: { type: '红矮星 M2V', mag: '4.9', dist: '404' },
  },
]
const emotionNarrative = {
  dominant: '思念',
  dominantPct: '42.3%',
  summary: '雨夜与灯影反复出现，思念是这卷星笺的主调，多指向远方的人与未寄出的话。',
  contrast: '「夜虽沉，主序却稳——就像恒星在主序阶段停留最久，你的思念也在最深处静静燃烧，虽然暗但最持久。',
  flow: '从东升（浓思）→ 中天（孤独回望）→ 西沉（释然微光），星轨虽慢，但终究划过了整个夜。',
}

/** 心事摘录 → 【星空绑定】亮星独白（Top3亮星 αβγ，加星名/星等/光年/恒星类型） */
const storyQuotes = [
  {
    rank: 'α',
    starName: '雨夜寄北',
    illus: 'moon',
    color: '#ffd98a',
    text: '把没寄出的话折成纸船，放进窗外的雨里——不知道它会漂去哪里，但至少今晚，它不用再困在我心里。',
    tags: ['思念', '夜雨', '纸船'],
    author: '匿名星客',
    date: '03/12 子时',
    astro: { type: 'G2V', mag: '2.8', dist: '148' },
  },
  {
    rank: 'β',
    starName: '凌晨四点',
    illus: 'house',
    color: '#caa7ff',
    text: '翻到那张合影，才发现你笑得比我记得的还要年轻。屋里很安静，只有我一个人，却好像听见厨房里还飘着切菜的声音。',
    tags: ['回忆', '家', '旧照片'],
    author: '夜归人',
    date: '03/25 丑时',
    astro: { type: 'K5V', mag: '3.1', dist: '212' },
  },
  {
    rank: 'γ',
    starName: '江边走走',
    illus: 'flower',
    color: '#95f0c0',
    text: '风把帽子吹进水里，我居然笑了出来。有些东西抓不住就是抓不住，没关系——下次换一顶帽子就是了。',
    tags: ['释然', '风', '江边'],
    author: '桥上客',
    date: '04/30 辰时',
    astro: { type: 'F8V', mag: '3.4', dist: '276' },
  },
]

/** 情感球体尺寸：按值映射 40~66px（参考星星 orbSize 映射区间） */
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
  /**
   * 【设计预览模式：强制返回 MOCK，不依赖真实数据】
   * 用户已明确：禁止接数据，先把前端设计做好，信息充实。
   * 因此这里直接使用 MOCK_BELONGINGS（8 颗跨星座星），保证光谱/星座/标签/星图
   * 全部有足够数据呈现设计效果。
   * 将来接入真实数据时，恢复下面注释掉的真实数据聚合逻辑即可。
   */
  return MOCK_BELONGINGS.map(x => ({ ...x }))

  // —— 真实数据逻辑（暂不启用） ——
  // const map = new Map<number, number>()
  // for (const s of props.stories ?? []) {
  //   const ids: number[] = []
  //   if (s.catalogStarId != null) ids.push(s.catalogStarId)
  //   if (Array.isArray(s.catalogStarIds)) ids.push(...s.catalogStarIds)
  //   for (const id of Array.from(new Set(ids))) {
  //     map.set(id, (map.get(id) ?? 0) + 1)
  //   }
  // }
  // if (map.size > 0) {
  //   return Array.from(map.entries())
  //     .map(([id, count]) => {
  //       const info = getStarNameInfo(id)
  //       return {
  //         id,
  //         name: info?.name ?? `星 ${id}`,
  //         con: info?.con ?? '',
  //         color: info?.color ?? '#86a8ff',
  //         count,
  //         ra: info?.ra ?? -1,
  //         dec: info?.dec ?? 0,
  //       }
  //     })
  //     .sort((a, b) => b.count - a.count)
  //     .slice(0, 12)
  // }
  // return MOCK_BELONGINGS.map(x => ({ ...x }))
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
type HeroStar = { x:number; y:number; r:number; fill:string; gid:'Gold'|'Purple'|'Blue'|'Green'; label?:string }
const heroStars: HeroStar[] = [
  // Top 3 大心事（带时间标签）
  { x: 58,  y: 150, r: 4.9, fill: '#ffd98a', gid: 'Gold',   label: '20:31' }, // 雨夜寄北 · 思念浓（中部偏下）
  { x: 150, y: 52,  r: 4.6, fill: '#caa7ff', gid: 'Purple', label: '01:12' }, // 凌晨四点 · 柔软伤感（上部）
  { x: 226, y: 130, r: 4.2, fill: '#86a8ff', gid: 'Blue',   label: '03:04' }, // 江边走走 · 平静（中部）
  // 其余 5 颗
  { x: 100, y: 110, r: 3.0, fill: '#ffd98a', gid: 'Gold' },
  { x: 128, y: 170, r: 3.2, fill: '#ffb48a', gid: 'Gold' },
  { x: 182, y: 92,  r: 2.9, fill: '#9ae6b4', gid: 'Green'},
  { x: 252, y: 64,  r: 3.4, fill: '#ffd98a', gid: 'Gold' },
  { x: 288, y: 148, r: 3.0, fill: '#caa7ff', gid: 'Purple'},
]

/**
 * 合集统计数据（全部可以从 props.stories 真实提取，绝非假数据）
 *  这里先按 {{ storyCount }}=4 的 demo 填充占位
 *  后续接入时替换为 computed 真实计算即可
 */
const heroStats = [
  { k: '心事总数', v: props.storyCount ?? 4, sub: '则', color: '#ffd98a' },
  { k: '累计共鸣', v: (props.resonanceTotal ?? 237), sub: '次', color: '#caa7ff' },
  { k: '平均共鸣', v: Math.round((props.resonanceTotal ?? 237) / Math.max(1, props.storyCount ?? 4)), sub: '则心事', color: '#86a8ff' },
  { k: '投递跨度', v: '4 小时 34 分', sub: '20:31 ~ 01:05', color: undefined },
  { k: '情绪倾向', v: '柔软思念', sub: '暖色占比 58%', color: '#ffb48a' },
  { k: '最多时段', v: '01:00 ~ 02:00', sub: '占比 37.5%', color: '#9ae6b4' },
]

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

/* ═══════════════════════════════════════════════════════════
   【旧数据兼容】下方画像/天官书 section 仍在使用 nightSky / skyFlecks
   暂未重构，保留原定义避免渲染崩溃；下一轮重构时同步替换
   ═══════════════════════════════════════════════════════════ */
/** 合集 = 你自己的「那一夜」整片夜空 */
const nightSky = {
  name: '夜雨孤灯 · 那一夜',
  season: '甲辰年 · 春分后第三夜',
  timeSpan: '子初 22:47 ~ 卯初 05:21',
  phase: '残月 · 蛾眉',
  moonIllum: '22%',
  moonAge: '26.4 日龄',
  term: '春分后三',
  ecliptic: 'λ 3°12′',
  termDeg: 3 + 12 / 60 * 15,
  meteo: [
    { k: '时跨', v: '子~卯 · 4 时', color: '#ffd98a' },
    { k: '夜温', v: '11.6℃ · 凉润', color: '#86a8ff' },
    { k: '风向', v: '西北风 二级', color: '#caa7ff' },
    { k: '能见度', v: '薄云 · 7.2km', color: '#95f0c0' },
    { k: '云量', v: '散云 · 4/8 量', color: '#ff8b7d' },
    { k: '体感', v: '夜寒 · 衣稍薄', color: undefined },
  ],
  hourDots: [
    { pos: 10,  size: 12, color: '#ffd98a' },
    { pos: 22,  size: 8,  color: '#ffd98a' },
    { pos: 38,  size: 10, color: '#caa7ff' },
    { pos: 52,  size: 5,  color: '#95f0c0' },
    { pos: 66,  size: 7,  color: '#caa7ff' },
    { pos: 78,  size: 6,  color: '#95f0c0' },
    { pos: 88,  size: 4,  color: '#86a8ff' },
  ],
}

/** 8 则心事 = 那一夜里的 8 道光斑 */
const skyFlecks: { x: number; y: number; r: number; color: string; glowId: 'Gold' | 'Purple' | 'Green' | 'Blue'; tag?: string }[] = [
  { x: 68,  y: 140, r: 4.8, color: '#ffd98a', glowId: 'Gold',   tag: '子初三刻' },
  { x: 188, y: 78,  r: 4.5, color: '#caa7ff', glowId: 'Purple', tag: '丑正二刻' },
  { x: 152, y: 54,  r: 4.2, color: '#95f0c0', glowId: 'Green',  tag: '寅初一刻' },
  { x: 106, y: 102, r: 3.0, color: '#ffd98a', glowId: 'Gold'   },
  { x: 86,  y: 164, r: 3.4, color: '#ff8b7d', glowId: 'Blue'   },
  { x: 214, y: 118, r: 2.8, color: '#86a8ff', glowId: 'Blue'   },
  { x: 238, y: 158, r: 3.6, color: '#ffd98a', glowId: 'Gold'   },
  { x: 224, y: 188, r: 3.2, color: '#95f0c0', glowId: 'Green'  },
]

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

const hourly = [2, 1, 1, 0, 0, 1, 3, 5, 4, 3, 2, 2, 4, 3, 2, 1, 2, 3, 4, 6, 9, 12, 8, 5]
const peakHour = 22
const lowHour = 4
const peakText = '子时雨最盛，心事也最稠。你总在别人入睡后才点亮自己那盏灯，把白天没说完的话留给夜雨。'
const lowText = '卯时天将明，是这卷星笺最安静的时辰。或许醒来之后，有些情绪就随晨光散了。'

const trajectory = [
  { emotion: '思念', color: '#ffd98a', date: '03/12', title: '雨夜寄北', snippet: '把没寄出的话折成纸船，放进窗外的雨里。' },
  { emotion: '孤独', color: '#caa7ff', date: '03/18', title: '一个人的地铁', snippet: '末班车空荡荡，影子比人先到站。' },
  { emotion: '思念', color: '#ffd98a', date: '03/25', title: '旧照片', snippet: '翻到那张合影，才发现你笑得比我记得的还要年轻。' },
  { emotion: '释然', color: '#95f0c0', date: '04/02', title: '江边走走', snippet: '风把帽子吹进水里，我居然笑了出来。' },
  { emotion: '孤独', color: '#caa7ff', date: '04/09', title: '凌晨四点', snippet: '整座城市都睡了，只有我和一盏台灯还醒着。' },
  { emotion: '希望', color: '#86a8ff', date: '04/15', title: '阳台的种子', snippet: '埋下去第十天，今天早上冒了一点绿。' },
  { emotion: '思念', color: '#ffd98a', date: '04/22', title: '故乡的槐花', snippet: '又到开花的季节，只是树下的人不在了。' },
  { emotion: '释然', color: '#95f0c0', date: '04/30', title: '合上这一卷', snippet: '把散落的纸页收好，灯灭了，雨也停了。' },
]

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
    .map(s => ({
      id: s.id,
      title: s.title || '未命名故事',
      summary: storySummary(s.content),
      resonance: s.resonanceCount ?? 0,
    }))
  if (real.length >= 3) return real
  // 不足 3 则用 mock 补足
  const mock = [
    { id: -1, title: '雨夜寄北', summary: '把没寄出的话折成纸船，放进窗外的雨里。', resonance: 42 },
    { id: -2, title: '凌晨四点', summary: '整座城市都睡了，只有我和一盏台灯还醒着。', resonance: 35 },
    { id: -3, title: '故乡的槐花', summary: '又到开花的季节，只是树下的人不在了。', resonance: 28 },
  ]
  return [...real, ...mock.slice(real.length)].slice(0, 3)
})

function storySummary(content: string): string {
  const plain = (content || '').replace(/[#*`>\-_~]/g, '').replace(/\s+/g, ' ').trim()
  return plain.length > 36 ? plain.slice(0, 36) + '…' : plain
}

const hourSum = computed(() => Math.max(1, hourly.reduce((a, b) => a + b, 0)))
const peakPct = computed(() => Math.max(1, Math.round(hourly[peakHour] / hourSum.value * 100)))
const lowPct = computed(() => Math.max(0.1, Math.round(hourly[lowHour] / hourSum.value * 100 * 10) / 10))

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
  gap: 0;  /* 分隔符改用星座连线 ::before 代替 */
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

/* 【星空绑定】板块间分隔符：星座连线 SVG（5颗星+虚连线，只显示在非首元素） */
.ca-wrap > * + * {
  position: relative;
  margin-top: 22px;
}
.ca-wrap > * + *::before {
  content: '';
  position: absolute;
  left: 12%;
  right: 12%;
  top: -16px;
  height: 12px;
  pointer-events: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 12' preserveAspectRatio='none'>\
    <!-- 5颗星沿水平曲线分布 -->\
    <defs>\
      <radialGradient id='star1' cx='50%25' cy='50%25' r='50%25'><stop offset='0%25' stop-color='%23ffd98a' stop-opacity='1'/><stop offset='100%25' stop-color='%23ffd98a' stop-opacity='0'/></radialGradient>\
      <radialGradient id='star2' cx='50%25' cy='50%25' r='50%25'><stop offset='0%25' stop-color='%23caa7ff' stop-opacity='1'/><stop offset='100%25' stop-color='%23caa7ff' stop-opacity='0'/></radialGradient>\
      <radialGradient id='star3' cx='50%25' cy='50%25' r='50%25'><stop offset='0%25' stop-color='%2395f0c0' stop-opacity='1'/><stop offset='100%25' stop-color='%2395f0c0' stop-opacity='0'/></radialGradient>\
      <radialGradient id='star4' cx='50%25' cy='50%25' r='50%25'><stop offset='0%25' stop-color='%2386a8ff' stop-opacity='1'/><stop offset='100%25' stop-color='%2386a8ff' stop-opacity='0'/></radialGradient>\
      <radialGradient id='star5' cx='50%25' cy='50%25' r='50%25'><stop offset='0%25' stop-color='%23ff8b7d' stop-opacity='1'/><stop offset='100%25' stop-color='%23ff8b7d' stop-opacity='0'/></radialGradient>\
    </defs>\
    <!-- 星座连线（贝塞尔曲线，起伏穿过5星 -->\
    <path d='M 20 8 C 80 3, 160 10, 200 5 S 320 9, 380 6' fill='none' stroke='rgba(255,217,138,0.38)' stroke-width='0.8' stroke-dasharray='2.5 2' stroke-linecap='round'/>\
    <!-- 星 1（金星色 -->\
    <circle cx='20' cy='8' r='2.2' fill='%23ffd98a'/>\
    <circle cx='20' cy='8' r='4.5' fill='url(%23star1)' opacity='0.8'/>\
    <!-- 星 2（木紫色 -->\
    <circle cx='110' cy='4' r='1.7' fill='%23caa7ff'/>\
    <circle cx='110' cy='4' r='3.6' fill='url(%23star2)' opacity='0.7'/>\
    <!-- 星 3（中间绿主星 -->\
    <circle cx='200' cy='5' r='2.8' fill='%2395f0c0'/>\
    <circle cx='200' cy='5' r='5.6' fill='url(%23star3)' opacity='0.85'/>\
    <!-- 星 4（蓝色 -->\
    <circle cx='290' cy='9' r='1.5' fill='%2386a8ff'/>\
    <circle cx='290' cy='9' r='3.2' fill='url(%23star4)' opacity='0.7'/>\
    <!-- 星 5（珊瑚色末星 -->\
    <circle cx='380' cy='6' r='2' fill='%23ff8b7d'/>\
    <circle cx='380' cy='6' r='4.2' fill='url(%23star5)' opacity='0.75'/>\
  </svg>");
  background-repeat: no-repeat;
  background-position: center;
  background-size: 100% 100%;
  opacity: 0.92;
  z-index: 0;
}
/* 双栏 ca-duo 内部的两个小 section 不要额外显示分隔符 */
.ca-duo > section::before { display: none; }
.ca-duo > section { margin-top: 0; }
.ca-duo { margin-top: 22px; }

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

/* ===== 【那一夜·五大气象维度条】用户说"去了很丑"，加回到夜观手记右栏底部 ===== */
.ca-pt-meteo-five {
  margin-top: 4px;
  padding: 10px 12px;
  background:
    linear-gradient(120deg, rgba(134,168,255,0.045), rgba(202,167,255,0.04) 50%, rgba(255,217,138,0.05)),
    rgba(0,0,0,0.2);
  border: 1px solid rgba(134,168,255,0.1);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ca-pt-meteo-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.66rem;
  font-weight: 600;
  color: rgba(255,255,255,0.72);
  letter-spacing: 0.05em;
  padding-bottom: 5px;
  border-bottom: 1px dashed rgba(255,255,255,0.06);
}
.ca-pt-meteo-title svg { color: #86a8ff; opacity: 0.9; }
.ca-pt-meteo-bars {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.ca-pt-meteo-row {
  display: grid;
  grid-template-columns: 28px 1fr 58px;
  align-items: center;
  gap: 8px;
}
.ca-pt-meteo-k {
  font-size: 0.64rem;
  font-weight: 700;
  color: var(--mc, #86a8ff);
  letter-spacing: 0.08em;
  font-family: "Inter", "PingFang SC", sans-serif;
}
.ca-pt-meteo-track {
  position: relative;
  height: 6px;
  background: rgba(255,255,255,0.035);
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.04);
}
.ca-pt-meteo-fill {
  height: 100%;
  border-radius: 20px;
  opacity: 0.92;
  transition: width 0.4s ease;
}
.ca-pt-meteo-en {
  font-size: 0.52rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: rgba(220,220,240,0.4);
  font-family: "SF Mono", "JetBrains Mono", monospace;
  text-align: right;
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
.ca-emo-nl-label {
  background: linear-gradient(90deg, rgba(134,168,255,0.15), rgba(255,217,138,0.12));
  color: rgba(255,255,255,0.7);
  border-color: rgba(134,168,255,0.18);
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
}
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
/* 【星空绑定】主序阶段标签（情绪球体右下角浮层） */
.ca-emo-ms-label {
  position: absolute;
  left: -4px;
  top: -4px;
  font-size: 0.48rem;
  font-family: 'Courier New', monospace;
  font-weight: 700;
  color: rgba(255,255,255,0.9);
  background: rgba(0,0,0,0.45);
  padding: 1px 3.5px;
  border-radius: 3px;
  letter-spacing: 0.06em;
  border: 1px solid rgba(255,217,138,0.38);
  backdrop-filter: blur(2px);
  z-index: 2;
  white-space: nowrap;
  opacity: 0.92;
}

/* 删除旧的未用 class */
.ca-emo-list, .ca-emo-item, .ca-emo-dot, .ca-emo-item-name, .ca-emo-item-desc, .ca-emo-item-val { display: none; }

/* ═══ 2.5 心事摘录（ca-quote，全宽卡片，参考 AIRadarWordcloud quote-list） ═══ */
.ca-q-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.ca-q-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.ca-q-item {
  display: grid;
  grid-template-columns: 26px 48px 1fr;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 7px;
  background: rgba(255,255,255,0.016);
  border: 1px solid rgba(255,255,255,0.035);
  transition: background 0.15s, border-color 0.15s, transform 0.15s;
}
.ca-q-item:hover {
  background: rgba(255,217,138,0.04);
  border-color: rgba(255,217,138,0.12);
  transform: translateY(-1px);
}
/* 【星空绑定】αβγ 亮星徽章（第一列） */
.ca-q-rank {
  align-self: flex-start;
  justify-self: center;
  margin-top: 2px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, var(--rk, #ffd98a) 0%, rgba(0,0,0,0.35) 100%);
  border: 1px solid var(--rk, #ffd98a);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  color: #0a0a18;
  text-shadow: 0 0 3px rgba(255,255,255,0.35);
  box-shadow:
    0 0 6px var(--rk, #ffd98a)66,
    inset 0 0 4px rgba(255,255,255,0.25);
  z-index: 1;
}
/* 【天空本色】天窗片段：左上圆形徽章 → 改成「时辰贴纸」（横椭圆微贴纸风） */
.ca-q-sticker {
  width: auto;
  height: auto;
  min-width: 48px;
  padding: 3px 7px;
  border-radius: 8px;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--c) 22%, rgba(11,13,42,0.9)), rgba(11,13,42,0.92));
  border: 1px solid color-mix(in srgb, var(--c) 32%, transparent);
  color: color-mix(in srgb, var(--c) 95%, #fff);
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 0.56rem;
  letter-spacing: 0.05em;
  font-weight: 500;
  justify-content: center;
  align-items: center;
  display: flex;
  box-shadow:
    0 0 6px color-mix(in srgb, var(--c) 22%, transparent),
    inset 0 1px 0 rgba(255,255,255,0.06);
  text-shadow: 0 0 2px rgba(0,0,0,0.5);
  margin-top: 0;
}
.ca-q-sticker i {
  font-style: normal;
  font-family: inherit;
  color: inherit;
}
/* 【天空本色】天窗片段：左侧插画 → 套一层「夜色小窗」（方形窗框+内部天色） */
.ca-q-skywindow {
  position: relative;
  align-self: center;
  width: 54px;
  height: 54px;
  flex-shrink: 0;
  padding: 3px;
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(134,168,255,0.35), rgba(202,167,255,0.3)),
    linear-gradient(180deg, #0b0d2a, #1f2046);
  border: 1px solid rgba(134,168,255,0.22);
  box-shadow:
    inset 0 0 6px rgba(11,13,42,0.8),
    0 0 8px rgba(134,168,255,0.1);
}
/* 夜色窗内嵌 svg 插画 */
.ca-q-skywindow .ca-q-illus {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 5px;
  background: linear-gradient(180deg, rgba(11,13,42,0.6), rgba(31,32,70,0.5));
  opacity: 1;
}
/* 夜色窗的 4 角窗棂光斑（残灯/星） */
.ca-q-sw-corner {
  position: absolute;
  width: 1.6px;
  height: 1.6px;
  background: rgba(255,217,138,0.85);
  border-radius: 50%;
  box-shadow: 0 0 2px rgba(255,217,138,0.7);
  pointer-events: none;
}
.ca-q-sw-corner.tl { top: 1px;   left: 1px; }
.ca-q-sw-corner.tr { top: 1px;   right: 1px; }
.ca-q-sw-corner.bl { bottom: 1px; left: 1px; background: rgba(134,168,255,0.8); box-shadow: 0 0 2px rgba(134,168,255,0.65); }
.ca-q-sw-corner.br { bottom: 1px; right: 1px; background: rgba(202,167,255,0.8); box-shadow: 0 0 2px rgba(202,167,255,0.65); }
/* 天色版：头行（夜名+夜属性）字体更楷体更夜色 */
.ca-q-night-head .ca-q-star-name {
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
}
/* 希腊字母（α/β/γ）→ 天色：时辰前缀（子初三刻） */
.ca-q-sky-greek {
  font-style: normal;
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 0.5px 4px 1px;
  margin-right: 2px;
  background: color-mix(in srgb, var(--c) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 28%, transparent);
  border-radius: 6px;
  letter-spacing: 0.04em;
}
/* 天色：属性行（相/温/云） → 改字体夜色楷体感（非等宽） */
.ca-q-night-astro {
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
  color: rgba(255,255,255,0.38);
  letter-spacing: 0.04em;
}
.ca-q-night-astro span i {
  font-style: normal;
  font-family: inherit;
  letter-spacing: 0.06em;
  margin-right: 2px;
}
.ca-q-illus {
  width: 48px;
  height: 48px;
  align-self: center;
  opacity: 0.95;
  flex-shrink: 0;
  position: relative;
}
.ca-q-body-inner { position: relative; padding: 0; }
/* 【星空绑定】亮星星名 + 天文参数行（头部） */
.ca-q-star-head {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 4px;
  padding-bottom: 3px;
  border-bottom: 1px dashed rgba(255,255,255,0.06);
}
.ca-q-star-name {
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 0.74rem;
  font-weight: 700;
  color: rgba(255,255,255,0.86);
  letter-spacing: 0.05em;
}
.ca-q-star-astro {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.54rem;
  font-family: 'Courier New', monospace;
  color: rgba(255,255,255,0.42);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.ca-q-star-astro-item {
  display: flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
}
.ca-q-star-astro-k {
  color: rgba(255,255,255,0.28);
  letter-spacing: 0.04em;
  font-size: 0.5rem;
}
.ca-q-mark {
  font-size: 1.6rem;
  font-weight: 700;
  line-height: 0.5;
  opacity: 0.55;
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
  display: block;
  margin-bottom: 2px;
}
.ca-q-text {
  font-size: 0.76rem;
  line-height: 1.75;
  color: rgba(255,255,255,0.65);
  margin: 2px 0 6px;
  font-style: italic;
}
.ca-q-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 0.56rem;
  color: rgba(255,255,255,0.28);
}
.ca-q-tag {
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(255,255,255,0.03);
  border: 0.5px solid rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.45);
  letter-spacing: 0.02em;
}
.ca-q-spacer { flex: 1; }
.ca-q-author { color: rgba(255,255,255,0.4); font-weight: 500; }
.ca-q-date { color: rgba(255,255,255,0.24); }

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
/* 左里面的唯一元素：【黑色星空板块】 height:100% —— 跟随右内容高度响应式变化！ */
.ca-h-left-block .ca-starmap-wrap {
  height: 100%;
  /* 保留本体深蓝夜空底+细边框（这就是用户说的"黑色板块"，不是嵌套框，是本体） */
  border-color: rgba(134,168,255,0.08);
  background:
    radial-gradient(ellipse at 50% 30%, rgba(202,167,255,0.045), transparent 72%),
    rgba(10,12,35,0.55);
  border-radius: 7px;
  padding: 10px 8px 8px;
}
/* 左黑块里的星图SVG：aspect-ratio保持星图比例不变形，上下留夜空黑底 */
.ca-h-left-block .ca-starmap-svg {
  aspect-ratio: 420 / 300;
  /* 不加硬min-height，让SVG根据宽度自适应，黑块上下自然留夜空底 */
  width: 100%;
  height: auto;
  margin: 0 auto;
  display: block;
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
}
@media (max-width: 540px) {
  .ca-h-stats { grid-template-columns: 1fr 1fr; }
  .ca-h-ss-quad { grid-template-columns: 1fr 1fr; }
  .ca-et-svg { min-height: 180px; }
  .ca-h-left-block .ca-starmap-svg { aspect-ratio: 420 / 340; min-height: 150px; }
}
</style>
