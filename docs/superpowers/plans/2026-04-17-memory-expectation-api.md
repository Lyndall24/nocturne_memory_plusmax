# Memory Expectation API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Nocturne Memory 后端新增 `/expectation` API，在 session 级别记录用户对记忆加载的偏好（加载强度、依赖程度、表达方式）。

**Architecture:** 新增 `Expectation` ORM 模型（独立表），通过 `session_id` 键值存取，生命周期为 session 级，可跨 session 继承。新增 `api/expectation.py` 路由文件，注册到 `main.py`。仅做 CRUD，不含推断逻辑（推断逻辑在 Plan B 的 Skill 中）。

**Tech Stack:** FastAPI, SQLAlchemy (async), PostgreSQL / SQLite, pytest-asyncio, httpx

---

## File Structure

| 文件 | 操作 | 职责 |
|------|------|------|
| `backend/db/models.py` | Modify | 新增 `Expectation` 模型 |
| `backend/db/migrations/` | Create | `add_expectation_table.sql` 迁移脚本 |
| `backend/api/expectation.py` | Create | `/expectation` 路由（GET / POST / DELETE） |
| `backend/api/__init__.py` | Modify | 导出 `expectation_router` |
| `backend/main.py` | Modify | 注册 `expectation_router` |
| `backend/tests/api/test_expectation.py` | Create | API 集成测试 |

---

### Task 1: 添加 `Expectation` ORM 模型

**Files:**
- Modify: `backend/db/models.py`

- [ ] **Step 1: 在 `models.py` 末尾添加 `Expectation` 类**

在文件末尾（`ChangeCollector` 类之前）追加：

```python
class Expectation(Base):
    """Session-level user preferences for memory loading behavior.

    Controls three axes of memory injection:
    - intensity: how much historical memory to load (0=none, 1=normal, 2=full)
    - dependency: how strongly the reply should depend on memory context (0=weak, 1=normal, 2=strong)
    - expression: whether to explicitly cite loaded memories (0=silent, 1=reference, 2=explicit)
    """

    __tablename__ = "expectations"

    session_id = Column(String(128), primary_key=True)
    intensity = Column(Integer, default=1)   # 0=none  1=normal  2=full
    dependency = Column(Integer, default=1)  # 0=weak  1=normal  2=strong
    expression = Column(Integer, default=1)  # 0=silent 1=reference 2=explicit
    note = Column(Text, nullable=True)       # 用户原话/推断依据，可选
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

- [ ] **Step 2: 确认导入无误 —— 运行一次 import 检查**

```bash
cd /Users/lyn/nocturne_memory_plusmax/backend
python -c "from db.models import Expectation; print(Expectation.__tablename__)"
```

期望输出：`expectations`

- [ ] **Step 3: Commit**

```bash
git add backend/db/models.py
git commit -m "feat: add Expectation ORM model for session-level memory loading preferences"
```

---

### Task 2: 添加数据库迁移脚本

**Files:**
- Create: `backend/db/migrations/004_add_expectation_table.sql`

- [ ] **Step 1: 写迁移 SQL**

```sql
-- 004_add_expectation_table.sql
CREATE TABLE IF NOT EXISTS expectations (
    session_id  VARCHAR(128) PRIMARY KEY,
    intensity   INTEGER NOT NULL DEFAULT 1,
    dependency  INTEGER NOT NULL DEFAULT 1,
    expression  INTEGER NOT NULL DEFAULT 1,
    note        TEXT,
    updated_at  TIMESTAMP DEFAULT NOW()
);
```

- [ ] **Step 2: 确认 `init_db()` 会自动建表**

Nocturne 使用 `Base.metadata.create_all`，新模型注册后会自动建表（开发环境不需要手动执行迁移 SQL）。

验证：

```bash
cd /Users/lyn/nocturne_memory_plusmax/backend
python -c "
import asyncio
from db.database import DatabaseManager
import os
os.environ['DATABASE_URL'] = 'sqlite+aiosqlite:///./test_expectation_check.db'
async def check():
    dm = DatabaseManager(os.environ['DATABASE_URL'])
    await dm.init_db()
    print('init_db OK')
    await dm.close()
