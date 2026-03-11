import { useMemo } from 'react';
import { EmptyState } from '../../../shared/components';
import { formatKc, formatCzDate } from '../../../shared/utils/format';
import type { FinPrescription } from '../types';

export function DebtorsTab({ prescriptions, getPropName, getTenantName }: {
  prescriptions: FinPrescription[];
  getPropName: (id: unknown) => string;
  getTenantName: (id?: string | null) => string;
}) {
  const dluznici = useMemo(() => {
    const map = new Map<string, { celkem: number; predpisy: FinPrescription[] }>();
    for (const p of prescriptions) {
      if (!p.tenantId || p.status === 'paid') continue;
      const kUhrade = p.kUhrade ?? 0;
      if (kUhrade <= 0) continue;
      const entry = map.get(p.tenantId) || { celkem: 0, predpisy: [] };
      entry.celkem += kUhrade;
      entry.predpisy.push(p);
      map.set(p.tenantId, entry);
    }
    return Array.from(map.entries())
      .map(([tenantId, data]) => ({ tenantId, ...data }))
      .sort((a, b) => b.celkem - a.celkem);
  }, [prescriptions]);

  if (dluznici.length === 0) {
    return <EmptyState title="Žádní dlužníci" description="Všechny předpisy jsou uhrazeny." />;
  }

  const total = dluznici.reduce((s, d) => s + d.celkem, 0);

  return (
    <div>
      <div className="text-muted text-sm" style={{ marginBottom: 12 }}>
        Dlužníků: {dluznici.length} | Celková pohledávka: {formatKc(total)}
      </div>
      {dluznici.map(d => (
        <div key={d.tenantId} style={{ border: '1px solid var(--border)', borderRadius: 8, marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: 'var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600 }}>{getTenantName(d.tenantId)}</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--danger)' }}>{formatKc(d.celkem)}</div>
          </div>
          <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
            <tbody>
              {d.predpisy.map(p => (
                <tr key={p.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 16px' }}>{p.popis}</td>
                  <td style={{ padding: '8px 16px' }} className="text-muted">{getPropName(p.propId)}</td>
                  <td style={{ padding: '8px 16px' }} className="text-muted">splatnost: {formatCzDate(p.splatnost)}</td>
                  <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>{formatKc(p.kUhrade ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
