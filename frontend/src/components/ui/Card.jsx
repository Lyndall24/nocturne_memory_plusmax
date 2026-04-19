import React from 'react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Card — 容器原子。
//
// padding: sm | md | lg | none
// tone:    default | raised | sunken
// as:      标签名（默认 div）
// ---------------------------------------------------------------------------

const PADDING = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const TONE = {
  default: 'bg-surface-1 border border-line shadow-e1',
  raised: 'bg-surface-2 border border-line-strong shadow-e2',
  sunken: 'bg-surface-0 border border-line',
};

const Card = React.forwardRef(function Card(
  { padding = 'md', tone = 'default', as: Tag = 'div', className, children, ...rest },
  ref,
) {
  return (
    <Tag
      ref={ref}
      className={clsx('rounded-card', PADDING[padding], TONE[tone], className)}
      {...rest}
    >
      {children}
    </Tag>
  );
});

export default Card;
