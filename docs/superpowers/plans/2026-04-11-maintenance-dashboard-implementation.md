# Maintenance Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current action-heavy dashboard with a maintenance-first memory browser: left tree, middle file list, right preview, and a bottom maintenance strip backed by maintenance-specific API data.

**Architecture:** Keep routing simple by preserving `/dashboard`, but split the implementation into two data surfaces. `browse` endpoints provide structure tree, region list, and item preview data; `maintenance` endpoints provide summary counts, anomaly filters, and human-queue explanations. The frontend assembles those surfaces into a three-column browser layout with a quiet Claude/Notion-inspired visual system.

**Tech Stack:** FastAPI, pytest, React, Vite, React Router, Axios, Tailwind CSS, Vitest, Testing Library

---

## File Structure

- Modify: `backend/api/browse.py`
  Add maintenance-browser read endpoints for the structure tree and region list/preview.
- Modify: `backend/api/maintenance.py`
  Add maintenance summary and human-queue endpoints that explain why an item needs human judgment.
- Modify: `backend/tests/api/test_api_routes.py`
  Add focused API tests for the new browse and maintenance responses.
- Modify: `frontend/package.json`
  Add frontend test scripts and dependencies.
- Create: `frontend/vitest.config.js`
  Configure Vitest with jsdom and React support.
- Create: `frontend/src/test/setup.js`
  Register jest-dom and stable browser mocks for routing, `localStorage`, and `ResizeObserver`.
- Modify: `frontend/src/lib/api.js`
  Add dashboard-specific API helpers for tree, region list, preview, summary, and queue data.
- Modify: `frontend/src/index.css`
  Introduce warm maintenance-browser tokens and a few shared utility classes.
- Modify: `frontend/src/features/dashboard/DashboardPage.jsx`
  Replace the current metric/action dashboard with a state coordinator for the new browser layout.
- Create: `frontend/src/features/dashboard/components/StructureTree.jsx`
  Render the anomaly-badged tree and selection behavior.
- Create: `frontend/src/features/dashboard/components/RegionList.jsx`
  Render the sortable middle-column list and multi-select state.
- Create: `frontend/src/features/dashboard/components/DetailPreview.jsx`
  Render preview metadata, content excerpt, and context actions.
- Create: `frontend/src/features/dashboard/components/MaintenanceStrip.jsx`
  Render bottom summary, filters, and low-risk actions.
- Create: `frontend/src/features/dashboard/dashboard.test.jsx`
  Lock routing, browser layout, filter behavior, and degraded rendering.
- Modify: `docs/dev-notes.md`
  Record that dashboard design shifted from overview cards to a maintenance browser.

## Task 1: Add backend coverage for maintenance-browser data

**Files:**
- Modify: `backend/tests/api/test_api_routes.py`
- Modify: `backend/api/browse.py`
- Modify: `backend/api/maintenance.py`

- [ ] **Step 1: Write the failing API tests for tree, region list, and maintenance summary**

```python
async def test_browse_tree_returns_domains_clusters_and_anomaly_flags(api_client, graph_service):
    await graph_service.create_memory(
        parent_path="projects/job-hunt",
        domain="work",
        title="profile",
        content="Job hunt profile note",
        priority=2,
        disclosure="When organizing job hunt memory",
    )

    response = await api_client.get("/browse/tree")

    assert response.status_code == 200
    payload = response.json()
    work_root = next(item for item in payload if item["uri"] == "work://")
    assert any(child["name"] == "projects" for child in work_root["children"])


async def test_browse_region_returns_items_for_selected_branch(api_client, graph_service):
    await graph_service.create_memory(
        parent_path="agents/cola",
        domain="work",
        title="legacy_misfiled_profile",
        content="Potentially misplaced profile memory",
        priority=2,
        disclosure="When cleaning cola branch",
    )

    response = await api_client.get(
        "/browse/region",
        params={"domain": "work", "path": "agents/cola"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["region"]["uri"] == "work://agents/cola"
    assert payload["items"][0]["uri"] == "work://agents/cola/legacy_misfiled_profile"


async def test_maintenance_summary_returns_filters_and_human_queue(api_client, graph_service):
    await graph_service.create_memory(
        parent_path="agents/cola",
        domain="work",
        title="legacy_misfiled_profile",
        content="Potentially misplaced profile memory",
        priority=2,
        disclosure="When cleaning cola branch",
    )

    response = await api_client.get(
        "/maintenance/summary",
        params={"domain": "work", "path": "agents/cola"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert "filters" in payload
    assert payload["filters"][0]["key"] == "structure"
    assert payload["human_queue"][0]["priority"] in {"Now", "Soon", "Watch"}
```

