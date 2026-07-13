import db from '../db';
import { generatePosition } from '../utils/position';

export interface Star {
  id: number;
  type: string;
  title: string | null;
  content: string;
  resonance_count: number;
  pos_x: number;
  pos_y: number;
  pos_z: number;
  catalog_star_id: number | null;
  created_at: string;
}

// 获取所有星星
export function getAllStars(): Star[] {
  return db.prepare('SELECT * FROM stars ORDER BY created_at DESC').all() as unknown as Star[];
}

// 创建星星
export function createStar(content: string, title?: string, catalogStarId?: number): Star {
  const pos = generatePosition();
  const stmt = db.prepare(`
    INSERT INTO stars (type, title, content, pos_x, pos_y, pos_z, catalog_star_id)
    VALUES ('user', ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(title ?? null, content, pos.x, pos.y, pos.z, catalogStarId ?? null);
  return db.prepare('SELECT * FROM stars WHERE id = ?').get(result.lastInsertRowid) as unknown as Star;
}

// 共鸣 +1
export function resonate(id: number): { id: number; resonance_count: number } | null {
  const star = db.prepare('SELECT * FROM stars WHERE id = ?').get(id) as unknown as Star | undefined;
  if (!star) return null;
  db.prepare('UPDATE stars SET resonance_count = resonance_count + 1 WHERE id = ?').run(id);
  const updated = db.prepare('SELECT id, resonance_count FROM stars WHERE id = ?').get(id) as unknown as {
    id: number;
    resonance_count: number;
  };
  return updated;
}
