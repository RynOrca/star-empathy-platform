import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import starsRouter from './routes/stars';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// 中间件
app.use(cors());
app.use(express.json());

// 健康检查
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ code: 200, message: 'ok', data: null });
});

// 星星路由
app.use('/api/stars', starsRouter);

// 全局错误处理中间件
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
});

// 启动服务
app.listen(PORT, () => {
  console.log(`🌟 星语穹庭后端运行中: http://localhost:${PORT}`);
  console.log(`   GET  /api/stars         - 获取所有星星`);
  console.log(`   POST /api/stars/story   - 投递心事`);
  console.log(`   POST /api/stars/:id/resonate - 共鸣点亮`);
});

export default app;
