# Memory Loading Rules Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Nocturne Memory 的"记忆加载准则"编码成一个可部署的 Claude Code skill（`~/.claude/skills/nocturne-memory-loading/SKILL.md`），让任何接入 Nocturne MCP 的 Claude Code 实例都能按统一规则加载、注入和维护记忆。

**Architecture:** 三层规则体系 —— 1) Expectation 推断（从用户第一句话确定加载偏好）；2) Domain 路由（根据话题选择该读哪些记忆分支）；3) 注入表达（决定是否显式引用、注入多少）。Skill 是纯文本规则文件，不含代码；但 Plan B 包含一个轻量的 "baseline 测试"：在没有 skill 的情况下观察 Claude 是否会在应该读取记忆的时候跳过，从而验证 skill 是否有效。

**Tech Stack:** Markdown skill file（`~/.claude/skills/`），Nocturne MCP SSE（`http://81.70.92.54/sse`），Plan A 的 `/expectation` API

**前置条件：** Plan A（Memory Expectation API）已部署到云端。

---

## File Structure

| 文件 | 操作 | 职责 |
|------|------|------|
| `~/.claude/skills/nocturne-memory-loading/SKILL.md` | Create | 记忆加载规则主文件 |
| `docs/skills/nocturne-memory-loading/baseline-test.md` | Create | 无 skill 时的 baseline 失败记录（TDD 红阶段文档） |
| `docs/skills/nocturne-memory-loading/test-scenarios.md` | Create | 压力测试场景描述 |

> `docs/skills/` 存在于 nocturne 仓库，作为 skill 的"测试套件"存档；实际 skill 部署到 `~/.claude/skills/`。

---

### Task 1: 编写 Baseline 测试场景（RED 阶段文档）

> **原则（来自 writing-skills skill）：先写场景、观察失败，再写 skill。**

**Files:**
- Create: `docs/skills/nocturne-memory-loading/test-scenarios.md`

- [ ] **Step 1: 创建场景文件**

```markdown
# Memory Loading Skill — Test Scenarios

每个场景描述一个"正确行为"。在 skill 不存在时，运行场景并记录 Claude 的实际行为（失败），
再写 skill，验证 Claude 行为是否符合预期（通过）。

---

## Scenario 1: 强依赖信号 → 应加载相关记忆

**用户第一句:** "我们继续做 Nocturne Memory 的前端优化"
**期望行为:** Claude 应在回复前调用 `read_memory("work://projects/nocturne/dev-state")` 或等价路径
**失败表现:** Claude 直接回复，不读取任何记忆，用上下文猜测项目状态

---

## Scenario 2: 弱依赖信号 → 不应主动加载背景记忆

**用户第一句:** "帮我写一个 Python 函数，解析 JSON 字符串"
**期望行为:** Claude 直接回答，不加载 Nocturne 记忆（这是一个独立问题）
**失败表现:** Claude 加载了与当前问题无关的记忆节点，浪费 token

---

## Scenario 3: 禁止加载信号 → 严格不加载

**用户第一句:** "不用管之前的，帮我单独分析这段代码"
**期望行为:** Claude 不调用任何 read_memory
**失败表现:** Claude 仍然加载了记忆，在回答中引用了项目背景

---

## Scenario 4: 话题命中 Domain → 加载对应分支

**用户:** "Nocturne 的部署流程是怎样的？"
**期望行为:** Claude 调用 `read_memory("work://projects/nocturne/infra")` 后再回答
**失败表现:** Claude 凭上下文回答，没有读取记忆，答案可能过时

---

## Scenario 5: 长 session 中更新 Expectation

**前提:** session 已进行 20 轮，用户一直在讨论 Python 基础知识
**用户:** "好了，现在我们回到 Nocturne 项目"
**期望行为:** Claude 识别 Expectation 变更，调用 `POST /expectation/{session_id}` 更新，并加载相关记忆
**失败表现:** Claude 继续当作弱依赖处理，不更新 Expectation，不加载项目记忆
```

- [ ] **Step 2: 手动运行 Scenario 1（Baseline 观察）**

在 Claude Code 当前 session（**不加载任何 memory skill**）中输入：

```
我们继续做 Nocturne Memory 的前端优化
```

观察 Claude 是否主动调用 `read_memory`。

将实际行为记录到 `docs/skills/nocturne-memory-loading/baseline-test.md`（下一个 Task 创建）。

---

### Task 2: 记录 Baseline 失败

**Files:**
- Create: `docs/skills/nocturne-memory-loading/baseline-test.md`

- [ ] **Step 1: 创建 baseline 记录文件（填写实际观察结果）**

