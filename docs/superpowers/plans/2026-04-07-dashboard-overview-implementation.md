# Dashboard Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a control-console dashboard overview that becomes the default human entrypoint for the cloud Nocturne system, while preserving the existing Review, Memory Explorer, and Brain Cleanup workspaces.

**Architecture:** Keep the three existing work pages intact and add a new `/dashboard` route above them. Reuse existing cloud-facing APIs for health, review, maintenance, domain, and namespace data; add only the missing browse capabilities required by the dashboard: recent memories, search, and quick create.

**Tech Stack:** FastAPI, pytest, React, Vite, React Router, Axios, Tailwind CSS, Vitest, Testing Library

---

## File Structure

- Modify: `backend/api/browse.py`
  Add dashboard-needed browse endpoints for recent memories, search, and quick-create creation.
- Modify: `backend/main.py`
  Keep router registration in sync if browse models/helpers change.
- Modify: `backend/tests/api/test_api_routes.py`
  Add focused API coverage for the new dashboard-supporting routes.
- Modify: `frontend/package.json`
  Add frontend test scripts and testing dependencies.
- Create: `frontend/vitest.config.js`
  Configure Vitest with jsdom and the existing Vite React setup.
- Create: `frontend/src/test/setup.js`
  Register Testing Library matchers and shared browser mocks.
- Modify: `frontend/src/lib/api.js`
  Add dashboard fetch helpers and quick-create helpers on top of the existing API client.
- Create: `frontend/src/features/dashboard/DashboardPage.jsx`
  Implement the new overview screen, segmented into status, quick actions, attention, and workspace bands.
- Create: `frontend/src/features/dashboard/dashboard.test.jsx`
  Cover routing, module degradation, and quick-action navigation behavior.
- Modify: `frontend/src/App.jsx`
  Add `/dashboard`, change `/` to point there, and add Dashboard to the top navigation.
- Modify: `docs/dev-notes.md`
  Record the dashboard milestone and cloud-first deployment target for future context recovery.

## Task 1: Add backend routes for recent memories, search, and quick create

**Files:**
- Modify: `backend/api/browse.py`
- Test: `backend/tests/api/test_api_routes.py`

- [ ] **Step 1: Write the failing API tests**

```python
async def test_browse_recent_returns_latest_memories(api_client, graph_service):
    await graph_service.create_memory(
        parent_path="",
        content="First memory",
        priority=3,
        title="first",
        disclosure="First disclosure",
    )
    await graph_service.create_memory(
        parent_path="",
        content="Second memory",
        priority=1,
        title="second",
        disclosure="Second disclosure",
    )

    response = await api_client.get("/browse/recent", params={"limit": 5})

    assert response.status_code == 200
    payload = response.json()
    assert [item["uri"] for item in payload][:2] == ["core://second", "core://first"]


async def test_browse_search_returns_ranked_matches(api_client, graph_service):
    await graph_service.create_memory(
        parent_path="",
        content="Observability notes for dashboard work",
        priority=2,
        title="ops_notes",
        disclosure="Operator notes",
    )

    response = await api_client.get("/browse/search", params={"q": "dashboard"})

    assert response.status_code == 200
    assert response.json()[0]["uri"] == "core://ops_notes"


async def test_browse_quick_create_creates_and_returns_memory_uri(api_client):
    response = await api_client.post(
        "/browse/memories",
        json={
            "parent_uri": "core://",
            "title": "dashboard_seed",
            "content": "Created from dashboard quick action",
            "priority": 2,
            "disclosure": "Operator-created",
        },
    )

    assert response.status_code == 200
    assert response.json()["uri"] == "core://dashboard_seed"
```

- [ ] **Step 2: Run the targeted backend tests to verify they fail for the missing routes**

Run: `cd /Users/lyn/nocturne_memory_plusmax/backend && ../.venv/bin/pytest tests/api/test_api_routes.py -k "browse_recent or browse_search or browse_quick_create" -v`

Expected: FAIL with `404` or missing route behavior for `/browse/recent`, `/browse/search`, or `/browse/memories`.

- [ ] **Step 3: Implement the minimal browse API additions**

