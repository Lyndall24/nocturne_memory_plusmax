import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Database, Wrench, LayoutGrid, AlertCircle, Layers } from 'lucide-react';
import clsx from 'clsx';

import ReviewPage from './features/review/ReviewPage';
import MemoryBrowser from './features/memory/MemoryBrowser';
import MaintenancePage from './features/maintenance/MaintenancePage';
import TokenAuth from './components/TokenAuth';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmDialog';
import { NamespaceProvider, useNamespace } from './context/NamespaceContext';
import { AUTH_ERROR_EVENT, getNamespaces } from './lib/api';
import Spinner from './components/ui/Spinner';

// ---------------------------------------------------------------------------
// NamespaceSelector — 在顶栏切换 agent 命名空间。
// ---------------------------------------------------------------------------
function NamespaceSelector() {
  const { namespace: selected, setNamespace } = useNamespace();
  const [knownNamespaces, setKnownNamespaces] = useState([]);
  const [inputValue, setInputValue] = useState(selected);
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    getNamespaces()
      .then(nsList => setKnownNamespaces(nsList.filter(ns => ns !== '')))
      .catch(() => setKnownNamespaces([]));
  }, []);

  useEffect(() => { setInputValue(selected); }, [selected]);

  const applyNamespace = (ns) => { setNamespace(ns); setShowInput(false); };

  const handleSelectChange = (e) => {
    const val = e.target.value;
    if (val === '__custom__') { setShowInput(true); return; }
    applyNamespace(val);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') applyNamespace(inputValue);
    if (e.key === 'Escape') setShowInput(false);
  };

  return (
    <div className="flex items-center gap-2 ml-auto text-sm">
      <Layers size={14} className="text-fg-3 flex-shrink-0" />
      {showInput ? (
        <input
          autoFocus
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onBlur={() => setShowInput(false)}
          placeholder="命名空间（Enter 确认）"
          className={clsx(
            'bg-surface-2 border border-brand-500/60 text-fg-0 rounded-control',
            'px-2 py-1 text-xs w-40 outline-none',
            'focus-visible:ring-2 focus-visible:ring-brand-500/50',
          )}
        />
      ) : (
        <select
          value={selected}
          onChange={handleSelectChange}
          className={clsx(
            'bg-surface-2 border border-line text-fg-1 rounded-control',
            'px-2 py-1 text-xs cursor-pointer',
            'hover:border-line-strong hover:text-fg-0 transition-colors',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500/50',
          )}
          title={`当前命名空间：${selected || '(默认)'}`}
        >
          <option value="">(默认)</option>
          {knownNamespaces.map(ns => (
            <option key={ns} value={ns}>{ns}</option>
          ))}
          {selected && !knownNamespaces.includes(selected) && (
            <option key={selected} value={selected}>{selected}</option>
          )}
          <option value="__custom__">+ 输入自定义…</option>
        </select>
      )}
    </div>
  );
}

function Layout() {
  const location = useLocation();
  const isReviewPage = location.pathname.startsWith('/review');

  const navBase = 'h-full flex items-center gap-2 px-4 text-sm font-medium border-b-2 transition-colors';
  const navActive = 'border-brand-500 text-fg-0 bg-surface-2/50';
  const navInactive = 'border-transparent text-fg-2 hover:text-fg-0 hover:bg-surface-2/30';

  return (
    <div className="flex flex-col h-screen bg-surface-0 text-fg-0">
      {/* 顶部导航栏 */}
      <div className="h-12 border-b border-line bg-surface-1 flex items-center px-4 gap-6 flex-shrink-0 z-10">
        <div className="font-bold text-fg-0 flex items-center gap-2 mr-4">
          <LayoutGrid className="w-5 h-5 text-brand-500" />
          <span>Nocturne Admin</span>
        </div>

        <nav className="flex items-center gap-1 h-full">
          <NavLink
            to="/review"
            className={({ isActive }) => clsx(navBase, isActive ? navActive : navInactive)}
          >
            <ShieldCheck size={16} />
            复查
          </NavLink>

          <NavLink
            to="/memory"
            className={({ isActive }) => clsx(navBase, isActive ? navActive : navInactive)}
          >
            <Database size={16} />
            记忆
          </NavLink>

          <NavLink
            to="/maintenance"
            className={({ isActive }) => clsx(navBase, isActive ? navActive : navInactive)}
          >
            <Wrench size={16} />
            清理
          </NavLink>
        </nav>

        {!isReviewPage && <NamespaceSelector />}
      </div>

      {/* 主体区域 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Routes>
          <Route path="/" element={<Navigate to="/review" replace />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/memory" element={<MemoryBrowser />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('api_token'));
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [backendError, setBackendError] = useState(false);

  const handleAuthError = useCallback(() => { setIsAuthenticated(false); }, []);
  const handleAuthenticated = useCallback(() => { setIsAuthenticated(true); setBackendError(false); }, []);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const { getDomains } = await import('./lib/api');
        await getDomains();
        if (mounted) { setIsAuthenticated(true); setBackendError(false); setIsCheckingAuth(false); }
      } catch (error) {
        if (mounted) {
          if (!error.response) setBackendError(true);
          else if (error.response.status === 401) { setIsAuthenticated(false); setBackendError(false); }
          else setBackendError(false);
          setIsCheckingAuth(false);
        }
      }
    };
    check();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    window.addEventListener(AUTH_ERROR_EVENT, handleAuthError);
    return () => window.removeEventListener(AUTH_ERROR_EVENT, handleAuthError);
  }, [handleAuthError]);

  if (isCheckingAuth) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-surface-0 text-fg-2">
        <Spinner size="lg" className="mb-4" />
        <div className="text-sm">正在连接后端…</div>
      </div>
    );
  }

  if (backendError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-surface-0 text-fg-2">
        <div className="w-12 h-12 rounded-card bg-danger-500/10 border border-danger-500/30 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-danger-400" />
        </div>
        <div className="text-lg font-bold text-fg-0 mb-1">后端未连接</div>
        <div className="text-sm text-fg-3">请检查后端服务是否已启动</div>
        <button
          onClick={() => window.location.reload()}
          className={clsx(
            'mt-6 px-4 py-2 text-sm font-medium rounded-control',
            'bg-brand-500 hover:bg-brand-400 hover:shadow-glow text-white transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60',
          )}
        >
          重试
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <TokenAuth onAuthenticated={handleAuthenticated} />;
  }

  return (
    <NamespaceProvider>
      <ToastProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <Layout />
          </BrowserRouter>
        </ConfirmProvider>
      </ToastProvider>
    </NamespaceProvider>
  );
}

export default App;
