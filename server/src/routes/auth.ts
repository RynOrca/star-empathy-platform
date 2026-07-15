import { Router, Request, Response } from 'express';
import { register, login, guestLogin, getUserById, updateSignature } from '../services/userService';
import { authRequired } from '../middleware/auth';

const router = Router();

// 注册
router.post('/register', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || typeof username !== 'string' || username.length < 2 || username.length > 20) {
      return res.status(400).json({ code: 400, message: '用户名需 2~20 个字符', data: null });
    }
    if (!password || typeof password !== 'string' || password.length < 6 || password.length > 50) {
      return res.status(400).json({ code: 400, message: '密码需 6~50 个字符', data: null });
    }
    const result = register(username.trim(), password);
    res.json({ code: 200, message: '注册成功', data: result });
  } catch (error: any) {
    res.status(400).json({ code: 400, message: error.message || '注册失败', data: null });
  }
});

// 登录
router.post('/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ code: 400, message: '请填写用户名和密码', data: null });
    }
    const result = login(username, password);
    res.json({ code: 200, message: '登录成功', data: result });
  } catch (error: any) {
    res.status(400).json({ code: 400, message: error.message || '登录失败', data: null });
  }
});

// 访客快捷登录
router.post('/guest', (_req: Request, res: Response) => {
  try {
    const result = guestLogin();
    res.json({ code: 200, message: '访客登录成功', data: result });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message || '访客登录失败', data: null });
  }
});

// 获取当前用户
router.get('/me', authRequired, (req: Request, res: Response) => {
  const user = (req as Request & { user: { id: number } }).user;
  const info = getUserById(user.id);
  if (!info) return res.status(404).json({ code: 404, message: '用户不存在', data: null });
  res.json({ code: 200, message: 'success', data: info });
});

// 更新签名
router.patch('/signature', authRequired, (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { id: number } }).user;
    const { signature } = req.body;
    if (typeof signature !== 'string') {
      return res.status(400).json({ code: 400, message: '签名需为字符串', data: null });
    }
    const updated = updateSignature(user.id, signature);
    res.json({ code: 200, message: '签名已更新', data: updated });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message || '更新失败', data: null });
  }
});

export default router;
