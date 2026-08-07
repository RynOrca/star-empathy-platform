import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'node:fs';
import { exec } from 'node:child_process';
import multer from 'multer';
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
import locationRouter from './routes/location';
import analysisRouter from './routes/analysis';
import collectionsRouter from './routes/collections';
import { ok, badRequest, serverError } from './utils/response';
import { authRequired } from './middleware/auth';
import { setApiKey, getApiKey } from './services/deepseek';
import { setAmapKey, getAmapKey } from './services/amap';
import { cleanExpiredTokens } from './services/userService';
import { backfillMissingKernels } from './services/kernel';

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

// 图片上传配置
const uploadsDir = path.resolve(__dirname, '../data/uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req: Express.Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => cb(null, uploadsDir),
  filename: (_req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const extMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
    }
    const ext = extMap[file.mimetype] || '.jpg'
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('仅支持 JPG/PNG/WebP/GIF 格式'))
    }
  },
})

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
  setHeaders: (res: Response, filePath: string) => {
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
app.use('/uploads', express.static(uploadsDir, { maxAge: '7d' }))

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
// 图片上传（放在 storiesRouter 之前，避免被 :storyId 匹配）
app.post('/api/upload', authRequired, writeLimiter, upload.single('image'), (req: Request, res: Response) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return badRequest(res, '请选择图片')
    const imageUrl = `/uploads/${file.filename}`
    ok(res, '上传成功', { imageUrl })
  } catch (error) {
    console.error('POST /api/upload error:', error)
    serverError(res)
  }
})

// multer 错误处理 — 将文件类型/大小错误转为 400 而非 500
app.use('/api/upload', (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err) {
    badRequest(res, err.message || '上传失败')
  }
})
app.use('/api/stories', storiesRouter);

// 恒星 catalog 相关（/api/catalog/stars）
app.post('/api/catalog/stars/:catalogStarId/visit', writeLimiter);
app.post('/api/catalog/stars/:catalogStarId/favorite', writeLimiter);
app.delete('/api/catalog/stars/:catalogStarId/favorite', writeLimiter);
app.use('/api/catalog/stars', analysisRouter);  // :id/analysis 放最前面，避免被 :id 匹配吞掉
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
app.use('/api/stars', analysisRouter); // 兼容旧 URL: /api/stars/:id/analysis
app.use('/api/stars', starsRouter);

// 个人主页
app.use('/api/profile', profileRouter);

// 故事合集（星笺）：故事的唯一系列标识
app.post('/api/collections', writeLimiter);
app.patch('/api/collections/:id', writeLimiter);
app.delete('/api/collections/:id', writeLimiter);
app.use('/api/collections', collectionsRouter);

// 月相解读
app.use('/api/moon', moonRouter);

// 定位（IP 定位 + 反向地理编码）
app.use('/api/location', locationRouter);

// ════════════════════════════════════════════════════════════════
// 设置（只读）：
//   · Key 只允许通过「环境变量」或「管理员服务器上写 .runtime-key」配置，
//     不提供前端写入接口（项目不做权限系统，写接口开放 = 任意访客替换/清空 Key）。
//   · GET /api/settings/*-key 只返回 hasKey 状态，永远不返回 Key 正文。
//   · POST 写接口 → 统一 405 Method Not Allowed（防止旧版前端 POST 404 或 500 乱蹦）
// ════════════════════════════════════════════════════════════════

const SETTINGS_READONLY_MSG = '出于安全考虑，运行时 Key 只允许通过服务器环境变量或 .runtime-key 文件配置，前端不提供写入通道。';

function methodNotAllowed(res: Response, msg: string) {
  res.status(405).json({ code: 405, message: msg, data: null });
}

// DeepSeek
app.get('/api/settings/api-key', (_req: Request, res: Response) => {
  ok(res, 'ok', { hasKey: !!getApiKey() });
});
app.post('/api/settings/api-key', (_req: Request, res: Response) => {
  methodNotAllowed(res, SETTINGS_READONLY_MSG);
});
app.post('/api/settings/test-key', (_req: Request, res: Response) => {
  methodNotAllowed(res, SETTINGS_READONLY_MSG);
});

