import React from 'react';
import { AlertCircle } from 'lucide-react';

// ---------------------------------------------------------------------------
// ErrorState — 统一错误展示：红色图标 + 标题 + 错误描述 + 可选操作按钮。
//
// 用法：
//   <ErrorState title="Backend offline" message={err.message} />
//   <ErrorState message="..." actionLabel="Retry" onAction={reload} />
// ---------------------------------------------------------------------------
export default function ErrorState({
  icon: Icon = AlertCircle,
  title = 'Something went wrong',
  message,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      <div className="w-14 h-14 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4">
        <Icon size={24} className="text-rose-400" />
      </div>
      <p className="text-sm font-semibold text-slate-100">{title}</p>
      {message && (
        <p className="mt-1.5 text-xs text-slate-500 max-w-md leading-relaxed break-words">{message}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-lg shadow-indigo-900/30"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
