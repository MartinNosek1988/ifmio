import type { ReactNode } from 'react';

export type BadgeVariant = 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'muted';

interface Props {
  variant?: BadgeVariant;
  children: ReactNode;
}

export function Badge({ variant = 'muted', children }: Props) {
  return <span className={`badge badge--${variant}`}>{children}</span>;
}
