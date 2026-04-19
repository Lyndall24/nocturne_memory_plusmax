import React, { useState, useCallback } from 'react';
import { LayoutGrid, KeyRound, AlertCircle } from 'lucide-react';
import { getDomains } from '../lib/api';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';

const TokenAuth = ({ onAuthenticated }) => {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) return;

    setLoading(true);
    setError('');
    localStorage.setItem('api_token', trimmed);

    try {
      await getDomains();
      onAuthenticated();
    } catch (err) {
      localStorage.removeItem('api_token');
      if (err.response && err.response.status === 401) {
        setError('Token 无效，请检查后重试');
      } else {
        setError('连接失败，请检查服务器状态');
      }
    } finally {
      setLoading(false);
    }
  }, [token, onAuthenticated]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-surface-0">
      <div className="w-full max-w-sm mx-4">
        <Card padding="lg" tone="raised">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-card bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-4">
              <LayoutGrid className="w-6 h-6 text-brand-500" />
            </div>
            <h1 className="text-lg font-bold text-fg-0">Nocturne Admin</h1>
            <p className="text-xs text-fg-3 mt-1">记忆管理面板</p>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="api-token" className="block text-xs font-medium text-fg-2 mb-2">
                请输入 API Token
              </label>
              <Input
                id="api-token"
                type="password"
                value={token}
                onChange={(e) => { setToken(e.target.value); if (error) setError(''); }}
                placeholder="输入令牌…"
                disabled={loading}
                leftIcon={KeyRound}
                error={error ? '' : undefined}
                size="md"
              />
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="flex items-center gap-2 text-xs text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-control px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              disabled={!token.trim()}
              className="w-full justify-center"
            >
              {loading ? '验证中…' : '连接'}
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-fg-3 mt-4 tracking-wider uppercase">
          Nocturne Memory
        </p>
      </div>
    </div>
  );
};

export default TokenAuth;
