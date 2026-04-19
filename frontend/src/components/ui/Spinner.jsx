import React from 'react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Spinner — 替换全仓散落的 border-2 border-indigo-500/30 ... animate-spin。
//
// size: sm | md | lg
// tone: brand | success | warn | danger | neutral
// ---------------------------------------------------------------------------

const SIZE = {
  sm: 'w-4 h-4 border-2',
  md: 'w-5 h-5 border-2',
  lg: 'w-8 h-8 border-[3px]',
};

const TONE = {
  brand:   'border-brand-500/25 border-t-brand-500',
  success: 'border-success-500/25 border-t-success-500',
  warn:    'border-warn-500/25 border-t-warn-500',
  danger:  'border-danger-500/25 border-t-danger-500',
  neutral: 'border-fg-3 border-t-fg-1',
};

export default function Spinner({ size = 'md', tone = 'brand', className }) {
  return (
    <span
      role="status"
      aria-label="加载中"
      className={clsx(
        'inline-block rounded-full animate-spin',
        SIZE[size],
        TONE[tone],
        className,
      )}
    />
  );
}
