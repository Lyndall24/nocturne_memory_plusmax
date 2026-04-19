import React from 'react';
import clsx from 'clsx';
import { AlertCircle } from 'lucide-react';

// ---------------------------------------------------------------------------
// ErrorState — 统一错误展示：红色图标 + 标题 + 描述 + 可选操作按钮。
// ---------------------------------------------------------------------------
export default function ErrorState({
  icon: Icon = AlertCircle,
  title = '出错了',
  message,
  actionLabel,
  onAction,
  className,
}) {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-16 px-6 text-center', className)}>
      <div className="w-14 h-14 rounded-card bg-danger-500/10 border border-danger-500/30 flex items-center justify-center mb-4">
        <Icon size={24} className="text-danger-400" />
      </div>
      <p className="text-sm font-semibold text-fg-0">{title}</p>
      {message && (
        <p className="mt-1.5 text-xs text-fg-3 max-w-md leading-relaxed break-words">{message}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className={clsx(
            'mt-5 px-4 py-2 text-xs font-medium rounded-control',
            'bg-brand-500 hover:bg-brand-400 hover:shadow-glow text-white',
            'transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60',
          )}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
