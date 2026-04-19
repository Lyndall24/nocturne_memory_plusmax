import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, X } from 'lucide-react';
import clsx from 'clsx';

function findAllOccurrences(text, keywords) {
  if (!keywords || keywords.length === 0 || !text) return [];
  const matches = [];
  for (const entry of keywords) {
    if (!entry.keyword) continue;
    let idx = text.indexOf(entry.keyword);
    while (idx !== -1) {
      matches.push({ start: idx, end: idx + entry.keyword.length, keyword: entry.keyword, nodes: entry.nodes });
      idx = text.indexOf(entry.keyword, idx + entry.keyword.length);
    }
  }
  matches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const result = [];
  let lastEnd = -1;
  for (const m of matches) {
    if (m.start >= lastEnd) { result.push(m); lastEnd = m.end; }
  }
  return result;
}

const GlossaryPopup = ({ keyword, nodes, position, onClose, onNavigate }) => {
  const popupRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return createPortal(
    <div
      ref={popupRef}
      className="fixed z-[100] w-72 bg-surface-2 border border-warn-500/30 rounded-card shadow-e2 overflow-hidden flex flex-col"
      style={{
        left: position.x,
        ...(position.isAbove
          ? { bottom: window.innerHeight - position.spanTop + 4, maxHeight: position.spanTop - 16 }
          : { top: position.y + 4, maxHeight: window.innerHeight - position.y - 16 }),
      }}
    >
      <div className="px-3 py-2 border-b border-line flex items-center gap-2 flex-shrink-0">
        <BookOpen size={12} className="text-warn-400" />
        <span className="text-xs font-semibold text-warn-300">{keyword}</span>
        <button
          onClick={onClose}
          className="ml-auto text-fg-3 hover:text-fg-1 transition-colors focus-visible:outline-none"
          aria-label="关闭"
        >
          <X size={12} />
        </button>
      </div>
      <div className="p-2 overflow-y-auto flex-1">
        {nodes.map((node, i) => {
          const isUnlinked = node.uri?.startsWith('unlinked://');
          return (
            <button
              key={node.uri || i}
              onClick={() => {
                if (isUnlinked) return;
                const match = node.uri?.match(/^([^:]+):\/\/(.*)$/);
                if (match) onNavigate(match[2], match[1]);
                onClose();
              }}
              className={clsx(
                'w-full text-left px-2.5 py-2 rounded-control transition-colors group',
                isUnlinked ? 'cursor-default opacity-70 bg-surface-1/40' : 'hover:bg-surface-3 cursor-pointer',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <code className={clsx(
                  'text-xs font-mono block truncate flex-1',
                  isUnlinked ? 'text-fg-3' : 'text-brand-400/80 group-hover:text-brand-300',
                )}>
                  {node.uri}
                </code>
                {isUnlinked && (
                  <span className="text-xs px-1.5 py-0.5 bg-danger-500/15 text-danger-400 border border-danger-500/25 rounded-control flex-shrink-0">
                    孤立
                  </span>
                )}
              </div>
              {node.content_snippet && (
                <p className="text-xs text-fg-3 mt-0.5 line-clamp-2 leading-snug">{node.content_snippet}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
};

const GlossaryHighlighter = ({ content, glossary, currentNodeUuid, onNavigate }) => {
  const [popup, setPopup] = useState(null);

  useEffect(() => { setPopup(null); }, [content]);

  const filteredGlossary = useMemo(() => {
    if (!glossary) return [];
    return glossary.map(entry => ({
      ...entry,
      nodes: entry.nodes?.filter(n => n.node_uuid !== currentNodeUuid) || [],
    })).filter(entry => entry.nodes.length > 0);
  }, [glossary, currentNodeUuid]);

  const matches = useMemo(
    () => findAllOccurrences(content, filteredGlossary),
    [content, filteredGlossary],
  );

  const handleKeywordClick = useCallback((e, match) => {
    const spanRect = e.target.getBoundingClientRect();
    const popupWidth = 288;
    let x = spanRect.left;
    if (x + popupWidth > window.innerWidth - 16) x = Math.max(16, window.innerWidth - popupWidth - 16);
    const estimatedHeight = 250;
    const y = spanRect.bottom;
    const isAbove = y + estimatedHeight > window.innerHeight - 16 && spanRect.top > estimatedHeight + 16;
    setPopup({ keyword: match.keyword, nodes: match.nodes, position: { x, y, isAbove, spanTop: spanRect.top } });
  }, []);

  if (matches.length === 0) {
    return <pre className="whitespace-pre-wrap font-mono text-fg-1 leading-7">{content}</pre>;
  }

  const parts = [];
  let lastIdx = 0;
  for (const m of matches) {
    if (m.start > lastIdx) parts.push({ text: content.slice(lastIdx, m.start), isMatch: false });
    parts.push({ text: content.slice(m.start, m.end), isMatch: true, match: m });
    lastIdx = m.end;
  }
  if (lastIdx < content.length) parts.push({ text: content.slice(lastIdx), isMatch: false });

  return (
    <div className="relative">
      <pre className="whitespace-pre-wrap font-mono text-fg-1 leading-7">
        {parts.map((part, i) =>
          part.isMatch ? (
            <span
              key={i}
              className="text-warn-300 cursor-pointer underline decoration-dotted decoration-warn-500/50 hover:decoration-warn-400 hover:text-warn-200 transition-colors"
              onClick={(e) => handleKeywordClick(e, part.match)}
            >
              {part.text}
            </span>
          ) : (
            <React.Fragment key={i}>{part.text}</React.Fragment>
          )
        )}
      </pre>
      {popup && (
        <GlossaryPopup
          keyword={popup.keyword}
          nodes={popup.nodes}
          position={popup.position}
          onClose={() => setPopup(null)}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
};

export default GlossaryHighlighter;
