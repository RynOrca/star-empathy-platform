# ============================================
# 星语穹庭 本地部署脚本
# 用法: powershell -File deploy\deploy-local.ps1
# ============================================

param(
    [switch]$SkipInstall,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

# ---------- 读取配置 ----------
$envFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envFile)) {
    Write-Error "未找到 deploy\.env，请先复制 deploy\.env.example 并填写配置"
    exit 1
}

Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([^#=][^=]*)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2])
    }
}

$SERVER_IP = $env:SERVER_IP
$SERVER_USER = $env:SERVER_USER
$DOMAIN = $env:DOMAIN
$JWT_SECRET = $env:JWT_SECRET

if (-not $SERVER_IP -or -not $DOMAIN -or -not $JWT_SECRET) {
    Write-Error "deploy\.env 配置不完整，请检查 SERVER_IP, DOMAIN, JWT_SECRET"
    exit 1
}

$SSH_TARGET = "$SERVER_USER@$SERVER_IP"
Write-Host "🚀 开始部署到 $DOMAIN ($SERVER_IP)" -ForegroundColor Cyan

function Invoke-Ssh {
    param([string]$Command)
    Write-Host "  [SSH] $($Command.Substring(0, [Math]::Min(80, $Command.Length)))..." -ForegroundColor Gray
    $output = ssh -o StrictHostKeyChecking=no $SSH_TARGET $Command 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "命令执行失败: $Command`n$output"
        exit 1
    }
    return $output
}

# ---------- 阶段 1: 系统环境 ----------
if (-not $SkipInstall) {
    Write-Host "`n📦 [1/6] 安装系统依赖..." -ForegroundColor Yellow
    Invoke-Ssh "apt update -qq && apt upgrade -y -qq 2>&1 | tail -3"
    Invoke-Ssh "apt install -y -qq curl wget git ufw 2>&1 | tail -1"

    # Node.js
    $nodeVer = Invoke-Ssh "node -v 2>/dev/null || echo 'none'"
    if ($nodeVer -match 'none' -or $nodeVer -notmatch 'v(\d+)') {
        Write-Host "  安装 Node.js 22..."
        Invoke-Ssh "curl -fsSL https://deb.nodesource.com/setup_22.x | bash - > /dev/null 2>&1 && apt install -y -qq nodejs 2>&1 | tail -1"
    } else {
        $major = [int]$Matches[1]
        if ($major -lt 22) {
            Write-Host "  Node.js 版本过低 ($nodeVer)，升级到 22..."
            Invoke-Ssh "curl -fsSL https://deb.nodesource.com/setup_22.x | bash - > /dev/null 2>&1 && apt install -y -qq nodejs 2>&1 | tail -1"
        }
    }

    # PM2
    Invoke-Ssh "which pm2 > /dev/null 2>&1 || npm install -g pm2 -s"

    # Nginx
    Invoke-Ssh "which nginx > /dev/null 2>&1 || (apt install -y -qq nginx 2>&1 | tail -1)"

    # 防火墙
    Invoke-Ssh "ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && (ufw --force enable 2>&1 || true)"

    Write-Host "  ✅ 环境就绪" -ForegroundColor Green
    Invoke-Ssh "echo 'Node:' && node -v && echo 'PM2:' && pm2 -v && echo 'Nginx:' && nginx -v 2>&1"
}

# ---------- 阶段 2: 拉取代码 ----------
Write-Host "`n📥 [2/6] 获取代码..." -ForegroundColor Yellow
$appDir = "/var/www/star-empathy-platform"
$exists = Invoke-Ssh "test -d $appDir/.git && echo yes || echo no"
if ($exists -match 'yes') {
    Invoke-Ssh "cd $appDir && git fetch origin && git checkout main && git checkout -- . && git pull origin main 2>&1"
} else {
    Invoke-Ssh "mkdir -p /var/www && cd /var/www && git clone https://github.com/RynOrca/star-empathy-platform.git 2>&1"
}
Write-Host "  ✅ 代码就绪" -ForegroundColor Green

