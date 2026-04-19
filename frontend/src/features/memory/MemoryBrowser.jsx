import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Folder,
  Edit3,
  Save,
  X,
  Brain,
  Hash,
  AlertTriangle,
  Link2,
  Star
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '../../lib/api';
import PriorityBadge from './components/PriorityBadge';
import GlossaryHighlighter from './components/GlossaryHighlighter';
import KeywordManager from './components/KeywordManager';
import DomainNode from './components/MemorySidebar';
import Breadcrumb from './components/Breadcrumb';
import NodeGridCard from './components/NodeGridCard';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import { useToast } from '../../components/Toast';
import { useNamespace } from '../../context/NamespaceContext';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Input from '../../components/ui/Input';

export default function MemoryBrowser() {
  const [searchParams, setSearchParams] = useSearchParams();
  const domain = searchParams.get('domain') || 'core';
  const path = searchParams.get('path') || '';
  const { namespace } = useNamespace();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ node: null, children: [], breadcrumbs: [] });
  const [domains, setDomains] = useState([]);

  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editDisclosure, setEditDisclosure] = useState('');
  const [editPriority, setEditPriority] = useState(0);
  const [saving, setSaving] = useState(false);

  const currentRouteRef = useRef({ domain, path, namespace });
  useEffect(() => { currentRouteRef.current = { domain, path, namespace }; }, [domain, path, namespace]);

  useEffect(() => {
    api.get('/browse/domains').then(res => setDomains(res.data)).catch(() => {});
  }, [namespace]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setEditing(false);
      try {
        const res = await api.get('/browse/node', { params: { domain, path } });
        setData(res.data);
        setEditContent(res.data.node?.content || '');
        setEditDisclosure(res.data.node?.disclosure || '');
        setEditPriority(res.data.node?.priority ?? 0);
      } catch (err) {
        setError(err.response?.data?.detail || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [domain, path, namespace]);

  const navigateTo = (newPath, newDomain) => {
    const params = new URLSearchParams();
    params.set('domain', newDomain || domain);
    if (newPath) params.set('path', newPath);
    setSearchParams(params);
  };

  const refreshData = () =>
    api.get('/browse/node', { params: { domain, path } }).then(res => {
      setData(currentData => {
        const ref = currentRouteRef.current;
        if (ref.domain === domain && ref.path === path && ref.namespace === namespace) return res.data;
        return currentData;
      });
    });

  const startEditing = () => {
    setEditContent(data.node?.content || '');
    setEditDisclosure(data.node?.disclosure || '');
    setEditPriority(data.node?.priority ?? 0);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditContent(data.node?.content || '');
    setEditDisclosure(data.node?.disclosure || '');
    setEditPriority(data.node?.priority ?? 0);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {};
      if (editContent !== (data.node?.content || '')) payload.content = editContent;
      if (editPriority !== (data.node?.priority ?? 0)) payload.priority = editPriority;
      if (editDisclosure !== (data.node?.disclosure || '')) payload.disclosure = editDisclosure;
      if (Object.keys(payload).length === 0) { setEditing(false); return; }
      await api.put('/browse/node', payload, { params: { domain, path } });
      await refreshData();
      setEditing(false);
      toast.success('已保存');
    } catch (err) {
      toast.error('保存失败：' + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  // 快捷键：Cmd/Ctrl+S 保存，Escape 取消，Cmd/Ctrl+E 进入编辑
  useEffect(() => {
    const onKeyDown = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (editing) {
        if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); if (!saving) handleSave(); }
        else if (e.key === 'Escape') {
          if (!document.querySelector('[role="dialog"]')) { e.preventDefault(); cancelEditing(); }
        }
      } else {
        if (mod && e.key.toLowerCase() === 'e') {
          const node = data.node;
          if (node && !node.is_virtual) { e.preventDefault(); startEditing(); }
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, saving, data, editContent, editDisclosure, editPriority]);

  const isRoot = !path;
  const node = data.node;

  return (
    <div className="flex h-full bg-surface-0 text-fg-1 overflow-hidden">

      {/* 侧边栏 */}
      <div className="w-64 flex-shrink-0 bg-surface-1 border-r border-line flex flex-col">
        <div className="p-5 border-b border-line">
          <div className="flex items-center gap-2 text-brand-400 mb-1">
            <Brain size={18} />
            <h1 className="font-bold tracking-tight text-sm text-fg-0">记忆浏览</h1>
          </div>
          <p className="text-xs text-fg-3 pl-6">Nocturne Memory</p>
        </div>

        <div className="p-3 flex-1 overflow-y-auto">
          <div className="mb-4">
            <h3 className="px-3 text-xs font-bold text-fg-3 uppercase tracking-widest mb-2">域</h3>
            {domains.map(d => (
              <DomainNode
                key={d.domain}
                domain={d.domain}
                rootCount={d.root_count}
                activeDomain={domain}
                activePath={path}
                onNavigate={navigateTo}
              />
            ))}
            {domains.length === 0 && (
              <DomainNode
                domain="core"
                activeDomain={domain}
                activePath={path}
                onNavigate={navigateTo}
              />
            )}
          </div>
        </div>

        <div className="p-4 border-t border-line">
          <div className="bg-surface-2 rounded-control p-3 border border-line">
            <div className="flex items-center gap-2 text-xs text-fg-3 mb-2">
              <Hash size={12} />
              <span>当前路径</span>
            </div>
            <code className="block text-xs font-mono text-brand-400/80 break-all leading-tight">
              {domain}://{path || 'root'}
            </code>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0 bg-surface-0">
        <div className="h-14 flex-shrink-0 border-b border-line flex items-center px-6 bg-surface-0/80 backdrop-blur-md sticky top-0 z-20">
          <Breadcrumb items={data.breadcrumbs} onNavigate={navigateTo} />
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-fg-3">
              <Spinner size="lg" />
              <span className="text-xs tracking-widest uppercase">加载中…</span>
            </div>
          ) : error ? (
            <ErrorState
              title="读取失败"
              message={error}
              actionLabel="返回根节点"
              onAction={() => navigateTo('')}
            />
          ) : (
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">

              {node && (!isRoot || !node.is_virtual || editing) && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-3 min-w-0 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-bold text-fg-0 tracking-tight">
                          {node.name || path.split('/').pop()}
                        </h1>
                        <PriorityBadge priority={node.priority} size="lg" />
                      </div>

                      {node.disclosure && !editing && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-warn-500/10 border border-warn-500/30 rounded-control text-warn-400 text-xs max-w-full">
                          <AlertTriangle size={14} className="flex-shrink-0" />
                          <span className="font-medium mr-1">触发条件：</span>
                          <span className="italic truncate">{node.disclosure}</span>
                        </div>
                      )}

                      {node.aliases && node.aliases.length > 0 && !editing && (
                        <div className="flex items-start gap-2 text-xs text-fg-3">
                          <Link2 size={13} className="flex-shrink-0 mt-0.5 text-fg-3" />
                          <div className="flex flex-wrap gap-1.5">
                            <span className="text-fg-3 font-medium">别名路径：</span>
                            {node.aliases.map(alias => (
                              <code key={alias} className="px-1.5 py-0.5 bg-surface-2 rounded-control text-brand-400/70 font-mono text-xs border border-line">
                                {alias}
                              </code>
                            ))}
                          </div>
                        </div>
                      )}

                      {!editing && !node.is_virtual && (
                        <KeywordManager
                          keywords={node.glossary_keywords || []}
                          nodeUuid={node.node_uuid}
                          onUpdate={refreshData}
                        />
                      )}
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      {editing ? (
                        <>
                          <Button variant="ghost" size="sm" icon={X} onClick={cancelEditing} aria-label="取消" />
                          <Button
                            variant="primary"
                            size="sm"
                            icon={Save}
                            loading={saving}
                            onClick={handleSave}
                          >
                            {saving ? '保存中…' : '保存'}
                          </Button>
                        </>
                      ) : (
                        <Button variant="secondary" size="sm" icon={Edit3} onClick={startEditing}>
                          编辑
                        </Button>
                      )}
                    </div>
                  </div>

                  {editing && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-surface-1 border border-line rounded-card">
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-medium text-fg-2">
                          <Star size={12} />
                          优先级
                          <span className="text-fg-3 font-normal">（数值越小优先级越高）</span>
                        </label>
                        <Input
                          type="number"
                          min="0"
                          value={editPriority}
                          onChange={e => setEditPriority(parseInt(e.target.value) || 0)}
                          size="sm"
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-medium text-fg-2">
                          <AlertTriangle size={12} />
                          触发条件
                          <span className="text-fg-3 font-normal">（何时唤起此记忆）</span>
                        </label>
                        <Input
                          type="text"
                          value={editDisclosure}
                          onChange={e => setEditDisclosure(e.target.value)}
                          placeholder="例：当我需要记住…"
                          size="sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* 内容区 — editing 时加 glow（唯一允许的 glow 用例） */}
                  <div className={clsx(
                    'relative rounded-card border overflow-hidden transition-all duration-300',
                    editing
                      ? 'bg-surface-1 border-brand-500/50 shadow-glow'
                      : 'bg-surface-1 border-line shadow-e1',
                  )}>
                    {editing ? (
                      <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        className="w-full h-96 p-6 bg-transparent text-fg-0 font-mono text-sm leading-relaxed focus:outline-none resize-y"
                        spellCheck={false}
                      />
                    ) : (
                      <div className="p-6 md:p-8 prose prose-invert prose-sm max-w-none">
                        <GlossaryHighlighter
                          key={node.node_uuid}
                          content={node.content || ''}
                          glossary={node.glossary_matches || []}
                          currentNodeUuid={node.node_uuid}
                          onNavigate={navigateTo}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {data.children && data.children.length > 0 && (
                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-3 text-fg-3">
                    <h2 className="text-xs font-bold uppercase tracking-widest">
                      {isRoot ? '记忆域' : '子节点'}
                    </h2>
                    <div className="h-px flex-1 bg-line" />
                    <span className="text-xs bg-surface-2 px-2 py-0.5 rounded-pill border border-line">
                      {data.children.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {data.children.map(child => (
                      <NodeGridCard
                        key={`${child.domain || domain}:${child.path}`}
                        node={child}
                        currentDomain={domain}
                        onClick={() => navigateTo(child.path, child.domain)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {!loading && !data.children?.length && !node && (
                <EmptyState
                  icon={Folder}
                  title="空节点"
                  description="此处暂无记忆。可通过 MCP 服务器创建，或切换到其他域。"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
