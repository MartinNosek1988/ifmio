import { Inbox, Search, AlertTriangle, Filter } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children?: ReactNode;
  variant?: 'default' | 'search' | 'error' | 'filtered';
  action?: { label: string; onClick: () => void };
}

const VARIANT_ICONS = {
  default: <Inbox size={40} color="var(--text-muted)" />,
  search: <Search size={40} color="var(--text-muted)" />,
  error: <AlertTriangle size={40} color="var(--accent-red, #ef4444)" />,
  filtered: <Filter size={40} color="var(--text-muted)" />,
};

export function EmptyState({ title, description, icon, children, variant = 'default', action }: EmptyStateProps) {
  return (
    <div className="empty-state" data-testid="empty-state">
      {icon || VARIANT_ICONS[variant]}
      <div className="empty-state__title">{title}</div>
      {description && <div className="empty-state__desc">{description}</div>}
      {action && (
        <button
          onClick={action.onClick}
          style={{
            marginTop: 12,
            padding: '8px 20px',
            background: '#6366f1',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          {action.label}
        </button>
      )}
      {children}
    </div>
  );
}
