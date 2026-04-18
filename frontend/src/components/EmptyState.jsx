import React from 'react';
import { Inbox } from 'lucide-react';

// ---------------------------------------------------------------------------
// EmptyState — 统一空状态展示：图标 + 标题 + 描述 + 可选 CTA 按钮。
//
// 用法：
//   <EmptyState icon={Folder} title="No memories" description="..." />
//   <EmptyState title="All clean" actionLabel="Refresh" onAction={reload} />
// ---------------------------------------------------------------------------
export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      <div className="w-14 h-14 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mb-4">
        <Icon size={24} className="text-slate-500" />
      </div>
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {description && (
        <p className="mt-1.5 text-xs text-slate-500 max-w-sm leading-relaxed">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 px-4 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
