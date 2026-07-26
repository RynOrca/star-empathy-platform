import 'dotenv/config';
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
import { ok, serverError } from './utils/response';

const app = express();
app.set('trust proxy', 1);
const PORT = parseInt(process.env.PORT || '3000', 10);
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
const clientDist = path.resolve(__dirname, '../../../client/dist')
app.use(express.static(clientDist))

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
});

export default app;
