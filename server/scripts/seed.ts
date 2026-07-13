import db from '../src/db';
import { generatePosition } from '../src/utils/position';

interface SeedData {
  title: string;
  content: string;
}

// 冷启动数据：古诗词 + 星座神话 + 社区语录
const seedData: SeedData[] = [
  // 古诗词
  { title: '静夜思', content: '床前明月光，疑是地上霜。举头望明月，低头思故乡。' },
  { title: '水调歌头', content: '明月几时有？把酒问青天。不知天上宫阙，今夕是何年。' },
  { title: '春江花月夜', content: '春江潮水连海平，海上明月共潮生。滟滟随波千万里，何处春江无月明。' },
  { title: '望月怀远', content: '海上生明月，天涯共此时。情人怨遥夜，竟夕起相思。' },
  { title: '霜月', content: '初闻征雁已无蝉，百尺楼高水接天。青女素娥俱耐冷，月中霜里斗婵娟。' },
  { title: '十五夜望月', content: '中庭地白树栖鸦，冷露无声湿桂花。今夜月明人尽望，不知秋思落谁家。' },
  { title: '月下独酌', content: '花间一壶酒，独酌无相亲。举杯邀明月，对影成三人。' },
  { title: '古朗月行', content: '小时不识月，呼作白玉盘。又疑瑶台镜，飞在青云端。' },
  { title: '把酒问月', content: '青天有月来几时？我今停杯一问之。人攀明月不可得，月行却与人相随。' },
  { title: '西江月', content: '明月别枝惊鹊，清风半夜鸣蝉。稻花香里说丰年，听取蛙声一片。' },

  // 星座神话
  { title: '牛郎织女', content: '天河之东有织女，天帝之女也。年年机杼劳役，织成云锦天衣。天帝怜其独处，许嫁河西牵牛郎。嫁后遂废织纴。天帝怒，责令归河东，许一年一度相会。' },
  { title: '天狼星', content: '天狼星是夜空中最亮的恒星，古埃及人观察它的升起预测尼罗河的泛滥。罗马人认为它与暑热和瘟疫有关，它的英文名 Sirius 意为"炽热"。' },
  { title: '猎户座', content: '猎户奥利安是波塞冬之子，是一位伟大的猎人。他扬言要杀尽地上所有野兽，大地女神盖亚派巨蝎将其蜇死。死后宙斯将他升为星座，与天蝎遥遥相对。' },
  { title: '天蝎座', content: '天蝎是大地女神盖亚派去刺杀猎人奥利安的毒蝎。完成任务后，天蝎被升为星空中的天蝎座，与猎户座遥遥相对，永不相见。' },
  { title: '双子座', content: '卡斯托尔与波吕克斯是一对同母异父的兄弟。卡斯托尔死后，波吕克斯向宙斯哀求，希望能与兄弟共享永生。宙斯将他们升为星座，永不分离。' },
  { title: '仙女座', content: '仙女安德洛墨达是埃塞俄比亚公主。因母亲得罪海神，被锁在礁石上等待海怪吞噬。英雄珀耳修斯救了她，宙斯将她升为星座，永驻星空。' },
  { title: '北斗七星', content: '北斗七星是大熊座的一部分，由天枢、天璇、天玑、天权、玉衡、开阳、摇光七颗星组成。古人用它来确定方向和季节，斗柄东指，天下皆春。' },
  { title: '参商二星', content: '参星在西，商星在东，此出彼没，永不相见。杜甫诗云："人生不相见，动如参与商。"比喻亲友相隔两地，难以重逢。' },

  // 社区语录
  { title: '深夜独白', content: '又是一个加班到深夜的日子。走在回家的路上，抬头看见一轮弯月，突然想起小时候奶奶讲的嫦娥故事。也许每个人心里都住着一片星空吧。' },
  { title: '异乡人', content: '在这座城市生活已经五年了。每到中秋，还是会想起小时候和家人一起赏月的场景。月亮还是那个月亮，只是看月亮的人和心境都变了。' },
  { title: '程序员的自白', content: '写着写着代码，一抬头天已经黑了。关上屏幕的那一刻，窗外的星星显得格外明亮。有时候想，也许每一颗星星都是一个未 push 的 commit 吧。' },
  { title: '雨天思考', content: '连着下了好几天雨，晚上终于放晴。走出地铁站的一瞬间，看到满天繁星，突然觉得生活还是很美好的。有时候，光是抬头看一眼星空就足够了。' },
  { title: '毕业季', content: '毕业那天晚上，我们几个人躺在操场上看星星。有人说，我们是天上的星星，散落在了世界的各个角落。但我相信，被点亮的星星会相互照耀。' },
];

function seed() {
  console.log('🌟 开始注入冷启动数据...');

  // 清空已有的 history 数据（避免重复）
  db.prepare("DELETE FROM stars WHERE type = 'history'").run();
  console.log('  已清除旧的历史星数据');

  const insert = db.prepare(`
    INSERT INTO stars (type, title, content, resonance_count, pos_x, pos_y, pos_z)
    VALUES ('history', ?, ?, ?, ?, ?, ?)
  `);

const insertMany = (items: SeedData[]) => {
  for (const item of items) {
    const pos = generatePosition();
    const resonance = Math.floor(Math.random() * 195) + 5; // 5~200
    const content = item.content.length > 300
      ? item.content.substring(0, 297) + '...'
      : item.content;
    insert.run(item.title, content, resonance, pos.x, pos.y, pos.z);
  }
};

  insertMany(seedData);

  const count = db.prepare("SELECT COUNT(*) as count FROM stars WHERE type = 'history'").get() as { count: number };
  console.log(`  ✅ 成功注入 ${count.count} 条历史星`);
  console.log(`  总计星星数: ${(db.prepare('SELECT COUNT(*) as count FROM stars').get() as { count: number }).count}`);
}

seed();
