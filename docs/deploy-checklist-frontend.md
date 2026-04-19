# Frontend Deploy Checklist — Nocturne Memory Plusmax

只改前端（React 组件、样式、UX）时使用。后端未变 → 不需要重启 systemd 服务、不需要跑 migration。

---

**Release / PR:** _________
**Date:** _________
**Deployer:** _________

---

## Pre-Deploy（本地）

- [ ] PR 有人 review（至少一次自审），或在 PR 描述里注明 solo-reviewed
- [ ] `cd frontend && npm run build` 本地通过，无新增警告
- [ ] 开发环境（`npm run dev`）手动点一遍改动的页面：
  - Review / Memory Explorer / Maintenance 都能打开无 console.error
  - 新增的交互（按钮、快捷键、弹窗、toast）实际触发一次
- [ ] 如果改了 `package.json` 的 deps → `package-lock.json` 一起提交
- [ ] 如果改了 `api.js` 的调用或参数 → 与后端实际接口对齐
- [ ] PR 已 merge 到 `main`

---

## Deploy（服务器 `root@81.70.92.54`）

> 当前服务器的 git 分支是 `feat/initial-vibe-coding`（不是 main）。
> 正确做法是**在 feat 分支上 merge origin/main**，保留后端独有 commit。

```bash
ssh root@81.70.92.54
cd /root/nocturne_memory_plusmax

# 1. 记录 before 状态
echo "[before] $(git rev-parse --short HEAD) on $(git branch --show-current)"

# 2. 同步代码
git fetch origin
git merge origin/main --no-edit        # 如果在 feat 分支
# 或 git pull origin main               # 如果服务器切到 main 了

# 3. 构建
cd frontend
npm ci 2>&1 | tail -5 || npm install 2>&1 | tail -5
npm run build 2>&1 | tail -15

# 4. 备份 + 部署
BACKUP=/var/www/nocturne_memory_plusmax.backup.$(date +%Y%m%d_%H%M%S)
cp -a /var/www/nocturne_memory_plusmax "$BACKUP"
echo "Backup: $BACKUP"
rsync -a --delete /root/nocturne_memory_plusmax/frontend/dist/ /var/www/nocturne_memory_plusmax/
ls -la /var/www/nocturne_memory_plusmax/
```

- [ ] 备份路径已记录（后面 rollback 用）：`_______________________________`

---

## Smoke Test

```bash
# 服务器本地
ssh root@81.70.92.54 '
  echo "=== HTTP ===";
  curl -sI http://127.0.0.1/ | head -3;
  echo "=== 新 asset hash ===";
  grep -oE "assets/index-[A-Za-z0-9_-]+\.(js|css)" /var/www/nocturne_memory_plusmax/index.html;
  echo "=== API proxy ===";
  curl -sI http://127.0.0.1/api/browse/domains | head -2;
  echo "=== services ===";
  systemctl is-active nocturne-plusmax-api nocturne-plusmax-mcp nginx
'
```

- [ ] HTTP 首页 200 OK
- [ ] `index.html` 引用的 asset hash 已更新（跟本地 build 输出一致）
- [ ] nginx `/api/` 返回 401（未鉴权就 401 说明 proxy 通到后端了）
- [ ] 三个 systemd 服务都 active

---

## 浏览器验证

- [ ] 强刷首页（`Cmd+Shift+R` / `Ctrl+Shift+R`）—— 旧 `index.html` 可能被缓存
- [ ] 登录进去，三个主页面各打开一次，确认无红屏、无 console.error
- [ ] 实际走一遍工作流：Memory Explorer 打开一个节点 → 编辑一个字段 → 保存 → 看到成功反馈

---

## Post-Deploy（15 分钟观察窗口）

```bash
# 后端 API 错误日志
ssh root@81.70.92.54 'journalctl -u nocturne-plusmax-api -n 50 --since "10 min ago" | grep -iE "error|exception|traceback" || echo "clean"'

# nginx 5xx
ssh root@81.70.92.54 'tail -n 100 /var/log/nginx/error.log | grep -iE "error|5[0-9][0-9]" || echo "clean"'
```

- [ ] 后端日志无新增 ERROR / Traceback
- [ ] nginx 错误日志无 5xx 上升
- [ ] 自己再做一轮关键操作（比如审核通过一条变更）无异常

---

## Rollback

```bash
ssh root@81.70.92.54 "rsync -a --delete <上面记录的 BACKUP 路径>/ /var/www/nocturne_memory_plusmax/"
```

后端本次未动，**不需要回滚后端**。

### Rollback 触发条件

- 首页打不开 / 白屏 / 404
- 登录流程失败
- 核心操作（审核、编辑、浏览）任何一个阻塞性 bug
- 浏览器 console 反复出现未捕获异常
- 出现不应出现的 401 / CORS 错误（说明前后端契约破了）

---

## Housekeeping（不紧急但别忘）

- [ ] `/var/www/*.backup.*` 超过 3 个 → 删最老的
- [ ] 服务器 git 分支如果有本地独有 commit（如 merge commit）→ 考虑 push 回 GitHub 对齐三端
- [ ] 如果 `package.json` version bump 了 → 打 git tag + 写 release notes

---

## 附：服务器关键路径速查

```
/root/nocturne_memory_plusmax/           ← git repo
├── frontend/dist/                       ← npm run build 产物
├── .venv/                               ← 后端 Python venv
└── .env                                 ← systemd 读这个

/var/www/nocturne_memory_plusmax/        ← nginx 实际 serve 路径（rsync 目标）

/etc/systemd/system/
├── nocturne-plusmax-api.service         ← uvicorn :8002
└── nocturne-plusmax-mcp.service         ← run_sse.py :8003

/etc/nginx/sites-enabled/
└── nocturne-memory.conf                 ← 路由 /, /api/, /mcp, /sse, /openclaw/
```
