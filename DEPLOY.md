# 云端部署手册 — Nocturne Memory

> 目标环境：Ubuntu 20.04 +，Docker Compose 一键拉起全栈。

---

## 一、前提条件

### 1. 安装 Docker + Docker Compose

若服务器已安装 Docker（`docker --version` 能返回版本号），跳过此步。

```bash
# 安装 Docker Engine（官方脚本，一行搞定）
curl -fsSL https://get.docker.com | sudo sh

# 将当前用户加入 docker 组（避免每次都加 sudo）
sudo usermod -aG docker $USER
newgrp docker          # 或重新登录 SSH 使组生效

# 验证
docker --version       # Docker version 25.x.x
docker compose version # Docker Compose version v2.x.x
```

---

## 二、克隆代码

```bash
# 选一个合适的目录，例如 /opt
cd /opt

# 公开仓库，直接 HTTPS 克隆（无需配置 SSH Key）
git clone https://github.com/Lyndall24/nocturne_memory_plusmax.git
cd nocturne_memory_plusmax
```

---

## 三、配置 .env

```bash
cp .env.example .env
nano .env        # 或 vim .env
```

将以下字段全部填写（**不要留默认占位符**）：

```dotenv
# ── 数据库 ──────────────────────────────────────────────
POSTGRES_DB=nocturne_memory
POSTGRES_USER=nocturne
POSTGRES_PASSWORD=你的强密码_至少16位

# ── 业务配置 ─────────────────────────────────────────────
# 合法的记忆域（逗号分隔，按需改）
VALID_DOMAINS=core,writer,game,notes

# 启动时自动加载的核心记忆 URI（逗号分隔，按需改）
CORE_MEMORY_URIS=core://agent,core://my_user,core://agent/my_user

# ── 安全 ────────────────────────────────────────────────
# 强烈建议设置；留空则所有人可免密访问
API_TOKEN=你的强Token_至少32位随机字符串

# ── 端口 ────────────────────────────────────────────────
# 如果 80 端口已被占用，改成其他端口，例如 8080
NGINX_PORT=80
```

> **生成随机 token 的命令：**
> ```bash
> openssl rand -hex 32
> ```

---

## 四、启动全栈

```bash
# 在仓库根目录下执行
docker compose up -d --build
```

首次执行会拉取镜像并构建前后端，通常需要 3～8 分钟，取决于网速和服务器配置。

---

## 五、验证服务健康

```bash
# 查看所有容器状态（应全部 Up / healthy）
docker compose ps

# 查看实时日志（Ctrl+C 退出）
docker compose logs -f

# 单独查看某个服务的日志
docker compose logs -f backend-api
docker compose logs -f nginx
```

预期输出（`docker compose ps`）：

```
NAME              SERVICE       STATUS          PORTS
...-postgres-1    postgres      Up (healthy)
...-backend-api-1 backend-api   Up (healthy)
...-backend-sse-1 backend-sse   Up
...-nginx-1       nginx         Up              0.0.0.0:80->80/tcp
```

### 接口健康检查

```bash
# 后端 REST 健康端点（通过 nginx 代理）
curl http://localhost/api/health

# 期望返回：{"status":"ok"} 或类似 JSON
```

浏览器访问 `http://<服务器IP>` 即可看到 Nocturne Memory 管理面板。

---

## 六、更新代码（拉新版本重部署）

```bash
cd /opt/nocturne_memory_plusmax

# 拉取最新代码
git pull origin main

# 重新构建并热更新（不停数据库，仅重建变化的服务）
docker compose up -d --build
```

> **如果后端数据库 schema 有变动**，后端服务启动时会自动执行迁移（`backend-api` 的 healthcheck 通过后才拉起 `backend-sse`），无需手动操作。

---

## 七、常用运维命令

```bash
# 停止所有服务（数据不丢失）
docker compose stop

# 停止并删除容器（数据卷保留，再次 up 数据仍在）
docker compose down

# 彻底清除，包括数据库数据卷（⚠️ 不可恢复）
docker compose down -v

# 查看磁盘占用
docker system df

# 清理构建缓存（节省磁盘）
docker builder prune -f
```

---

## 八、开放云服务器防火墙

若使用云服务商（阿里云、腾讯云、AWS 等），需要在**安全组/防火墙**规则里放行对应端口：

| 端口 | 用途 | 来源 |
|------|------|------|
| 22   | SSH  | 你的 IP |
| 80（或 NGINX_PORT）| 前端 + API | 0.0.0.0/0 |
| 443  | HTTPS（如配置 TLS）| 0.0.0.0/0 |

> **注意**：8000 和 8001（后端端口）由 Docker 内部网络管理，**不需要**对外暴露。

---

## 九、配置 HTTPS（可选，推荐生产环境）

最简方案：用 Caddy 反代 nginx 容器，自动申请 Let's Encrypt 证书。

```bash
# 安装 Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy

# 将 NGINX_PORT 改为非 80（避免冲突），例如：
# NGINX_PORT=8080  （在 .env 里修改）

# 创建 Caddyfile（替换 your.domain.com）
sudo tee /etc/caddy/Caddyfile <<'EOF'
your.domain.com {
    reverse_proxy localhost:8080
}
EOF

sudo systemctl reload caddy
```

---

## 快速参考

| 动作 | 命令 |
|------|------|
| 首次部署 | `docker compose up -d --build` |
| 拉新版本 | `git pull && docker compose up -d --build` |
| 查看状态 | `docker compose ps` |
| 查看日志 | `docker compose logs -f` |
| 停止服务 | `docker compose stop` |
| 访问面板 | `http://<服务器IP>` |
