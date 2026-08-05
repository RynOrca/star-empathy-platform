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

    <!-- ═══ 0.5. 【星空绑定】星座迷你星图（合集=一个自定义星座：8则心事=8颗星，按时间顺序连成星座图案）═══ -->
    <section class="ca-card ca-constellation">
      <div class="ca-card-head">
        <component :is="Orbit" :size="12" class="ca-ch-icon ca-ch-purple" />
        <span class="ca-ch-title">你的私人星座</span>
        <span class="ca-ch-count">{{ constellation.name }} · {{ constellation.stars.length }} 主星 · {{ constellation.ra }}</span>
      </div>
      <div class="ca-constellation-body">
        <!-- 左：星座星图 SVG（8 颗星按时间顺序连线 → 自定义星座图案） -->
        <div class="ca-cs-map">
          <!-- 背景星点 -->
          <svg viewBox="0 0 280 220" class="ca-cs-svg">
            <!-- 背景深空星（20颗随机小点） -->
            <circle v-for="(s, i) in deepSpaceStars" :key="'ds'+i"
              :cx="s.x" :cy="s.y" :r="s.r" fill="#fff" :opacity="s.opacity" />
            <!-- 赤道/赤纬参考线（极淡） -->
            <ellipse cx="140" cy="110" rx="125" ry="18" fill="none"
              stroke="rgba(202,167,255,0.08)" stroke-width="0.6" stroke-dasharray="2 4" />
            <ellipse cx="140" cy="110" rx="100" ry="58" fill="none"
              stroke="rgba(202,167,255,0.06)" stroke-width="0.5" stroke-dasharray="2 4" />
            <!-- 星座连线（按时间顺序把8颗星串成你的"私人星座"图案） -->
            <path :d="constellationLinePath" fill="none"
              stroke="rgba(255,217,138,0.55)" stroke-width="0.9" stroke-linecap="round"
              stroke-dasharray="3 2.5" style="filter: drop-shadow(0 0 3px rgba(255,217,138,0.25))" />
            <!-- 8 颗主星：大小=共鸣数(星等)，颜色=情绪 -->
            <g v-for="(star, i) in constellation.stars" :key="'st'+i">
              <!-- 光晕 -->
              <circle :cx="star.x" :cy="star.y" :r="star.size * 2.2" fill="none"
                :stroke="star.color + '33'" stroke-width="1" />
              <circle :cx="star.x" :cy="star.y" :r="star.size * 1.4"
                :fill="star.color" opacity="0.12" />
              <!-- 星本体 -->
              <circle :cx="star.x" :cy="star.y" :r="star.size"
                :fill="star.color" :stroke="star.color" stroke-width="0.4"
                style="filter: drop-shadow(0 0 2px currentColor)" />
              <!-- 四角星芒（仅亮星 α/β/γ） -->
              <g v-if="star.rank" :transform="`translate(${star.x}, ${star.y})`">
                <path d="M0,-16 L1.2,-3 L16,-1.2 L3,1.2 L1.3,16 L-1.3,3 L-16,1.2 L-3,-1.2 Z"
                  :fill="star.color" opacity="0.2" />
              </g>
              <!-- α/β/γ 编号徽章（亮星） -->
              <g v-if="star.rank" :transform="`translate(${star.x}, ${star.y})`">
                <text :x="star.size + 3" :y="-(star.size + 1)"
                  font-size="8" font-weight="700"
                  :fill="star.color" opacity="0.95"
                  style="font-family: Georgia, 'Times New Roman', serif; font-style: italic">
                  {{ star.rank }}
                </text>
              </g>
              <!-- 星名（悬停显示，但这里轻量地把 α 星名标上） -->
              <text v-if="star.rank === 'α'"
                :x="star.x" :y="star.y + star.size + 10"
                text-anchor="middle"
                font-size="6.5" fill="rgba(255,255,255,0.7)"
                style="letter-spacing: 0.08em">
                {{ star.name }}
              </text>
            </g>
          </svg>
        </div>
        <!-- 右：星图参数面板 -->
        <div class="ca-cs-panel">
          <div class="ca-cs-row">
            <span class="ca-cs-k">星座名</span>
            <span class="ca-cs-v ca-cs-v-gold">{{ constellation.name }}</span>
          </div>
          <div class="ca-cs-row">
            <span class="ca-cs-k">汉名</span>
            <span class="ca-cs-v">{{ constellation.hanName }}</span>
          </div>
          <div class="ca-cs-grid">
            <div class="ca-cs-cell">
              <div class="ca-cs-cell-k">赤经 RA</div>
              <div class="ca-cs-cell-v">{{ constellation.ra }}</div>
            </div>
            <div class="ca-cs-cell">
              <div class="ca-cs-cell-k">赤纬 Dec</div>
              <div class="ca-cs-cell-v">{{ constellation.dec }}</div>
            </div>
            <div class="ca-cs-cell">
              <div class="ca-cs-cell-k">平均星等</div>
              <div class="ca-cs-cell-v">{{ constellation.avgMag }}<span class="ca-cs-unit">m</span></div>
            </div>
            <div class="ca-cs-cell">
              <div class="ca-cs-cell-k">距离</div>
              <div class="ca-cs-cell-v">{{ constellation.distance }}<span class="ca-cs-unit">ly</span></div>
            </div>
          </div>
          <!-- 亮星名录（Top 3 = α/β/γ） -->
          <div class="ca-cs-brights">
            <div class="ca-cs-b-title">亮星名录</div>
            <div class="ca-cs-b-list">
              <div class="ca-cs-b-item" v-for="b in brightStars" :key="b.rank">
                <span class="ca-cs-b-rank" :style="{ color: b.color }">{{ b.rank }}</span>
                <span class="ca-cs-b-name">{{ b.name }}</span>
                <span class="ca-cs-b-spacer"></span>
                <span class="ca-cs-b-meta">{{ b.mag }}m · {{ b.emotion }}</span>
              </div>
            </div>
          </div>
          <!-- 底部注释 -->
          <div class="ca-cs-foot">
            <component :is="Info" :size="9" />
            <span>星图为虚拟自定义星座：按心事时间顺序串联，星等=共鸣数，星色=情绪</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ 1. 星座肖像（=原合集画像，升级星空绑定：笺卷卡加天文参数、关键词→亮星、性格光谱→星座五曜）═══ -->
    <section class="ca-card ca-persona">
      <div class="ca-card-head">
        <component :is="MoonStar" :size="12" class="ca-ch-icon ca-ch-gold" />
        <span class="ca-ch-title">星座肖像</span>
        <span class="ca-ch-count">星格凝意 · {{ persona.dimensions.length }} 五曜 · {{ storyCount }} 主星</span>
      </div>
      <div class="ca-persona-body">
        <!-- 左：笺卷小卡（加入天文参数条：赤经/赤纬/视星等/距离） -->
        <div class="ca-scroll-card">
          <div class="sc-corner sc-tl"></div>
          <div class="sc-corner sc-tr"></div>
          <div class="sc-corner sc-bl"></div>
          <div class="sc-corner sc-br"></div>

          <div class="sc-top">
            <div class="sc-collection">{{ persona.constellation }}</div>
            <div class="sc-name-han">{{ persona.hanName }}</div>
          </div>

          <!-- SVG 笺卷插画：卷起来的星笺 + 月亮 + 散落星点 -->
          <svg viewBox="0 0 120 120" class="sc-svg">
            <circle v-for="(s, i) in bgStars" :key="'ps'+i"
              :cx="s.x" :cy="s.y" :r="s.r" fill="#fff" :opacity="s.opacity" />
            <!-- 月亮 -->
            <path d="M82 34 a18 18 0 1 0 0 24 a14 14 0 1 1 0 -24z"
              fill="#ffd98a" opacity="0.88" />
            <!-- 卷轴主体 -->
            <rect x="16" y="58" width="88" height="42" rx="3"
              fill="rgba(30,24,52,0.85)" stroke="rgba(255,217,138,0.35)" stroke-width="0.8" />
            <!-- 卷轴上下轴 -->
            <rect x="12" y="54" width="96" height="6" rx="3" fill="rgba(202,167,255,0.25)" stroke="rgba(202,167,255,0.45)" stroke-width="0.6" />
            <rect x="12" y="98" width="96" height="6" rx="3" fill="rgba(202,167,255,0.25)" stroke="rgba(202,167,255,0.45)" stroke-width="0.6" />
            <!-- 卷轴内容：三行短横线模拟文字 -->
            <rect x="24" y="68" width="54" height="1.6" rx="0.8" fill="rgba(255,217,138,0.35)" />
            <rect x="24" y="74" width="72" height="1.6" rx="0.8" fill="rgba(255,217,138,0.28)" />
            <rect x="24" y="80" width="42" height="1.6" rx="0.8" fill="rgba(255,217,138,0.22)" />
            <rect x="24" y="86" width="62" height="1.6" rx="0.8" fill="rgba(255,217,138,0.18)" />
            <!-- 卷轴印章 -->
            <rect x="88" y="82" width="10" height="10" rx="1.5" fill="rgba(255,139,125,0.35)" stroke="rgba(255,139,125,0.55)" stroke-width="0.6" />
            <text x="93" y="90" text-anchor="middle" font-size="5" fill="rgba(255,255,255,0.55)" font-weight="700">笺</text>
            <!-- 连线星 -->
            <path d="M10 22 L42 46" stroke="rgba(255,255,255,0.5)" stroke-width="0.8" stroke-linecap="round" />
            <circle cx="42" cy="46" r="1.4" fill="#fff" />
          </svg>

          <!-- 【新增】天文参数条（小卡中部：赤经/赤纬/视星等/光年） -->
          <div class="sc-astro">
            <div class="sc-astro-row">
              <span class="sc-astro-k">RA</span>
              <span class="sc-astro-v">{{ constellation.ra.replace('RA ', '') }}</span>
            </div>
            <div class="sc-astro-row">
              <span class="sc-astro-k">Dec</span>
              <span class="sc-astro-v">{{ constellation.dec.replace('Dec ', '') }}</span>
            </div>
            <div class="sc-astro-row">
              <span class="sc-astro-k">m</span>
              <span class="sc-astro-v">{{ constellation.avgMag }}</span>
            </div>
            <div class="sc-astro-row">
              <span class="sc-astro-k">ly</span>
              <span class="sc-astro-v">{{ constellation.distance }}</span>
            </div>
          </div>

          <!-- 标签：从通用标签改成「主要亮星」αβγ -->
          <div class="sc-tags sc-tags-brights">
            <span class="ca-pt-kw-bright" v-for="b in brightStars" :key="b.rank" :style="{ '--c': b.color }">
              <i class="ca-pt-kw-rank">{{ b.rank }}</i>{{ b.name }}
            </span>
          </div>
        </div>

        <!-- 右：文字解读（星区简介 + 双段 + 金句 + 关键词·亮星云 + 引导条 + 星座五曜） -->
        <div class="ca-persona-text">
          <!-- 【新增】星区简介条（天文志口吻） -->
          <div class="ca-pt-intro">
            <component :is="Orbit" :size="10" />
            <span>春夜南天第 ⅰ 星区 · 凝神静视可见 · 属「温吞思念」之格</span>
          </div>
          <p class="ca-pt-para first">
            这卷名为<span class="ca-han-hl">「{{ persona.hanName }}」</span>的星笺，收着
            <b>{{ storyCount }}</b> 主星——
            {{ persona.paragraphFirst }}
          </p>
          <p class="ca-pt-para">{{ persona.paragraphSecond }}</p>

          <!-- 金句卡片（引用块） -->
          <div class="ca-quote-card">
            <span class="ca-quote-mark">"</span>
            <span class="ca-quote-text">{{ persona.quote }}</span>
          </div>

          <!-- 【新增】关键词云 → 改名为「意象·亮星」云（主标签+亮星混合） -->
          <div class="ca-pt-keywords">
            <div class="ca-pt-kw-title">意象 · 亮星</div>
            <div class="ca-pt-kw-cloud">
              <span class="ca-pt-kw ca-pt-kw-tag" v-for="t in persona.tags" :key="t">#{{ t }}</span>
              <span class="ca-pt-kw ca-pt-kw-bright" v-for="b in brightStars" :key="'k'+b.rank" :style="{ '--c': b.color }">
                <i class="ca-pt-kw-rank">{{ b.rank }}</i>{{ b.name }}
              </span>
            </div>
          </div>

          <!-- 引导条（参考星格画像的 pt-suggest-wrap） -->
          <div class="ca-suggest-wrap">
            <span class="ca-s-tip">📜 给这卷星笺的注脚</span>
            <span class="ca-s-text">{{ persona.suggestIntro }}</span>
          </div>

          <!-- 维度条：性格光谱 → 星座五曜（金木水火土，五行星对应五维） -->
          <div class="ca-dims-card">
            <div class="ca-dims-title">
              <component :is="Orbit" :size="9" />
              <span>星座五曜</span>
              <span class="ca-dims-sub">金 · 木 · 水 · 火 · 土 — 守护星格</span>
            </div>
            <div class="ca-dims ca-dims-five">
              <div v-for="(d, i) in persona.dimensions" :key="d.left + d.right" class="ca-dim ca-dim-five">
                <div class="ca-dim-planet" :style="{ '--pc': fivePlanets[i].color }">
                  <div class="ca-dim-planet-orb" :style="{ background: fivePlanets[i].color }"></div>
                </div>
                <div class="ca-dim-main">
                  <div class="ca-dim-labels ca-dim-labels-five">
                    <div class="ca-dim-ln">
                      <span class="ca-dim-planet-name" :style="{ color: fivePlanets[i].color }">{{ fivePlanets[i].cn }}</span>
                      <span class="ca-dim-planet-en" :style="{ color: fivePlanets[i].color }">{{ fivePlanets[i].en }}</span>
                      <span :class="{ active: d.side === 'left' }">{{ d.left }}</span>
                    </div>
                    <div class="ca-dim-rn">
                      <span :class="{ active: d.side === 'right' }">{{ d.right }}</span>
                      <span class="ca-dim-pct">{{ d.percent }}%</span>
                    </div>
                  </div>
                  <div class="ca-dim-track ca-dim-track-five" :style="{ '--ptc': fivePlanets[i].color }">
                    <div class="ca-dim-fill" :style="{ width: d.percent + '%', background: fivePlanets[i].color }"></div>
                    <div class="ca-dim-knob" :style="{ left: d.percent + '%', background: fivePlanets[i].color, boxShadow: `0 0 6px ${fivePlanets[i].color}` }"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ 2. 星座星色（=原情感光谱，升级星空绑定：球阵加光谱型+赫罗图轴、洞察卡加星等/距离） + 3. 星辰归属 双栏═══ -->
    <div class="ca-duo">
      <!-- 星座星色（赫罗图风格：发光球体+光谱标签+洞察卡加天文参数+主调叙事→星座主序） -->
      <section class="ca-card ca-emotion">
        <div class="ca-card-head">
          <component :is="HeartPulse" :size="12" class="ca-ch-icon ca-ch-red" />
          <span class="ca-ch-title">星座星色</span>
          <span class="ca-ch-count">HR 图 · {{ emotions.length }} 光谱型 · {{ storyCount }} 主星</span>
        </div>
        <div class="ca-emotion-body">
          <!-- 球体展示：容器改成赫罗图(HR Diagram)风格，加X/Y轴 -->
          <div class="ca-emo-orbs ca-hr-diagram">
            <!-- Y 轴：光度 Lum (暗→亮，从下到上) -->
            <div class="ca-hr-y">
              <span class="ca-hr-y-top">Lum ↑</span>
              <span class="ca-hr-y-bot">暗</span>
            </div>
            <!-- X 轴：温度 Temp (蓝→红，从左到右) -->
            <div class="ca-hr-x">
              <span class="ca-hr-x-l">O B A F G K M →</span>
              <span class="ca-hr-x-r">Temp ↓</span>
            </div>
            <!-- 球体：加光谱型小标签 badge -->
            <span
              v-for="(e, i) in emotions"
              :key="e.name"
              class="ca-emo-orb ca-hr-orb"
              :style="{
                width: orbSize(e.value) + 'px',
                height: orbSize(e.value) + 'px',
                background: `radial-gradient(circle at 35% 30%, ${e.color}dd, ${e.color}33 70%, transparent)`,
                boxShadow: `0 0 ${10 + e.value * 16}px ${e.color}55`,
                // HR 图 X 偏移：按光谱顺序从左到右排布
                left: `calc(8% + ${i * 17}%)`,
                // HR 图 Y 偏移：值越大光度越高（越靠上）
                bottom: `calc(22% + ${e.value * 45}%)`,
              }"
              :title="`${e.name} · ${Math.round(e.value * 100)}% · ${e.desc} · 光谱 ${emotionSpectra[i].type}`"
            >
              <!-- 光谱型标签徽章（右下） -->
              <span class="ca-hr-spec-tag" :style="{ color: e.color, borderColor: e.color + '66' }">
                {{ emotionSpectra[i].type }}
              </span>
              <span class="ca-emo-orb-label">{{ e.name }}</span>
              <span class="ca-emo-orb-val">{{ Math.round(e.value * 100) }}</span>
            </span>
          </div>

          <!-- 情绪洞察卡片：加星等/光年/恒星类型参数行 -->
          <div class="ca-emo-insights">
            <div class="ca-ei-card" v-for="(ins, i) in emotionInsights" :key="i">
              <span class="ca-ei-dot" :style="{ background: ins.color, boxShadow: `0 0 5px ${ins.color}` }"></span>
              <div class="ca-ei-text">
                <div class="ca-ei-title" :style="`--c:${ins.color}`">
                  <span class="ca-ei-title-name" v-html="ins.title"></span>
                  <span class="ca-ei-pct" :style="{ color: ins.color }">{{ ins.pct }}</span>
                </div>
                <!-- 新增：天文参数行（恒星类型 / 视星等 / 光年距离） -->
                <div class="ca-ei-astro">
                  <span class="ca-ei-astro-item">
                    <i class="ca-ei-astro-k">TYPE</i>
                    <i class="ca-ei-astro-v" :style="{ color: ins.color }">{{ ins.astro.type }}</i>
                  </span>
                  <span class="ca-ei-astro-item">
                    <i class="ca-ei-astro-k">MAG</i>
                    <i class="ca-ei-astro-v">{{ ins.astro.mag }}m</i>
                  </span>
                  <span class="ca-ei-astro-item">
                    <i class="ca-ei-astro-k">DIST</i>
                    <i class="ca-ei-astro-v">{{ ins.astro.dist }}ly</i>
                  </span>
                </div>
                <div class="ca-ei-desc">{{ ins.desc }}</div>
              </div>
            </div>
          </div>

          <!-- 主调叙事：改成星座主序口吻（恒星演化类比） -->
          <div class="ca-emo-narrative ca-emo-mainseq">
            <p class="ca-emo-para">
              <span class="ca-emo-lead">{{ emotionNarrative.dominant }}</span>
              <span class="ca-emo-lead-pct">{{ emotionNarrative.dominantPct }}</span>
              {{ emotionNarrative.summary }}
            </p>
            <p class="ca-emo-para ca-emo-para-sub">
              <i class="ca-emo-ms-label">主序阶段</i>
              {{ emotionNarrative.contrast }}
            </p>
            <p class="ca-emo-para ca-emo-para-flow">
              <component :is="Orbit" :size="10" class="ca-emo-flow-icon" />
              {{ emotionNarrative.flow }}
            </p>
          </div>
        </div>
      </section>

      <!-- 星辰归属（真实地平坐标星图：alt/az + 地平线 + hover 高亮）—— 保留在双栏右栏 -->
      <section class="ca-card ca-stars">
        <div class="ca-card-head">
          <component :is="Orbit" :size="12" class="ca-ch-icon ca-ch-blue" />
          <span class="ca-ch-title">星辰归属</span>
          <span class="ca-ch-count">{{ starBelongings.length }} 星 · {{ starBelongTotal }} 篇</span>
        </div>
        <div class="ca-starmap-wrap">
          <svg v-if="starMapData.stars.length > 0" :viewBox="`0 0 ${MAP_W} ${MAP_H}`" class="ca-starmap-svg" preserveAspectRatio="xMidYMid meet">
            <!-- 天空背景渐变 -->
            <defs>
              <linearGradient :id="'skyGrad'" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="rgba(10,10,30,0.15)" />
                <stop offset="100%" stop-color="rgba(10,10,30,0)" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" :width="MAP_W" :height="HORIZON_Y" fill="url(#skyGrad)" />

            <!-- 背景星点（仅天空区域） -->
            <circle v-for="(bg, i) in bgStars" :key="'bg'+i" :cx="bg.x" :cy="bg.y" :r="bg.r" fill="#fff" :opacity="bg.opacity" />

            <!-- 地平线 -->
            <line :x1="0" :y1="HORIZON_Y" :x2="MAP_W" :y2="HORIZON_Y" stroke="rgba(134,168,255,0.25)" stroke-width="0.5" stroke-dasharray="4 3" />
            <!-- 地平线下方暗色遮罩 -->
            <rect x="0" :y="HORIZON_Y" :width="MAP_W" :height="MAP_H - HORIZON_Y" fill="rgba(0,0,0,0.25)" />

            <!-- 罗盘方位标 -->
            <text x="14" :y="HORIZON_Y - 3" class="ca-sm-compass" fill="rgba(255,255,255,0.3)">N</text>
            <text :x="MAP_W * 0.25 - 3" :y="HORIZON_Y - 3" class="ca-sm-compass" fill="rgba(255,255,255,0.2)">E</text>
            <text :x="MAP_W * 0.5 - 3" :y="HORIZON_Y - 3" class="ca-sm-compass" fill="rgba(255,255,255,0.3)">S</text>
            <text :x="MAP_W * 0.75 - 3" :y="HORIZON_Y - 3" class="ca-sm-compass" fill="rgba(255,255,255,0.2)">W</text>
            <text :x="MAP_W - 14" :y="HORIZON_Y - 3" class="ca-sm-compass" fill="rgba(255,255,255,0.3)">N</text>
            <!-- 天顶标 -->
            <text :x="MAP_W / 2" y="8" text-anchor="middle" class="ca-sm-compass" fill="rgba(255,255,255,0.15)">天顶</text>

            <!-- 星座连线（仅地平线上） -->
            <line
              v-for="(l, i) in starMapData.lines"
              :key="'l'+i"
              :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2"
              :stroke="l.color" stroke-width="0.4" opacity="0.18" stroke-dasharray="2 2"
            />

            <!-- 主星：hover 高亮 + 防遮挡标签 -->
            <g
              v-for="s in starMapData.stars"
              :key="s.id"
              class="ca-sm-star"
              :class="{
                active: hoveredStarId === s.id,
                dimmed: hoveredStarId !== null && hoveredStarId !== s.id,
                below: !s.aboveHorizon,
              }"
              @mouseenter="hoveredStarId = s.id"
              @mouseleave="hoveredStarId = null"
            >
              <!-- 外发光晕 -->
              <circle :cx="s.x" :cy="s.y" :r="s.radius * 3" :fill="s.color" opacity="0.06" />
              <circle :cx="s.x" :cy="s.y" :r="s.radius * 1.8" :fill="s.color" opacity="0.14" />
              <!-- 主体 -->
              <circle :cx="s.x" :cy="s.y" :r="s.radius" :fill="s.color" opacity="0.9">
                <animate attributeName="opacity" :values="`0.7;1;0.7`" :dur="3 + (s.id % 3) + 's'" repeatCount="indefinite" />
              </circle>
              <!-- 高光核心 -->
              <circle :cx="s.x" :cy="s.y" :r="s.radius * 0.35" fill="#fff" opacity="0.85" />

              <!-- 默认标签：仅 top 3 星显示，交替上下避免遮挡 -->
              <template v-if="s.showLabel && hoveredStarId === null">
                <text :x="s.x" :y="s.labelY" text-anchor="middle" class="ca-sm-label" :fill="s.color">{{ s.name }}</text>
                <text :x="s.x" :y="s.labelY + (s.labelAbove ? -4 : 7)" text-anchor="middle" class="ca-sm-count">{{ s.count }}篇</text>
              </template>

              <!-- hover 时：显示完整信息浮窗 -->
              <template v-if="hoveredStarId === s.id">
                <text :x="s.x" :y="s.labelY" text-anchor="middle" class="ca-sm-label ca-sm-label-hover" :fill="s.color">{{ s.name }}</text>
                <text :x="s.x" :y="s.labelY + (s.labelAbove ? -4 : 7)" text-anchor="middle" class="ca-sm-count ca-sm-count-hover">{{ s.count }}篇 · {{ s.aboveHorizon ? '地平线上' : '地平线下' }} · alt {{ Math.round(s.alt) }}°</text>
              </template>
            </g>
          </svg>
          <div v-else class="ca-stars-empty">
            故事尚未挂上星辰
          </div>
          <!-- 图例 + 地平线统计 -->
          <div v-if="starBelongings.length > 0" class="ca-sm-legend">
            <span class="ca-sm-legend-item"><i class="ca-sm-dot"></i>大小=故事数</span>
            <span class="ca-sm-legend-item"><i class="ca-sm-dash"></i>星座连线</span>
            <span v-if="starMapData.belowHorizon > 0" class="ca-sm-legend-item ca-sm-below">{{ starMapData.aboveHorizon }}↑ / {{ starMapData.belowHorizon }}↓</span>
          </div>
        </div>
        <div class="ca-stars-insight">
          <component :is="Orbit" :size="10" class="ca-stars-flow-icon" />
          <span v-if="starBelongings.length > 0">
            心事散落于 {{ starBelongings.length }} 颗星，最密处在「{{ starBelongings[0].name }}」
          </span>
          <span v-else>等待第一则心事找到它的星辰</span>
        </div>
      </section>
    </div>

    <!-- ═══ 心事摘录 → 【星空绑定】亮星独白（全宽：左插画+αβγ亮星编号徽章+星等/光年+正文+标签）═══ -->
    <section class="ca-card ca-quote">
      <div class="ca-card-head">
        <component :is="Quote" :size="12" class="ca-ch-icon ca-ch-gold" />
        <span class="ca-ch-title">亮星独白</span>
        <span class="ca-ch-count">α β γ · {{ storyQuotes.length }} 颗亮星 · 精选心事</span>
      </div>
      <div class="ca-q-body">
        <div class="ca-q-list">
          <div class="ca-q-item" v-for="(q, i) in storyQuotes" :key="i">
            <!-- 【新增】左上 α/β/γ 亮星编号徽章（彩色发光） -->
            <span class="ca-q-rank" :style="{ '--c': q.color }"><i>{{ q.rank }}</i></span>

            <!-- 左 SVG 插画：根据 illus 渲染月亮 / 家屋 / 花枝 -->
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

            <!-- 右：正文（顶部新增亮星星名+天文参数行） -->
            <div class="ca-q-body-inner">
              <div class="ca-q-mark" :style="{ color: q.color }">"</div>
              <!-- 【新增】亮星星名+天文参数行（α 雨夜寄北 / 视星等 / 光年） -->
              <div class="ca-q-star-head">
                <span class="ca-q-star-name" :style="{ color: q.color }">
                  <i class="ca-q-star-greek" :style="{ color: q.color }">{{ q.rank }}</i>
                  {{ q.starName }}
                </span>
                <span class="ca-q-star-astro">
                  <span><i>MAG</i>{{ q.astro.mag }}m</span>
                  <span><i>DIST</i>{{ q.astro.dist }}ly</span>
                  <span><i>TYPE</i>{{ q.astro.type }}</span>
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

    <!-- ═══ 8. 观星手记（原AI总叙，星空绑定：星图总志+星轨运行+星座神话+观星者手记）═══ -->
    <section class="ca-card ca-narrative">
      <div class="ca-card-head">
        <component :is="MoonStar" :size="12" class="ca-ch-icon ca-ch-gold" />
        <span class="ca-ch-title">观星手记</span>
        <span class="ca-ch-count">星图总志 · 四星轨 · 星官注</span>
      </div>
      <div class="ca-narr-body">
        <!-- ===== 第一段：星图总志（原概览，左图标 + 标题 + 观测参数卡 + 正文） ===== -->
        <div class="ca-narr-section ca-narr-overview">
          <div class="ca-nr-head">
            <div class="ca-nr-icon ca-nr-icon-gold">
              <component :is="Orbit" :size="13" />
            </div>
            <div class="ca-nr-title-wrap">
              <div class="ca-nr-title">{{ narrative.overview.title }}</div>
              <div class="ca-nr-sub">星图总志 · {{ narrative.overview.storyCount }}星 · {{ narrative.overview.time }}</div>
            </div>
          </div>
          <!-- 【星空绑定】观测参数卡（天文观测记录风格） -->
          <div class="ca-nr-obs-card">
            <div class="ca-nr-obs-item">
              <span class="ca-nr-obs-k">赤经</span>
              <span class="ca-nr-obs-v ca-nr-obs-v-gold">RA 22h 14m</span>
            </div>
            <div class="ca-nr-obs-item">
              <span class="ca-nr-obs-k">赤纬</span>
              <span class="ca-nr-obs-v ca-nr-obs-v-purple">Dec +37°21′</span>
            </div>
            <div class="ca-nr-obs-item">
              <span class="ca-nr-obs-k">银纬</span>
              <span class="ca-nr-obs-v">b -12.4°</span>
            </div>
            <div class="ca-nr-obs-item">
              <span class="ca-nr-obs-k">星数</span>
              <span class="ca-nr-obs-v ca-nr-obs-v-gold">8 ★</span>
            </div>
            <div class="ca-nr-obs-item">
              <span class="ca-nr-obs-k">能见度</span>
              <span class="ca-nr-obs-v">V ~4.2 等</span>
            </div>
            <div class="ca-nr-obs-item">
              <span class="ca-nr-obs-k">观测地</span>
              <span class="ca-nr-obs-v">北纬 31.2° · 江边</span>
            </div>
          </div>
          <div class="ca-nr-content">{{ narrative.overview.content }}</div>
          <div class="ca-nr-tags">
            <span class="ca-nr-tag" v-for="k in narrative.overview.keywords" :key="k">#{{ k }}</span>
          </div>
        </div>

        <!-- ===== 第二段：星轨运行（原情绪弧线：4步东升/中天/西沉/入夜，带方位角/高度角参数） ===== -->
        <div class="ca-narr-section ca-narr-arc">
          <div class="ca-nr-head">
            <div class="ca-nr-icon ca-nr-icon-blue">
              <component :is="Route" :size="13" />
            </div>
            <div class="ca-nr-title-wrap">
              <div class="ca-nr-title">{{ narrative.arc.title }}</div>
              <div class="ca-nr-sub">星轨四步 · 地平坐标记录 · AZ方位角 ALT高度角</div>
            </div>
          </div>
          <!-- 【星空绑定】星轨步点图（4步，每步带天文坐标） -->
          <div class="ca-nr-arc-steps ca-nr-orb-steps">
            <div
              class="ca-nr-step ca-nr-orbit-step"
              v-for="(p, i) in narrative.arc.phases"
              :key="i"
              :style="{ '--step-color': p.color } as Record<string, string>"
            >
              <div class="ca-nr-step-dot ca-nr-orbit-dot"></div>
              <div class="ca-nr-step-body">
                <div class="ca-nr-step-name-row">
                  <div class="ca-nr-step-name">{{ p.name }}</div>
                  <!-- 天文坐标：方位角AZ / 高度角ALT -->
                  <div class="ca-nr-step-coord" v-if="p.coord">
                    <span>AZ <b>{{ p.coord.az }}</b></span>
                    <span>ALT <b>{{ p.coord.alt }}</b></span>
                  </div>
                </div>
                <div class="ca-nr-step-anchor" v-if="p.anchor">「{{ p.anchor }}」</div>
                <div class="ca-nr-step-desc">{{ p.desc }}</div>
              </div>
              <div v-if="i < narrative.arc.phases.length - 1" class="ca-nr-step-line ca-nr-orbit-line"></div>
            </div>
          </div>
          <p class="ca-nr-summary">{{ narrative.arc.summary }}</p>
        </div>

        <!-- ===== 第三段：星座神话（原独白卡，加「星官注」标签，像古代天文书注释） ===== -->
        <div class="ca-narr-monologue ca-narr-myth">
          <div class="sc-corner sc-tl"></div>
          <div class="sc-corner sc-tr"></div>
          <div class="sc-corner sc-bl"></div>
          <div class="sc-corner sc-br"></div>
          <!-- 【星空绑定】顶部星官注标签 -->
          <div class="ca-nm-myth-tag">
            <span class="ca-nm-myth-seal">星官注</span>
            <span class="ca-nm-myth-sub">《夜雨孤灯座·天官书》卷三</span>
          </div>
          <!-- 左小插画：星座连线图（提灯替换成小星图 -->
          <svg viewBox="0 0 60 60" class="ca-nm-illus">
            <circle cx="10" cy="14" r="0.8" fill="#fff" opacity="0.5" />
            <circle cx="50" cy="10" r="0.6" fill="#fff" opacity="0.4" />
            <circle cx="52" cy="46" r="0.7" fill="#fff" opacity="0.45" />
            <circle cx="14" cy="48" r="0.6" fill="#fff" opacity="0.38" />
            <!-- 星座8星简图（α/β/γ/δ/ε/ζ/η/θ 连线 -->
            <!-- α 雨夜寄北 (18,16) → β 凌晨四点 (42,20) → γ 江边走走 (48,36) → δ 阳台种子 (36,50) → ε 槐花再开 (20,46) → ζ 末班车 (10,30) → η 陌生人的话 (24,28) → θ 合上这卷 (28,22) -->
            <path d="M18,16 L42,20 L48,36 L36,50 L20,46 L10,30 L24,28 L28,22 Z"
              fill="none" stroke="rgba(255,217,138,0.45)" stroke-width="0.8"
              stroke-dasharray="2 1.5" stroke-linejoin="round" />
            <!-- α 亮星 (雨夜寄北）主星 -->
            <circle cx="18" cy="16" r="3" fill="rgba(255,217,138,0.92)">
              <animate attributeName="r" values="3;3.6;3" dur="2.8s" repeatCount="indefinite" />
            </circle>
            <circle cx="18" cy="16" r="5" fill="rgba(255,217,138,0.15)" />
            <!-- β 次亮 -->
            <circle cx="42" cy="20" r="2.4" fill="rgba(202,167,255,0.9)" />
            <circle cx="42" cy="20" r="4" fill="rgba(202,167,255,0.12)" />
            <!-- γ 第三 -->
            <circle cx="48" cy="36" r="2" fill="rgba(149,240,192,0.88)" />
            <!-- 其余 δ~θ -->
            <circle cx="36" cy="50" r="1.2" fill="rgba(255,255,255,0.7)" />
            <circle cx="20" cy="46" r="1.2" fill="rgba(255,255,255,0.7)" />
            <circle cx="10" cy="30" r="1" fill="rgba(255,255,255,0.55)" />
            <circle cx="24" cy="28" r="1" fill="rgba(255,255,255,0.6)" />
            <circle cx="28" cy="22" r="0.9" fill="rgba(255,255,255,0.5)" />
            <!-- 星名文字 -->
            <text x="13" y="12" font-size="3.2" fill="rgba(255,217,138,0.95)" font-family="Georgia,serif" font-weight="700">α</text>
            <text x="45" y="18" font-size="3" fill="rgba(202,167,255,0.9)" font-family="Georgia,serif" font-weight="700">β</text>
            <text x="50" y="34" font-size="2.8" fill="rgba(149,240,192,0.9)" font-family="Georgia,serif" font-weight="700">γ</text>
          </svg>
          <div class="ca-nm-body">
            <div class="ca-nm-mark">"</div>
            <p class="ca-nm-text">{{ narrative.monologue.text }}</p>
            <!-- 【星空绑定】星官注释行 -->
            <div class="ca-nm-myth-note">
              <span class="ca-nm-myth-note-k">星官按：</span>
              <span class="ca-nm-myth-note-v">{{ narrative.monologue.mythNote }}</span>
            </div>
            <div class="ca-nm-meta">
              <span class="ca-nm-tag">{{ narrative.monologue.tag }}</span>
              <span class="ca-nm-spacer"></span>
              <span class="ca-nm-author">{{ narrative.monologue.author }}</span>
            </div>
          </div>
        </div>

        <!-- ===== 第四段：观星者手记（原寄语条，天文学者手写笔记风格，带日期/仪器/气象） ===== -->
        <div class="ca-narr-postscript ca-narr-obs-log">
          <div class="ca-obs-header">
            <span class="ca-obs-tip">
              <component :is="Feather" :size="10" />
              {{ narrative.postscript.tag }}
            </span>
            <!-- 观测元数据：日期 / 仪器 / 气象 -->
            <div class="ca-obs-meta">
              <div class="ca-obs-meta-item">
                <span class="ca-obs-meta-k">观测日</span>
                <span class="ca-obs-meta-v">甲辰 · 春分后三日</span>
              </div>
              <div class="ca-obs-meta-item">
                <span class="ca-obs-meta-k">仪器</span>
                <span class="ca-obs-meta-v">心之所感 · 六分仪</span>
              </div>
              <div class="ca-obs-meta-item">
                <span class="ca-obs-meta-k">气象</span>
                <span class="ca-obs-meta-v">夜雨初霁 · 视宁度 良</span>
              </div>
            </div>
          </div>
          <p class="ca-ps-text ca-obs-text">{{ narrative.postscript.content }}</p>
          <!-- 签名落款：观星者 -->
          <div class="ca-obs-sign">
            <div class="ca-obs-sign-seal">观</div>
            <div class="ca-obs-sign-name">
              <span>夜雨孤灯座 · 观测记录</span>
              <span class="ca-obs-sign-date">子时 · 露结为霜</span>
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
  Feather, Info, Quote,
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

/** 星辰归属：从真实故事派生，聚合 catalogStarId/catalogStarIds → 星名+星座+颜色+故事数+方位 */
const starBelongings = computed<{ id: number; name: string; con: string; color: string; count: number; ra: number; dec: number }[]>(() => {
  const map = new Map<number, number>()
  for (const s of props.stories ?? []) {
    const ids: number[] = []
    if (s.catalogStarId != null) ids.push(s.catalogStarId)
    if (Array.isArray(s.catalogStarIds)) ids.push(...s.catalogStarIds)
    for (const id of Array.from(new Set(ids))) {
      map.set(id, (map.get(id) ?? 0) + 1)
    }
  }
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
  gap: 12px;
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

/* ═══ 0.5 星座迷你星图（合集=你的私人自定义星座：左星图+右参数面板）═══ */
.ca-constellation-body {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: 18px;
  align-items: stretch;
}
.ca-cs-map {
  background:
    radial-gradient(ellipse at 50% 40%, rgba(202, 167, 255, 0.06), transparent 70%),
    radial-gradient(ellipse at 30% 80%, rgba(255, 217, 138, 0.05), transparent 60%),
    rgba(15, 10, 35, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 10px 14px;
  position: relative;
  overflow: hidden;
}
.ca-cs-map::before {
  /* 左上角深紫色渐变晕染（模拟银河带） */
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 80% 20%, rgba(202,167,255,0.05), transparent 45%),
    radial-gradient(circle at 20% 90%, rgba(255,217,138,0.04), transparent 40%);
  pointer-events: none;
}
.ca-cs-svg {
  width: 100%;
  height: auto;
  max-height: 260px;
  position: relative;
  z-index: 1;
  display: block;
}

/* 右：星图参数面板 */
.ca-cs-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ca-cs-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.ca-cs-k {
  flex-shrink: 0;
  width: 56px;
  font-size: 0.62rem;
  color: var(--muted);
  letter-spacing: 0.08em;
}
.ca-cs-v {
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.88);
  letter-spacing: 0.02em;
}
.ca-cs-v-gold {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0.06em;
}

/* 四宫格天文参数 */
.ca-cs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid rgba(255, 255, 255, 0.045);
  border-radius: 10px;
  position: relative;
}
.ca-cs-grid::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background:
    linear-gradient(90deg, transparent 49.5%, rgba(202,167,255,0.08) 49.5%, rgba(202,167,255,0.08) 50.5%, transparent 50.5%),
    linear-gradient(0deg,  transparent 49.5%, rgba(202,167,255,0.08) 49.5%, rgba(202,167,255,0.08) 50.5%, transparent 50.5%);
  pointer-events: none;
  opacity: 0.55;
}
.ca-cs-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 2px 4px;
  position: relative;
}
.ca-cs-cell-k {
  font-size: 0.56rem;
  color: var(--muted);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.85;
}
.ca-cs-cell-v {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.88);
  font-weight: 500;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
}
.ca-cs-unit {
  font-size: 0.58rem;
  color: var(--muted);
  margin-left: 2px;
  font-weight: 400;
  letter-spacing: 0.05em;
}

