import db from '../src/db';

// 迁移：给已有的 history 故事补上 origin 字段
const updates: Record<string, string> = {
  '静夜思': '中国',
  '水调歌头': '中国',
  '春江花月夜': '中国',
  '望月怀远': '中国',
  '霜月': '中国',
  '十五夜望月': '中国',
  '月下独酌': '中国',
  '古朗月行': '中国',
  '把酒问月': '中国',
  '西江月': '中国',
  '牛郎织女': '中国',
  '天狼星': '古埃及',
  '猎户座': '古希腊',
  '天蝎座': '古希腊',
  '双子座': '古希腊',
  '仙女座': '古希腊',
  '北斗七星': '中国',
  '参商二星': '中国',
};

const stmt = db.prepare('UPDATE stars SET origin = ? WHERE title = ? AND type = \'history\' AND origin IS NULL');
let count = 0;

for (const [title, origin] of Object.entries(updates)) {
  const result = stmt.run(origin, title);
  if (result.changes > 0) {
    count++;
    console.log(`  ✓ ${title} → ${origin}`);
  }
}

console.log(`\n✅ 共更新 ${count} 条记录`);
