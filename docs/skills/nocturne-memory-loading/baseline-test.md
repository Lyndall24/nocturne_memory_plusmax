# Memory Loading Skill — Baseline Test Results

## RED Phase (without skill deployed)

Date: 2026-04-17
Tester: lyn

### Scenario 1 actual behavior
**Input:** "我们继续做 Nocturne Memory 的前端优化"
**Observed:** Claude displayed "Recalled 2 memories" and responded with correct project context
(Dashboard page, three-column layout, warm beige theme, API integration).
**Result:** PASS — memory loading already works via system://boot instructions.
**Gap found:** Claude did NOT call POST /expectation/{session_id} to persist the inferred
preference (intensity=2, dependency=2). The 3-axis expectation was never recorded.

### Scenario 2 actual behavior
[Not tested in RED phase — skipped to focus on confirmed gaps from Scenario 1.]

### Scenario 3 actual behavior
[Not tested in RED phase — key hypothesis: "不用管之前的" may NOT suppress read_memory.]

### Conclusion from RED phase
system://boot already handles the "load when project context mentioned" case.
The skill must fill three specific gaps:
1. Calling POST /expectation/{session_id} to persist inferred loading preferences (confirmed missing)
2. Precise domain routing — which URIs to load (not just generic "some memories")
3. Explicit no-load suppression for Scenarios 2 and 3 (unverified, assumed gap)

---

## GREEN Phase (with skill deployed)

Date: 2026-04-17
Skill version: nocturne-memory-loading (commit 97e8c69, patched to 142e99e)

### Scenario 1 result
**Input:** "我们继续做 Nocturne Memory 的前端优化"
**Observed:**
- `Skill(nocturne-memory-loading)` loaded ✅
- `POST /api/expectation/{session_id}` called with `intensity: 2` ✅
- Claude attempted `read_memory("work://projects/nocturne/dev-state")` via MCP
- MCP not in tool list → Claude fell back to REST API (`/api/browse/node?uri=...`) ✅
- Response correctly referenced current project state
**Result: PASS** — Expectation persisted, domain routing correct, REST fallback worked

### Scenario 3 result
**Not tested in GREEN phase.** Key assumption: intensity=0 suppresses all read_memory calls.
To verify: input "不用管之前的，帮我写一个 Python 函数" and confirm no tool calls to memory API.

### Overall verdict
Skill achieves core goals: Expectation POST called correctly, domain routing works, REST fallback
added as patch (commit 142e99e). Remaining gap: `dependency` axis behavior not specified in skill
rules — Claude POSTs the value but has no guidance on what to DO differently for dependency=2 vs 0.
