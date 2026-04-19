import React, { useEffect, useState, useCallback } from 'react';
import {
  Trash2, Wrench, RefreshCw,
  ChevronDown, ChevronUp, ArrowRight, Unlink, Archive, CheckSquare, Square, Minus
} from 'lucide-react';
import { format } from 'date-fns';
import DiffViewer from '../../components/DiffViewer';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import { api } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmDialog';
import { useNamespace } from '../../context/NamespaceContext';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import StatTile from '../../components/ui/StatTile';
import Spinner from '../../components/ui/Spinner';

export default function MaintenancePage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { namespace } = useNamespace();

  const [orphans, setOrphans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [expandedId, setExpandedId] = useState(null);
  const [detailData, setDetailData] = useState({});
  const [detailLoading, setDetailLoading] = useState(null);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);

  useEffect(() => {
    loadOrphans();
    setDetailData({});
    setExpandedId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespace]);

  const loadOrphans = async () => {
    setLoading(true);
    setError(null);
    setSelectedIds(new Set());
    try {
      const res = await api.get('/maintenance/orphans');
      setOrphans(res.data);
    } catch (err) {
      setError('加载失败：' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = useCallback((id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((items) => {
    const ids = items.map(i => i.id);
    setSelectedIds(prev => {
      const next = new Set(prev);
      const allSelected = ids.every(id => next.has(id));
      if (allSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  }, []);

  const handleBatchDelete = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    const ok = await confirm({
      title: `删除 ${count} 条记忆？`,
      message: '此操作将永久删除选中的孤立记忆，无法撤销。',
      confirmLabel: '删除',
      danger: true,
    });
    if (!ok) return;

    setBatchDeleting(true);
    const toDelete = [...selectedIds];
    const failed = [];

    for (const id of toDelete) {
      try { await api.delete(`/maintenance/orphans/${id}`); }
      catch { failed.push(id); }
    }

    const failedSet = new Set(failed);
    setOrphans(prev => prev.filter(item => !toDelete.includes(item.id) || failedSet.has(item.id)));
    setSelectedIds(new Set(failed));
    if (expandedId && toDelete.includes(expandedId) && !failedSet.has(expandedId)) setExpandedId(null);

    const succeeded = count - failed.length;
    if (failed.length === 0) toast.success(`已删除 ${succeeded} 条记忆`);
    else if (succeeded === 0) toast.error(`全部 ${count} 条删除失败`);
    else toast.error(`${failed.length}/${count} 条删除失败（ID：${failed.join('、')}）`);

    setBatchDeleting(false);
  };

  const handleExpand = async (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!detailData[id]) {
      setDetailLoading(id);
      try {
        const res = await api.get(`/maintenance/orphans/${id}`);
        setDetailData(prev => ({ ...prev, [id]: res.data }));
      } catch (err) {
        setDetailData(prev => ({ ...prev, [id]: { error: err.response?.data?.detail || err.message } }));
      } finally {
        setDetailLoading(null);
      }
    }
  };

  const deprecated = orphans.filter(o => o.category === 'deprecated');
  const orphaned = orphans.filter(o => o.category === 'orphaned');

  const renderCard = (item) => {
    const isExpanded = expandedId === item.id;
    const detail = detailData[item.id];
    const isLoadingDetail = detailLoading === item.id;
    const isChecked = selectedIds.has(item.id);

    return (
      <div key={item.id} className="group bg-surface-2 border border-line hover:border-line-strong rounded-card transition-colors">
        <div
          className="flex items-start gap-3 p-4 cursor-pointer select-none"
          onClick={() => handleExpand(item.id)}
        >
          {/* Checkbox */}
          <button
            onClick={(e) => toggleSelect(item.id, e)}
            className="mt-0.5 flex-shrink-0 p-0.5 rounded-control transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60"
            aria-label={isChecked ? '取消选择' : '选择'}
          >
            {isChecked
              ? <CheckSquare size={18} className="text-brand-400" />
              : <Square size={18} className="text-fg-3 group-hover:text-fg-2" />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-xs font-mono text-fg-2 bg-surface-3 px-1.5 py-0.5 rounded-control border border-line">
                #{item.id}
              </span>
              {item.category === 'deprecated' ? (
                <Badge tone="warn" size="xs" dot><Archive size={9} className="mr-0.5" />已弃用</Badge>
              ) : (
                <Badge tone="danger" size="xs" dot><Unlink size={9} className="mr-0.5" />孤立</Badge>
              )}
              {item.migrated_to && (
                <Badge tone="brand" size="xs">→ #{item.migrated_to}</Badge>
              )}
              <span className="text-xs text-fg-3">
                {item.created_at ? format(new Date(item.created_at), 'yyyy-MM-dd HH:mm') : '未知'}
              </span>
            </div>

            {item.migration_target && item.migration_target.paths.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                <ArrowRight size={12} className="text-brand-400/70 flex-shrink-0" />
                {item.migration_target.paths.map((p, i) => (
                  <span key={i} className="text-xs font-mono text-brand-300/90 bg-brand-500/10 px-1.5 py-0.5 rounded-control border border-brand-500/20">
                    {p}
                  </span>
                ))}
              </div>
            )}
            {item.migration_target && item.migration_target.paths.length === 0 && (
              <div className="flex items-center gap-1.5 mb-2">
                <ArrowRight size={12} className="text-fg-3 flex-shrink-0" />
                <span className="text-xs text-fg-3 italic">目标 #{item.migration_target.id} 也无路径</span>
              </div>
            )}

            <div className="bg-surface-0 rounded-control p-2.5 text-xs text-fg-2 font-mono leading-relaxed line-clamp-3 border border-line">
              {item.content_snippet}
            </div>
          </div>

          <div className="mt-1 flex-shrink-0 text-fg-3">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-line p-5 bg-surface-1">
            {isLoadingDetail ? (
              <div className="flex items-center gap-3 text-fg-3 py-4">
                <Spinner size="sm" />
                <span className="text-xs">加载详情中…</span>
              </div>
            ) : detail?.error ? (
              <p className="text-danger-400 text-xs py-2">错误：{detail.error}</p>
            ) : detail ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs uppercase tracking-widest text-fg-3 mb-2 font-semibold">
                    {detail.migration_target ? '旧版本（当前记忆）' : '完整内容'}
                  </h4>
                  <div className="bg-surface-0 rounded-control p-4 border border-line text-xs text-fg-1 font-mono leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {detail.content}
                  </div>
                </div>

                {detail.migration_target && (
                  <div>
                    <h4 className="text-xs uppercase tracking-widest text-fg-3 mb-2 font-semibold flex items-center gap-2">
                      <span>差异：#{item.id} → #{detail.migration_target.id}</span>
                      {detail.migration_target.paths.length > 0 && (
                        <span className="text-brand-400/70 normal-case tracking-normal font-normal">
                          ({detail.migration_target.paths[0]})
                        </span>
                      )}
                    </h4>
                    <div className="bg-surface-0 rounded-control border border-line p-4 max-h-96 overflow-y-auto">
                      <DiffViewer oldText={detail.content} newText={detail.migration_target.content} />
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  const renderSectionHeader = (icon, label, tone, items) => {
    const allSelected = items.length > 0 && items.every(i => selectedIds.has(i.id));
    const someSelected = items.some(i => selectedIds.has(i.id));
    const iconColor = tone === 'warn' ? 'text-warn-400' : 'text-danger-400';

    return (
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => toggleSelectAll(items)}
          className="p-0.5 rounded-control transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60"
          title={allSelected ? '取消全选' : '全选'}
        >
          {allSelected
            ? <CheckSquare size={16} className={iconColor} />
            : someSelected
              ? <Minus size={16} className={iconColor} />
              : <Square size={16} className="text-fg-3" />}
        </button>
        {icon}
        <h3 className={`text-xs font-bold uppercase tracking-widest ${iconColor}`}>{label}</h3>
        <span className="text-xs text-fg-3 bg-surface-2 px-2 py-0.5 rounded-pill border border-line">{items.length}</span>
      </div>
    );
  };

  return (
    <div className="flex h-full bg-surface-0 text-fg-1 overflow-hidden">
      {/* 侧边栏 */}
      <div className="w-72 flex-shrink-0 bg-surface-1 border-r border-line flex flex-col p-6">
        <div className="mb-8">
          <div className="w-12 h-12 bg-warn-500/10 rounded-card flex items-center justify-center border border-warn-500/25 mb-4">
            <Wrench className="text-warn-400" size={24} />
          </div>
          <h1 className="text-xl font-bold text-fg-0 mb-2">清理</h1>
          <p className="text-xs text-fg-3 leading-relaxed">
            找出并清理孤立记忆 — 包括因更新产生的已弃用版本，以及因路径删除而无法访问的记忆。
          </p>
        </div>

        <div className="space-y-3 mt-auto">
          <div className="bg-surface-2 rounded-card p-4 border border-line">
            <StatTile label="已弃用" value={deprecated.length} tone="warn" hint="更新产生的旧版本" />
          </div>
          <div className="bg-surface-2 rounded-card p-4 border border-line">
            <StatTile label="孤立" value={orphaned.length} tone="danger" hint="无路径可达" />
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0 bg-surface-0 overflow-hidden">
        <div className="h-14 flex items-center justify-between px-8 border-b border-line bg-surface-0/90 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-sm font-bold text-fg-1 uppercase tracking-widest flex items-center gap-2">
            <Trash2 size={14} /> 孤立记忆
          </h2>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button
                variant="danger"
                size="sm"
                icon={batchDeleting ? undefined : Trash2}
                loading={batchDeleting}
                onClick={handleBatchDelete}
              >
                删除 {selectedIds.size} 条
              </Button>
            )}
            <button
              onClick={loadOrphans}
              className="p-2 text-fg-3 hover:text-brand-400 hover:bg-surface-2 rounded-control transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60"
              title="刷新"
              aria-label="刷新"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-fg-3 gap-4">
              <Spinner size="lg" tone="warn" />
              <span className="text-xs tracking-widest uppercase">扫描孤立记忆中…</span>
            </div>
          ) : error ? (
            <ErrorState title="扫描失败" message={error} actionLabel="重试" onAction={loadOrphans} />
          ) : orphans.length === 0 ? (
            <EmptyState icon={Wrench} title="系统整洁" description="未发现孤立记忆。" />
          ) : (
            <div className="max-w-5xl mx-auto space-y-8">
              {deprecated.length > 0 && (
                <section>
                  {renderSectionHeader(<Archive size={16} className="text-warn-400/80" />, '已弃用版本', 'warn', deprecated)}
                  <div className="space-y-2">{deprecated.map(renderCard)}</div>
                </section>
              )}
              {orphaned.length > 0 && (
                <section>
                  {renderSectionHeader(<Unlink size={16} className="text-danger-400/80" />, '孤立记忆', 'danger', orphaned)}
                  <div className="space-y-2">{orphaned.map(renderCard)}</div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