asyncio.run(check())
"
rm -f backend/test_expectation_check.db
```

期望输出：`init_db OK`

- [ ] **Step 3: Commit**

```bash
git add backend/db/migrations/004_add_expectation_table.sql
git commit -m "feat: add migration SQL for expectations table"
```

---

### Task 3: 写失败测试（TDD 先行）

**Files:**
- Create: `backend/tests/api/test_expectation.py`

- [ ] **Step 1: 写测试文件**

```python
"""Tests for /expectation API endpoints."""
import pytest


async def test_get_expectation_returns_defaults_when_not_set(api_client):
    response = await api_client.get("/expectation/session-abc")

    assert response.status_code == 200
    payload = response.json()
    assert payload["session_id"] == "session-abc"
    assert payload["intensity"] == 1
    assert payload["dependency"] == 1
    assert payload["expression"] == 1


async def test_post_expectation_persists_and_returns_updated_values(api_client):
    response = await api_client.post(
        "/expectation/session-xyz",
        json={"intensity": 2, "dependency": 0, "expression": 1, "note": "继续项目A"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["intensity"] == 2
    assert payload["dependency"] == 0
    assert payload["note"] == "继续项目A"


async def test_post_expectation_is_idempotent_upsert(api_client):
    await api_client.post("/expectation/session-xyz", json={"intensity": 2})
    response = await api_client.post("/expectation/session-xyz", json={"intensity": 0})

    assert response.status_code == 200
    assert response.json()["intensity"] == 0


async def test_get_expectation_reflects_previously_posted_values(api_client):
    await api_client.post(
        "/expectation/session-persist",
        json={"intensity": 2, "dependency": 2, "expression": 0},
    )

    response = await api_client.get("/expectation/session-persist")
    payload = response.json()

    assert payload["intensity"] == 2
    assert payload["dependency"] == 2
    assert payload["expression"] == 0


async def test_delete_expectation_resets_to_defaults(api_client):
    await api_client.post("/expectation/session-del", json={"intensity": 2})
    del_response = await api_client.delete("/expectation/session-del")
    assert del_response.status_code == 200

    get_response = await api_client.get("/expectation/session-del")
    assert get_response.json()["intensity"] == 1  # back to default


async def test_post_expectation_rejects_out_of_range_values(api_client):
    response = await api_client.post(
        "/expectation/session-bad",
        json={"intensity": 5},
    )
    assert response.status_code == 422
```

- [ ] **Step 2: 运行测试，确认全部 FAIL（路由不存在）**

```bash
cd /Users/lyn/nocturne_memory_plusmax
python -m pytest backend/tests/api/test_expectation.py -v 2>&1 | head -40
```

期望：6 个 FAILED，错误类型为 404 或 import error，不是 500。

---

### Task 4: 实现 `api/expectation.py`

**Files:**
- Create: `backend/api/expectation.py`

- [ ] **Step 1: 创建路由文件**

```python
"""
Expectation API - Session-level memory loading preferences.

Stores user preferences for how memories should be loaded and expressed.
Intensity / dependency / expression each range 0-2.
"""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db_manager
from db.models import Expectation

router = APIRouter(prefix="/expectation", tags=["expectation"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ExpectationPayload(BaseModel):
    intensity: Annotated[int, Field(ge=0, le=2)] = 1
    dependency: Annotated[int, Field(ge=0, le=2)] = 1
    expression: Annotated[int, Field(ge=0, le=2)] = 1
    note: str | None = None


class ExpectationResponse(BaseModel):
    session_id: str
    intensity: int
    dependency: int
    expression: int
    note: str | None
    updated_at: datetime | None


# ---------------------------------------------------------------------------
# DB helper
# ---------------------------------------------------------------------------

async def _get_or_default(session: AsyncSession, session_id: str) -> ExpectationResponse:
    result = await session.execute(
        select(Expectation).where(Expectation.session_id == session_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        return ExpectationResponse(
            session_id=session_id,
            intensity=1,
            dependency=1,
            expression=1,
            note=None,
            updated_at=None,
        )
    return ExpectationResponse(
        session_id=row.session_id,
        intensity=row.intensity,
        dependency=row.dependency,
        expression=row.expression,
        note=row.note,
        updated_at=row.updated_at,
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/{session_id}", response_model=ExpectationResponse)
async def get_expectation(session_id: str):
    """Return current expectation for a session, or defaults if not set."""
    db = get_db_manager()
    async with db.session() as s:
        return await _get_or_default(s, session_id)


@router.post("/{session_id}", response_model=ExpectationResponse)
async def upsert_expectation(session_id: str, payload: ExpectationPayload):
    """Create or update expectation for a session (upsert)."""
    db = get_db_manager()
    async with db.session() as s:
        result = await s.execute(
            select(Expectation).where(Expectation.session_id == session_id)
        )
        row = result.scalar_one_or_none()
        if row is None:
            row = Expectation(session_id=session_id)
            s.add(row)
        row.intensity = payload.intensity
        row.dependency = payload.dependency
        row.expression = payload.expression
        row.note = payload.note
        row.updated_at = datetime.utcnow()
        await s.flush()
        return ExpectationResponse(
            session_id=row.session_id,
            intensity=row.intensity,
            dependency=row.dependency,
            expression=row.expression,
            note=row.note,
            updated_at=row.updated_at,
        )


@router.delete("/{session_id}")
async def delete_expectation(session_id: str):
    """Remove stored expectation (session will revert to defaults)."""
    db = get_db_manager()
    async with db.session() as s:
        result = await s.execute(
            select(Expectation).where(Expectation.session_id == session_id)
        )
        row = result.scalar_one_or_none()
        if row is not None:
            await s.delete(row)
    return {"deleted": session_id}
```

- [ ] **Step 2: 运行测试，确认通过**

```bash
cd /Users/lyn/nocturne_memory_plusmax
python -m pytest backend/tests/api/test_expectation.py -v
```

期望：6 个 PASSED。

如果有 FAIL，先看报错类型：
- `AttributeError: 'DatabaseManager' object has no attribute 'session'` → 检查 `db/database.py` 里 `session()` 的方法名（browse.py 里也在用，参考它的用法）
- `422 Unprocessable Entity` on 正常请求 → 检查 `ExpectationPayload` schema

---

### Task 5: 注册路由到 `main.py`

**Files:**
- Modify: `backend/api/__init__.py`
- Modify: `backend/main.py`

- [ ] **Step 1: 在 `api/__init__.py` 导出 `expectation_router`**

```python
from .review import router as review_router
from .browse import router as browse_router
from .maintenance import router as maintenance_router
from .expectation import router as expectation_router
```

- [ ] **Step 2: 在 `main.py` 注册路由**

在 `app.include_router(maintenance_router)` 行后追加：

```python
from api import review_router, browse_router, maintenance_router, expectation_router
# ...（已有 include_router 调用之后）
app.include_router(expectation_router)
```

- [ ] **Step 3: 运行全量测试确认无回归**

```bash
cd /Users/lyn/nocturne_memory_plusmax
python -m pytest backend/tests/ -v --tb=short 2>&1 | tail -20
```

期望：原有测试全部 PASSED，新增 6 个 PASSED。

- [ ] **Step 4: Commit**

```bash
git add backend/api/expectation.py backend/api/__init__.py backend/main.py backend/tests/api/test_expectation.py
git commit -m "feat: add /expectation API for session-level memory loading preferences"
```

---

### Task 6: 云端部署

- [ ] **Step 1: Push 到远端**

```bash
git push origin feat/initial-vibe-coding
```

- [ ] **Step 2: 云端拉取并重启 API 服务**

```bash
ssh root@81.70.92.54 "
  cd /root/nocturne_memory_plusmax &&
  git pull origin feat/initial-vibe-coding &&
  systemctl restart nocturne-plusmax-api.service &&
  sleep 2 &&
  systemctl status nocturne-plusmax-api.service | head -10
"
```

- [ ] **Step 3: 烟雾测试**

```bash
curl -s http://81.70.92.54/api/expectation/test-session | python3 -m json.tool
```

期望返回：`{"session_id": "test-session", "intensity": 1, "dependency": 1, "expression": 1, "note": null, "updated_at": null}`

---

## Self-Review Checklist

- [x] **Spec coverage:** intensity / dependency / expression 三个控制轴 ✓；session 级别存取 ✓；GET/POST/DELETE ✓；默认值回退 ✓
- [x] **Placeholders:** 无 TBD / TODO
- [x] **Type consistency:** `ExpectationResponse` 在 GET、POST 响应、DELETE 全路径统一用同一 schema
- [x] **Missing:** `db.session()` 用法需要对齐现有代码 —— Task 4 Step 2 列了诊断路径