# ---------- 阶段 3: 环境变量 ----------
Write-Host "`n🔐 [3/6] 配置环境变量..." -ForegroundColor Yellow
Invoke-Ssh "cat > $appDir/server/.env << 'ENVEOF'
JWT_SECRET=$JWT_SECRET
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://$DOMAIN,https://www.$DOMAIN
ENVEOF"
Write-Host "  ✅ server/.env 已写入" -ForegroundColor Green

# ---------- 阶段 4: 构建 ----------
if (-not $SkipBuild) {
    Write-Host "`n🏗️  [4/6] 构建后端..." -ForegroundColor Yellow
    Invoke-Ssh "cd $appDir/server && npm install --production --silent 2>&1 | tail -3"
    Invoke-Ssh "cd $appDir/server && npm run build 2>&1 | tail -5"
    Write-Host "  ✅ 后端构建完成" -ForegroundColor Green

    Write-Host "`n🏗️  [4.5/6] 构建前端..." -ForegroundColor Yellow
    Invoke-Ssh "cd $appDir/client && npm install --silent 2>&1 | tail -3"
    Invoke-Ssh "cd $appDir/client && npm run build 2>&1 | tail -5"
    Write-Host "  ✅ 前端构建完成" -ForegroundColor Green
}

# ---------- 阶段 5: 数据库 & 启动 ----------
Write-Host "`n🗄️  [5/6] 数据库 & 启动服务..." -ForegroundColor Yellow
Invoke-Ssh "cd $appDir/server && mkdir -p data"
$dbExists = Invoke-Ssh "test -f $appDir/server/data/stars.db && echo yes || echo no"
if ($dbExists -notmatch 'yes') {
    Invoke-Ssh "cd $appDir/server && npm run seed 2>&1"
    Write-Host "  ✅ 冷启动数据已注入" -ForegroundColor Green
} else {
    Write-Host "  ℹ️  数据库已存在，跳过 seed" -ForegroundColor Gray
}

# 启动服务
$pm2Exists = Invoke-Ssh "pm2 list 2>/dev/null | grep star-api | wc -l"
if ($pm2Exists -match '0') {
    Invoke-Ssh "cd $appDir && pm2 start ecosystem.config.js 2>&1 && pm2 save 2>&1 && pm2 startup systemd 2>&1 | tail -1"
} else {
    Invoke-Ssh "cd $appDir && pm2 restart ecosystem.config.js 2>&1"
}
Write-Host "  ✅ 后端服务已启动" -ForegroundColor Green

# ---------- 阶段 6: Nginx ----------
Write-Host "`n🌐 [6/6] 配置 Nginx..." -ForegroundColor Yellow
$nginxConf = @"/etc/nginx/conf.d/star-empathy.conf"
$nginxExists = Invoke-Ssh "test -f $nginxConf && echo yes || echo no"
if ($nginxExists -notmatch 'yes') {
    Invoke-Ssh "cat > $nginxConf << 'NGINXEOF'
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        root $appDir/client/dist;
        try_files `$uri `$uri/ /index.html;
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;
}
NGINXEOF"
    Write-Host "  ✅ Nginx 配置已写入" -ForegroundColor Green
} else {
    Write-Host "  ℹ️  Nginx 配置已存在，跳过（如需修改请手动编辑 $nginxConf）" -ForegroundColor Gray
}

Invoke-Ssh "nginx -t 2>&1 && nginx -s reload 2>&1 || true"

# ---------- 完成 ----------
Write-Host "`n`n🎉 部署完成！" -ForegroundColor Green
Write-Host "═══════════════════════════════════════"
Write-Host "  网站: http://$DOMAIN"
Write-Host "  API:  http://$DOMAIN/api/health"
Write-Host "═══════════════════════════════════════`n"

Write-Host "服务状态:" -ForegroundColor Cyan
Invoke-Ssh "pm2 status 2>&1"
