# Backend Deploy Checklist — Nocturne Memory Plusmax

改了 `backend/` 下任何文件、`.env`、Python 依赖、或 DB schema 时使用。

> 通常配合 `deploy-checklist-frontend.md` 一起用 —— 即便只改后端，前端可能也需要 rebuild（比如 api.js 调用变化）。

---

**Release / PR:** _________
**Date:** _________
**Deployer:** _________
**变更类型:** [ ] 纯代码 [ ] 新依赖 [ ] Schema migration [ ] `.env` 新增变量 [ ] 破坏性 API 变更

---

## Pre-Deploy（本地）

- [ ] PR 有 review（至少自审）或注明 solo-reviewed
- [ ] `cd backend && pytest` 通过（或在 `pytest.ini` 覆盖的范围内）
- [ ] 有 schema 变更 → migration 脚本在**本地 DB / shadow DB** 上跑过，`upgrade` 和 `downgrade` 都验证
- [ ] 破坏性变更 → **先部兼容 migration**（双写 / 加新字段），等前端上线后再部清理 migration
- [ ] 新依赖 → `requirements.txt` 已更新并 commit
- [ ] 新增 `.env` 变量 → 在 PR 描述里写清楚变量名、含义、默认值
- [ ] API 变更 → 前端调用位置（通常是 `frontend/src/lib/api.js`）同步更新过
- [ ] PR merge 到 `main`

---

## Deploy（服务器 `root@81.70.92.54`）

> systemd 重启顺序：`api` 先，`mcp` 后。mcp depends on api。

```bash
ssh root@81.70.92.54
cd /root/nocturne_memory_plusmax

# 1. 记录 before 状态
git rev-parse --short HEAD

# 2. 同步代码
git fetch origin
git merge origin/main --no-edit        # 服务器在 feat 分支

# 3. 如有新 .env 变量，手动编辑
# nano .env
# ⚠️ 不要把 .env 加入 git

# 4. 更新 Python 依赖（有新依赖才需要）
source .venv/bin/activate
pip install -r backend/requirements.txt

# 5. 跑 migration（按项目实际方式；如果用 alembic）
cd backend
# alembic upgrade head
# 或者项目自定义的 migration 脚本
cd ..

# 6. 重启服务（按依赖顺序）
systemctl restart nocturne-plusmax-api
sleep 3
systemctl is-active nocturne-plusmax-api || { echo "api failed to start"; journalctl -u nocturne-plusmax-api -n 30; exit 1; }

systemctl restart nocturne-plusmax-mcp
sleep 3
systemctl is-active nocturne-plusmax-mcp || { echo "mcp failed to start"; journalctl -u nocturne-plusmax-mcp -n 30; exit 1; }
```

- [ ] 旧的 git HEAD 已记录：`_______________________________`
- [ ] 两个 systemd 服务都 `active (running)`

---

## Smoke Test

```bash
ssh root@81.70.92.54 '
  TOKEN=$(grep "^API_TOKEN=" /root/nocturne_memory_plusmax/.env | cut -d= -f2)

  echo "=== /health ===";
  curl -s http://127.0.0.1:8002/health || echo "no health endpoint";
  echo;

  echo "=== /api/browse/domains (authed) ===";
  curl -s -H "Authorization: Bearer $TOKEN" http://127.0.0.1:8002/browse/domains | head -c 200;
  echo;

  echo "=== MCP SSE (3s probe) ===";
  timeout 3 curl -Ns http://127.0.0.1:8003/sse | head -c 200 || echo "(sse closed as expected)";

  echo;
  echo "=== DB connection ===";
  systemctl status postgresql --no-pager | head -5;
'
```

- [ ] `/health` 返回 200（如果 endpoint 存在）
- [ ] `/browse/domains` 返回合法 JSON（不是 500 / 未授权异常）
- [ ] MCP SSE 能开启连接（即使立刻关闭也 OK，只要不是连接拒绝）
- [ ] PostgreSQL 服务 active

---

## 如果做了 Schema Migration（额外）

- [ ] 检查关键表的行数跟 migration 前对比无异常：
  ```bash
  ssh root@81.70.92.54 'sudo -u postgres psql <DB_NAME> -c "SELECT count(*) FROM memories; SELECT count(*) FROM paths;"'
  ```
- [ ] 如果是破坏性 migration → 确认前端已经用新字段 / 新契约
- [ ] 记录 migration 版本号（便于 downgrade）：`_________`

---

## Post-Deploy（30 分钟观察窗口）

```bash
# API 错误率
ssh root@81.70.92.54 'journalctl -u nocturne-plusmax-api -n 200 --since "30 min ago" | grep -iE "error|exception|traceback" | head -30'

# MCP SSE 连接问题
ssh root@81.70.92.54 'journalctl -u nocturne-plusmax-mcp -n 200 --since "30 min ago" | grep -iE "error|disconnect|timeout" | head -30'

# nginx 5xx 上升？
ssh root@81.70.92.54 'grep -E " 5[0-9]{2} " /var/log/nginx/access.log | tail -20'
```

- [ ] 后端 API 无新 ERROR / Traceback
- [ ] MCP SSE 长连接稳定（无异常断开）
- [ ] nginx 无新增 5xx
- [ ] 实际跑一次完整工作流（Claude 客户端读写记忆 + 管理后台审核通过）

---

## Rollback

```bash
ssh root@81.70.92.54 '
  cd /root/nocturne_memory_plusmax
  # 代码回滚
  git reset --hard <上面记录的旧 HEAD>

  # 依赖回退（如果之前装了新包）
  source .venv/bin/activate
  pip install -r backend/requirements.txt

  # Migration 反向（如果之前 upgrade 过）
  cd backend
  # alembic downgrade -1
  cd ..

  # 重启
  systemctl restart nocturne-plusmax-api
  sleep 3
  systemctl restart nocturne-plusmax-mcp
'
```

### Rollback 触发条件

- `/api/*` 出现 500 错误率 > 5%
- MCP SSE 连接反复断开（影响 Claude 客户端）
- PostgreSQL 出现死锁 / 连接池耗尽
- 30 分钟观察期内出现任何数据一致性问题
- 收到"记忆写不进去 / 读不出来"的反馈

---

## Housekeeping

- [ ] `.env` 有更新 → 本地 `.env.example`（如果有）同步加上变量名（值不要）
- [ ] Migration 完成 → 在 PR 描述里记录 migration 版本号
- [ ] 重大变更 → 更新 `docs/system_prompt.md` 里对记忆系统行为的描述（如果影响 AI 操作规范）
- [ ] 服务器 git 分支如果有 merge commit → 决定是否 push 回 GitHub

---

## 附：关键命令速查

```bash
# 服务状态
systemctl status nocturne-plusmax-api
systemctl status nocturne-plusmax-mcp

# 实时日志（Ctrl+C 退出）
journalctl -u nocturne-plusmax-api -f
journalctl -u nocturne-plusmax-mcp -f

# DB shell
sudo -u postgres psql <DB_NAME>

# Python venv 里跑脚本
source /root/nocturne_memory_plusmax/.venv/bin/activate
cd /root/nocturne_memory_plusmax/backend
python -c "..."
```
