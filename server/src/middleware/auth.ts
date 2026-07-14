import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'star-empathy-dev-secret';

export interface AuthUser {
  id: number;
  username: string;
}

// 必须登录
export function authRequired(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '请先登录', data: null });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    (req as Request & { user: AuthUser }).user = decoded;
    next();
  } catch {
    return res.status(401).json({ code: 401, message: '登录已过期', data: null });
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
