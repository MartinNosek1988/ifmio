import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  icon?: ReactNode;
  onClick?: () => void;
}

export function KpiCard({ label, value, sub, color = 'var(--accent-blue)', icon, onClick }: Props) {
  return (
    <div
      className="kpi-card"
      style={{ borderLeftColor: color }}
      data-clickable={onClick ? 'true' : undefined}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="kpi-card__label">{label}</div>
        {icon && <div style={{ color }}>{icon}</div>}
      </div>
      <div className="kpi-card__value">{value}</div>
      {sub && <div className="kpi-card__sub">{sub}</div>}
    </div>
  );
}
