import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge, Button, LoadingState, EmptyState, Modal } from '../../../shared/components';
import { useProperties } from '../../properties/use-properties';
import { usePropertyDebtors, useDebtorStats } from '../api/debtors.queries';
import { usePropertyAccounts, useApplyOffset } from '../api/konto.queries';
import type { DebtorSummary } from '../api/debtors.api';
import type { OwnerAccountSummary } from '../api/konto.api';
import { useToast } from '../../../shared/components/toast/Toast';

/* ─── Formatting helpers ──────────────────────────────────────── */

function fmtCzk(n: number) {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', minimumFractionDigits: 2 }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('cs-CZ');
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

/* ─── Bucket helpers ──────────────────────────────────────────── */

function getBucketColor(bucket: string): string {
  switch (bucket) {
    case '0-30': return 'yellow';
    case '31-60': return 'yellow';
    case '61-90': return 'red';
    case '91-180': return 'red';
    case '180+': return 'red';
    default: return 'muted';
  }
}

function getBucketLabel(bucket: string): string {
  switch (bucket) {
    case '0-30': return '0–30 dní';
    case '31-60': return '31–60 dní';
    case '61-90': return '61–90 dní';
    case '91-180': return '91–180 dní';
    case '180+': return '180+ dní';
    default: return bucket;
  }
}

/* ─── Aging chart colors ──────────────────────────────────────── */

const AGING_COLORS: Record<string, { bg: string; fg: string }> = {
  '0-30':  { bg: '#FEF3C7', fg: '#92400E' },
  '31-60': { bg: '#FED7AA', fg: '#9A3412' },
  '61-90': { bg: '#FECACA', fg: '#991B1B' },
  '91-180': { bg: '#FCA5A5', fg: '#7F1D1D' },
  '180+':  { bg: '#7F1D1D', fg: '#FFFFFF' },
};

const AGING_ORDER = ['0-30', '31-60', '61-90', '91-180', '180+'];

/* ─── Styles ──────────────────────────────────────────────────── */

const thStyle: React.CSSProperties = { padding: '8px 12px', fontWeight: 600, fontSize: '.8rem', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' };
const tdStyle: React.CSSProperties = { padding: '8px 12px' };
const linkBtnStyle: React.CSSProperties = { background: 'none', border: 'none', color: 'var(--primary, #3b82f6)', cursor: 'pointer', fontSize: '.82rem', textDecoration: 'underline', padding: 0 };

/* ─── Main Component ──────────────────────────────────────────── */

export default function DebtorsTabV2() {
  const [, setParams] = useSearchParams();
  const { data: properties = [] } = useProperties();
  const [propertyId, setPropertyId] = useState<string>('');

  // Auto-select first property
  if (!propertyId && properties.length > 0) setPropertyId(properties[0].id);

  const { data: debtors = [], isLoading } = usePropertyDebtors(propertyId || undefined);
  const { data: stats } = useDebtorStats(propertyId || undefined);
  const { data: allAccounts = [] } = usePropertyAccounts(propertyId || undefined);
  const [sortBy, setSortBy] = useState<'amount' | 'age' | 'name'>('amount');
  const [showOffset, setShowOffset] = useState<DebtorSummary | null>(null);

  // Sort locally
  const sorted = [...debtors].sort((a, b) => {
    switch (sortBy) {
      case 'amount': return b.totalDebt - a.totalDebt;
      case 'age': return b.daysOverdue - a.daysOverdue;
      case 'name': return a.residentName.localeCompare(b.residentName, 'cs');
      default: return 0;
    }
  });

  // Overpayment accounts for offset
  const overpayments = allAccounts.filter(a => Number(a.currentBalance) < -0.005);

  const selectStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '.85rem', marginBottom: 16 };

  if (!propertyId) return <EmptyState title="Žádná nemovitost" description="Nejprve vytvořte nemovitost." />;

  return (
    <div>
      {/* Property selector - show only if >1 property */}
      {properties.length > 1 && (
        <select value={propertyId} onChange={e => setPropertyId(e.target.value)} style={selectStyle}>
          {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}

      {/* Stats cards - 4 in a row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Dlužníků" value={String(stats?.totalDebtors ?? 0)} color="var(--text)" />
        <StatCard label="Celkem dluh" value={fmtCzk(stats?.totalDebtAmount ?? 0)} color="#ef4444" />
        <StatCard label="Přeplatky" value={fmtCzk(stats?.totalOverpayments ?? 0)} color="#10b981" />
        <StatCard
          label="Čistý stav"
          value={fmtCzk(stats?.netPosition ?? 0)}
          color={(stats?.netPosition ?? 0) > 0.005 ? '#ef4444' : (stats?.netPosition ?? 0) < -0.005 ? '#10b981' : 'var(--text-muted)'}
        />
      </div>

      {/* Aging bar chart */}
      {stats && stats.totalDebtors > 0 && <AgingChart breakdown={stats.agingBreakdown} />}

      {/* Debtors table */}
      {isLoading ? <LoadingState text="Načítání..." /> :
       debtors.length === 0 ? <EmptyState title="Žádní dlužníci" description="Všechna konta jsou vyrovnána nebo v přeplatku." /> : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th onClick={() => setSortBy('name')} style={thStyle}>Vlastník</th>
                <th style={{ ...thStyle, cursor: 'default' }}>Jednotka</th>
                <th onClick={() => setSortBy('amount')} style={{ ...thStyle, textAlign: 'right' }}>Dluh (Kč)</th>
                <th onClick={() => setSortBy('age')} style={{ ...thStyle, textAlign: 'right' }}>Po splatnosti</th>
                <th style={{ ...thStyle, cursor: 'default' }}>Kategorie</th>
                <th style={{ ...thStyle, cursor: 'default' }}>Poslední platba</th>
                <th style={{ ...thStyle, textAlign: 'center', cursor: 'default' }}>Upomínek</th>
                <th style={{ ...thStyle, cursor: 'default' }}>Navigace</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(d => {
                const bucketColor = getBucketColor(d.agingBucket);
                const bucketLabel = getBucketLabel(d.agingBucket);
                return (
                  <tr key={d.accountId} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={tdStyle}><span style={{ fontWeight: 500 }}>{d.residentName}</span></td>
                    <td style={tdStyle}>{d.unitName}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, fontFamily: 'monospace', color: '#ef4444' }}>{fmtCzk(d.totalDebt)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{d.daysOverdue} dní</td>
                    <td style={tdStyle}><Badge variant={bucketColor as any}>{bucketLabel}</Badge></td>
                    <td style={tdStyle}>
                      {d.lastPaymentDate ? (
                        <div>
                          <span>{fmtDate(d.lastPaymentDate)}</span>
                          {d.lastPaymentAmount != null && (
                            <span className="text-muted text-sm" style={{ marginLeft: 4 }}>
                              ({fmtCzk(d.lastPaymentAmount)})
                            </span>
                          )}
                          {d.lastPaymentDate && isToday(d.lastPaymentDate) && (
                            <Badge variant="green">Právě uhrazeno</Badge>
                          )}
                        </div>
                      ) : 'Žádná'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{d.reminderCount}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {overpayments.length > 0 && (
                          <button onClick={() => setShowOffset(d)} style={linkBtnStyle} data-testid="debtor-offset-btn">Zápočet</button>
                        )}
                        <button
                          onClick={() => setParams({ tab: 'bank' })}
                          style={linkBtnStyle}
                          data-testid="debtor-show-payments-btn"
                        >Platby</button>
                        <button
                          onClick={() => setParams({ tab: 'konto' })}
                          style={linkBtnStyle}
                          data-testid="debtor-show-konto-btn"
                        >Konto</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Summary row */}
          <div style={{ padding: '10px 12px', borderTop: '2px solid var(--border)', fontSize: '.85rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Celkem dlužníků: <strong>{debtors.length}</strong></span>
            <span>Celkem dluh: <strong style={{ color: '#ef4444' }}>{fmtCzk(debtors.reduce((s, d) => s + d.totalDebt, 0))}</strong></span>
          </div>
        </div>
      )}

      {/* Offset modal */}
      {showOffset && (
        <OffsetModal
          targetAccountId={showOffset.accountId}
          targetBalance={showOffset.totalDebt}
          targetName={showOffset.residentName}
          targetUnit={showOffset.unitName}
          propertyId={propertyId}
          overpayments={overpayments}
          onClose={() => setShowOffset(null)}
        />
      )}
    </div>
  );
}

/* ─── StatCard ────────────────────────────────────────────────── */

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '14px 16px',
    }}>
      <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '1.15rem', fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

/* ─── AgingChart ──────────────────────────────────────────────── */

function AgingChart({ breakdown }: { breakdown: Record<string, number> }) {
  const total = Object.values(breakdown).reduce((s, v) => s + v, 0);
  if (total === 0) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: '.82rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>
        Stáří pohledávek
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        {AGING_ORDER.map(bucket => {
          const amount = breakdown[bucket] ?? 0;
          if (amount === 0) return null;
          const pct = Math.max(8, (amount / total) * 100);
          const colors = AGING_COLORS[bucket] ?? { bg: '#E5E7EB', fg: '#374151' };
          return (
            <div key={bucket} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                background: colors.bg,
                color: colors.fg,
                borderRadius: 6,
                height: `${Math.max(32, pct * 1.2)}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '.75rem',
                fontWeight: 600,
                padding: '4px 6px',
              }}>
                {fmtCzk(amount)}
              </div>
              <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {getBucketLabel(bucket)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── OffsetModal ─────────────────────────────────────────────── */

interface OffsetModalProps {
  targetAccountId: string;
  targetBalance: number;
  targetName: string;
  targetUnit: string;
  propertyId: string;
  overpayments: OwnerAccountSummary[];
  onClose: () => void;
}

function OffsetModal({ targetAccountId, targetBalance, targetName, targetUnit, overpayments, onClose }: OffsetModalProps) {
  const toast = useToast();
  const offsetMut = useApplyOffset();
  const [sourceId, setSourceId] = useState(overpayments.length > 0 ? overpayments[0].id : '');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const selectedSource = overpayments.find(a => a.id === sourceId);
  const sourceBalance = selectedSource ? Math.abs(Number(selectedSource.currentBalance)) : 0;
  const maxAmount = Math.min(sourceBalance, targetBalance);

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0 || parsedAmount > maxAmount) return;

    try {
      await offsetMut.mutateAsync({
        sourceAccountId: sourceId,
        targetAccountId,
        amount: parsedAmount,
        description: description || undefined,
      });
      toast.success(`Zápočet ${fmtCzk(parsedAmount)} úspěšně proveden.`);
      onClose();
    } catch {
      toast.error('Zápočet se nezdařil.');
    }
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))', color: 'var(--text)', boxSizing: 'border-box' };

  const sourceName = (a: OwnerAccountSummary) => {
    const name = a.resident.isLegalEntity && a.resident.companyName
      ? a.resident.companyName
      : `${a.resident.lastName} ${a.resident.firstName}`;
    return `${name} — ${a.unit.name} (${fmtCzk(Math.abs(Number(a.currentBalance)))})`;
  };

  return (
    <Modal open onClose={onClose} title="Vzájemný zápočet">
      {/* Target info */}
      <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: 'var(--surface-2, #f9fafb)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginBottom: 4 }}>Cíl (dlužník)</div>
        <div style={{ fontWeight: 600 }}>{targetName}</div>
        <div style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>Jednotka: {targetUnit}</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ef4444', marginTop: 4 }}>Dluh: {fmtCzk(targetBalance)}</div>
      </div>

      {/* Source selector */}
      <div style={{ marginBottom: 12 }}>
        <label className="form-label">Zdroj (přeplatek)</label>
        <select value={sourceId} onChange={e => setSourceId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          {overpayments.map(a => (
            <option key={a.id} value={a.id}>{sourceName(a)}</option>
          ))}
        </select>
      </div>

      {/* Amount input */}
      <div style={{ marginBottom: 12 }}>
        <label className="form-label">Částka (Kč)</label>
        <input
          type="number"
          min="0.01"
          step="0.01"
          max={maxAmount}
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder={`Max ${fmtCzk(maxAmount)}`}
          style={inputStyle}
        />
        {maxAmount > 0 && (
          <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Max. možný zápočet: {fmtCzk(maxAmount)}
          </div>
        )}
      </div>

      {/* Description input */}
      <div style={{ marginBottom: 16 }}>
        <label className="form-label">Popis (volitelné)</label>
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Důvod zápočtu"
          style={inputStyle}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button onClick={onClose}>Zrušit</Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={offsetMut.isPending || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > maxAmount}
        >
          {offsetMut.isPending ? 'Provádím...' : 'Provést zápočet'}
        </Button>
      </div>
    </Modal>
  );
}
