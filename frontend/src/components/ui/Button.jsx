import React from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Button — 项目唯一的按钮原子。
//
// variant:  primary | secondary | ghost | danger
// size:     sm | md | lg
// loading:  替换 leftIcon 为 spinner，并禁用按钮
// icon:     左侧图标组件（lucide），与 children 同时存在
// iconPosition: 'left' | 'right'
// ---------------------------------------------------------------------------

const VARIANT = {
  primary:
    'bg-brand-500 text-white hover:bg-brand-400 hover:shadow-glow active:bg-brand-600 ' +
    'border border-transparent',
  secondary:
    'bg-surface-2 text-fg-1 hover:bg-surface-3 hover:text-fg-0 ' +
    'border border-line hover:border-line-strong',
  ghost:
    'bg-transparent text-fg-1 hover:bg-surface-2 hover:text-fg-0 border border-transparent',
  danger:
    'bg-danger-500/10 text-danger-400 hover:bg-danger-500/20 hover:text-danger-400 ' +
    'border border-danger-500/40 hover:border-danger-500/60',
};

const SIZE = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
};

const ICON_SIZE = { sm: 14, md: 16, lg: 18 };

const Button = React.forwardRef(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    disabled = false,
    icon: Icon,
    iconPosition = 'left',
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  const iconSize = ICON_SIZE[size];
  const renderedIcon = loading
    ? <Loader2 size={iconSize} className="animate-spin" />
    : Icon
      ? <Icon size={iconSize} />
      : null;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={clsx(
        'inline-flex items-center justify-center font-medium rounded-control',
        'transition-colors duration-150 select-none whitespace-nowrap',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-0',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none',
        SIZE[size],
        VARIANT[variant],
        className,
      )}
      {...rest}
    >
      {iconPosition === 'left' && renderedIcon}
      {children && <span>{children}</span>}
      {iconPosition === 'right' && renderedIcon}
    </button>
  );
});

export default Button;