- [ ] **Step 2: Run the targeted backend tests to verify the routes do not exist yet**

Run: `cd /Users/lyn/nocturne_memory_plusmax/backend && ../.venv/bin/pytest tests/api/test_api_routes.py -k "browse_tree or browse_region or maintenance_summary" -v`

Expected: FAIL with `404 Not Found` for `/browse/tree`, `/browse/region`, or `/maintenance/summary`.

- [ ] **Step 3: Add minimal response models and route implementations**

```python
# backend/api/browse.py

def _segments_for_tree(rows: list[dict]) -> list[dict]:
    tree: dict[str, dict] = {}

    for row in rows:
        root_uri = f"{row['domain']}://"
        root = tree.setdefault(
            root_uri,
            {
                "name": row["domain"],
                "uri": root_uri,
                "children": [],
            },
        )

        current = root
        accumulated: list[str] = []
        for segment in filter(None, row["path"].split("/")):
            accumulated.append(segment)
            segment_uri = f"{row['domain']}://{'/'.join(accumulated)}"
            existing = next((child for child in current["children"] if child["uri"] == segment_uri), None)
            if existing is None:
                existing = {
                    "name": segment,
                    "uri": segment_uri,
                    "children": [],
                    "flags": row.get("flags", []),
                }
                current["children"].append(existing)
            current = existing

    return sorted(tree.values(), key=lambda item: item["uri"])


@router.get("/tree")
async def get_tree():
    graph = get_graph_service()
    rows = await graph.get_recent_memories(limit=200, namespace=get_namespace())
    normalized = [
        {
            "domain": item["domain"],
            "path": item["path"],
            "flags": [],
        }
        for item in rows
    ]
    return _segments_for_tree(normalized)


@router.get("/region")
async def get_region(domain: str = Query("core"), path: str = Query("")):
    node = await get_node(domain=domain, path=path, nav_only=True)
    items = [
        {
            "uri": child["uri"],
            "name": child["name"],
            "description": child.get("disclosure") or child.get("content_snippet") or "No summary",
            "flags": [],
            "status": "Watch",
            "updated_label": "recent",
        }
        for child in node["children"]
    ]
    return {
        "region": {
            "uri": f"{domain}://{path}",
            "name": path.split("/")[-1] if path else domain,
        },
        "items": items,
    }
```

```python
# backend/api/maintenance.py

@router.get("/summary")
async def get_summary(domain: str = "core", path: str = ""):
    graph = get_graph_service()
    orphan_items = await graph.get_all_orphan_memories()
    relevant = [
        item for item in orphan_items
        if any(current.startswith(f"{domain}://{path}".rstrip("/")) for current in item.get("current_paths", []))
    ]

    return {
        "summary": {
            "label": "Selected region needs maintenance review" if relevant else "Selected region is currently stable",
            "now_count": len(relevant),
            "watch_count": 0,
        },
        "filters": [
            {"key": "structure", "label": "Structure"},
            {"key": "duplicate", "label": "Duplicate"},
            {"key": "orphan", "label": "Orphan"},
            {"key": "review", "label": "Review"},
        ],
        "human_queue": [
            {
                "title": item.get("current_paths", [f"memory:{item['id']}"])[0],
                "type": item["category"],
                "reason": "Needs human judgment because the maintenance system cannot safely relocate or delete it automatically.",
                "priority": "Now",
            }
            for item in relevant[:5]
        ],
    }
```

- [ ] **Step 4: Run the targeted backend tests again and confirm they pass**

Run: `cd /Users/lyn/nocturne_memory_plusmax/backend && ../.venv/bin/pytest tests/api/test_api_routes.py -k "browse_tree or browse_region or maintenance_summary" -v`

