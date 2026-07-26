#!/usr/bin/env bash
# ============================================
# 星语穹庭 一键部署脚本（Debian 13）
# 用法: bash deploy/deploy.sh
# ============================================

set -e

APP_DIR="/var/www/star-empathy-platform"
LOG_FILE="${APP_DIR}/deploy.log"

echo "🚀 星语穹庭 部署开始..."
echo "日志文件: ${LOG_FILE}"

# ---------- 1. 系统依赖检查 ----------
echo "
📦 [1/8] 检查系统依赖..."

check_cmd() {
    command -v "$1" >/dev/null 2>&1
}

if ! check_cmd node; then
    echo "❌ Node.js 未安装，请先安装 Node.js ≥22.5"
    echo "   curl -fsSL https://deb.nodesource.com/setup_22.x | bash -"
    echo "   apt install -y nodejs"
    exit 1
fi

NODE_VER=$(node -v | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
NODE_MINOR=$(echo "$NODE_VER" | cut -d. -f2)
if [ "$NODE_MAJOR" -lt 22 ] || ([ "$NODE_MAJOR" -eq 22 ] && [ "$NODE_MINOR" -lt 5 ]); then
    echo "❌ Node.js 版本过低 (v${NODE_VER})，需要 ≥22.5"
    exit 1
fi
echo "   ✅ Node.js v${NODE_VER}"

if ! check_cmd npm; then echo "❌ npm 未安装"; exit 1; fi
echo "   ✅ npm"

if ! check_cmd pm2; then
    echo "   ⚠️  PM2 未安装，正在安装..."
    npm install -g pm2
fi
echo "   ✅ PM2"

if ! check_cmd nginx; then
    echo "   ⚠️  Nginx 未安装，正在安装..."
    apt update -qq && apt install -y nginx
fi
echo "   ✅ Nginx"

# ---------- 2. 拉取代码 ----------
echo "
📥 [2/8] 获取最新代码..."

if [ -d "${APP_DIR}/.git" ]; then
    cd "${APP_DIR}"
    git fetch origin
    git checkout main
    git checkout -- .
    git pull origin main
    echo "   ✅ 已更新到最新"
else
    echo "   ⚠️  目录不存在，正在 clone..."
    mkdir -p /var/www
    git clone https://github.com/RynOrca/star-empathy-platform.git "${APP_DIR}"
    cd "${APP_DIR}"
    echo "   ✅ 克隆完成"
fi

# ---------- 3. 环境变量 ----------
echo "
🔐 [3/8] 检查环境变量..."

if [ ! -f "${APP_DIR}/server/.env" ]; then
    echo "   ⚠️  server/.env 不存在，从 .env.example 复制..."
    cp "${APP_DIR}/server/.env.example" "${APP_DIR}/server/.env"
    echo "   ❗ 请手动编辑 ${APP_DIR}/server/.env 设置 JWT_SECRET"
    echo "      然后重新运行此脚本"
    exit 0
fi

if grep -q "change-this-to" "${APP_DIR}/server/.env"; then
    echo "   ❗ JWT_SECRET 仍是默认值，请修改后重新运行"
    exit 1
fi
echo "   ✅ 环境变量就绪"

# ---------- 4. 后端构建 ----------
echo "
🏗️  [4/8] 构建后端..."

cd "${APP_DIR}/server"
npm install
npm run build
npm prune --production
echo "   ✅ 后端构建完成"

# ---------- 5. 前端构建 ----------
echo "
🏗️  [5/8] 构建前端..."

cd "${APP_DIR}/client"
npm install
npm run build
echo "   ✅ 前端构建完成"

# ---------- 6. 数据库初始化 ----------
echo "
🗄️  [6/8] 数据库初始化..."

cd "${APP_DIR}/server"
mkdir -p data
if [ ! -f "data/stars.db" ]; then
    npm run seed
    echo "   ✅ 冷启动数据已注入"
else
    echo "   ℹ️  数据库已存在，跳过 seed"
fi

# ---------- 7. 启动服务 ----------
echo "
⚙️  [7/8] 启动后端服务..."

cd "${APP_DIR}"
if pm2 list | grep -q "star-api"; then
    pm2 restart ecosystem.config.js
    echo "   ✅ 服务已重启"
else
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup
    echo "   ✅ 服务已启动并设置开机自启"
fi

# ---------- 8. Nginx 配置 ----------
echo "
🌐 [8/8] 检查 Nginx 配置..."

NGINX_CONF="/etc/nginx/conf.d/star-empathy.conf"
if [ ! -f "${NGINX_CONF}" ]; then
    cp "${APP_DIR}/deploy/nginx.conf.template" "${NGINX_CONF}"
    echo "   ❗ 请编辑 ${NGINX_CONF} 替换 your-domain.com 为实际域名"
    echo "      然后执行: nginx -t && nginx -s reload"
else
    echo "   ℹ️  Nginx 配置已存在，跳过"
fi

# ---------- 完成 ----------
echo "
🎉 部署完成！
───────────────────────────
后端: http://localhost:3000
健康检查: http://localhost:3000/api/health
───────────────────────────
"

pm2 status
