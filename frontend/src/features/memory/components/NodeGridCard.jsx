import React from 'react';
import { ChevronRight, Folder, FileText, AlertTriangle, Link2 } from 'lucide-react';
import clsx from 'clsx';
import PriorityBadge from './PriorityBadge';

const NodeGridCard = ({ node, currentDomain, onClick }) => {
  const isCrossDomain = node.domain && node.domain !== currentDomain;

  return (
    <button
      onClick={onClick}
      className={clsx(
        'group relative flex flex-col items-start p-5 rounded-card border transition-all duration-200',
        'text-left w-full h-full overflow-hidden',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60',
        'hover:-translate-y-0.5 hover:shadow-e2',
        isCrossDomain
          ? 'bg-surface-1 border-brand-500/20 hover:border-brand-500/40'
          : 'bg-surface-1 border-line hover:border-line-strong',
      )}
    >
      <div className="flex items-center gap-3 mb-3 w-full">
        <div className={clsx(
          'p-2 rounded-control flex-shrink-0 transition-colors',
          'bg-surface-2 group-hover:bg-brand-500/15 text-fg-3 group-hover:text-brand-400',
        )}>
          {node.approx_children_count > 0 ? <Folder size={18} /> : <FileText size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-fg-1 group-hover:text-fg-0 transition-colors break-words line-clamp-2">
            {node.name || node.path.split('/').pop()}
          </h3>
          {isCrossDomain && (
            <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 text-xs font-mono text-brand-400/80 bg-brand-500/10 border border-brand-500/20 rounded-control">
              <Link2 size={9} />
              {node.domain}://
            </span>
          )}
        </div>
        <PriorityBadge priority={node.priority} />
      </div>

      {node.disclosure && (
        <div className="w-full mb-2">
          <p className="text-xs text-warn-400/70 leading-snug line-clamp-2 flex items-start gap-1">
            <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
            <span className="italic">{node.disclosure}</span>
          </p>
        </div>
      )}

      <div className="w-full flex-1">
        {node.content_snippet ? (
          <p className="text-xs text-fg-3 leading-relaxed line-clamp-3">{node.content_snippet}</p>
        ) : (
          <p className="text-xs text-fg-3 italic">暂无预览</p>
        )}
      </div>

      <ChevronRight size={14} className="absolute bottom-4 right-4 text-brand-500/40 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
};

export default NodeGridCard;
