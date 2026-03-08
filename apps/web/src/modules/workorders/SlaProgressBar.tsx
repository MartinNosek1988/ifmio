interface Props {
  created: string;
  deadline: string;
  status: string;
}

export function SlaProgressBar({ created, deadline, status }: Props) {
  if (!created || !deadline || status === 'vyresena' || status === 'uzavrena') {
    return <span className="text-muted text-sm">-</span>;
  }

  const start = new Date(created).getTime();
  const end = new Date(deadline).getTime();
  const now = Date.now();
  const total = end - start;
  const elapsed = now - start;
  const pct = total > 0 ? Math.min(100, Math.round((elapsed / total) * 100)) : 100;

  let color = 'var(--accent-green)';
  if (pct > 80) color = 'var(--accent-orange)';
  if (pct >= 100) color = 'var(--danger)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
      <div style={{ flex: 1, height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', minWidth: 32 }}>{pct}%</span>
    </div>
  );
}
