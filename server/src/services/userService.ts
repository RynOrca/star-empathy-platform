import db from '../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { JWT_SECRET } from '../middleware/auth';
import { sendResetCode } from './emailService';

interface User {
  id: number;
  username: string;
  email: string | null;
  signature: string | null;
  created_at: string;
}

function publicUser(u: User) {
  return { id: u.id, username: u.username, email: u.email || '', signature: u.signature || '', created_at: u.created_at };
}

function signToken(user: User, rememberMe?: boolean) {
  if (rememberMe) {
    // 记住我：永不过期
    return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
  }
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
}

// 注册
export function register(username: string, password: string, email?: string): { user: ReturnType<typeof publicUser>; token: string } {
  // 查重
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) throw new Error('用户名已存在');
  const hash = bcrypt.hashSync(password, 10);
  const safeEmail = email && email.includes('@') ? email.trim() : null;
  const result = db.prepare('INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)').run(username, hash, safeEmail);
  const user = db.prepare('SELECT id, username, email, signature, created_at FROM users WHERE id = ?').get(result.lastInsertRowid) as unknown as User;
  return { user: publicUser(user), token: signToken(user) };
}

// 登录
export function login(username: string, password: string, rememberMe?: boolean): { user: ReturnType<typeof publicUser>; token: string } {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as unknown as (User & { password_hash: string }) | undefined;
  if (!user) throw new Error('用户不存在');
  if (!bcrypt.compareSync(password, user.password_hash)) throw new Error('密码错误');
  return { user: publicUser(user), token: signToken(user, rememberMe) };
}

// 访客登录：自动创建/登录内置访客账号
const GUEST_USERNAME = '星穹访客'
const GUEST_PASSWORD = 'star-guest-2026'

export function guestLogin(): { user: ReturnType<typeof publicUser>; token: string } {
  const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(GUEST_USERNAME) as unknown as (User & { password_hash: string }) | undefined
  if (existing) {
    return { user: publicUser(existing), token: signToken(existing) }
  }
  // 不存在则自动创建
  const hash = bcrypt.hashSync(GUEST_PASSWORD, 10)
  const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(GUEST_USERNAME, hash)
  const user = db.prepare('SELECT id, username, signature, created_at FROM users WHERE id = ?').get(result.lastInsertRowid) as unknown as User
  return { user: publicUser(user), token: signToken(user) }
}

// 获取用户信息
export function getUserById(id: number): ReturnType<typeof publicUser> | null {
  const user = db.prepare('SELECT id, username, signature, created_at FROM users WHERE id = ?').get(id) as unknown as User | undefined;
  return user ? publicUser(user) : null;
}

// 更新签名
export function updateSignature(id: number, signature: string): ReturnType<typeof publicUser> | null {
  const trimmed = signature.trim().slice(0, 30)
  db.prepare('UPDATE users SET signature = ? WHERE id = ?').run(trimmed, id)
  return getUserById(id)
}

// 修改密码
export function changePassword(userId: number, oldPassword: string, newPassword: string): void {
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as { password_hash: string } | undefined
  if (!user) throw new Error('用户不存在')
  if (!bcrypt.compareSync(oldPassword, user.password_hash)) throw new Error('旧密码错误')
  if (oldPassword === newPassword) throw new Error('新密码不能与旧密码相同')
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 50) {
    throw new Error('新密码需 6~50 个字符')
  }
  const hash = bcrypt.hashSync(newPassword, 10)
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId)
}

// ─── 找回密码 ───

// 生成 6 位数字验证码
function generateResetCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// 发送密码重置验证码
export async function forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
  const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email) as { id: number; email: string } | undefined;
  if (!user) {
    // 不暴露用户是否存在，统一返回成功
    return { success: true, message: '如果该邮箱已注册，验证码已发送' };
  }

  const code = generateResetCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 分钟有效

  db.prepare('INSERT INTO password_reset_tokens (email, code, expires_at) VALUES (?, ?, ?)').run(email, code, expiresAt);

  const sent = await sendResetCode(email, code);
  if (!sent) {
    return { success: false, message: '邮件发送失败，请稍后重试' };
  }

  return { success: true, message: '验证码已发送' };
}

// 重置密码
export function resetPassword(email: string, code: string, newPassword: string): { success: boolean; message: string } {
  const now = new Date().toISOString();

  // 查找有效且未使用的验证码
  const token = db.prepare(
    'SELECT id FROM password_reset_tokens WHERE email = ? AND code = ? AND expires_at > ? AND used = 0 ORDER BY created_at DESC LIMIT 1'
  ).get(email, code, now) as { id: number } | undefined;

  if (!token) {
    return { success: false, message: '验证码无效或已过期' };
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 50) {
    return { success: false, message: '新密码需 6~50 个字符' };
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hash, email);
  // 标记验证码已使用
  db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(token.id);

  return { success: true, message: '密码已重置' };
}

// ─── Token 刷新 ───

export function refreshToken(oldToken: string): { token: string } | { error: string } {
  if (isTokenBlacklisted(oldToken)) {
    return { error: '登录已失效，请重新登录' };
  }
  try {
    const decoded = jwt.verify(oldToken, JWT_SECRET, { ignoreExpiration: true }) as { id: number; username: string };
    const user = db.prepare('SELECT id, username, email, signature, created_at FROM users WHERE id = ?').get(decoded.id) as unknown as User | undefined;
    if (!user) return { error: '用户不存在' };
    // 保持原 token 的过期策略：原 token 无 exp → 记住我 → 新 token 也无过期
    const wasRememberMe = !(jwt.decode(oldToken) as any)?.exp;
    return { token: signToken(user, wasRememberMe) };
  } catch {
    return { error: '登录已过期，请重新登录' };
  }
}

// ─── Token 黑名单 ───

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function blacklistToken(token: string): void {
  const tokenHash = hashToken(token)
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000).toISOString()
      : new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
    db.prepare('INSERT OR IGNORE INTO token_blacklist (token_hash, expires_at) VALUES (?, ?)').run(tokenHash, expiresAt)
  } catch {
    // token 解码失败，仍然存入黑名单
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
    db.prepare('INSERT OR IGNORE INTO token_blacklist (token_hash, expires_at) VALUES (?, ?)').run(tokenHash, expiresAt)
  }
}

export function isTokenBlacklisted(token: string): boolean {
  const tokenHash = hashToken(token)
  const row = db.prepare('SELECT id FROM token_blacklist WHERE token_hash = ?').get(tokenHash)
  return !!row
}

export function cleanExpiredTokens(): void {
  const now = new Date().toISOString()
  const result = db.prepare('DELETE FROM token_blacklist WHERE expires_at < ?').run(now)
  if (result.changes > 0) {
    console.log(`[token-cleanup] 清理了 ${result.changes} 条过期 token`)
  }
}
