import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// ConfirmDialog — 替换 window.confirm() 的自定义模态框。
//
// 用法：
//   const confirm = useConfirm();
//   const ok = await confirm({
//     title: 'Delete 5 memories?',
//     message: 'This cannot be undone.',
//     confirmLabel: 'Delete',
//     danger: true,
//   });
//   if (!ok) return;
// ---------------------------------------------------------------------------

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { options, resolve } | null
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

  // Keyboard: Esc cancels, Enter confirms
  useEffect(() => {
    if (!state) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        close(true);
      }
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
    title = 'Are you sure?',
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    danger = false,
  } = options;

  const confirmBtnRef = useRef(null);
  useEffect(() => {
    // Focus confirm button by default so Enter works naturally.
    confirmBtnRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="w-full max-w-md mx-4 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-3">
          <div className="flex items-start gap-3">
            {danger && (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                <AlertTriangle size={18} className="text-rose-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 id="confirm-dialog-title" className="text-base font-semibold text-slate-100">
                {title}
              </h3>
              {message && (
                <p className="mt-1.5 text-sm text-slate-400 leading-relaxed break-words">
                  {message}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-slate-950/50 border-t border-slate-800">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors text-white shadow-lg',
              danger
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/30'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/30',
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
  if (!ctx) {
    throw new Error('useConfirm must be used within a <ConfirmProvider>');
  }
  return ctx;
}
