# Memory Loading Skill — Test Scenarios

These scenarios define expected behavior for the `nocturne-memory-loading` skill.
Run each scenario in a Claude Code session both WITHOUT the skill (baseline) and WITH the skill deployed,
and record whether Claude's behavior matches expectations.

---

## Scenario 1: 强依赖信号 → 应加载相关记忆

**用户第一句:** "我们继续做 Nocturne Memory 的前端优化"

**Expected behavior:**
- Claude infers intensity=2, dependency=2
- Claude calls `POST /expectation/{session_id}` with those values
- Claude calls `read_memory("work://projects/nocturne/dev-state")` before responding
- Response references current project state from memory

**Failure mode (what Claude does WITHOUT the skill):**
- Claude responds directly from conversation context
- No `read_memory` call is made
- Answer may be stale or generic

---

## Scenario 2: 弱依赖信号 → 不应主动加载背景记忆

**用户第一句:** "帮我写一个 Python 函数，解析 JSON 字符串"

**Expected behavior:**
- Claude infers intensity=0 (no project context)
- No `read_memory` calls
- Claude answers the coding question directly

**Failure mode (what Claude does WITHOUT the skill):**
- Claude loads unrelated memory nodes "just in case"
- Wastes tokens, adds irrelevant context to response

---

## Scenario 3: 禁止加载信号 → 严格不加载

**用户第一句:** "不用管之前的，帮我单独分析这段代码 [paste code]"

**Expected behavior:**
- Claude infers intensity=0 from "不用管之前的"
- Zero `read_memory` calls throughout this response
- Answer treats the question as fully isolated

**Failure mode (what Claude does WITHOUT the skill):**
- Claude still loads memory "out of habit"
- Response includes references to project background unprompted

---

## Scenario 4: 话题命中已知 Domain → 加载对应分支

**用户:** "Nocturne 的部署流程是怎样的？"

**Expected behavior:**
- Claude recognizes "Nocturne" → `work://projects/nocturne/` domain
- Claude calls `read_memory("work://projects/nocturne/infra")` before responding
- Answer reflects actual deployment state (nginx, systemd units, ports)

**Failure mode (what Claude does WITHOUT the skill):**
- Claude answers from general knowledge or stale context
- Deployment details may be wrong or out of date

---

## Scenario 5: 长 session 中 Expectation 变更

**Setup:** Session has 20+ turns discussing Python basics (intensity=0 established).
**User message:** "好了，现在我们回到 Nocturne 项目"

**Expected behavior:**
- Claude detects the Expectation shift signal
- Claude calls `POST /expectation/{session_id}` to update intensity=2, dependency=2
- Claude calls `read_memory("work://projects/nocturne/dev-state")` before next response

**Failure mode (what Claude does WITHOUT the skill):**
- Claude continues treating as intensity=0 (no memory loading)
- Expectation is not updated in the API
- Response lacks project context

---

## How to run these scenarios

1. Open a fresh Claude Code session
2. (Without skill) Just type the user message and observe tool calls made
3. Record observations in `baseline-test.md`
4. Deploy skill to `~/.claude/skills/nocturne-memory-loading/SKILL.md`
5. Open another fresh session
6. Repeat the same inputs
7. Record GREEN phase results in `baseline-test.md`