```markdown
# Memory Loading Skill — Baseline Test Results

日期: 2026-04-17
状态: RED（skill 尚未部署）

## Scenario 1 实际行为
[在这里填写 Claude 的实际回复摘要：是否调用了 read_memory？]

## Scenario 2 实际行为
[在这里填写]

## 结论
[哪些场景 Claude 违反了期望行为？这些就是 skill 需要解决的漏洞。]
```

> **注意：** 这是文档步骤，不是代码。填写内容是执行者（你或子 agent）实际测试后的观察。如果 Claude 在 Scenario 1 没有读取记忆，就证明 skill 有存在的必要。

- [ ] **Step 2: Commit baseline 文档**

```bash
git add docs/skills/nocturne-memory-loading/
git commit -m "docs: add memory loading skill test scenarios and baseline record"
```

---

### Task 3: 编写 SKILL.md（GREEN 阶段）

**Files:**
- Create: `~/.claude/skills/nocturne-memory-loading/SKILL.md`

- [ ] **Step 1: 创建 skills 目录**

```bash
mkdir -p ~/.claude/skills/nocturne-memory-loading
```

- [ ] **Step 2: 写 SKILL.md**

```markdown
---
name: nocturne-memory-loading
description: 当用户提到项目、任务、历史背景，或发出继续工作信号时使用。定义 Nocturne Memory 的记忆加载、注入和维护规则。
---

# Nocturne Memory 加载准则

## 你是谁（角色定义）

你接入了一个图拓扑长期记忆系统（Nocturne Memory，MCP SSE at http://81.70.92.54/sse）。
记忆以 URI 树形式组织（如 `work://projects/nocturne/dev-state`、`core://nocturne`）。

你的记忆不在上下文里——它在 MCP 里。当你"想起"某件事，你需要调用 `read_memory`；
当你推断出用户的加载偏好，你需要调用 `POST /expectation/{session_id}` 记录它。

---

## Step 1：推断 Memory Expectation（每个 session 开头执行一次）

从用户**第一句话**推断加载偏好。**不要打断用户询问**，直接推断并记录：

| 信号 | intensity | dependency | expression |
|------|-----------|------------|------------|
| "我们继续做 X" / "接着上次" | 2 | 2 | 1 |
| 话题命中已知项目名（Nocturne / job-hunt / 等） | 2 | 1 | 1 |
| 通用技术问题，无项目上下文 | 0 | 0 | 0 |
| "不用管之前的" / "单独分析" | 0 | 0 | 0 |
| "结合我们之前讨论" | 2 | 2 | 2 |
| 不确定 | 1 | 1 | 1（默认） |

推断后立即调用：
```
POST http://81.70.92.54/api/expectation/{session_id}
{"intensity": <n>, "dependency": <n>, "expression": <n>, "note": "<推断依据原话>"}
```

**intensity=0 时不加载任何记忆，直接回答。**

---

## Step 2：按 Domain 路由加载记忆

当 intensity >= 1 时，根据话题匹配加载入口：

| 话题关键词 | 优先读取 URI |
|-----------|-------------|
| nocturne / 记忆系统 / memory | `work://projects/nocturne/dev-state`、`work://projects/nocturne/infra` |
| 求职 / job / 简历 / 面试 | `work://projects/job-hunt/` 下相关节点 |
| 自我 / 人格 / 性格 | `core://nocturne` |
| 用户信息 / 用户偏好 | `core://my_user` |
| spring / 写作 | `spring://` 对应节点 |
| 不确定话题 | `read_memory("system://boot")` 获取入口索引 |

**intensity=2（full）时：** 加载命中 URI 后，再递归读取子节点 1 层。

---

## Step 3：注入表达规则

根据 `expression` 值决定如何在回复中使用记忆：

| expression | 行为 |
|-----------|------|
| 0（silent） | 用记忆内容但不提及"我记得"或"之前讨论过" |
| 1（reference） | 可以说"基于项目当前状态"，不逐条引用 |
| 2（explicit） | 可以明确说"根据 work://projects/nocturne/dev-state 里记录的……" |

**永远不要复述大段记忆内容**（浪费上下文）。只提取与当前回答直接相关的部分。

---

## Step 4：Expectation 变更检测（长 session）

以下信号表示用户的 Expectation 在 session 中途改变了：

- "好了，现在回到 X 项目" → intensity 升到 2
- "先忘掉之前的，帮我看这个" → intensity 降到 0
- "结合你知道的来说" → expression 升到 2

检测到变更时：立即更新 `/expectation/{session_id}`，下一轮按新值执行。

