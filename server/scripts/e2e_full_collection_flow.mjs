/* =========================================================
   合集全链路端到端验证脚本
   完全模拟前端真实请求路径：
   注册 → /auth/me → /collections/mine(默认合集1条)
   → 创建合集『夏夜晚风』 → /mine(2条)
   → GET /:id/stats(详情Hero) → GET /:id/stories(详情故事)
   → PATCH /:id(改名+清空描述)
   → 投故事默认合集 → move-story(移到新合集)
   → /:id/stats(有1条故事) → DELETE新合集
   → /mine(回到1条) → 删除默认合集(必须400拒绝)
   ========================================================= */
import http from 'node:http';
const BASE = { hostname: 'localhost', port: 3000 };
let passN = 0, failN = 0;
const results = [];

function json(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const opts = { ...BASE, path, method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers.Authorization = 'Bearer ' + token;
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d), raw: d.slice(0, 400) }); }
        catch (e) { reject(new Error('not JSON [' + res.statusCode + '] ' + d.slice(0, 300))); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}
function pass(note) { passN++; results.push('✅ ' + note); }
function fail(note) { failN++; results.push('❌ ' + note); }

const u = 'flow_' + String(Math.floor(Math.random() * 1e6)).padStart(6, '0');
console.log('══════════════════════════════════════════════');
console.log('合集全链路验证  用户：', u);
console.log('══════════════════════════════════════════════\n');

