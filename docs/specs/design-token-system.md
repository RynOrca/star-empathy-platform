# Spec: 移动端 UI 设计体系（Design Token System）

> 关联 Issue: [#77](https://github.com/RynOrca/star-empathy-platform/issues/77)
> 父 Issue: [#44](https://github.com/RynOrca/star-empathy-platform/issues/44)
> 分支: `feat/mobile-story-ui`

## Problem Statement

星语穹庭的移动端 UI 存在大量硬编码样式值（67+ 处 `rgba()` 直接写入组件），颜色、间距、圆角、字体大小没有统一体系。改一个主题色需要全局搜索替换，极易遗漏。现有 `variables.css` 定义了部分 token 但未被充分使用。这导致移动端 UI 视觉不统一、维护成本高、新功能开发周期长。

## Solution

建立一套完整的 Design Token 体系作为所有 UI 工作的基础层。所有新组件和重构组件必须引用 Token，禁止硬编码。Token 体系覆盖：颜色、间距、圆角、字体层级、阴影、动效时长/缓动、z-index 层级。

## User Stories

1. As a 前端开发者, I want 统一的颜色变量（背景分层、文字层级、强调色、语义色），so that 修改主题色只需改一个变量
2. As a 前端开发者, I want 统一的间距系统（基于 4px 网格），so that 所有组件 padding/margin 视觉一致
3. As a 前端开发者, I want 统一的圆角规格（sm/md/lg/xl/full），so that 不同层级的卡片和按钮圆角有明确规范
4. As a 前端开发者, I want 统一的字体层级（H1/H2/body/caption/overline），so that 页面信息权重清晰
5. As a 前端开发者, I want 统一的阴影层级（sm/md/lg/glow），so that 卡片和弹窗的纵深关系一致
6. As a 前端开发者, I want 统一的动效 Token（时长、缓动函数），so that 所有过渡和动画节奏一致
7. As a 前端开发者, I want 统一的 z-index 层级系统，so that 弹窗、抽屉、导航栏的层级关系明确
8. As a 移动端用户, I want 按钮点击区域至少 44x44px，so that 触控体验舒适
9. As a 移动端用户, I want 深色背景有明确的分层，so that 不同界面层级辨识清晰
10. As a 移动端用户, I want 文字对比度满足 WCAG AA 标准，so that 在户外也能看清
11. As a 设计师, I want 所有 Token 集中在 `variables.css` 中，so that 设计和开发对齐成本低
12. As a 新贡献者, I want 清晰的 Token 命名规范文档，so that 快速上手不犯错

## Implementation Decisions

### 1. Token 文件结构
- 主文件：`client/src/styles/variables.css`（在现有基础上扩展）
- 移动端专用 Token：在同一文件中通过 `@media` 或独立变量覆盖
- 不引入 CSS-in-JS 或额外工具链，保持零依赖

### 2. 颜色 Token 层级
```
背景: --bg-base, --bg-elevated, --bg-overlay
文字: --text-primary, --text-secondary, --text-muted, --text-disabled
强调: --accent (金色 #ffd98a), --accent-hover, --accent-subtle
语义: --success, --warning, --error, --info
边框: --border-subtle, --border-default, --border-strong
```

### 3. 间距系统（4px 网格）
```
--space-1: 4px    --space-4: 16px   --space-7: 28px
--space-2: 8px    --space-5: 20px   --space-8: 32px
--space-3: 12px   --space-6: 24px   --space-10: 40px
```
touch-target: 44px 最小点击区域

### 4. 圆角规格
```
--radius-sm: 6px   (内嵌元素：标签、chip)
--radius-md: 10px  (卡片、输入框)
--radius-lg: 14px  (弹窗、抽屉)
--radius-xl: 20px  (大面板)
--radius-full: 9999px (按钮、头像)
```

### 5. 字体层级
```
--text-xs: 0.625rem   (10px)  caption
--text-sm: 0.75rem    (12px)  secondary
--text-base: 0.875rem (14px)  body
--text-lg: 1rem       (16px)  subtitle
--text-xl: 1.125rem   (18px)  heading
--text-2xl: 1.25rem   (20px)  title
```

### 6. 阴影层级
```
--shadow-sm: 卡片默认
--shadow-md: 卡片悬浮
--shadow-lg: 弹窗/抽屉
--shadow-glow: 强调光晕
```

### 7. 动效 Token
```
--duration-instant: 100ms
--duration-fast: 150ms
--duration-normal: 200ms
--duration-slow: 300ms
--ease-out: cubic-bezier(0.4, 0, 0.2, 1)
--ease-in-out: cubic-bezier(0.32, 0.72, 0, 1)
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)
```

### 8. z-index 层级
```
--z-base: 0
--z-dropdown: 100
--z-sticky: 200
--z-overlay: 300
--z-drawer: 400
--z-modal: 500
--z-toast: 600
```

### 9. 移动端专用 Token
```
--touch-target: 44px
--mobile-safe-bottom: env(safe-area-inset-bottom, 16px)
--mobile-safe-top: env(safe-area-inset-top, 0px)
```

### 10. 迁移策略
- 先在 `variables.css` 中补充所有新 Token
- 保留现有 Token 名称不变（向后兼容）
- 新组件强制使用 Token，旧组件逐步迁移
- CI 中可考虑添加 stylelint 规则禁止硬编码 `rgba()` 值

## Testing Decisions

- **测试什么**：Token 文件的 CSS 语法正确性、所有 Token 变量可被解析
- **不测试什么**：Token 的视觉效果（属于视觉回归测试范畴）
- **验证方式**：
  1. 手动检查 `variables.css` 语法（CSS 文件，无运行时依赖）
  2. 在 `StarDetail.vue` 中选取 5 处硬编码替换为 Token，验证构建通过
  3. 浏览器 DevTools 检查 computed styles 确认 Token 生效

## Out of Scope

- 组件拆分（StarDetail.vue 重构）—— 后续独立 Spec
- 具体组件 UI 重新设计（故事卡片、底部导航等）—— 后续独立 Spec
- 动画/微交互实现 —— 后续独立 Spec
- 可访问性（A11y）全面改造 —— 后续独立 Spec
- 平板/横屏适配 —— 后续独立 Spec
- 引入 CSS Module 或 CSS-in-JS 方案

## Further Notes

- 现有 Token 在 `variables.css` 中已定义 55 行，需扩展至约 120 行
- 67+ 处 `rgba()` 硬编码值在 StarDetail.vue 中，为后续迁移重点
- 当前分支无 `@media` 查询，移动端适配通过 JS 逻辑 + 内联样式实现，Token 体系需与此兼容
- 参考设计：Calm、Headspace（深色冥想类 App 的配色和间距）