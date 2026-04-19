import React, { useEffect, useState, useRef } from 'react';
import { getGroups, getGroupDiff, rollbackGroup, approveGroup, clearAll } from '../../lib/api';
import SnapshotList from '../../components/SnapshotList';
import DiffViewer from '../../components/DiffViewer';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmDialog';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import {
  Activity,
  Check,
  FileText,
  LayoutTemplate,
  RotateCcw,
  ShieldCheck,
  Database,
  Trash2,
  Box,
  Link as LinkIcon,
  BookOpen,
} from 'lucide-react';
import clsx from 'clsx';

function ReviewPage() {
  const toast = useToast();
  const confirm = useConfirm();

  const [changes, setChanges] = useState([]);
  const [selectedChange, setSelectedChange] = useState(null);
  const [diffData, setDiffData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [diffError, setDiffError] = useState(null);

  const diffRequestRef = useRef(0);

  useEffect(() => { loadChanges(); }, []);

  const loadChanges = async () => {
    setLoading(true);
    try {
      const list = await getGroups();
      setChanges(list);
      if (selectedChange && !list.find(c => c.node_uuid === selectedChange.node_uuid)) {
        setSelectedChange(list.length > 0 ? list[0] : null);
      } else if (list.length > 0 && !selectedChange) {
        setSelectedChange(list[0]);
      }
      if (list.length === 0) { setSelectedChange(null); setDiffData(null); }
    } catch {
      setDiffError('后端连接断开，请检查服务状态。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedChange) loadDiff(selectedChange.node_uuid);
  }, [selectedChange]);

  const loadDiff = async (nodeUuid) => {
    const requestId = ++diffRequestRef.current;
    setDiffError(null);
    setDiffData(null);
    try {
      const data = await getGroupDiff(nodeUuid);
      if (requestId === diffRequestRef.current) setDiffData(data);
    } catch (err) {
      if (requestId === diffRequestRef.current) {
        setDiffError(err.response?.data?.detail || '无法获取记忆片段。');
        setDiffData(null);
      }
    }
  };

  const handleRollback = async () => {
    if (!selectedChange) return;
    const ok = await confirm({
      title: '回滚此变更？',
      message: `回滚节点组 ${selectedChange.display_uri} 的改动，记忆状态将恢复到之前版本。`,
      confirmLabel: '回滚',
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await rollbackGroup(selectedChange.node_uuid);
      if (res && res.success === false) throw new Error(res.message || '回滚时发生未知错误');
      await loadChanges();
      toast.success('已回滚变更');
    } catch (err) {
      toast.error('回滚失败：' + (err.response?.data?.detail || err.message));
    }
  };

  const handleApprove = async () => {
    if (!selectedChange) return;
    try {
      await approveGroup(selectedChange.node_uuid);
      await loadChanges();
      toast.success('已接受变更');
    } catch (err) {
      toast.error('接受失败：' + (err.response?.data?.detail || err.message));
    }
  };

  const handleClearAll = async () => {
    const ok = await confirm({
      title: '接受所有待审变更？',
      message: '这将批准所有命名空间下的全部待审记忆变更。',
      confirmLabel: '全部接受',
    });
    if (!ok) return;
    try {
      await clearAll();
      setChanges([]); setSelectedChange(null); setDiffData(null);
      toast.success('已接受所有变更');
    } catch (err) {
      toast.error('批量接受失败：' + (err.response?.data?.detail || err.message));
    }
  };

  const actionTone = (action) => {
    if (action === 'created') return 'success';
    if (action === 'deleted') return 'danger';
    return 'warn';
  };

  const actionLabel = (action) => {
    if (action === 'created') return '新建';
    if (action === 'deleted') return '删除';
    return '修改';
  };

  const changeTypeIcon = (type) => {
    switch (type) {
      case 'nodes': return <Box size={18} />;
      case 'memories': return <FileText size={18} />;
      case 'edges': return <LinkIcon size={18} />;
      case 'paths': return <Database size={18} />;
      case 'glossary_keywords': return <BookOpen size={18} />;
      default: return <FileText size={18} />;
    }
  };

  const renderMetadataChanges = () => {
    if (!diffData?.before_meta || !diffData?.current_meta) return null;
    const metaKeys = ['priority', 'disclosure'];
    const hasPathChanges = diffData.path_changes && diffData.path_changes.length > 0;
    const diffs = metaKeys.filter(key => {
      const oldVal = diffData.before_meta[key];
      const newVal = diffData.current_meta[key];
      const isChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);
      if (isChanged) return true;
      if (hasPathChanges && (oldVal != null || newVal != null)) return true;
      return false;
    });
    if (diffs.length === 0) return null;

    const allPreserved = diffs.every(key => JSON.stringify(diffData.before_meta[key]) === JSON.stringify(diffData.current_meta[key]));
    const isCreation = diffData.action === 'created';
    const isDeletion = diffData.current_meta.priority == null && diffData.before_meta.priority != null;

    const sectionLabel = isCreation ? '（初始值）' : isDeletion ? '（已删除）' : allPreserved ? '（未改变）' : '变更';

    return (
      <div className="mb-6 p-4 bg-surface-1 border border-line rounded-card">
        <h3 className="text-xs font-bold text-fg-3 uppercase mb-4 flex items-center gap-2 tracking-widest">
          <Activity size={12} /> 元数据 {sectionLabel}
        </h3>
        <div className="space-y-3">
          {diffs.map(key => {
            const oldVal = diffData.before_meta[key];
            const newVal = diffData.current_meta[key];
            const isChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);
            return (
              <div key={key} className="grid grid-cols-[100px_1fr_20px_1fr] gap-4 text-sm items-start">
                <span className="text-fg-2 font-medium capitalize text-xs pt-0.5">{key}</span>
                <div className={clsx('text-xs font-mono text-right break-words', isChanged && !isCreation ? 'text-danger-400/70 line-through' : 'text-fg-3')}>
                  {oldVal != null ? String(oldVal) : '∅'}
                </div>
                <div className="text-center text-fg-3 pt-0.5">{isChanged ? '→' : '≡'}</div>
                <div className={clsx('text-xs font-mono font-bold break-words', isChanged ? 'text-success-400' : 'text-fg-2')}>
                  {newVal != null ? String(newVal) : '∅'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full bg-surface-0 text-fg-1 overflow-hidden">

      {/* 侧边栏 */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-line bg-surface-1">
        <div className="p-5 border-b border-line">
          <div className="flex items-center gap-3 text-fg-0">
            <div className="w-8 h-8 rounded-control bg-brand-500/15 border border-brand-500/30 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-brand-400" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-sm">复查队列</span>
              <span className="text-xs text-fg-3">全部命名空间</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="p-8 flex justify-center">
              <Spinner size="md" />
            </div>
          ) : (
            <SnapshotList
              snapshots={changes}
              selectedId={selectedChange?.node_uuid}
              onSelect={setSelectedChange}
            />
          )}
        </div>

        {changes.length > 0 && (
          <div className="p-4 border-t border-line">
            <Button
              variant="secondary"
              size="sm"
              icon={Check}
              onClick={handleClearAll}
              className="w-full justify-center"
            >
              全部接受
            </Button>
          </div>
        )}
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0 bg-surface-0">
        {selectedChange ? (
          <>
            {/* 头部操作栏 */}
            <div className="h-20 border-b border-line flex items-center justify-between px-8">
              <div className="flex items-center gap-4 min-w-0">
                <div className={clsx(
                  'w-10 h-10 rounded-card flex items-center justify-center border',
                  actionTone(selectedChange.action) === 'success' && 'bg-success-500/10 border-success-500/30 text-success-400',
                  actionTone(selectedChange.action) === 'danger' && 'bg-danger-500/10 border-danger-500/30 text-danger-400',
                  actionTone(selectedChange.action) === 'warn' && 'bg-warn-500/10 border-warn-500/30 text-warn-400',
                )}>
                  {changeTypeIcon(selectedChange.top_level_table)}
                </div>
                <div className="min-w-0 flex flex-col gap-1">
                  <h2 className="text-base font-medium text-fg-0 truncate tracking-tight flex items-center gap-2">
                    <span>{selectedChange.display_uri}</span>
                    {selectedChange.namespaces && selectedChange.namespaces.some(ns => ns !== '' || selectedChange.namespaces.length > 1) && (
                      <Badge tone="brand" size="xs">
                        {selectedChange.namespaces.map(ns => ns === '' ? 'default' : ns).join(', ')}
                      </Badge>
                    )}
                  </h2>
                  <div className="flex items-center gap-2">
                    <Badge tone={actionTone(selectedChange.action)} size="xs">
                      {selectedChange.top_level_table} · {actionLabel(selectedChange.action)}
                    </Badge>
                    <span className="text-xs text-fg-3">
                      {selectedChange.row_count} 行受影响
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="danger" size="sm" icon={RotateCcw} onClick={handleRollback}>
                  回滚
                </Button>
                <Button variant="primary" size="sm" icon={Check} onClick={handleApprove}>
                  接受
                </Button>
              </div>
            </div>

            {/* Diff 区域 */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <div className="max-w-4xl mx-auto">
                {diffError ? (
                  <div className="mt-16 flex flex-col items-center justify-center text-danger-400 gap-4">
                    <Activity size={40} className="opacity-40" />
                    <div className="text-center">
                      <p className="text-base font-medium text-fg-1">获取记忆失败</p>
                      <p className="text-sm text-fg-3 mt-1 max-w-md">{diffError}</p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => loadDiff(selectedChange.node_uuid)}>
                      重试
                    </Button>
                  </div>
                ) : diffData ? (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {/* 操作类型 badge */}
                    <div className="mb-6 flex justify-end">
                      <Badge
                        tone={
                          diffData.action === 'deleted' ? 'danger'
                            : diffData.action === 'created' ? 'success'
                              : (diffData.has_changes || diffData.path_changes?.length > 0 || diffData.glossary_changes?.length > 0) ? 'warn'
                                : 'neutral'
                        }
                        size="xs"
                        dot
                      >
                        {diffData.action === 'deleted' ? '检测到删除'
                          : diffData.action === 'created' ? '检测到新建'
                            : (diffData.has_changes || diffData.path_changes?.length > 0 || diffData.glossary_changes?.length > 0) ? '检测到修改'
                              : '内容未变更'}
                      </Badge>
                    </div>

                    {/* 路径变更 */}
                    {diffData.path_changes && diffData.path_changes.length > 0 && (
                      <div className="mb-6 p-4 bg-surface-1 border border-line rounded-card">
                        <h3 className="text-xs font-bold text-fg-3 uppercase mb-4 flex items-center gap-2 tracking-widest">
                          <Database size={12} /> 路径变更
                        </h3>
                        <div className="space-y-2">
                          {diffData.path_changes.map((pc, i) => (
                            <div key={i} className="flex items-center gap-3 text-sm">
                              <Badge tone={pc.action === 'deleted' ? 'danger' : 'success'} size="xs">
                                {pc.action === 'deleted' ? '移除' : '新增'}
                              </Badge>
                              <span className={clsx('font-mono text-xs break-all', pc.action === 'deleted' ? 'text-danger-400/70 line-through' : 'text-success-400')}>
                                {pc.uri}
                              </span>
                              {pc.namespace != null && (pc.namespace !== '' || (selectedChange.namespaces && selectedChange.namespaces.some(n => n !== '' || selectedChange.namespaces.length > 1))) && (
                                <Badge tone="brand" size="xs" className="ml-auto">
                                  {pc.namespace === '' ? 'default' : pc.namespace}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                        {diffData.active_paths && diffData.active_paths.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-line">
                            <span className="text-xs text-fg-3 block mb-2">节点仍可通过以下路径访问：</span>
                            <div className="flex flex-wrap gap-2">
                              {diffData.active_paths.map((uri, i) => (
                                <span key={i} className="flex items-center gap-1.5 text-xs font-mono text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2 py-1 rounded-control">
                                  {uri}
                                  {diffData.path_namespaces?.[uri]?.filter(ns => ns !== '' || diffData.path_namespaces[uri].length > 1).map((ns, ni) => (
                                    <Badge key={ni} tone="brand" size="xs">{ns === '' ? 'default' : ns}</Badge>
                                  ))}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 词表变更 */}
                    {diffData.glossary_changes && diffData.glossary_changes.length > 0 && (
                      <div className="mb-6 p-4 bg-surface-1 border border-line rounded-card">
                        <h3 className="text-xs font-bold text-fg-3 uppercase mb-4 flex items-center gap-2 tracking-widest">
                          <BookOpen size={12} /> 词表关键词
                        </h3>
                        <div className="space-y-2">
                          {diffData.glossary_changes.map((gc, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <Badge tone={gc.action === 'deleted' ? 'danger' : 'success'} size="xs">
                                {gc.action === 'deleted' ? '移除' : '新增'}
                              </Badge>
                              <span className={clsx('font-mono text-xs break-all', gc.action === 'deleted' ? 'text-danger-400/70 line-through' : 'text-success-400')}>
                                {gc.keyword}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {renderMetadataChanges()}

                    {/* Diff 内容 */}
                    <div className="bg-surface-1 rounded-card border border-line shadow-e2 overflow-hidden">
                      <div className="h-0.5 bg-gradient-to-r from-transparent via-brand-500/20 to-transparent" />
                      <div className="p-6 md:p-8">
                        <DiffViewer
                          oldText={diffData.before_content ?? ''}
                          newText={diffData.current_content ?? ''}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-fg-3">
                    <Spinner size="sm" className="mb-4" />
                    <span className="text-xs tracking-widest uppercase opacity-50">同步中…</span>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : diffError ? (
          <div className="flex-1 flex flex-col items-center justify-center text-danger-400 gap-4">
            <Activity size={40} className="opacity-30" />
            <p className="text-sm text-fg-3">连接断开</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-fg-3 gap-4 select-none">
            <LayoutTemplate size={48} className="opacity-20" />
            <div className="text-center">
              <p className="text-base text-fg-2">暂无待审</p>
              <p className="text-xs text-fg-3 mt-1">所有记忆变更已处理</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReviewPage;
