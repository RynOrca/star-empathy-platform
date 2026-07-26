# SSH 连接服务器

## 首次连接（Windows PowerShell）

### 方式一：密码连接

```powershell
ssh root@你的服务器IP
```

### 方式二：配置密钥无密码连接（推荐，用于自动化部署）

```powershell
# 1. 本地生成 SSH 密钥（如果没有）
ssh-keygen -t rsa -b 4096 -f "$env:USERPROFILE\.ssh\id_rsa" -N '""'

# 2. 用密码首次连接，把公钥上传到服务器
#    把下面 YOUR_PUBLIC_KEY 换成 $env:USERPROFILE\.ssh\id_rsa.pub 的内容
ssh root@你的服务器IP "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo 'YOUR_PUBLIC_KEY' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"

# 3. 测试无密码连接
ssh root@你的服务器IP "echo '连接成功'"
```

### 部署配置文件

在 `deploy/.env` 中配置服务器信息（不会提交到 git）：

```
SERVER_IP=你的服务器IP
SERVER_USER=root
SERVER_PASSWORD=你的SSH密码（可选，密钥连接不需要）
DOMAIN=你的域名.com
JWT_SECRET=一长串随机字符
```

复制模板：`copy deploy\.env.example deploy\.env`

## 首次连接后建议做的事

```bash
# 1. 更新系统
apt update && apt upgrade -y

# 2. 安装基础工具
apt install -y curl wget git vim ufw

# 3. 配置防火墙（只开放必要端口）
ufw allow 22       # SSH
ufw allow 80       # HTTP
ufw allow 443      # HTTPS
ufw enable

# 4. 安装 Node.js ≥22.5
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v   # 应 ≥ 22.5

# 5. 安装 PM2
npm install -g pm2

# 6. 安装 Nginx
apt install -y nginx
```

## 确认环境就绪

```bash
node -v     # ≥ 22.5
npm -v
pm2 -v
nginx -v
```

全部就绪后，运行部署脚本：
```bash
bash deploy/deploy.sh
```