// 高德地图
app.get('/api/settings/amap-key', (_req: Request, res: Response) => {
  ok(res, 'ok', { hasKey: !!getAmapKey() });
});
app.post('/api/settings/amap-key', (_req: Request, res: Response) => {
  methodNotAllowed(res, SETTINGS_READONLY_MSG);
});
app.post('/api/settings/test-amap-key', (_req: Request, res: Response) => {
  methodNotAllowed(res, SETTINGS_READONLY_MSG);
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

// 启动服务（带端口被占自动 fallback 友好处理）
const MAX_FALLBACK = 3;

/**
 * 解析 Windows/Linux 下占用某 TCP 端口的 PID
 */
function resolvePid(port: number): Promise<string | null> {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32'
      ? `netstat -ano | findstr ":${port}" | findstr LISTENING`
      : `lsof -iTCP:${port} -sTCP:LISTEN -t 2>/dev/null`;
    exec(cmd, { timeout: 2000 }, (err, stdout) => {
      if (err || !stdout) return resolve(null);
      const line = stdout.trim().split(/\r?\n/)[0];
      if (!line) return resolve(null);
      // Windows: 最后一列 = PID；Linux lsof -t = PID
      const parts = line.split(/\s+/).filter(Boolean);
      if (process.platform === 'win32') {
        resolve(parts[parts.length - 1] || null);
      } else {
        resolve(parts[0] || null);
      }
    });
  });
}

function startServer(port: number, fallbackCount = 0) {
  const server = app.listen(port);

  server.once('listening', async () => {
    if (fallbackCount > 0) {
      console.log(`⚠️  原始端口 ${PORT} 被占用，已自动 fallback → ${port}`);
    }
    console.log(`🌟 星语穹庭后端运行中: http://localhost:${port}`);
    console.log(`   GET  /api/stories               - 获取所有故事`);
    console.log(`   POST /api/stories               - 投递心事`);
    console.log(`   POST /api/stories/:id/resonate  - 共鸣点亮`);
    console.log(`   GET  /api/catalog/stars/:id/stats - 恒星统计`);
    if (port !== PORT) {
      console.log(`💡 提示：前端 vite.config.ts /api 代理仍指向 ${PORT}，请手动 "taskkill /F /PID <占用者PID>" 释放 ${PORT} 后重试，或临时把前端代理改到 ${port}`);
    }

    // 定时清理过期 token 黑名单（每 10 分钟）
    setInterval(() => {
      try { cleanExpiredTokens(); } catch { /* 静默 */ }
    }, 10 * 60 * 1000);

    // 启动后自动补全缺失的故事内核（后台运行，不阻塞）
    setImmediate(() => {
      try { backfillMissingKernels(); } catch (e) { console.error('[kernel] 补全任务启动失败:', e); }
    });
  });

  server.on('error', async (err: any) => {
    if (err.code === 'EADDRINUSE') {
      const pid = await resolvePid(port);
      console.error(`❌ 端口 ${port} 被占用 ${pid ? `(PID: ${pid})` : ''}`);
      if (port === PORT && pid) {
        console.log(`👉  建议执行：  taskkill /F /PID ${pid}    然后再 npm run dev`);
      }
      if (fallbackCount < MAX_FALLBACK && port === PORT) {
        // 仅在首次（使用默认 PORT 被占）时允许 fallback，避免用户迷惑
        const nextPort = PORT + fallbackCount + 1;
        console.log(`🔄  正在尝试 fallback 端口 ${nextPort} ...`);
        server.close(() => {
          setTimeout(() => startServer(nextPort, fallbackCount + 1), 300);
        });
        return;
      }
      console.error('💥 无法启动服务，所有候选端口均不可用。请执行上方 taskkill 命令后重试。');
      process.exit(1);
    }
    console.error('💥 服务启动异常：', err);
    process.exit(1);
  });
}

startServer(PORT);

export { upload };
export default app;
