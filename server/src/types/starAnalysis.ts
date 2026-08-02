// catalog_star_analyses 相关的 TS 类型
// 与前端 AIPersonaCard / AIRadarWordcloud / AIHeatmapThemes 三个组件的 props 对应

export type PersonaDimension = {
  left: string;
  right: string;
  percent: number; // 0-100
  side: 'left' | 'right';
};

export type PersonaPayload = {
  constellation: string;  // "织女星 · 天琴座"（前端展示用）
  hanName: string;        // 四字汉名："望月听风"
  /** @deprecated 产品已移除 MBTI，仅为兼容历史保留，新生成一律 undefined/缺省 */
  mbti?: 'INFP' | 'INFJ' | 'ENFP' | 'ISFP' | 'INTP' | 'ENFJ' | 'ISFJ' | 'ISTP' | string;
  tags: string[];         // 最多 5 个
  quote: string;          // 30~50 字金句
  suggestIntro: string;   // 60~100 字
  paragraphs: [string, string]; // 两段解读：复用旧"古今共望"叙事正文（去掉三节）
  dimensions: [PersonaDimension, PersonaDimension, PersonaDimension, PersonaDimension]; // 4 维
};

export type EmotionPoint = {
  name: '思念' | '孤独' | '希望' | '释然' | '共鸣' | string;
  value: number; // 0-1
  color: string;
};

export type EmotionInsight = {
  title: string;
  pct: string;   // "42.3%"
  color: string; // hex
  desc: string;  // 70-120 字
};

export type StoryQuote = {
  text: string;   // 8-20 字
  color: string;  // 金/蓝/紫
  tags: string[]; // 2 个
  author: string; // "@XXX · 北京"
  date: string;   // "3 天前"
  illus: 'sakura' | 'moon' | 'house' | string;
};

export type EmotionPayload = {
  emotions: [EmotionPoint, EmotionPoint, EmotionPoint, EmotionPoint, EmotionPoint];
  insights: [EmotionInsight, EmotionInsight, EmotionInsight];
  quotes: [StoryQuote, StoryQuote, StoryQuote];
};

export type ThemeItem = {
  name: string;
  count: number;
  color: string;
};

export type ThemeHourPayload = {
  // 以下为真实 SQL 聚合，永远准确
  themes: ThemeItem[]; // 最多 8，按 count 降序
  hourly: number[];    // 24 个数
  peakHour: number;    // 0-23
  lowHour: number;     // 0-23

  // 以下 3 段由 AI 后续生成；Phase 1 先给占位文
  forestNote?: string; // 90-120 字 AI 观察
  peakText?: string;   // 70-100 子时高峰
  lowText?: string;    // 70-100 卯时低谷
};

export type CatalogAnalysisFull = {
  persona: PersonaPayload | null;
  emotion: EmotionPayload | null;
  themehour: ThemeHourPayload | null;
  ready: boolean;           // false = 仍缺部分，前端可提示"分析进行中"
  generatedAt: number | null; // unix ms
};
