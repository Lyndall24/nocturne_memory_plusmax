import React from 'react';
import { Star } from 'lucide-react';
import clsx from 'clsx';

// priority 0 = 最高（danger），1–2 = warn，3–5 = info/brand，>5 = neutral
const PriorityBadge = ({ priority, size = 'sm' }) => {
  if (priority === null || priority === undefined) return null;

  const toneClass = priority === 0
    ? 'bg-danger-500/15 text-danger-400 border-danger-500/30'
    : priority <= 2
    ? 'bg-warn-500/15 text-warn-400 border-warn-500/30'
    : priority <= 5
    ? 'bg-brand-500/15 text-brand-400 border-brand-500/30'
    : 'bg-surface-2 text-fg-3 border-line';

  const sizeClass = size === 'lg'
    ? 'px-2.5 py-1 text-xs gap-1.5'
    : 'px-1.5 py-0.5 text-xs gap-1';

  return (
    <span className={clsx(
      'inline-flex items-center rounded-control border font-mono font-semibold',
      toneClass,
      sizeClass,
    )}>
      <Star size={size === 'lg' ? 12 : 10} />
      {priority}
    </span>
  );
};

export default PriorityBadge;
