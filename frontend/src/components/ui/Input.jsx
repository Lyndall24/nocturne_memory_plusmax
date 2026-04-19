import React from 'react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Input — 文本输入原子，支持左侧 icon、错误状态、全宽。
// 继承所有原生 <input> 属性。
// ---------------------------------------------------------------------------

const Input = React.forwardRef(function Input(
  { leftIcon: Icon, error, size = 'md', className, ...rest },
  ref,
) {
  const sizes = {
    sm: 'h-8 text-xs',
    md: 'h-9 text-sm',
    lg: 'h-11 text-base',
  };
  const iconSizes = { sm: 14, md: 16, lg: 18 };

  return (
    <div className="relative w-full">
      {Icon && (
        <Icon
          size={iconSizes[size]}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-2"
        />
      )}
      <input
        ref={ref}
        className={clsx(
          'w-full rounded-control border bg-surface-2 text-fg-0 placeholder:text-fg-3',
          'transition-colors duration-150 outline-none',
          'focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:border-brand-500/60',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-danger-500/50 focus-visible:ring-danger-500/40'
            : 'border-line hover:border-line-strong',
          Icon ? 'pl-9 pr-3' : 'px-3',
          sizes[size],
          className,
        )}
        {...rest}
      />
      {error && (
        <p className="mt-1 text-xs text-danger-400">{error}</p>
      )}
    </div>
  );
});

export default Input;
