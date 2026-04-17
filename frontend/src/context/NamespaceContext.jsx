import React, { createContext, useCallback, useContext, useState } from 'react';

// ---------------------------------------------------------------------------
// NamespaceContext — 管理当前选中的 namespace。
//
// 设计要点：
//   - 仍然把值写入 localStorage（键名 `selected_namespace`），以便 axios
//     拦截器在非 React 代码中读取。
//   - 切换时**不**再触发 window.location.reload()。业务组件（如
//     MemoryBrowser、MaintenancePage）应通过 useNamespace() 的
//     `namespace` 作为 useEffect 依赖重新拉数据。
//   - ReviewPage 本身不发送 X-Namespace 请求头（见 api.js 拦截器），
//     但 namespace 切换仍会让 review 侧导航（下拉选项）更新。
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'selected_namespace';

const NamespaceContext = createContext(null);

export function NamespaceProvider({ children }) {
  const [namespace, setNamespaceState] = useState(
    () => localStorage.getItem(STORAGE_KEY) ?? ''
  );

  const setNamespace = useCallback((next) => {
    const trimmed = (next ?? '').trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setNamespaceState(trimmed);
  }, []);

  return (
    <NamespaceContext.Provider value={{ namespace, setNamespace }}>
      {children}
    </NamespaceContext.Provider>
  );
}

export function useNamespace() {
  const ctx = useContext(NamespaceContext);
  if (!ctx) {
    throw new Error('useNamespace must be used within a <NamespaceProvider>');
  }
  return ctx;
}
