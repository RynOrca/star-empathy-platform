# GitHub Actions 自动部署

## 前置条件

1. 服务器已完成首次手动部署（代码在 `/var/www/star-empathy-platform`）
2. 服务器已配置 SSH 公钥（见 `deploy/SSH.md`）

## 配置 GitHub Secrets

在仓库 **Settings → Secrets and variables → Actions** 中添加以下 Secret：

| Secret 名称 | 值 | 示例 |
|---|---|---|
| `SSH_HOST` | 服务器公网 IP | `43.160.255.5` |
| `SSH_USER` | SSH 用户名 | `root` |
| `SSH_PRIVATE_KEY` | 本地 SSH 私钥内容 | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `JWT_SECRET` | JWT 签名密钥 | 长随机字符串 |
| `ALLOWED_ORIGINS` | CORS 白名单（逗号分隔） | `https://starsempathy.site,https://www.starsempathy.site` |

### 获取 SSH 私钥

```powershell
# Windows
Get-Content "$env:USERPROFILE\.ssh\id_rsa"
```

复制全部内容（包括 `-----BEGIN` 和 `-----END` 行）粘贴到 `SSH_PRIVATE_KEY`。

## 触发部署

- **自动**：push 到 `main` 分支后自动部署
- **手动**：仓库 → Actions → Deploy to Server → Run workflow

## 工作流文件

`.github/workflows/deploy.yml`

部署步骤：
1. SSH 连接服务器
2. `git pull origin main` 拉取最新代码
3. 构建后端（`npm install` + `npm run build`）
4. 重启 PM2 服务
5. 构建前端（`npm install` + `npm run build`）
6. 重载 Nginx
