import React from 'react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Badge — 状态/分类标签。
//
// tone:    neutral | success | warn | danger | info | brand
// size:    xs (text-xs) | sm (text-sm)
// shape:   pill (default) | square (rounded-control)
// dot:     在文字左侧加一个色点
// ---------------------------------------------------------------------------

const TONE = {
  neutral: 'bg-surface-2 text-fg-1 border border-line',
  success: 'bg-success-500/12 text-success-400 border border-success-500/30',
  warn:    'bg-warn-500/12 text-warn-400 border border-warn-500/30',
  danger:  'bg-danger-500/12 text-danger-400 border border-danger-500/30',
  info:    'bg-brand-500/12 text-brand-400 border border-brand-500/30',
  brand:   'bg-brand-500/15 text-brand-400 border border-brand-500/40',
};

const DOT_TONE = {
  neutral: 'bg-fg-2',
  success: 'bg-success-500',
  warn:    'bg-warn-500',
  danger:  'bg-danger-500',
  info:    'bg-brand-500',
  brand:   'bg-brand-500',
};

const SIZE = {
  xs: 'text-xs px-1.5 py-0.5 gap-1',
  sm: 'text-sm px-2 py-0.5 gap-1.5',
};

export default function Badge({
  tone = 'neutral',
  size = 'xs',
  shape = 'pill',
  dot = false,
  className,
  children,
  ...rest
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium leading-none whitespace-nowrap',
        shape === 'pill' ? 'rounded-pill' : 'rounded-control',
        SIZE[size],
        TONE[tone],
        className,
      )}
      {...rest}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', DOT_TONE[tone])} />}
      {children}
    </span>
  );
}
