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

Date: [fill in]
Skill version: [fill in]

### Scenario 1 result
[PASS / FAIL + actual behavior]

### Scenario 3 result
[PASS / FAIL + actual behavior]

### Overall verdict
[Did the skill achieve expected behavior? Any remaining loopholes?]