/* 亮星名录 */
.ca-cs-brights {
  padding: 8px 10px;
  background: rgba(255, 217, 138, 0.025);
  border: 1px solid rgba(255, 217, 138, 0.09);
  border-radius: 10px;
}
.ca-cs-b-title {
  font-size: 0.6rem;
  color: var(--accent);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 7px;
  padding-bottom: 5px;
  border-bottom: 1px dashed rgba(255, 217, 138, 0.1);
  opacity: 0.9;
}
.ca-cs-b-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ca-cs-b-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.72rem;
}
.ca-cs-b-rank {
  width: 14px;
  font-family: Georgia, 'Times New Roman', serif;
  font-style: italic;
  font-weight: 700;
  font-size: 0.78rem;
  flex-shrink: 0;
  text-align: center;
  filter: drop-shadow(0 0 2px currentColor);
}
.ca-cs-b-name {
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 0.02em;
}
.ca-cs-b-spacer { flex: 1; }
.ca-cs-b-meta {
  font-size: 0.6rem;
  color: var(--muted);
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  opacity: 0.9;
}

/* 底部注释 */
.ca-cs-foot {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 8px;
  font-size: 0.56rem;
  line-height: 1.5;
  color: var(--muted-light);
  background: rgba(255, 255, 255, 0.015);
  border-radius: 6px;
  border: 1px dashed rgba(255, 255, 255, 0.04);
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
  font-family: "LXGW WenKai", "Noto Serif SC", serif;
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
  font-family: Georgia, 'Times New Roman', serif;
  font-style: italic;
  font-weight: 700;
  font-size: 0.68rem;
  color: var(--c);
  filter: drop-shadow(0 0 2px var(--c));
  line-height: 1;
  padding: 0 1px 0 2px;
}
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
  font-family: "LXGW WenKai", "Noto Serif SC", serif;
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
  font-family: Georgia, serif;
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
  font-family: "LXGW WenKai", "Noto Serif SC", serif;
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
  font-family: Georgia, serif;
  font-size: 0.68rem;
  font-weight: 700;
  color: #0a0a18;
  text-shadow: 0 0 3px rgba(255,255,255,0.35);
  box-shadow:
    0 0 6px var(--rk, #ffd98a)66,
    inset 0 0 4px rgba(255,255,255,0.25);
  z-index: 1;
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
  font-family: Georgia, 'Times New Roman', serif;
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
  font-family: Georgia, serif;
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
  font-family: Georgia, 'STSong', serif;
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
  font-family: Georgia, 'STSong', serif;
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
  font-family: Georgia, 'STSong', serif;
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
  font-family: Georgia, 'STSong', serif;
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
  font-family: Georgia, 'STSong', serif;
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
  font-family: 'STKaiti', 'KaiTi', Georgia, serif;
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
  font-family: Georgia, 'STSong', serif;
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
  /* 星座迷你星图：移动端改单列 */
  .ca-constellation-body { grid-template-columns: 1fr; gap: 12px; }
  .ca-cs-svg { max-height: 220px; }
  .ca-cs-grid { padding: 8px 10px; }
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
</style>
