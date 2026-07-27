import db from '../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { JWT_SECRET } from '../middleware/auth';

interface User {
  id: number;
  username: string;
  signature: string | null;
  created_at: string;
}

function publicUser(u: User) {
  return { id: u.id, username: u.username, signature: u.signature || '', created_at: u.created_at };
}

function signToken(user: User) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
}

// 注册
export function register(username: string, password: string): { user: ReturnType<typeof publicUser>; token: string } {
  // 查重
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) throw new Error('用户名已存在');
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
  const user = db.prepare('SELECT id, username, signature, created_at FROM users WHERE id = ?').get(result.lastInsertRowid) as unknown as User;
  return { user: publicUser(user), token: signToken(user) };
}

// 登录
export function login(username: string, password: string): { user: ReturnType<typeof publicUser>; token: string } {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as unknown as (User & { password_hash: string }) | undefined;
  if (!user) throw new Error('用户不存在');
  if (!bcrypt.compareSync(password, user.password_hash)) throw new Error('密码错误');
  return { user: publicUser(user), token: signToken(user) };
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
