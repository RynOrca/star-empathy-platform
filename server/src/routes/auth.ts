import { Router, Request, Response } from 'express';
import { register, login, guestLogin, getUserById, updateSignature, changePassword, blacklistToken, forgotPassword, resetPassword, refreshToken } from '../services/userService';
import { authRequired } from '../middleware/auth';
import { ok, badRequest, notFound, send } from '../utils/response';
import { getOrCreateDefaultCollections } from '../services/collectionService';

const router = Router();

// 注册
router.post('/register', (req: Request, res: Response) => {
  try {
    const { username, password, email } = req.body;
    if (!username || typeof username !== 'string' || username.length < 2 || username.length > 20) {
      return badRequest(res, '用户名需 2~20 个字符');
    }
    if (!password || typeof password !== 'string' || password.length < 6 || password.length > 50) {
      return badRequest(res, '密码需 6~50 个字符');
    }
    const result = register(username.trim(), password, email);
    // 注册即创建「公开星笺 + 私密星笺」两个系统默认合集
    try { getOrCreateDefaultCollections(result.user.id); } catch (e) { console.error('getOrCreateDefaultCollections(register) failed:', e); }
    ok(res, '注册成功', result);
  } catch (error: any) {
    send(res, 400, error.message || '注册失败');
  }
});

// 登录
router.post('/login', (req: Request, res: Response) => {
  try {
    const { username, password, rememberMe } = req.body;
    if (!username || !password) {
      return badRequest(res, '请填写用户名和密码');
    }
    const result = login(username, password, !!rememberMe);
    // 登录时确保有「公开星笺 + 私密星笺」（兼容老用户历史未创建）
    try { getOrCreateDefaultCollections(result.user.id); } catch (e) { console.error('getOrCreateDefaultCollections(login) failed:', e); }
    ok(res, '登录成功', result);
  } catch (error: any) {
    send(res, 400, error.message || '登录失败');
  }
});

// 访客快捷登录
router.post('/guest', (_req: Request, res: Response) => {
  try {
    const result = guestLogin();
    // 访客也确保有「公开星笺 + 私密星笺」两个默认合集
    try { getOrCreateDefaultCollections(result.user.id); } catch (e) { console.error('getOrCreateDefaultCollections(guest) failed:', e); }
    ok(res, '访客登录成功', result);
  } catch (error: any) {
    send(res, 500, error.message || '访客登录失败');
  }
});

// 获取当前用户
router.get('/me', authRequired, (req: Request, res: Response) => {
  const user = (req as Request & { user: { id: number } }).user;
  const info = getUserById(user.id);
  if (!info) return notFound(res, '用户不存在');
  ok(res, 'success', info);
});

// 更新签名
router.patch('/signature', authRequired, (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { id: number } }).user;
    const { signature } = req.body;
    if (typeof signature !== 'string') {
      return badRequest(res, '签名需为字符串');
    }
    const updated = updateSignature(user.id, signature);
    ok(res, '签名已更新', updated);
  } catch (error: any) {
    send(res, 500, error.message || '更新失败');
  }
});

// 修改密码
router.patch('/password', authRequired, (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { id: number } }).user;
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || typeof oldPassword !== 'string') {
      return badRequest(res, '请输入旧密码');
    }
    if (!newPassword || typeof newPassword !== 'string') {
      return badRequest(res, '请输入新密码');
    }
    changePassword(user.id, oldPassword, newPassword);
    ok(res, '密码已修改');
  } catch (error: any) {
    send(res, 400, error.message || '修改失败');
  }
});

// 退出登录
router.post('/logout', authRequired, (req: Request, res: Response) => {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      blacklistToken(header.slice(7));
    }
    ok(res, '已退出');
  } catch (error: any) {
    send(res, 500, error.message || '退出失败');
  }
});

// 刷新 Token（自动续期）
router.post('/refresh', (req: Request, res: Response) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return badRequest(res, '请先登录');
    }
    const result = refreshToken(header.slice(7));
    if ('error' in result) {
      return badRequest(res, result.error);
    }
    ok(res, 'Token 已刷新', result);
  } catch (error: any) {
    send(res, 500, error.message || '刷新失败');
  }
});

// 找回密码 — 发送验证码
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return badRequest(res, '请输入有效的邮箱地址');
    }
    const result = await forgotPassword(email.trim());
    ok(res, result.message);
  } catch (error: any) {
    send(res, 500, error.message || '发送失败');
  }
});

// 重置密码 — 验证码 + 新密码
router.post('/reset-password', (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return badRequest(res, '请输入有效的邮箱地址');
    }
    if (!code || typeof code !== 'string' || code.length !== 6) {
      return badRequest(res, '请输入 6 位验证码');
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 50) {
      return badRequest(res, '新密码需 6~50 个字符');
    }
    const result = resetPassword(email.trim(), code.trim(), newPassword);
    if (!result.success) {
      return badRequest(res, result.message);
    }
    ok(res, result.message);
  } catch (error: any) {
    send(res, 500, error.message || '重置失败');
  }
});

export default router;
