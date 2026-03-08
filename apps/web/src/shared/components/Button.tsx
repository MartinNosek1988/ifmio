import type { ReactNode, ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger';
  size?: 'default' | 'sm';
  icon?: ReactNode;
  children?: ReactNode;
}

export function Button({ variant = 'default', size = 'default', icon, children, className = '', ...rest }: Props) {
  const cls = [
    'btn',
    variant !== 'default' && `btn--${variant}`,
    size === 'sm' && 'btn--sm',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={cls} {...rest}>
      {icon}
      {children}
    </button>
  );
}
