# 给开发者 A 的对接 & 部署指南

## 接口文档

Base URL：`http://localhost:3000`（本地开发），部署后为 `https://your-domain.com`

### 1. 获取所有星星

```
GET /api/stars
```

响应：
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 1,
      "type": "history",
      "title": "静夜思",
      "content": "床前明月光...",
      "resonance_count": 34,
      "pos_x": -91.0,
      "pos_y": 120.5,
      "pos_z": -45.2,
      "created_at": "2026-07-13 03:50:00"
    }
  ]
}
```

前端映射：`pos_x` → `position.x`, `pos_y` → `position.y`, `pos_z` → `position.z`

### 2. 投递心事

```
POST /api/stars/story
Content-Type: application/json

{ "content": "用户输入的心事（1~300字）" }
```

### 3. 共鸣点亮

```
POST /api/stars/:id/resonate
```

---

## Phase 4：编译验证（B 执行）

```bash
cd server
npm run build    # tsc 编译，产物在 dist/
```

预期：零错误，`dist/` 生成 JS 文件。

---

## Phase 5：部署上线

### 5.1 ECS 环境准备

```bash
# 安装 Node.js ≥22（必须支持 node:sqlite）
node --version   # 应 ≥ 22.5

# 安装 PM2
npm install -g pm2

# 安装 Nginx
# (Ubuntu) apt install nginx
# (CentOS) yum install nginx
```

### 5.2 后端部署

```bash
# 上传 server/ 到 ECS
scp -r server/ user@ecs-ip:/var/www/star-server/

# 在 ECS 上
cd /var/www/star-server
npm install --production
mkdir -p data
npm run seed          # 注入冷启动数据
pm2 start dist/index.js --name star-api
pm2 save
pm2 startup           # 开机自启
```

### 5.3 前端构建

```bash
cd client
npm run build         # Vite 构建，产物在 dist/
```

### 5.4 Nginx 配置

创建 `/etc/nginx/conf.d/star.conf`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 反向代理后端 API
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # CORS
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'Content-Type' always;

        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }

    # 前端静态资源
    location / {
        root /var/www/star-client/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
nginx -t              # 测试配置
nginx -s reload       # 重载
```

### 5.5 线上验证

```bash
curl https://your-domain.com/api/stars
curl https://your-domain.com/api/health
curl -X POST https://your-domain.com/api/stars/story \
  -H "Content-Type: application/json" \
  -d '{"content":"线上测试"}'
```

---

## 注意事项

- **Node 版本必须 ≥22.5**，否则 `node:sqlite` 不可用
- 后端端口默认 `3000`，无需修改
- 跨域已配置 `cors()`，任意来源可访问
- 数据库文件在 `server/data/stars.db`，备份只需复制此文件
