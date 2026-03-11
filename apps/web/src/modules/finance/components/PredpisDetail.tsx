import { Badge } from '../../../shared/components';
import { formatKc, formatCzDate } from '../../../shared/utils/format';
import { FIN_STATUS_LABELS, label } from '../../../constants/labels';
import type { FinTransaction, FinPrescription } from '../types';

export function PredpisDetail({ predpis, transactions, getTenantName }: {
  predpis: FinPrescription;
  transactions: FinTransaction[];
  getTenantName: (id?: string | null) => string;
}) {
  const matched = transactions.filter(t => (t.parovani || []).includes(predpis.id));

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, fontSize: '0.875rem' }}>
        <div>
          <div className="text-muted">Nájemce</div>
          <div style={{ fontWeight: 500 }}>{getTenantName(predpis.tenantId)}</div>
        </div>
        <div>
          <div className="text-muted">Status</div>
          <Badge variant={predpis.status === 'paid' ? 'green' : predpis.status === 'overdue' ? 'red' : 'yellow'}>
            {label(FIN_STATUS_LABELS, predpis.status)}
          </Badge>
        </div>
        <div>
          <div className="text-muted">Celková částka</div>
          <div style={{ fontWeight: 600 }}>{formatKc(predpis.castka)}</div>
        </div>
        <div>
          <div className="text-muted">K úhradě</div>
          <div style={{ fontWeight: 600, color: (predpis.kUhrade ?? 0) > 0 ? 'var(--danger)' : 'var(--success)' }}>
            {formatKc(predpis.kUhrade ?? 0)}
          </div>
        </div>
        <div>
          <div className="text-muted">Datum</div>
          <div>{formatCzDate(predpis.datum)}</div>
        </div>
        <div>
          <div className="text-muted">Splatnost</div>
          <div>{formatCzDate(predpis.splatnost)}</div>
        </div>
      </div>
      {matched.length > 0 && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '0.875rem' }}>Spárované platby</div>
          {matched.map(t => (
            <div key={t.id} style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 6, marginBottom: 6, display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span>{t.popis} <span className="text-muted">({formatCzDate(t.datum)})</span></span>
              <span style={{ fontWeight: 600, color: 'var(--success)' }}>+{formatKc(t.castka)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