Expected: PASS for the three new endpoint behaviors.

- [ ] **Step 5: Commit the backend maintenance-browser API slice**

```bash
cd /Users/lyn/nocturne_memory_plusmax
git add backend/api/browse.py backend/api/maintenance.py backend/tests/api/test_api_routes.py
git commit -m "feat: add maintenance dashboard data endpoints"
```

## Task 2: Add frontend test harness and lock the new dashboard shell

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.js`
- Create: `frontend/src/test/setup.js`
- Create: `frontend/src/features/dashboard/dashboard.test.jsx`

- [ ] **Step 1: Write the failing dashboard shell tests**

```jsx
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import App from '../../App';

vi.mock('../../lib/api', () => ({
  AUTH_ERROR_EVENT: 'nocturne:auth-error',
  getDomains: vi.fn(() => Promise.resolve([{ domain: 'core', root_count: 1 }])),
  getNamespaces: vi.fn(() => Promise.resolve([''])),
  getBrowseTree: vi.fn(() => Promise.resolve([{ uri: 'work://', name: 'work', children: [] }])),
  getBrowseRegion: vi.fn(() => Promise.resolve({ region: { uri: 'work://agents/cola' }, items: [] })),
  getMaintenanceSummary: vi.fn(() => Promise.resolve({
    summary: { label: 'Selected region is currently stable', now_count: 0, watch_count: 0 },
    filters: [{ key: 'structure', label: 'Structure' }],
    human_queue: [],
  })),
}));

it('renders the three-column maintenance browser on /dashboard', async () => {
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <App />
    </MemoryRouter>
  );

  expect(await screen.findByText(/Domain \/ Cluster tree/i)).toBeInTheDocument();
  expect(screen.getByText(/Current region/i)).toBeInTheDocument();
  expect(screen.getByText(/Preview/i)).toBeInTheDocument();
});

