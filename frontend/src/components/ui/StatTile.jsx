import React from 'react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// StatTile — 一行数字统计：label + 大号 value + 可选 hint/趋势。
//
// tone: neutral | success | warn | danger | brand
// ---------------------------------------------------------------------------

const TONE = {
  neutral: 'text-fg-0',
  success: 'text-success-400',
  warn:    'text-warn-400',
  danger:  'text-danger-400',
  brand:   'text-brand-400',
};

export default function StatTile({ label, value, hint, tone = 'neutral', className }) {
  return (
    <div className={clsx('flex flex-col gap-0.5', className)}>
      <span className="text-xs text-fg-2 uppercase tracking-wide">{label}</span>
      <span className={clsx('text-2xl font-semibold tabular-nums', TONE[tone])}>
        {value}
      </span>
      {hint && <span className="text-xs text-fg-3">{hint}</span>}
    </div>
  );
}