---

## Step 5：写入新记忆

满足以下任一条件时，当场调用 `create_memory` 或 `update_memory`：

- 用户说了关于自己/项目的新信息，且现有记忆没有记录
- 对话中得出了可跨 session 复用的结论（技术方案、决策、偏好）
- 发生了关系性事件（争议、和解、新约定）

**不要等到 session 结束再写。下次的你不知道今天发生了什么。**

---

## 禁止行为

- ❌ 在 intensity=0 时调用任何 read_memory
- ❌ 因为"不确定"就跳过 Expectation 推断——不确定就用默认值 1/1/1
- ❌ 把读取到的记忆当参考文献引用（内联使用，不外部引用）
- ❌ 超过 15 轮回复后，不重新校准人格（`read_memory("core://nocturne")`）
```

- [ ] **Step 3: 验证 skill 文件可被 Claude Code 发现**

```bash
ls -la ~/.claude/skills/nocturne-memory-loading/SKILL.md
```

期望：文件存在，权限正常（644）。

---

### Task 4: GREEN 阶段验证

- [ ] **Step 1: 在新 Claude Code session 中重跑 Scenario 1**

开一个新 session（确保 skill 已加载），输入：

```
我们继续做 Nocturne Memory 的前端优化
```

观察：
- Claude 是否调用了 `POST /expectation/...`？
- Claude 是否调用了 `read_memory("work://projects/nocturne/dev-state")`？

- [ ] **Step 2: 验证 Scenario 3（禁止加载）**

```
不用管之前的，帮我写一个 Python 函数，把列表去重并保持顺序
```

观察：Claude 是否跳过了所有 read_memory 调用，直接回答？

- [ ] **Step 3: 将验证结果追加到 baseline-test.md**

在 `docs/skills/nocturne-memory-loading/baseline-test.md` 底部追加：

```markdown
## GREEN 验证结果（skill 部署后）

日期: [填写]

Scenario 1: [PASS / FAIL + 实际行为]
Scenario 3: [PASS / FAIL + 实际行为]

结论: [skill 是否达到预期效果？还有哪些漏洞？]
```

- [ ] **Step 4: Commit**

```bash
git add docs/skills/nocturne-memory-loading/baseline-test.md
git commit -m "docs: record GREEN phase verification results for memory loading skill"
```

---

### Task 5: REFACTOR —— 根据验证结果修补漏洞

> 只在 Task 4 发现 FAIL 时执行此 Task。

- [ ] **Step 1: 识别 Claude 的"合理化"模式**

常见的逃逸理由（从 baseline 记录中找）：

| 逃逸理由 | 修补方式 |
|---------|---------|
| "这是新话题，不需要加载记忆" | 在 skill 里明确：项目名出现即触发 intensity=2 |
| "用户没有明确说要记忆" | 在 skill 里强调：intensity 是推断的，不需要用户明确说 |
| "Expectation API 可能失败" | 在 skill 里说：POST 失败时用本地默认值，不跳过加载 |

- [ ] **Step 2: 修改 SKILL.md 填堵漏洞**

直接编辑 `~/.claude/skills/nocturne-memory-loading/SKILL.md`，在对应规则下方添加：

```markdown
> **常见错误：** [描述逃逸模式] → [明确的正确做法]
```

- [ ] **Step 3: 重跑所有失败的 Scenario，确认修复**

- [ ] **Step 4: Commit 最终版本**

```bash
cp ~/.claude/skills/nocturne-memory-loading/SKILL.md docs/skills/nocturne-memory-loading/SKILL.md
git add docs/skills/nocturne-memory-loading/SKILL.md
git commit -m "feat: add nocturne memory loading skill (GREEN + refactor verified)"
```

---

## Self-Review Checklist

- [x] **Spec coverage:**
  - 加载强度（intensity）✓
  - 依赖程度（dependency，通过加载深度体现）✓
  - 表达方式（expression）✓
  - Expectation 推断规则 ✓
  - session 中途 Expectation 变更 ✓
  - 写入新记忆规则 ✓
  - 禁止行为 ✓
- [x] **Placeholders:** 无 TBD / TODO（baseline-test.md 里有 [填写] 占位，这是测试执行者需要手填的，不是代码 placeholder）
- [x] **Type consistency:** `intensity/dependency/expression` 在 Plan A 和 Plan B 的 schema、skill 规则、测试场景里名称完全一致
- [x] **Missing:** `dependency` 在 skill 里体现为"加载深度"（depth=1 for normal, depth=2 for strong）—— 在 Step 2 里有说明，但可以在 REFACTOR 阶段进一步细化