```python
class QuickCreateRequest(BaseModel):
    parent_uri: str
    content: str
    priority: int = 2
    title: str | None = None
    disclosure: str | None = None


def _parse_uri(uri: str) -> tuple[str, str]:
    if "://" not in uri:
        raise ValueError("URI must include a domain, e.g. core://parent/path")
    domain, path = uri.split("://", 1)
    return domain or "core", path


@router.get("/recent")
async def get_recent(limit: int = Query(8, ge=1, le=50)):
    graph = get_graph_service()
    return await graph.get_recent_memories(limit=limit, namespace=get_namespace())


@router.get("/search")
async def search_memories(q: str = Query(..., min_length=1), limit: int = Query(8, ge=1, le=25)):
    search = get_search_indexer()
    return await search.search(q, limit=limit, namespace=get_namespace())


@router.post("/memories")
async def quick_create_memory(body: QuickCreateRequest):
    graph = get_graph_service()
    try:
        domain, parent_path = _parse_uri(body.parent_uri.strip())
        return await graph.create_memory(
            parent_path=parent_path,
            domain=domain,
            title=body.title.strip() if body.title else None,
            content=body.content,
            priority=body.priority,
            disclosure=body.disclosure,
            namespace=get_namespace(),
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
```

- [ ] **Step 4: Run the targeted backend tests to verify they pass**

Run: `cd /Users/lyn/nocturne_memory_plusmax/backend && ../.venv/bin/pytest tests/api/test_api_routes.py -k "browse_recent or browse_search or browse_quick_create" -v`

Expected: PASS for the three new browse behaviors.

- [ ] **Step 5: Commit the backend dashboard-support API slice**

```bash
cd /Users/lyn/nocturne_memory_plusmax
git add backend/api/browse.py backend/tests/api/test_api_routes.py
git commit -m "feat: add dashboard browse endpoints"
```

## Task 2: Add frontend test harness and lock the dashboard routing behavior

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.js`
- Create: `frontend/src/test/setup.js`
- Create: `frontend/src/features/dashboard/dashboard.test.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Write the failing dashboard routing and degradation tests**

```jsx
it('redirects the root route to /dashboard', async () => {
  render(<App />, { initialEntries: ['/'] });
  expect(await screen.findByText(/system status/i)).toBeInTheDocument();
});

it('keeps rendering the dashboard when one module request fails', async () => {
  server.use(
    http.get('/api/review/groups', () => HttpResponse.json({ detail: 'boom' }, { status: 500 }))
  );

  render(<App />, { initialEntries: ['/dashboard'] });

  expect(await screen.findByText(/quick actions/i)).toBeInTheDocument();
  expect(await screen.findByText(/review queue unavailable/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the frontend test command to verify it fails before implementation**

Run: `cd /Users/lyn/nocturne_memory_plusmax/frontend && npm test -- --run`

Expected: FAIL because Vitest is not configured and the dashboard route/component do not exist yet.

- [ ] **Step 3: Add the minimal frontend test harness**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "jsdom": "^26.1.0",
    "vitest": "^3.2.4"
  }
}
```

```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
});
```

- [ ] **Step 4: Run the frontend test command again and confirm it now fails on missing dashboard behavior**

Run: `cd /Users/lyn/nocturne_memory_plusmax/frontend && npm test -- --run`

Expected: FAIL in `dashboard.test.jsx` because `/dashboard` and the overview UI are not implemented yet.

- [ ] **Step 5: Commit the frontend test harness**

```bash
cd /Users/lyn/nocturne_memory_plusmax
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.js frontend/src/test/setup.js frontend/src/App.jsx frontend/src/features/dashboard/dashboard.test.jsx
git commit -m "test: add dashboard frontend test harness"
```

## Task 3: Implement the dashboard overview UI and API client glue

**Files:**
- Create: `frontend/src/features/dashboard/DashboardPage.jsx`
- Modify: `frontend/src/lib/api.js`
- Modify: `frontend/src/App.jsx`
- Test: `frontend/src/features/dashboard/dashboard.test.jsx`

- [ ] **Step 1: Extend the API client with dashboard helpers**

```js
export const getHealth = () =>
  api.get('/health').then(res => res.data);

export const getRecentMemories = (limit = 8) =>
  api.get('/browse/recent', { params: { limit } }).then(res => res.data);

export const searchMemories = (query, limit = 8) =>
  api.get('/browse/search', { params: { q: query, limit } }).then(res => res.data);

export const quickCreateMemory = (payload) =>
  api.post('/browse/memories', payload).then(res => res.data);

export const getMaintenanceOrphans = () =>
  api.get('/maintenance/orphans').then(res => res.data);
```

- [ ] **Step 2: Build the dashboard page with independently degrading modules**

