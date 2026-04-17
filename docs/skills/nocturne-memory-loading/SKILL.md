---
name: nocturne-memory-loading
description: 当用户提到项目、任务、历史背景，或发出继续工作信号时使用。定义 Nocturne Memory 的记忆加载、Expectation 持久化和维护规则。
---

# Nocturne Memory 加载准则

## 背景

你接入了一个图拓扑长期记忆系统（Nocturne Memory，MCP SSE at http://81.70.92.54/sse）。
记忆以 URI 树形式组织（如 `work://projects/nocturne/dev-state`、`core://nocturne`）。

system://boot 已处理基础的记忆加载触发。本 skill 在此之上补充三个能力：
1. **Expectation 持久化** — 把推断出的加载偏好 POST 到 `/expectation` API
2. **精准 Domain 路由** — 根据话题选择最相关的 URI，而不是泛化加载
3. **显式禁止加载** — 在用户明确要求时完全跳过记忆

---

## Step 1：推断并持久化 Memory Expectation

从用户**第一句话**推断加载偏好，然后**立即** POST 到 Expectation API：

```
POST http://81.70.92.54/api/expectation/{session_id}
Authorization: Bearer <API_TOKEN>
{"intensity": <0-2>, "dependency": <0-2>, "expression": <0-2>, "note": "<用户原话>"}
```

| 信号 | intensity | dependency | expression |
|------|-----------|------------|------------|
| "我们继续做 X" / "接着上次" / 项目名出现 | 2 | 2 | 1 |
| 通用技术问题，无项目上下文 | 0 | 0 | 0 |
| "不用管之前的" / "单独看这个" | 0 | 0 | 0 |
| "结合之前讨论" / "你知道的" | 2 | 2 | 2 |
| 不确定 | 1 | 1 | 1 |

**intensity=0：跳过后续所有步骤，直接回答。**

---

## Step 2：精准 Domain 路由

intensity >= 1 时，根据话题选择 URI，**不要泛化加载所有记忆**：

| 话题关键词 | 优先读取 URI |
|-----------|-------------|
| nocturne / 记忆系统 / memory / 前端 / 后端 / 部署 | `work://projects/nocturne/dev-state`、`work://projects/nocturne/infra` |
| 求职 / job / 简历 / 面试 | `work://projects/job-hunt/` 相关节点 |
| 人格 / 自我 / 性格 | `core://nocturne` |
| 用户偏好 / 用户信息 | `core://my_user` |
| 写作 / spring | `spring://` 对应节点 |
| 话题不明确 | `read_memory("system://boot")` 获取入口索引后再定向 |

intensity=2（full）：加载命中 URI 后，再递归读取其直接子节点 1 层。

### MCP 不可用时的 REST Fallback

如果 `read_memory` 工具不在列表里，直接用 REST API，**不要摸索 openapi.json**：

```bash
# 读取单个节点（等价于 read_memory("work://projects/nocturne/dev-state")）
curl -s "http://81.70.92.54/api/browse/node?uri=work://projects/nocturne/dev-state" \
  -H "Authorization: Bearer <API_TOKEN>"

# 搜索关键词
curl -s "http://81.70.92.54/api/browse/search?q=<关键词>" \
  -H "Authorization: Bearer <API_TOKEN>"

# API_TOKEN 在 ~/.claude/nocturne-boot.py 里，或从环境变量读
```

> **常见错误：** 拼接 `/api/memory/<domain>/<path>` 路径（404）。正确端点是 `/api/browse/node?uri=<完整URI>`。

---

## Step 2.5：依赖程度（dependency）

`dependency` 控制回复**对记忆内容的依赖强度**，独立于加载了多少记忆：

| dependency | 行为 |
|-----------|------|
| 0（weak） | 记忆仅作背景参考，回复以用户当前问题为主，不强行关联历史 |
| 1（normal） | 记忆与当前回答自然结合，有上下文关联时引用 |
| 2（strong） | 回复必须基于记忆建立，明确从已知状态出发推进，不重复建立前置条件 |

**dependency=2 的典型行为：** 用户说"继续上次的方案"→ 不要重新问"你想做什么"，直接从记忆里最后的状态接着说。

---

## Step 3：注入表达

根据 `expression` 决定如何在回复中使用记忆：

| expression | 行为 |
|-----------|------|
| 0 | 用记忆内容，不提"我记得"或"之前说过" |
| 1 | 可说"基于项目当前状态"，不逐条引用 |
| 2 | 可明确引用 URI，如"根据 work://projects/nocturne/dev-state 里记录的……" |

**不要复述大段记忆内容。** 只提取与当前回答直接相关的部分。

---

## Step 4：Expectation 变更检测（长 session）

以下信号意味着用户的偏好在 session 中途改变了：

- "好了，回到 X 项目" → intensity 升至 2
- "先忘掉之前的，帮我看这个" → intensity 降至 0
- "结合你知道的来说" → expression 升至 2

检测到变更时：**立即** POST 到 `/expectation/{session_id}` 更新，下一轮按新值执行。

---

## Step 5：写入新记忆

以下情况当场调用 `create_memory` 或 `update_memory`，不要等到 session 结束：

- 用户说了关于自己/项目的新信息，现有记忆没有记录
- 对话中得出了可跨 session 复用的结论（技术方案、决策、偏好）
- 发生了关系性事件（争议、和解、新约定）

---

## 禁止行为

- **intensity=0 时调用任何 read_memory** — 用户明确要求独立处理时，绝对不加载
- **跳过 Expectation POST** — 即使推断是默认值 1/1/1 也要 POST，让系统有记录
- **泛化加载** — 不要因为"可能有用"就加载不相关 domain 的记忆
- **超过 15 轮不校准人格** — 长 session 里每 15 轮执行一次 `read_memory("core://nocturne")`
