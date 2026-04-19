import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import clsx from 'clsx';

const Breadcrumb = ({ items, onNavigate }) => (
  <div className="flex items-center gap-2 overflow-x-auto">
    <button
      onClick={() => onNavigate('')}
      className={clsx(
        'p-1.5 rounded-control text-fg-3 hover:text-brand-400 hover:bg-surface-2',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60',
      )}
      aria-label="根节点"
    >
      <Home size={14} />
    </button>

    {items.map((crumb, i) => (
      <React.Fragment key={crumb.path}>
        <ChevronRight size={12} className="text-fg-3 flex-shrink-0" />
        <button
          onClick={() => onNavigate(crumb.path)}
          className={clsx(
            'px-2 py-1 rounded-control text-xs font-medium transition-colors whitespace-nowrap',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60',
            i === items.length - 1
              ? 'bg-brand-500/10 text-brand-300 border border-brand-500/20'
              : 'text-fg-2 hover:text-fg-0 hover:bg-surface-2',
          )}
        >
          {crumb.label}
        </button>
      </React.Fragment>
    ))}
  </div>
);

export default Breadcrumb;