```jsx
const moduleLoaders = [
  ['health', () => getHealth()],
  ['domains', () => getDomains()],
  ['namespaces', () => getNamespaces()],
  ['reviewGroups', () => getGroups()],
  ['orphans', () => getMaintenanceOrphans()],
  ['recentMemories', () => getRecentMemories()],
];

const settled = await Promise.allSettled(
  moduleLoaders.map(([, loader]) => loader())
);

const nextState = moduleLoaders.reduce((acc, [key], index) => {
  const result = settled[index];
  acc[key] = result.status === 'fulfilled' ? result.value : null;
  acc.errors[key] = result.status === 'rejected' ? result.reason : null;
  return acc;
}, { errors: {} });
```

```jsx
<Routes>
  <Route path="/" element={<Navigate to="/dashboard" replace />} />
  <Route path="/dashboard" element={<DashboardPage />} />
  <Route path="/review" element={<ReviewPage />} />
  <Route path="/memory" element={<MemoryBrowser />} />
  <Route path="/maintenance" element={<MaintenancePage />} />
</Routes>
```

- [ ] **Step 3: Add quick actions that route into existing workspaces instead of duplicating them**

```jsx
const handleUriOpen = () => {
  const match = uriInput.trim().match(/^([^:]+):\/\/(.*)$/);
  if (!match) {
    setUriError('Use a full URI such as core://agent/profile');
    return;
  }

  navigate(`/memory?domain=${encodeURIComponent(match[1])}&path=${encodeURIComponent(match[2])}`);
};

const handleQuickCreate = async (event) => {
  event.preventDefault();
  const created = await quickCreateMemory(formState);
  navigate(`/memory?domain=${encodeURIComponent(created.domain)}&path=${encodeURIComponent(created.path)}`);
};
```

- [ ] **Step 4: Run the dashboard frontend tests and fix only what is required to get green**

Run: `cd /Users/lyn/nocturne_memory_plusmax/frontend && npm test -- --run`

Expected: PASS for the routing and degradation tests, plus any quick-action tests added while implementing.

- [ ] **Step 5: Build the frontend bundle to verify production output**

Run: `cd /Users/lyn/nocturne_memory_plusmax/frontend && npm run build`

Expected: `vite build` completes successfully and produces the updated `dist/` assets.

- [ ] **Step 6: Commit the dashboard UI slice**

```bash
cd /Users/lyn/nocturne_memory_plusmax
git add frontend/src/lib/api.js frontend/src/features/dashboard/DashboardPage.jsx frontend/src/features/dashboard/dashboard.test.jsx frontend/src/App.jsx
git commit -m "feat: add dashboard overview page"
```

## Task 4: Record context, verify the cloud-facing build, and prepare redeploy

**Files:**
- Modify: `docs/dev-notes.md`

- [ ] **Step 1: Update the development notes with the dashboard and cloud-first deployment context**

```markdown
## Dashboard Overview Milestone

- Cloud target system:
  - Main domain: `https://memory.lynagent.com`
  - REST API: `/api`
  - MCP: `http://127.0.0.1:8001/mcp`
- Dashboard overview becomes the default human entrypoint at `/`
- Existing workspaces remain:
  - `/review`
  - `/memory`
  - `/maintenance`
```

- [ ] **Step 2: Run the focused verification commands before any completion claim**

Run: `cd /Users/lyn/nocturne_memory_plusmax/backend && ../.venv/bin/pytest tests/api/test_api_routes.py -v`

Expected: PASS

Run: `cd /Users/lyn/nocturne_memory_plusmax/frontend && npm test -- --run`

Expected: PASS

Run: `cd /Users/lyn/nocturne_memory_plusmax/frontend && npm run build`

Expected: PASS

- [ ] **Step 3: Commit the docs/context update**

```bash
cd /Users/lyn/nocturne_memory_plusmax
git add docs/dev-notes.md
git commit -m "docs: record dashboard cloud deployment context"
```

## Self-Review

- Spec coverage:
  - `/dashboard` route and `/` redirect are implemented in Task 3.
  - System status, attention, and workspace launch rely on reused APIs in Task 3.
  - Quick search, URI open, and quick create are implemented through Task 1 and Task 3.
  - Graceful degradation is covered in Task 2 and verified in Task 3.
- Placeholder scan:
  - No `TODO`, `TBD`, or vague “appropriate handling” steps remain.
- Type consistency:
  - API helpers use `/browse/recent`, `/browse/search`, and `/browse/memories` consistently across backend tests, frontend client code, and UI tasks.
