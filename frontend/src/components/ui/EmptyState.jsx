import React from 'react';
import clsx from 'clsx';
import { Inbox } from 'lucide-react';

// ---------------------------------------------------------------------------
// EmptyState — 空状态展示：图标 + 标题 + 描述 + 可选 CTA。
//
// icon:        lucide 图标组件（默认 Inbox）
// title:       主文案
// description: 辅助说明（可选）
// actionLabel: 按钮文字（需配合 onAction）
// onAction:    按钮回调
// ---------------------------------------------------------------------------
export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-16 px-6 text-center', className)}>
      <div className="w-14 h-14 rounded-card bg-surface-2 border border-line flex items-center justify-center mb-4">
        <Icon size={24} className="text-fg-3" />
      </div>
      {title && <p className="text-sm font-medium text-fg-1">{title}</p>}
      {description && (
        <p className="mt-1.5 text-xs text-fg-3 max-w-sm leading-relaxed">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className={clsx(
            'mt-5 px-4 py-2 text-xs font-medium rounded-control',
            'bg-surface-2 hover:bg-surface-3 text-fg-1 hover:text-fg-0',
            'border border-line hover:border-line-strong transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60',
          )}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
