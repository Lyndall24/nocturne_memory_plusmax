import React, { useEffect } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Dialog — 基础 Modal 层，不含业务逻辑。
//
// open:        boolean
// onClose:     () => void  （点遮罩或 Esc 触发）
// title:       string
// description: string（可选）
// size:        sm | md | lg  (default md)
// children:    弹框正文（按钮区也放在这里）
// showClose:   是否显示右上角 × 按钮（default true）
// ---------------------------------------------------------------------------

const SIZE = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export default function Dialog({
  open,
  onClose,
  title,
  description,
  size = 'md',
  showClose = true,
  children,
  className,
}) {
  // Esc closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose?.(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'dialog-title' : undefined}
    >
      <div
        className={clsx(
          'relative w-full mx-4 bg-surface-1 border border-line rounded-card shadow-e2',
          'animate-in zoom-in-95 fade-in duration-150 overflow-hidden',
          SIZE[size],
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-start justify-between gap-3 px-6 pt-5">
            {title && (
              <div>
                <h3 id="dialog-title" className="text-base font-semibold text-fg-0">
                  {title}
                </h3>
                {description && (
                  <p className="mt-1 text-sm text-fg-2 leading-relaxed">{description}</p>
                )}
              </div>
            )}
            {showClose && (
              <button
                onClick={onClose}
                className="flex-shrink-0 p-1 -mr-1 text-fg-3 hover:text-fg-1 rounded-control transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60"
                aria-label="关闭"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className={clsx('px-6', title ? 'py-4' : 'py-6')}>
          {children}
        </div>
      </div>
    </div>
  );
}
