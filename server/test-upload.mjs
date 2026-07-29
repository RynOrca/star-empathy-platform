// Quick test: simulate upload → create story → fetch story → check imageUrl
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Check database
const dbPath = path.join(__dirname, 'data', 'stars.db');
const db = new DatabaseSync(dbPath);

// 看看有哪些故事
const allStars = db.prepare('SELECT id, title, image_url, type FROM stars ORDER BY id DESC LIMIT 5').all();
console.log('=== Stars in DB ===');
console.log(JSON.stringify(allStars, null, 2));
console.log('Total:', db.prepare('SELECT COUNT(*) as c FROM stars').get());

// 2. Check uploads directory
const uploadsDir = path.join(__dirname, 'data', 'uploads');
if (fs.existsSync(uploadsDir)) {
  console.log('\n=== Uploaded files ===');
  for (const f of fs.readdirSync(uploadsDir)) {
    const stat = fs.statSync(path.join(uploadsDir, f));
    console.log(`  ${f} (${stat.size} bytes)`);
  }
}

// 3. Simulate the SELECT query to see what keys are returned
console.log('\n=== SELECT s.*, s.image_url as imageUrl test ===');
const testRow = db.prepare(`
  SELECT s.*, s.image_url as imageUrl
  FROM stars s
  LIMIT 1
`).get();
if (testRow) {
  console.log('Keys:', Object.keys(testRow));
  console.log('image_url:', testRow.image_url);
  console.log('imageUrl:', testRow.imageUrl);
} else {
  console.log('No stars in DB, testing with VALUES...');
  // Simulate with a dummy query
  const dummy = db.prepare(`
    SELECT 'test' as content, '/uploads/test.jpg' as image_url, '/uploads/test.jpg' as imageUrl
  `).get();
  console.log('Keys:', Object.keys(dummy));
  console.log('image_url:', dummy.image_url);
  console.log('imageUrl:', dummy.imageUrl);
}

// 4. Simulate convertKeys
function snakeToCamel(s) {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
function convertKeys(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(convertKeys);
  if (typeof obj !== 'object') return obj;
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    result[snakeToCamel(k)] = convertKeys(v);
  }
  return result;
}

console.log('\n=== convertKeys test ===');
if (testRow) {
  const converted = convertKeys(testRow);
  console.log('After convertKeys:', JSON.stringify(converted, null, 2));
  console.log('imageUrl:', converted.imageUrl);
}

db.close();
console.log('\nDone.');
