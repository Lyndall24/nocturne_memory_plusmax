import React, { useState, useEffect, useRef } from 'react';
import { Tag, X, Save, Plus } from 'lucide-react';
import { api } from '../../../lib/api';
import { useToast } from '../../../components/Toast';

const KeywordManager = ({ keywords, nodeUuid, onUpdate }) => {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (adding && inputRef.current) inputRef.current.focus();
  }, [adding]);

  const handleAdd = async () => {
    const kw = newKeyword.trim();
    if (!kw || !nodeUuid) return;
    try {
      await api.post('/browse/glossary', { keyword: kw, node_uuid: nodeUuid });
      setNewKeyword('');
      setAdding(false);
      onUpdate();
    } catch (err) {
      toast.error('添加词条失败：' + (err.response?.data?.detail || err.message));
    }
  };

  const handleRemove = async (kw) => {
    if (!nodeUuid) return;
    try {
      await api.delete('/browse/glossary', { data: { keyword: kw, node_uuid: nodeUuid } });
      onUpdate();
    } catch (err) {
      toast.error('删除词条失败：' + (err.response?.data?.detail || err.message));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') { setAdding(false); setNewKeyword(''); }
  };

  return (
    <div className="flex items-start gap-2 text-xs text-fg-3">
      <Tag size={13} className="flex-shrink-0 mt-0.5 text-warn-500/70" />
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-warn-500/70 font-medium">词表：</span>
        {keywords.map(kw => (
          <span
            key={kw}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-warn-500/10 border border-warn-500/25 rounded-pill text-warn-400/80 font-mono text-xs"
          >
            {kw}
            <button
              onClick={() => handleRemove(kw)}
              className="text-warn-500/50 hover:text-warn-400 transition-colors focus-visible:outline-none"
              aria-label={`删除 ${kw}`}
            >
              <X size={9} />
            </button>
          </span>
        ))}
        {adding ? (
          <span className="inline-flex items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              value={newKeyword}
              onChange={e => setNewKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => { if (!newKeyword.trim()) setAdding(false); }}
              placeholder="输入词条…"
              className="w-28 px-1.5 py-0.5 bg-surface-2 border border-warn-500/30 rounded-control text-warn-300 text-xs font-mono focus:outline-none focus:border-warn-500/50 focus-visible:ring-1 focus-visible:ring-warn-500/40"
            />
            <button
              onClick={handleAdd}
              className="text-warn-500/60 hover:text-warn-400 transition-colors focus-visible:outline-none"
              aria-label="确认添加"
            >
              <Save size={11} />
            </button>
          </span>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 border border-dashed border-warn-500/25 rounded-pill text-warn-500/50 hover:text-warn-400 hover:border-warn-500/40 transition-colors text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-warn-500/40"
          >
            <Plus size={9} /> 添加
          </button>
        )}
      </div>
    </div>
  );
};

export default KeywordManager;
