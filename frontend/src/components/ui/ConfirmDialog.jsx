import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// ConfirmDialog — 替换 window.confirm() 的语义化模态框。
//
// 用法：
//   const confirm = useConfirm();
//   const ok = await confirm({
//     title: '删除 5 条记忆？',
//     message: '此操作不可撤销。',
//     confirmLabel: '删除',
//     danger: true,
//   });
//   if (!ok) return;
// ---------------------------------------------------------------------------

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ options });
    });
  }, []);

  const close = useCallback((result) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setState(null);
    if (resolve) resolve(result);
  }, []);

  useEffect(() => {
    if (!state) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(false); }
      else if (e.key === 'Enter') { e.preventDefault(); close(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <ConfirmOverlay
          options={state.options}
          onCancel={() => close(false)}
          onConfirm={() => close(true)}
        />
      )}
    </ConfirmContext.Provider>
  );
}

function ConfirmOverlay({ options, onCancel, onConfirm }) {
  const {
    title = '确认操作？',
    message,
    confirmLabel = '确认',
    cancelLabel = '取消',
    danger = false,
  } = options;

  const confirmBtnRef = useRef(null);
  useEffect(() => { confirmBtnRef.current?.focus(); }, []);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="w-full max-w-md mx-4 bg-surface-1 border border-line rounded-card shadow-e2 overflow-hidden animate-in zoom-in-95 fade-in duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-3">
          <div className="flex items-start gap-3">
            {danger && (
              <div className="flex-shrink-0 w-10 h-10 rounded-card bg-danger-500/10 border border-danger-500/30 flex items-center justify-center">
                <AlertTriangle size={18} className="text-danger-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 id="confirm-dialog-title" className="text-base font-semibold text-fg-0">
                {title}
              </h3>
              {message && (
                <p className="mt-1.5 text-sm text-fg-2 leading-relaxed break-words">{message}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-surface-0/60 border-t border-line">
          <button
            onClick={onCancel}
            className={clsx(
              'px-4 py-2 text-sm text-fg-1 hover:text-fg-0 rounded-control',
              'hover:bg-surface-2 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60',
            )}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-control transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
              danger
                ? 'bg-danger-500 hover:bg-danger-400 text-white focus-visible:ring-danger-500/60'
                : 'bg-brand-500 hover:bg-brand-400 hover:shadow-glow text-white focus-visible:ring-brand-500/60',
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm 必须在 <ConfirmProvider> 内使用');
  return ctx;
}
