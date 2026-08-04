// End-to-end HTTP test for collections APIs
// Usage: node scripts/e2e_collections_test.mjs
import http from 'node:http';

const BASE = 'http://localhost:3000';

function request(method, path, { token = null, body = null, json = true } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const reqBody = body != null ? JSON.stringify(body) : null;
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(reqBody ? { 'Content-Length': Buffer.byteLength(reqBody, 'utf-8') } : {}),
      },
    };
    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8');
        let parsed = raw;
        if (json) { try { parsed = JSON.parse(raw); } catch { /* keep raw string */ } }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          raw,
          // 响应完整对象 { code, message, data }
          resp: parsed,
          // 真正的 data 字段（响应的 .data）
          data: parsed && typeof parsed === 'object' ? parsed.data : undefined,
          // 顶层 message
          message: parsed && typeof parsed === 'object' ? parsed.message : undefined,
        });
      });
    });
    req.on('error', reject);
    if (reqBody) req.write(reqBody, 'utf-8');
    req.end();
  });
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`  ❌ ${msg}`);
    process.exitCode = 1;
    return false;
  }
  console.log(`  ✅ ${msg}`);
  return true;
}

let passN = 0, failN = 0;
async function step(n, title, fn) {
  console.log(`\n=== [${n}] ${title} ===`);
  try {
    return await fn();
  } catch (e) {
    console.error(`  💥 EXCEPTION: ${e.stack || e.message}`);
    process.exitCode = 1;
    failN++;
  }
}