it('keeps the maintenance strip visible when queue data is empty', async () => {
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <App />
    </MemoryRouter>
  );

  expect(await screen.findByText(/Maintenance summary/i)).toBeInTheDocument();
  expect(screen.getByText(/Selected region is currently stable/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the frontend tests to verify the harness is missing**

Run: `cd /Users/lyn/nocturne_memory_plusmax/frontend && npm test -- --run`

Expected: FAIL because the `test` script and Vitest config do not exist yet.

- [ ] **Step 3: Add the minimal Vitest setup**

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
// frontend/vitest.config.js
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

```js
// frontend/src/test/setup.js
import '@testing-library/jest-dom/vitest';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;
```

- [ ] **Step 4: Run the frontend tests again and confirm the new shell tests now fail on missing UI**

Run: `cd /Users/lyn/nocturne_memory_plusmax/frontend && npm test -- --run`

Expected: FAIL in `dashboard.test.jsx` because the current dashboard still renders the old card/action layout.

- [ ] **Step 5: Commit the frontend test harness**

```bash
cd /Users/lyn/nocturne_memory_plusmax
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.js frontend/src/test/setup.js frontend/src/features/dashboard/dashboard.test.jsx
git commit -m "test: add maintenance dashboard frontend harness"
```

## Task 3: Add frontend API helpers and split dashboard UI into focused components

**Files:**
- Modify: `frontend/src/lib/api.js`
- Create: `frontend/src/features/dashboard/components/StructureTree.jsx`
- Create: `frontend/src/features/dashboard/components/RegionList.jsx`
- Create: `frontend/src/features/dashboard/components/DetailPreview.jsx`
- Create: `frontend/src/features/dashboard/components/MaintenanceStrip.jsx`

- [ ] **Step 1: Extend the API client with maintenance-browser helpers**

```js
export const getBrowseTree = () =>
  api.get('/browse/tree').then(res => res.data);

export const getBrowseRegion = (domain, path) =>
  api.get('/browse/region', { params: { domain, path } }).then(res => res.data);

export const getMaintenanceSummary = (domain, path) =>
  api.get('/maintenance/summary', { params: { domain, path } }).then(res => res.data);
```

- [ ] **Step 2: Create the structure-tree component**

```jsx
import clsx from 'clsx';

function TreeNode({ node, selectedUri, onSelect, level = 0 }) {
  const isSelected = node.uri === selectedUri;

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(node.uri)}
        className={clsx(
          'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition',
          isSelected ? 'bg-[#ead6c3] text-[#2a241f]' : 'text-[#4a4137] hover:bg-[#f1e8db]'
        )}
        style={{ paddingLeft: `${12 + level * 14}px` }}
      >
        <span>{node.name}</span>
        {node.flags?.length ? <span className="text-xs text-[#9a614a]">{node.flags.join(' ')}</span> : null}
      </button>
      {node.children?.map(child => (
        <TreeNode
          key={child.uri}
          node={child}
          selectedUri={selectedUri}
          onSelect={onSelect}
          level={level + 1}
        />
      ))}
    </div>
  );
}

export default function StructureTree({ tree, selectedUri, onSelect }) {
  return (
    <section className="rounded-[24px] border border-[#e3d7c6] bg-[#fbf8f2] p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-[#8c7258]">Structure</div>
      <h2 className="mt-2 text-lg font-semibold text-[#2a241f]">Domain / Cluster tree</h2>
      <div className="mt-4 space-y-1">
        {tree.map(node => (
          <TreeNode key={node.uri} node={node} selectedUri={selectedUri} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Create the list, preview, and maintenance-strip components**

```jsx
// frontend/src/features/dashboard/components/RegionList.jsx
export default function RegionList({ region, items, selectedItemUri, onSelectItem }) {
  return (
    <section className="rounded-[24px] border border-[#e3d7c6] bg-[#fbf8f2] p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-[#8c7258]">Current region</div>
      <h2 className="mt-2 text-lg font-semibold text-[#2a241f]">{region?.uri || 'No region selected'}</h2>
      <div className="mt-4 overflow-hidden rounded-[18px] border border-[#e8dccb] bg-[#fffaf3]">
        {items.map(item => (
          <button
            key={item.uri}
            type="button"
            onClick={() => onSelectItem(item.uri)}
            className="grid w-full grid-cols-[1.8fr_.8fr_.8fr_.7fr] gap-0 border-b border-[#f0e6d8] px-4 py-3 text-left last:border-b-0 hover:bg-[#fdf4e8]"
          >
            <div>
              <div className="font-medium text-[#2a241f]">{item.name}</div>
              <div className="mt-1 text-xs text-[#6d6257]">{item.description}</div>
            </div>
            <div className="text-sm text-[#6d6257]">{item.updated_label}</div>
            <div className="text-sm text-[#9a614a]">{item.flags?.join(' ') || '—'}</div>
            <div className="text-sm text-[#2a241f]">{item.status}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
```

```jsx
// frontend/src/features/dashboard/components/DetailPreview.jsx
export default function DetailPreview({ item }) {
  return (
    <section className="rounded-[24px] border border-[#e3d7c6] bg-[#fbf8f2] p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-[#8c7258]">Preview</div>
      <h2 className="mt-2 text-lg font-semibold text-[#2a241f]">{item?.name || 'Select a memory item'}</h2>
      <div className="mt-4 text-sm leading-6 text-[#6d6257]">
        {item ? item.description : 'Choose a row to inspect the memory path, anomaly reason, and preview content.'}
      </div>
    </section>
  );
}
```

```jsx
// frontend/src/features/dashboard/components/MaintenanceStrip.jsx
export default function MaintenanceStrip({ summary }) {
  return (
    <section className="rounded-[22px] border border-[#dfd0bc] bg-[#efe7db] p-4">
      <div className="grid gap-4 md:grid-cols-[1.25fr_1fr_.95fr]">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[#8c7258]">Maintenance summary</div>
          <div className="mt-2 text-base font-semibold text-[#2a241f]">{summary?.summary?.label || 'Loading maintenance state…'}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[#8c7258]">Anomaly filters</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {summary?.filters?.map(filter => (
              <span key={filter.key} className="rounded-full bg-[#fbf8f2] px-3 py-2 text-sm text-[#2a241f]">{filter.label}</span>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[#8c7258]">Human queue</div>
          <div className="mt-2 text-sm text-[#6d6257]">
            {summary?.human_queue?.[0]?.reason || 'No human-judgment items for this region.'}
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run the frontend tests and confirm the component exports wire into the current dashboard implementation**

Run: `cd /Users/lyn/nocturne_memory_plusmax/frontend && npm test -- --run`

Expected: FAIL or partially pass until `DashboardPage.jsx` is rewritten to use the new helpers and components.

- [ ] **Step 5: Commit the dashboard component scaffold**

```bash
cd /Users/lyn/nocturne_memory_plusmax
git add frontend/src/lib/api.js frontend/src/features/dashboard/components
git commit -m "feat: scaffold maintenance dashboard components"
```

## Task 4: Rewrite the dashboard page into the maintenance browser

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardPage.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/index.css`
- Test: `frontend/src/features/dashboard/dashboard.test.jsx`

- [ ] **Step 1: Rewrite the failing dashboard test to assert the maintenance-browser experience**

```jsx
it('shows the maintenance browser instead of quick action cards', async () => {
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <App />
    </MemoryRouter>
  );

  expect(await screen.findByText(/Browse the memory system like a structured archive/i)).toBeInTheDocument();
  expect(screen.queryByText(/Quick Actions/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the frontend tests and confirm the old page still fails this expectation**

Run: `cd /Users/lyn/nocturne_memory_plusmax/frontend && npm test -- --run`

Expected: FAIL because `DashboardPage.jsx` still renders the legacy overview/action layout.

- [ ] **Step 3: Replace the dashboard page implementation with the maintenance-browser coordinator**

```jsx
import React, { useEffect, useMemo, useState } from 'react';

import {
  getBrowseRegion,
  getBrowseTree,
  getMaintenanceSummary,
} from '../../lib/api';
import StructureTree from './components/StructureTree';
import RegionList from './components/RegionList';
import DetailPreview from './components/DetailPreview';
import MaintenanceStrip from './components/MaintenanceStrip';

function parseUri(uri) {
  const [domain, path = ''] = uri.split('://');
  return { domain, path };
}

export default function DashboardPage() {
  const [tree, setTree] = useState([]);
  const [selectedUri, setSelectedUri] = useState('core://');
  const [region, setRegion] = useState({ region: null, items: [] });
  const [selectedItemUri, setSelectedItemUri] = useState('');
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    getBrowseTree().then(setTree).catch(() => setTree([]));
  }, []);

  useEffect(() => {
    const { domain, path } = parseUri(selectedUri);
    getBrowseRegion(domain, path).then(setRegion).catch(() => setRegion({ region: null, items: [] }));
    getMaintenanceSummary(domain, path).then(setSummary).catch(() => setSummary(null));
  }, [selectedUri]);

  const selectedItem = useMemo(
    () => region.items.find(item => item.uri === selectedItemUri) || region.items[0] || null,
    [region.items, selectedItemUri]
  );

  return (
    <div className="h-full overflow-y-auto bg-[#f6f2ea] text-[#2a241f]">
      <div className="mx-auto max-w-[1500px] px-5 py-6">
        <section className="border-b border-[#e7dccb] pb-4">
          <div className="text-xs uppercase tracking-[0.24em] text-[#8c7258]">Memory Maintenance</div>
          <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-tight">
            Browse the memory system like a structured archive, with maintenance always visible but never in the way.
          </h1>
        </section>

        <div className="mt-6 grid min-h-[520px] gap-4 xl:grid-cols-[260px_1.35fr_1fr]">
          <StructureTree tree={tree} selectedUri={selectedUri} onSelect={setSelectedUri} />
          <RegionList
            region={region.region}
            items={region.items}
            selectedItemUri={selectedItemUri}
            onSelectItem={setSelectedItemUri}
          />
          <DetailPreview item={selectedItem} />
        </div>

        <div className="mt-4">
          <MaintenanceStrip summary={summary} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add the warm maintenance-browser CSS tokens**

```css
:root {
  --nm-bg: #f6f2ea;
  --nm-panel: #fbf8f2;
  --nm-panel-strong: #efe7db;
  --nm-border: #e3d7c6;
  --nm-text: #2a241f;
  --nm-muted: #6d6257;
  --nm-accent: #b88a54;
  --nm-alert: #9a614a;
}

body {
  background: var(--nm-bg);
  color: var(--nm-text);
}
```

- [ ] **Step 5: Run the frontend tests to verify the new browser layout passes**

Run: `cd /Users/lyn/nocturne_memory_plusmax/frontend && npm test -- --run`

Expected: PASS for the dashboard shell tests and the maintenance-browser assertion.

- [ ] **Step 6: Build the frontend to catch layout/runtime regressions**

Run: `cd /Users/lyn/nocturne_memory_plusmax/frontend && npm run build`

Expected: PASS with a Vite production build and no import/runtime errors.

- [ ] **Step 7: Commit the dashboard rewrite**

```bash
cd /Users/lyn/nocturne_memory_plusmax
git add frontend/src/features/dashboard/DashboardPage.jsx frontend/src/App.jsx frontend/src/index.css frontend/src/features/dashboard/dashboard.test.jsx
git commit -m "feat: redesign dashboard as maintenance browser"
```

## Task 5: Polish maintenance semantics, degraded states, and docs

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardPage.jsx`
- Modify: `frontend/src/features/dashboard/components/RegionList.jsx`
- Modify: `frontend/src/features/dashboard/components/DetailPreview.jsx`
- Modify: `frontend/src/features/dashboard/components/MaintenanceStrip.jsx`
- Modify: `docs/dev-notes.md`

- [ ] **Step 1: Add a failing test for degraded maintenance data**

```jsx
it('keeps tree and list usable when maintenance summary fails', async () => {
  getMaintenanceSummary.mockRejectedValueOnce(new Error('boom'));

  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <App />
    </MemoryRouter>
  );

  expect(await screen.findByText(/Domain \/ Cluster tree/i)).toBeInTheDocument();
  expect(screen.getByText(/Maintenance state unavailable/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the frontend tests to verify the degraded-state copy is still missing**

Run: `cd /Users/lyn/nocturne_memory_plusmax/frontend && npm test -- --run`

Expected: FAIL because the current strip falls back to generic loading text.

- [ ] **Step 3: Add explicit degraded-state copy and update development notes**

```jsx
// frontend/src/features/dashboard/components/MaintenanceStrip.jsx
const label = summary?.summary?.label || 'Maintenance state unavailable. Continue browsing while maintenance signals recover.';
```

```md
## Maintenance Dashboard Redesign

- Date: `2026-04-11`
- Dashboard direction changed from overview cards to a maintenance-first browser
- Primary dashboard pattern is now:
  - left structure tree
  - middle content list
  - right detail preview
  - bottom maintenance strip
```

- [ ] **Step 4: Run the targeted frontend tests and one backend regression test**

Run: `cd /Users/lyn/nocturne_memory_plusmax/frontend && npm test -- --run`

Expected: PASS.

Run: `cd /Users/lyn/nocturne_memory_plusmax/backend && ../.venv/bin/pytest tests/api/test_api_routes.py -k "maintenance_summary or browse_region" -v`

Expected: PASS.

- [ ] **Step 5: Commit the polish and docs**

```bash
cd /Users/lyn/nocturne_memory_plusmax
git add frontend/src/features/dashboard/DashboardPage.jsx frontend/src/features/dashboard/components/RegionList.jsx frontend/src/features/dashboard/components/DetailPreview.jsx frontend/src/features/dashboard/components/MaintenanceStrip.jsx docs/dev-notes.md
git commit -m "chore: polish maintenance dashboard states"
```

## Self-Review

- Spec coverage:
  - three-column file-manager browser: Task 4
  - maintenance strip with summary and filters: Tasks 1, 3, 4, 5
  - human queue as secondary surface: Tasks 1, 3, 5
  - warm Claude/Notion visual direction: Task 4
  - degraded rendering and low-friction browsing-first behavior: Tasks 4 and 5
- Placeholder scan:
  - no `TBD`, `TODO`, or deferred implementation markers remain
  - each test and code step includes concrete snippets and commands
- Type consistency:
  - frontend helper names are `getBrowseTree`, `getBrowseRegion`, `getMaintenanceSummary`
  - UI component names are `StructureTree`, `RegionList`, `DetailPreview`, `MaintenanceStrip`
  - backend route names align with `/browse/tree`, `/browse/region`, and `/maintenance/summary`
