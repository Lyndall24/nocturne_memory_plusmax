import React from 'react';
import clsx from 'clsx';
import Badge from './ui/Badge';

const getActionTone = (action) => {
  if (action === 'created') return 'success';
  if (action === 'deleted') return 'danger';
  return 'warn';
};

const DOT_TONE = {
  success: 'bg-success-500',
  danger:  'bg-danger-500',
  warn:    'bg-warn-500',
};

const getActionLabel = (table, action) => {
  let entityName = table;
  if (table === 'memories') entityName = '记忆';
  else if (table === 'nodes') entityName = '节点';
  else if (table === 'edges') entityName = '边';
  else if (table === 'paths') entityName = '路径';
  else if (table === 'glossary_keywords') entityName = '词表';
  else entityName = table;

  const actionMap = { created: '新建', deleted: '删除', modified: '修改' };
  return `${entityName} ${actionMap[action] || '修改'}`;
};

const SnapshotList = ({ snapshots, selectedId, onSelect }) => {
  const getNamespacesLabel = (namespaces) => {
    if (!namespaces || namespaces.length === 0) return null;
    if (namespaces.length === 1 && namespaces[0] === '') return null;
    return namespaces.map(ns => ns === '' ? 'default' : ns).join(', ');
  };

  if (snapshots.length === 0) {
    return (
      <div className="text-center py-10 text-fg-3 text-xs tracking-wide uppercase">
        空列表
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {snapshots.map((item) => {
        const isSelected = item.node_uuid === selectedId;
        const tone = getActionTone(item.action);
        const nsLabel = getNamespacesLabel(item.namespaces);

        return (
          <button
            key={item.node_uuid}
            onClick={() => onSelect(item)}
            className={clsx(
              'group relative text-left py-3 px-5 border-l-2 transition-colors w-full',
              'focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-brand-500/60',
              isSelected
                ? 'border-brand-500 bg-brand-500/5'
                : 'border-transparent text-fg-3 hover:text-fg-1 hover:bg-surface-2/40',
            )}
          >
            {isSelected && (
              <div className="absolute inset-0 bg-gradient-to-r from-brand-500/8 to-transparent pointer-events-none" />
            )}

            <div className="flex items-center gap-3 relative z-10">
              {/* 状态点 */}
              <div className={clsx(
                'flex-shrink-0 w-1.5 h-1.5 rounded-full transition-colors',
                isSelected ? DOT_TONE[tone] : 'bg-fg-3',
              )} />

              <div className="min-w-0 flex-1">
                <div className={clsx(
                  'font-medium text-xs truncate transition-colors flex items-center gap-2',
                  isSelected ? 'text-fg-0' : 'text-fg-2 group-hover:text-fg-1',
                )}>
                  <span className="truncate">{item.display_uri}</span>
                  {nsLabel && (
                    <Badge tone="brand" size="xs" className="flex-shrink-0">{nsLabel}</Badge>
                  )}
                </div>
                <div className="mt-0.5 flex justify-between items-center pr-2">
                  <Badge tone={tone} size="xs">{getActionLabel(item.top_level_table, item.action)}</Badge>
                  {item.row_count > 1 && (
                    <span className="text-xs text-fg-3">{item.row_count} 行</span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default SnapshotList;
