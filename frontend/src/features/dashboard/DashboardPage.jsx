import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  FolderTree,
  History,
  Search,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import clsx from 'clsx';

import {
  getDomains,
  getGroups,
  getMaintenanceOrphans,
  getRecentMemories,
  searchMemories,
} from '../../lib/api';

const initialState = {
  loading: true,
  errors: {},
  domains: [],
  reviewGroups: [],
  orphans: [],
  recentMemories: [],
};

function parseUri(uri) {
  const [domain, path = ''] = uri.split('://');
  return { domain, path };
}

function TreeButton({ label, meta, active, onClick, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left transition',
        active ? 'bg-[#eadbca] text-[#2e271f]' : 'text-[#5e554b] hover:bg-[#f1e8dc]'
      )}
    >
      <span className="flex items-center gap-2">
        <Icon size={15} />
        <span className="text-sm">{label}</span>
      </span>
      {meta ? <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs">{meta}</span> : null}
    </button>
  );
}

function ListRow({ item, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'grid w-full grid-cols-[1.8fr_.9fr_.8fr] gap-3 border-b border-[#eee3d4] px-4 py-3 text-left last:border-b-0',
        active ? 'bg-[#f2e5d5]' : 'hover:bg-[#faf4eb]'
      )}
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-[#2e271f]">{item.title}</div>
        <div className="mt-1 truncate text-xs text-[#74695d]">{item.subtitle}</div>
      </div>
      <div className="text-xs text-[#74695d]">{item.when}</div>
      <div className="text-xs text-[#9b644a]">{item.status}</div>
    </button>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(initialState);
  const [selectedPanel, setSelectedPanel] = useState('recent');
  const [selectedKey, setSelectedKey] = useState('');
  const [query, setQuery] = useState('');
  const [searchState, setSearchState] = useState({ loading: false, error: '', results: [] });

  useEffect(() => {
    const refresh = async () => {
      setDashboard(current => ({ ...current, loading: true }));
      const modules = [
        ['domains', () => getDomains()],
        ['reviewGroups', () => getGroups()],
        ['orphans', () => getMaintenanceOrphans()],
        ['recentMemories', () => getRecentMemories(24)],
      ];
      const settled = await Promise.allSettled(modules.map(([, fn]) => fn()));
      const next = modules.reduce((acc, [key], index) => {
        const result = settled[index];
        if (result.status === 'fulfilled') {
          acc[key] = result.value;
        } else {
          acc.errors[key] = result.reason;
        }
        return acc;
      }, { ...initialState, loading: false, errors: {} });
      setDashboard(next);
    };

    refresh();
  }, []);

  const treeDomains = useMemo(
    () => dashboard.domains.map(item => ({ key: `domain:${item.domain}`, label: item.domain, meta: item.root_count || 0 })),
    [dashboard.domains]
  );

  const currentItems = useMemo(() => {
    if (searchState.results.length > 0) {
      return searchState.results.map(item => ({
        key: `search:${item.uri}`,
        type: 'memory',
        title: item.uri,
        subtitle: item.snippet || 'Open in Memory Explorer',
        when: 'search',
        status: 'Match',
        uri: item.uri,
      }));
    }

    if (selectedPanel === 'review') {
      return dashboard.reviewGroups.map(group => ({
        key: `review:${group.node_uuid}`,
        type: 'review',
        title: group.display_uri,
        subtitle: `${group.action} · ${group.row_count} rows`,
        when: group.top_level_table,
        status: 'Needs review',
        nodeUuid: group.node_uuid,
      }));
    }

    if (selectedPanel === 'cleanup') {
      return dashboard.orphans.map(item => ({
        key: `cleanup:${item.id}`,
        type: 'cleanup',
        title: item.current_paths?.[0] || item.migration_target?.paths?.[0] || `memory:${item.id}`,
        subtitle: item.content_snippet || 'Maintenance candidate',
        when: item.category,
        status: item.category === 'orphaned' ? 'Now' : 'Soon',
        memoryId: item.id,
      }));
    }

    if (selectedPanel.startsWith('domain:')) {
      const domain = selectedPanel.split(':')[1];
      return dashboard.recentMemories
        .filter(item => parseUri(item.uri).domain === domain)
        .map(item => ({
          key: `memory:${item.uri}`,
          type: 'memory',
          title: item.uri,
          subtitle: item.disclosure || 'Recent memory write',
          when: `p${item.priority ?? 0}`,
          status: 'Recent',
          uri: item.uri,
        }));
    }

    return dashboard.recentMemories.map(item => ({
      key: `memory:${item.uri}`,
      type: 'memory',
      title: item.uri,
      subtitle: item.disclosure || 'Recent memory write',
      when: `p${item.priority ?? 0}`,
      status: 'Recent',
      uri: item.uri,
    }));
  }, [dashboard.orphans, dashboard.recentMemories, dashboard.reviewGroups, searchState.results, selectedPanel]);

  useEffect(() => {
    setSelectedKey(currentItems[0]?.key || '');
  }, [currentItems]);

  const selectedItem = currentItems.find(item => item.key === selectedKey) || currentItems[0] || null;

  const handleSearch = async (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchState({ loading: false, error: '', results: [] });
      return;
    }
    setSearchState({ loading: true, error: '', results: [] });
    try {
      const results = await searchMemories(trimmed, 12);
      setSearchState({ loading: false, error: '', results });
    } catch {
      setSearchState({ loading: false, error: 'Search unavailable.', results: [] });
    }
  };

  const openMemory = (uri) => {
    const { domain, path } = parseUri(uri);
    navigate(`/memory?domain=${encodeURIComponent(domain)}&path=${encodeURIComponent(path)}`);
  };

  const summaryText = selectedPanel === 'review'
    ? `Review queue has ${dashboard.reviewGroups.length} pending items.`
    : selectedPanel === 'cleanup'
      ? `Cleanup queue has ${dashboard.orphans.length} candidates.`
      : searchState.results.length > 0
        ? `Search returned ${searchState.results.length} matching memories.`
        : `Showing ${currentItems.length} items in the current browsing context.`;

  return (
    <div className="h-full overflow-y-auto bg-[#f6f1e8] text-[#2e271f]">
      <div className="mx-auto max-w-[1520px] px-5 py-6">
        <section className="border-b border-[#e5d8c6] pb-5">
          <div className="text-[11px] uppercase tracking-[0.26em] text-[#8b755f]">Memory Maintenance</div>
          <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <h1 className="text-4xl font-semibold leading-tight text-[#2e271f]">Browse the memory system like a maintained archive.</h1>
              <p className="mt-3 text-sm leading-6 text-[#6f655a]">
                The dashboard is for scanning structure, spotting drift, and opening the right memory detail with minimal friction.
              </p>
            </div>
            <form onSubmit={handleSearch} className="flex w-full max-w-md gap-2">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search memories"
                className="flex-1 rounded-2xl border border-[#dcccb7] bg-[#fbf8f2] px-4 py-3 text-sm outline-none focus:border-[#b88a54]"
              />
              <button type="submit" className="rounded-2xl bg-[#2e271f] px-4 py-3 text-sm text-white">
                <Search size={16} />
              </button>
            </form>
          </div>
        </section>

        <div className="mt-6 grid min-h-[560px] gap-4 xl:grid-cols-[260px_1.3fr_.9fr]">
          <section className="rounded-[28px] border border-[#e3d7c6] bg-[#fbf8f2] p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-[#8b755f]">Structure</div>
            <h2 className="mt-2 text-lg font-semibold">Domain / Cluster tree</h2>
            <div className="mt-4 space-y-2">
              <TreeButton
                label="Recent writes"
                meta={dashboard.recentMemories.length}
                icon={History}
                active={selectedPanel === 'recent'}
                onClick={() => setSelectedPanel('recent')}
              />
              <TreeButton
                label="Review queue"
                meta={dashboard.reviewGroups.length}
                icon={ShieldAlert}
                active={selectedPanel === 'review'}
                onClick={() => setSelectedPanel('review')}
              />
              <TreeButton
                label="Cleanup candidates"
                meta={dashboard.orphans.length}
                icon={Sparkles}
                active={selectedPanel === 'cleanup'}
                onClick={() => setSelectedPanel('cleanup')}
              />
            </div>
            <div className="mt-6 text-xs uppercase tracking-[0.2em] text-[#8b755f]">Domains</div>
            <div className="mt-3 space-y-2">
              {treeDomains.map(item => (
                <TreeButton
                  key={item.key}
                  label={item.label}
                  meta={item.meta}
                  icon={FolderTree}
                  active={selectedPanel === item.key}
                  onClick={() => setSelectedPanel(item.key)}
                />
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-[#e3d7c6] bg-[#fbf8f2] p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-[#8b755f]">Current region</div>
                <h2 className="mt-2 text-lg font-semibold">
                  {searchState.results.length > 0 ? 'Search results' : selectedPanel.replace('domain:', '')}
                </h2>
              </div>
              {searchState.results.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setSearchState({ loading: false, error: '', results: [] })}
                  className="text-xs text-[#8b755f]"
                >
                  Clear search
                </button>
              ) : null}
            </div>
            <div className="mt-4 overflow-hidden rounded-[20px] border border-[#eadfce] bg-[#fffaf3]">
              {currentItems.map(item => (
                <ListRow
                  key={item.key}
                  item={item}
                  active={selectedItem?.key === item.key}
                  onClick={() => setSelectedKey(item.key)}
                />
              ))}
              {!dashboard.loading && currentItems.length === 0 ? (
                <div className="px-4 py-8 text-sm text-[#74695d]">No items in this view.</div>
              ) : null}
            </div>
            {searchState.error ? <div className="mt-3 text-sm text-[#9b644a]">{searchState.error}</div> : null}
          </section>

          <section className="rounded-[28px] border border-[#e3d7c6] bg-[#fbf8f2] p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-[#8b755f]">Preview</div>
            <h2 className="mt-2 text-lg font-semibold">{selectedItem?.title || 'Select an item'}</h2>
            <div className="mt-4 space-y-4 text-sm text-[#6f655a]">
              <div className="rounded-2xl bg-[#f3e6d6] px-4 py-3">
                {selectedItem?.subtitle || 'Choose a row to inspect details.'}
              </div>
              {selectedItem ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-[#f7efe3] px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-[#8b755f]">Status</div>
                      <div className="mt-1 font-medium text-[#2e271f]">{selectedItem.status}</div>
                    </div>
                    <div className="rounded-2xl bg-[#f7efe3] px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-[#8b755f]">Context</div>
                      <div className="mt-1 font-medium text-[#2e271f]">{selectedItem.when}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedItem.type === 'review') navigate('/review');
                      else if (selectedItem.type === 'cleanup') navigate('/maintenance');
                      else openMemory(selectedItem.uri);
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#2e271f] px-4 py-3 text-sm text-white"
                  >
                    Open detail
                    <ArrowRight size={16} />
                  </button>
                </>
              ) : null}
            </div>
          </section>
        </div>

        <section className="mt-4 rounded-[24px] border border-[#dfd1bd] bg-[#efe7db] px-5 py-4">
          <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr_1fr]">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#8b755f]">Maintenance summary</div>
              <div className="mt-2 text-base font-semibold text-[#2e271f]">{summaryText}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#8b755f]">Signals</div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-[#fbf8f2] px-3 py-2">Review {dashboard.reviewGroups.length}</span>
                <span className="rounded-full bg-[#fbf8f2] px-3 py-2">Cleanup {dashboard.orphans.length}</span>
                <span className="rounded-full bg-[#fbf8f2] px-3 py-2">Recent {dashboard.recentMemories.length}</span>
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#8b755f]">Workspace</div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <button onClick={() => navigate('/memory')} className="rounded-full bg-[#fbf8f2] px-3 py-2">Explorer</button>
                <button onClick={() => navigate('/review')} className="rounded-full bg-[#fbf8f2] px-3 py-2">Review</button>
                <button onClick={() => navigate('/maintenance')} className="rounded-full bg-[#fbf8f2] px-3 py-2">Cleanup</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
