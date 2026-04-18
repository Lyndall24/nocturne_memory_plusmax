import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Toast — 右下角浮层通知。替代 window.alert() 做成功/失败提示。
//
// 用法：
//   const toast = useToast();
//   toast.success('Saved');
//   toast.error('Save failed: ' + msg);
//   toast.info('Namespace switched');
// ---------------------------------------------------------------------------

const ToastContext = createContext(null);

const DEFAULT_DURATION = 3000;

const TYPE_STYLES = {
  success: {
    icon: CheckCircle2,
    ring: 'border-emerald-500/40',
    iconColor: 'text-emerald-400',
    glow: 'shadow-emerald-900/30',
  },
  error: {
    icon: AlertTriangle,
    ring: 'border-rose-500/40',
    iconColor: 'text-rose-400',
    glow: 'shadow-rose-900/30',
  },
  info: {
    icon: Info,
    ring: 'border-indigo-500/40',
    iconColor: 'text-indigo-400',
    glow: 'shadow-indigo-900/30',
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const push = useCallback((type, message, duration = DEFAULT_DURATION) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { id, type, message }]);
    const timer = setTimeout(() => dismiss(id), duration);
    timersRef.current.set(id, timer);
    return id;
  }, [dismiss]);

  // Clear all timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(t => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const api = {
    success: (msg, duration) => push('success', msg, duration),
    error: (msg, duration) => push('error', msg, duration ?? 5000),
    info: (msg, duration) => push('info', msg, duration),
    dismiss,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const style = TYPE_STYLES[toast.type] || TYPE_STYLES.info;
  const Icon = style.icon;
  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        'pointer-events-auto min-w-[260px] max-w-sm flex items-start gap-3 px-4 py-3',
        'bg-slate-900/95 backdrop-blur-sm border rounded-lg shadow-lg',
        'animate-in fade-in slide-in-from-bottom-2 duration-200',
        style.ring,
        style.glow,
      )}
    >
      <Icon size={18} className={clsx('flex-shrink-0 mt-0.5', style.iconColor)} />
      <div className="flex-1 text-sm text-slate-200 break-words">{toast.message}</div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a <ToastProvider>');
  }
  return ctx;
}
