import db from '../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth';

interface User {
  id: number;
  username: string;
  created_at: string;
}

function publicUser(u: User) {
  return { id: u.id, username: u.username, created_at: u.created_at };
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
  const user = db.prepare('SELECT id, username, created_at FROM users WHERE id = ?').get(result.lastInsertRowid) as unknown as User;
  return { user: publicUser(user), token: signToken(user) };
}

// 登录
export function login(username: string, password: string): { user: ReturnType<typeof publicUser>; token: string } {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as unknown as (User & { password_hash: string }) | undefined;
  if (!user) throw new Error('用户不存在');
  if (!bcrypt.compareSync(password, user.password_hash)) throw new Error('密码错误');
  return { user: publicUser(user), token: signToken(user) };
}

// 获取用户信息
export function getUserById(id: number): ReturnType<typeof publicUser> | null {
  const user = db.prepare('SELECT id, username, created_at FROM users WHERE id = ?').get(id) as unknown as User | undefined;
  return user ? publicUser(user) : null;
}
