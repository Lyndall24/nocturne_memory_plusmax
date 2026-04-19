import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Toast — 右下角浮层通知，替代 window.alert()。
//
// 用法：
//   const toast = useToast();
//   toast.success('已保存');
//   toast.error('保存失败：' + msg);
//   toast.info('命名空间已切换');
// ---------------------------------------------------------------------------

const ToastContext = createContext(null);
const DEFAULT_DURATION = 3000;

const TYPE_STYLES = {
  success: {
    icon: CheckCircle2,
    border: 'border-success-500/40',
    iconColor: 'text-success-400',
  },
  error: {
    icon: AlertTriangle,
    border: 'border-danger-500/40',
    iconColor: 'text-danger-400',
  },
  info: {
    icon: Info,
    border: 'border-brand-500/40',
    iconColor: 'text-brand-400',
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) { clearTimeout(timer); timersRef.current.delete(id); }
  }, []);

  const push = useCallback((type, message, duration = DEFAULT_DURATION) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { id, type, message }]);
    const timer = setTimeout(() => dismiss(id), duration);
    timersRef.current.set(id, timer);
    return id;
  }, [dismiss]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => { timers.forEach(t => clearTimeout(t)); timers.clear(); };
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
      {toasts.map(t => <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />)}
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
        'bg-surface-2/95 backdrop-blur-sm border rounded-card shadow-e2',
        'animate-in fade-in slide-in-from-bottom-2 duration-200',
        style.border,
      )}
    >
      <Icon size={18} className={clsx('flex-shrink-0 mt-0.5', style.iconColor)} />
      <div className="flex-1 text-sm text-fg-0 break-words">{toast.message}</div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 text-fg-3 hover:text-fg-1 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500/60 rounded"
        aria-label="关闭"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast 必须在 <ToastProvider> 内使用');
  return ctx;
}