try {
  // [1] 注册
  let r = await json('POST', '/api/auth/register', null, { username: u, password: '123456' });
  console.log('[1] 注册  HTTP', r.status, '\n   body.code =', r.body.code, '\n   user.id =', r.body.data?.user?.id);
  if (r.status === 200 && r.body.code === 200 && r.body.data?.user?.id) pass('注册成功 + code=200 + user.id');
  else fail('注册失败');
  const token = r.body.data?.token;
  const uid = r.body.data?.user?.id;

  // [2] /api/auth/me (前端onMounted必调)
  r = await json('GET', '/api/auth/me', token);
  console.log('\n[2] GET /api/auth/me  HTTP', r.status, 'code =', r.body.code, '\n   me.id =', r.body.data?.id);
  if (r.status === 200 && r.body.code === 200 && r.body.data?.id === uid) pass('auth/me 正确返回当前用户 id');
  else fail('auth/me 异常');

  // [3] 初始 /collections/mine → 只有默认合集
  r = await json('GET', '/api/collections/mine', token);
  console.log('\n[3] GET /mine 初始  HTTP', r.status, 'code =', r.body.code);
  const list0 = r.body.data?.list ?? [];
  console.log('   list.length =', list0.length, '（期望 1：默认合集）');
  const default0 = list0.find(c => c.isDefault);
  if (r.status === 200 && r.body.code === 200 && list0.length === 1 && default0) {
    pass('/mine 初始 1 条，默认合集 isDefault=true');
  } else fail('/mine 初始列表异常');
  if (default0) {
    console.log('   默认合集：id=%d name="%s" coverColor=%s storyCount=%d storyCount=%d totalViews=%d totalResonance=%d isPublic=%s status=%s',
      default0.id, default0.name, default0.coverColor, default0.storyCount, default0.totalViews, default0.totalResonance, default0.isPublic, default0.status);
    const ok = typeof default0.id === 'number' && default0.name && default0.coverColor
      && typeof default0.storyCount === 'number' && typeof default0.totalViews === 'number' && typeof default0.totalResonance === 'number'
      && default0.isPublic === 1 && default0.status === 'approved';
    if (ok) pass('默认合集字段齐全（name/coverColor/计数+公开+approved）');
    else fail('默认合集字段缺失');
  }

  // [4] 创建合集『夏夜晚风』
  r = await json('POST', '/api/collections', token, { name: '夏夜晚风', description: '夏夜里那些说不出口的话' });
  console.log('\n[4] 创建合集  HTTP', r.status, 'code =', r.body.code, '\n   newId =', r.body.data?.id, ' msg =', r.body.message);
  const newId = r.body.data?.id;
  if (r.status === 200 && r.body.code === 200 && typeof newId === 'number') pass('POST /collections 创建成功，返回新 id');
  else fail('创建合集失败');

  // [5] /mine 再查 → 2 条
  r = await json('GET', '/api/collections/mine', token);
  console.log('\n[5] GET /mine 再查  HTTP', r.status, 'code =', r.body.code);
  const list1 = r.body.data?.list ?? [];
  console.log('   list.length =', list1.length, '（期望 2）\n   list 顺序 isDefault DESC：', list1.map(x => `${x.isDefault ? '默认' : '自建'}:${x.name}(id=${x.id})`).join(' → '));
  const foundNew = list1.find(x => x.id === newId);
  const orderOk = list1[0]?.isDefault === 1;
  if (r.status === 200 && list1.length === 2 && foundNew && orderOk) pass('/mine 列表长度 2，新建存在，默认在最顶');
  else fail('/mine 列表异常（长度/存在/顺序）');

  // [6] GET /:id/stats 详情Hero
  r = await json('GET', `/api/collections/${newId}/stats`, token);
  console.log('\n[6] GET /:id/stats  HTTP', r.status, 'code =', r.body.code);
  const st = r.body.data ?? {};
  console.log('   stats: name=%s storyCount=%d totalViews=%d totalResonance=%d topTags.length=%d catalogs.length=%d isPublic=%s isDefault=%s',
    st.name, st.storyCount, st.totalViews, st.totalResonance, st.topTags?.length ?? '?', st.catalogs?.length ?? '?', st.isPublic, st.isDefault);
  if (r.status === 200 && r.body.code === 200 && st.name === '夏夜晚风' && st.storyCount === 0
    && Array.isArray(st.topTags) && Array.isArray(st.catalogs)) pass('stats 字段齐全，空合集 storyCount=0');
  else fail('stats 异常');

  // [7] GET /:id/stories 故事分页
  r = await json('GET', `/api/collections/${newId}/stories?page=1&limit=10`, token);
  console.log('\n[7] GET /:id/stories?page=1&limit=10  HTTP', r.status, 'code =', r.body.code);
  const pg = r.body.data ?? {};
  console.log('   pagination: page=%d limit=%d total=%d totalPages=%d hasMore=%s items.length=%d',
    pg.page, pg.limit, pg.total, pg.totalPages, pg.page < pg.totalPages, pg.items?.length ?? '?');
  if (r.status === 200 && r.body.code === 200 && pg.page === 1 && pg.total === 0 && (pg.items?.length ?? 0) === 0) pass('故事分页字段正确（空）');
  else fail('故事分页异常');

  // [8] PATCH /:id 改名成『夏夜晚风·改』+ 清空描述
  r = await json('PATCH', `/api/collections/${newId}`, token, { name: '夏夜晚风·改', description: '' });
  console.log('\n[8] PATCH 改名+清空描述  HTTP', r.status, 'code =', r.body.code);
  const patched = r.body.data?.collection ?? {};
  console.log('   patched: name=%s description=%s coverColor=%s isPublic=%s status=%s',
    patched.name, JSON.stringify(patched.description), patched.coverColor, patched.isPublic, patched.status);
  if (r.status === 200 && r.body.code === 200 && patched.name === '夏夜晚风·改' && (patched.description === null || patched.description === '')) {
    pass('PATCH 改名+清空描述生效');
  } else fail('PATCH 未生效');

  // [9] 投故事 → 默认挂默认合集
  r = await json('POST', '/api/stars/story', token, {
    title: '夏末的蝉鸣',
    content: '那年夏末我们坐在操场看星星，蝉鸣特别响，你说要一直做朋友。后来你去了南方，我再也没听过那样的蝉鸣。',
    tags: ['离别', '青春'],
  });
  console.log('\n[9] POST /stars/story  HTTP', r.status, 'code =', r.body.code);
  const storyId = r.body.data?.id;
  const storyCollectionId = r.body.data?.collectionId;
  console.log('   storyId =', storyId, ' collectionId =', storyCollectionId, '（期望等于默认合集 id=' + (default0?.id ?? '?') + '）');
  if (r.status === 200 && r.body.code === 200 && storyId && storyCollectionId === default0?.id) {
    pass('故事投递成功，默认挂到默认合集 id=' + default0?.id);
  } else fail('故事投递默认合集异常');

  // [10] move-story → 故事移到新建的『夏夜晚风·改』
  r = await json('POST', '/api/collections/move-story', token, { storyId, collectionId: newId });
  console.log('\n[10] POST /move-story  HTTP', r.status, 'code =', r.body.code, ' msg =', r.body.message);
  if (r.status === 200 && r.body.code === 200) pass('move-story 成功');
  else fail('move-story 失败');

  // [11] stats 再查 → storyCount 应该变成 1
  r = await json('GET', `/api/collections/${newId}/stats`, token);
  console.log('\n[11] 移动后 GET stats → storyCount 应该=1  HTTP', r.status);
  const st2 = r.body.data ?? {};
  console.log('   storyCount=%d totalViews>=1?%s topTags 含离别/青春？%s',
    st2.storyCount, st2.totalViews >= 1,
    (st2.topTags ?? []).map(t => t.tag).join('/'));
  if (st2.storyCount === 1 && st2.totalViews >= 1
    && (st2.topTags ?? []).some(t => t.tag === '离别' || t.tag === '青春')) {
    pass('移动后 stats 聚合正确（storyCount=1 + 标签含离别/青春）');
  } else fail('stats 聚合异常（故事没计入/标签没聚合）');
  // 再查默认合集 stats storyCount=0
  r = await json('GET', `/api/collections/${default0?.id}/stats`, token);
  const stDef = r.body.data ?? {};
  console.log('   同时默认合集 storyCount = %d（期望 0）', stDef.storyCount);
  if (stDef.storyCount === 0) pass('默认合集 storyCount 同步成 0（正确迁走）');
  else fail('默认合集计数未同步');
  // 故事分页也应有 1 条
  r = await json('GET', `/api/collections/${newId}/stories?page=1&limit=10`, token);
  const pg2 = r.body.data ?? {};
  const moved = (pg2.items ?? []).find(x => x.id === storyId);
  console.log('   /stories items.length=%d moved.title=%s', pg2.items?.length ?? 0, moved?.title);
  if (pg2.total === 1 && moved && moved.title === '夏末的蝉鸣' && Array.isArray(moved.tags) && moved.tags.length) {
    pass('故事分页包含移动后的故事，标签数组正确');
  } else fail('故事分页未包含移动后的故事');

  // [12] 删除非默认合集
  r = await json('DELETE', `/api/collections/${newId}`, token);
  console.log('\n[12] DELETE 非默认合集  HTTP', r.status, 'code =', r.body.code, ' msg =', r.body.message);
  if (r.status === 200 && r.body.code === 200) pass('DELETE 非默认合集成功');
  else fail('DELETE 失败');
  // mine 列表回到 1 条
  r = await json('GET', '/api/collections/mine', token);
  const list2 = r.body.data?.list ?? [];
  console.log('   /mine list.length =', list2.length, '（期望 1）');
  if (list2.length === 1 && list2[0]?.isDefault === 1) pass('删除后列表只剩默认合集');
  else fail('删除后列表异常');
  // 故事回到默认合集
  r = await json('GET', `/api/collections/${default0?.id}/stories?page=1&limit=10`, token);
  const pg3 = r.body.data ?? {};
  const back = (pg3.items ?? []).find(x => x.id === storyId);
  console.log('   故事是否回到默认合集？ ' + (back ? '✅ title=' + back.title : '❌ 未找到'));
  if (back && back.title === '夏末的蝉鸣') pass('删除非默认合集后故事自动迁回默认合集');
  else fail('故事未自动迁回');

  // [13] 试图删默认合集（必须 400）
  r = await json('DELETE', `/api/collections/${default0?.id}`, token);
  console.log('\n[13] 试图删默认合集  HTTP', r.status, 'code =', r.body.code, ' msg =', r.body.message);
  if (r.status === 400 && r.body.code === 400 && r.body.message?.includes('默认合集')) pass('默认合集防删 400 ✅');
  else fail('默认合集删除未被拒绝');

} catch (e) {
  console.error('\n💥 异常中断:', e.stack || e.message);
  failN++;
  results.push('💥 EXCEPTION: ' + (e.message || String(e)));
}

console.log('\n══════════════════════════════════════════════');
console.log('全链路验证 结果汇总：✅ %d 通过  ❌ %d 失败', passN, failN);
console.log('══════════════════════════════════════════════');
for (const s of results) console.log(s);
process.exit(failN === 0 ? 0 : 1);
