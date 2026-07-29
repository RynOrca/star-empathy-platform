import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import rateLimit from 'express-rate-limit';
import starsRouter from './routes/stars';
import storiesRouter from './routes/stories';
import catalogRouter from './routes/catalog';
import authRouter from './routes/auth';
import statsRouter from './routes/stats';
import profileRouter from './routes/profile';
import searchRouter from './routes/search';
import narrativeRouter from './routes/narrative';
import chatRouter from './routes/chat';
import moonRouter from './routes/moon';
import { ok, badRequest, serverError } from './utils/response';
import { setApiKey, getApiKey } from './services/deepseek';
import { cleanExpiredTokens } from './services/userService';

const app = express();
app.set('trust proxy', 1);
const PORT = parseInt(process.env.API_PORT || '3000', 10);
const isDev = process.env.NODE_ENV !== 'production';

const allowedOrigins = isDev
  ? ['http://localhost:5173', 'http://localhost:4173']
  : (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []);

// 中间件
app.use(helmet({
  contentSecurityPolicy: isDev ? false : undefined,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || isDev) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '100kb' }));

// ═══ 限流 ═══
// 全局：每分钟 120 次/IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: '请求过于频繁，请稍后再试', data: null },
});
app.use('/api/', globalLimiter);

// 写操作更严格：共鸣/浏览/收藏 每分钟 30 次/IP
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: '操作过于频繁，请稍后再试', data: null },
});

// 登录/注册更严格：每分钟 10 次/IP
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: '登录尝试过于频繁，请稍后再试', data: null },
});

// 生产环境：托管前端静态文件
// 使用 process.cwd() 而非 __dirname，兼容 tsc 编译后 dist/ 多一层目录的问题
const projectRoot = (() => {
  const cwd = process.cwd()
  if (cwd.endsWith('server') || cwd.endsWith('server/') || cwd.endsWith('server\\')) {
    return path.resolve(cwd, '..')
  }
  return cwd
})()
const clientDist = path.resolve(projectRoot, 'client/dist')
app.use(express.static(clientDist, {
  maxAge: '1y',
  immutable: true,
  setHeaders: (res, filePath) => {
    // 纹理资源：1 年 immutable 缓存
    if (filePath.includes('/textures/') || filePath.match(/\.(jpg|jpeg|png|webp)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    }
    // HTML 入口：不缓存，确保用户拿到最新版本
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache')
    }
  },
}))

// 健康检查
app.get('/api/health', (_req: Request, res: Response) => {
  ok(res, 'ok');
});

// 认证路由
app.use('/api/auth', authLimiter, authRouter);

// 统计
app.use('/api/stats', statsRouter);

// 搜索（catalog 搜索，放在 /api/catalog/stars 之前避免被 :id 匹配）
app.use('/api/catalog/stars/search', searchRouter);
app.use('/api/stars/search', searchRouter); // 旧路由兼容

// ═══ 新规范路由 ═══
// 故事相关（/api/stories）
app.post('/api/stories', writeLimiter);
app.post('/api/stories/:storyId/resonate', writeLimiter);
app.post('/api/stories/:storyId/view', writeLimiter);
app.use('/api/stories', storiesRouter);

// 恒星 catalog 相关（/api/catalog/stars）
app.post('/api/catalog/stars/:catalogStarId/visit', writeLimiter);
app.post('/api/catalog/stars/:catalogStarId/favorite', writeLimiter);
app.delete('/api/catalog/stars/:catalogStarId/favorite', writeLimiter);
app.use('/api/catalog/stars', narrativeRouter); // 叙事路由（/narrative）
app.use('/api/catalog/stars', chatRouter);      // 聊天路由（/chat/figures, /chat）
app.use('/api/catalog/stars', catalogRouter);

// ═══ 旧路由兼容（/api/stars/*，功能同上，不删除） ═══
// 星星路由（写接口限流）
app.post('/api/stars/story', writeLimiter);
app.post('/api/stars/:storyId/resonate', writeLimiter);
app.post('/api/stars/:catalogStarId/visit', writeLimiter);
app.post('/api/stars/story/:storyId/view', writeLimiter);
app.post('/api/stars/:catalogStarId/favorite', writeLimiter);
app.delete('/api/stars/:catalogStarId/favorite', writeLimiter);
app.use('/api/stars', starsRouter);

// 个人主页
app.use('/api/profile', profileRouter);

// 月相 AI 解读
app.use('/api/moon', moonRouter);

// 设置 API Key（运行时覆盖）
app.get('/api/settings/api-key', (_req: Request, res: Response) => {
  ok(res, 'ok', { hasKey: !!getApiKey() });
});
app.post('/api/settings/api-key', (req: Request, res: Response) => {
  const { apiKey } = req.body;
  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    setApiKey(null);
    ok(res, '已清除 API Key');
    return;
  }
  setApiKey(apiKey.trim());
  ok(res, 'API Key 已保存');
});

// 测试 API Key 连通性
app.post('/api/settings/test-key', async (req: Request, res: Response) => {
  const { apiKey } = req.body;
  const key = (typeof apiKey === 'string' && apiKey.trim()) ? apiKey.trim() : getApiKey();
  if (!key) {
    return badRequest(res, '请先设置 API Key');
  }
  try {
    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 5,
      }),
    });
    if (resp.ok) {
      ok(res, '星河已连通');
    } else {
      badRequest(res, '未能连通');
    }
  } catch (e: any) {
    serverError(res, `网络错误: ${e.message}`);
  }
});

// SPA 回退：非 API 路径返回 index.html
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// 全局错误处理中间件
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  serverError(res);
});

// 启动服务
app.listen(PORT, () => {
  console.log(`🌟 星语穹庭后端运行中: http://localhost:${PORT}`);
  console.log(`   GET  /api/stories               - 获取所有故事`);
  console.log(`   POST /api/stories               - 投递心事`);
  console.log(`   POST /api/stories/:id/resonate  - 共鸣点亮`);
  console.log(`   GET  /api/catalog/stars/:id/stats - 恒星统计`);

  // 定时清理过期 token 黑名单（每 10 分钟）
  setInterval(() => {
    try { cleanExpiredTokens(); } catch { /* 静默 */ }
  }, 10 * 60 * 1000);
});

export default app;