(async () => {
  const rand = Math.floor(Math.random() * 9000) + 1000;
  const u = `node_e2e_${rand}`;
  const p = 'pass1234';
  let token = null;
  let defaultId = null;
  let collId = null;
  let storyId = null;

  await step('1/12', `注册用户 ${u}`, async () => {
    const r = await request('POST', '/api/auth/register', { body: { username: u, password: p } });
    assert(r.status === 200, `HTTP 200 (got ${r.status})`);
    assert(r.data && r.data.user && r.data.user.id, '返回 user.id');
    token = r.data.token;
    assert(typeof token === 'string' && token.length > 20, '返回 token');
  });

  await step('2/12', '登录', async () => {
    const r = await request('POST', '/api/auth/login', { body: { username: u, password: p } });
    assert(r.status === 200, `HTTP 200 (got ${r.status})`);
    token = r.data.token;
    assert(typeof token === 'string' && token.length > 20, '登录返回 token');
  });

  await step('3/12', 'GET /api/collections/mine — 默认合集字段齐全', async () => {
    const r = await request('GET', '/api/collections/mine', { token });
    assert(r.status === 200, `HTTP 200 (got ${r.status})`);
    const list = r.data?.list;
    assert(Array.isArray(list) && list.length === 1, `list 长度 1（实际 ${list?.length ?? 'null'}）`);
    const c = list[0];
    defaultId = c.id;
    assert(typeof c.id === 'number', '有 id');
    assert(typeof c.name === 'string' && c.name.length > 0, '有 name');
    assert(c.description != null, '有 description（非 null/undefined）');
    assert(typeof c.coverColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c.coverColor), `有 coverColor 且合法 (got ${c.coverColor})`);
    assert(c.isDefault === 1, `isDefault=1 (got ${c.isDefault})`);
    assert(c.isPublic === 1, `isPublic=1 (got ${c.isPublic}) — 默认合集默认公开`);
    assert(c.status === 'approved', `status='approved' (got ${c.status})`);
    assert(typeof c.storyCount === 'number', `有 storyCount (got ${c.storyCount})`);
    assert(typeof c.totalViews === 'number', '有 totalViews');
    assert(typeof c.totalResonance === 'number', '有 totalResonance');
  });

  await step('4/12', 'POST /api/collections — 创建『秋天的怀念』公开', async () => {
    const r = await request('POST', '/api/collections', {
      token,
      body: { name: '秋天的怀念', description: '那些落叶的故事，藏在心里许多年。', coverColor: '#d4755c', isPublic: 1 },
    });
    assert(r.status === 200, `HTTP 200 (got ${r.status})`);
    collId = r.data?.id;
    assert(typeof collId === 'number' && collId > 0, `返回新建合集 id=${collId}`);
  });

  await step('5/12', 'GET /mine — 新建合集出现在列表中，字段全', async () => {
    const r = await request('GET', '/api/collections/mine', { token });
    assert(r.status === 200, `HTTP 200 (got ${r.status})`);
    const list = r.data.list;
    assert(list.length === 2, `列表长度 2 (got ${list.length})`);
    const c = list.find((x) => x.id === collId);
    assert(c, `新建合集 id=${collId} 存在于列表`);
    assert(c.name === '秋天的怀念', `name='秋天的怀念' (got '${c.name}')`);
    assert(c.coverColor === '#d4755c', `coverColor='#d4755c' (got '${c.coverColor}')`);
    assert(c.isDefault === 0, `isDefault=0 (got ${c.isDefault})`);
    assert(c.isPublic === 1, `isPublic=1 (got ${c.isPublic})`);
    assert(c.storyCount === 0, `storyCount=0 (got ${c.storyCount})`);
  });

  await step('6/12', 'PATCH /:id — 改名『秋夜往事』+ 清空描述 + 私密 isPublic=0', async () => {
    const r = await request('PATCH', `/api/collections/${collId}`, {
      token,
      body: { name: '秋夜往事', description: '', isPublic: 0, coverColor: '#9b7bbf' },
    });
    assert(r.status === 200, `HTTP 200 (got ${r.status})`);
    const c = r.data?.collection;
    assert(c && c.name === '秋夜往事', `name='秋夜往事' (got '${c?.name}')`);
    assert(c.description === null || c.description === '', `description 清空后为 null/'' (got '${c?.description}')`);
    assert(c.coverColor === '#9b7bbf', `coverColor='#9b7bbf' (got '${c?.coverColor}')`);
    assert(c.isPublic === 0, `isPublic=0 (got ${c?.isPublic})`);
    assert(c.status === 'draft', `status='draft' (got ${c?.status}) — 私密切为 draft`);
  });

  await step('7/12', 'POST /api/stars/story — 投故事（默认挂默认合集）', async () => {
    const r = await request('POST', '/api/stars/story', {
      token,
      body: {
        content: '秋天的风轻轻吹过窗户，我想起了那年在枫叶树下的约定。夕阳把天染成蜜色，你站在路口等我。',
        title: '秋风·约定',
        tags: ['思念', '离别'],
      },
    });
    assert(r.status === 200, `HTTP 200 (got ${r.status})`);
    storyId = r.data?.id;
    assert(typeof storyId === 'number' && storyId > 0, `storyId=${storyId}`);
    assert(r.data.collectionId === defaultId, `collectionId=defaultId(${defaultId}) (got ${r.data.collectionId}) — 新故事默认挂默认合集`);
  });

  await step('8/12', 'POST /move-story — story → 新建合集', async () => {
    const r = await request('POST', '/api/collections/move-story', {
      token,
      body: { storyId, collectionId: collId },
    });
    assert(r.status === 200, `HTTP 200 (got ${r.status}) — message=${r.data?.message ?? r.message}`);
  });

  await step('9/12', 'GET /:id/stats — 合集详情统计（storyCount/views/topTags）', async () => {
    const r = await request('GET', `/api/collections/${collId}/stats`, { token });
    assert(r.status === 200, `HTTP 200 (got ${r.status})`);
    const d = r.data;
    assert(d.name === '秋夜往事', `name='秋夜往事' (got '${d.name}')`);
    assert(d.isPublic === false, `isPublic=false (got ${d.isPublic}) — stats 返回 boolean`);
    assert(d.isDefault === false, `isDefault=false`);
    assert(d.storyCount === 1, `storyCount=1 (got ${d.storyCount})`);
    assert(typeof d.totalViews === 'number', `totalViews=${d.totalViews}（访问过应 >=1）`);
    assert(Array.isArray(d.topTags), `topTags 是数组`);
    assert(Array.isArray(d.catalogs), `catalogs 是数组`);
  });

  await step('10/12', 'GET /:id/stories?page=1&limit=10 — 合集故事列表', async () => {
    const r = await request('GET', `/api/collections/${collId}/stories?page=1&limit=10`, { token });
    assert(r.status === 200, `HTTP 200 (got ${r.status})`);
    const d = r.data;
    assert(typeof d.total === 'number' && d.total >= 1, `total=${d.total} >= 1`);
    assert(d.page === 1 && d.limit === 10, `分页参数 page=1, limit=10`);
    assert(Array.isArray(d.items) && d.items.length >= 1, `items.length>=1`);
    const s = d.items[0];
    assert(s.id === storyId, `items[0].id=${s.id} === storyId(${storyId})`);
    assert(Array.isArray(s.tags), `tags 是数组`);
  });

  await step('11/12', 'DELETE /:id — 删除非默认合集，故事自动回归默认合集', async () => {
    const r = await request('DELETE', `/api/collections/${collId}`, { token });
    assert(r.status === 200, `HTTP 200 (got ${r.status})`);
    const r2 = await request('GET', '/api/collections/mine', { token });
    assert(r2.status === 200 && r2.data.list.length === 1, `删除后 mine 列表只剩 1 条 (got ${r2.data?.list?.length})`);
    // 故事应该回到默认合集
    const r3 = await request('GET', `/api/collections/${defaultId}/stories?page=1&limit=10`, { token });
    const moved = r3.data?.items?.some((x) => x.id === storyId);
    assert(moved === true, `故事 id=${storyId} 回到默认合集 id=${defaultId}`);
  });

  await step('12/12', 'DELETE /:defaultId — 尝试删默认合集（期望 400 拒绝）', async () => {
    const r = await request('DELETE', `/api/collections/${defaultId}`, { token });
    assert(r.status === 400, `HTTP 400 (got ${r.status}) — 拒绝删除默认合集`);
    assert(
      (typeof r.data?.message === 'string' && r.data.message.includes('默认合集')) ||
      (typeof r.message === 'string' && r.message.includes('默认合集')),
      `message 含『默认合集』(got '${r.data?.message ?? r.message}')`,
    );
  });

  setTimeout(() => {
    console.log('\n=============================================================================');
    if (process.exitCode === 1) {
      console.log('❌ 合集接口集成测试 存在失败，请检查上方 ✅ / ❌');
    } else {
      console.log('✅ 合集接口集成测试 全绿 — 所有 12/12 步骤通过');
    }
    console.log('=============================================================================');
  }, 100);
})();
