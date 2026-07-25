import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { unauthorized } from '../utils/response';

const envSecret = process.env.JWT_SECRET;
const isDev = process.env.NODE_ENV !== 'production';
let JWT_SECRET: string;

if (!envSecret) {
  if (isDev) {
    console.warn('[auth] ⚠️  未设置 JWT_SECRET，开发环境使用默认值。生产环境必须设置！');
    JWT_SECRET = 'star-empathy-dev-secret';
  } else {
    throw new Error('[auth] 生产环境必须设置 JWT_SECRET 环境变量');
  }
} else {
  JWT_SECRET = envSecret;
}

export interface AuthUser {
  id: number;
  username: string;
}

// 必须登录
export function authRequired(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return unauthorized(res, '请先登录');
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    (req as Request & { user: AuthUser }).user = decoded;
    next();
  } catch {
    return unauthorized(res, '登录已过期');
  }
}

// 可选登录（不拦截，仅附加用户信息）
export function authOptional(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(header.slice(7), JWT_SECRET) as AuthUser;
      (req as Request & { user: AuthUser }).user = decoded;
    } catch { /* 静默 */ }
  }
  next();
}

export { JWT_SECRET };
