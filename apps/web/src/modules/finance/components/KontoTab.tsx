import { useState } from 'react';
import { Badge, Button, Modal, LoadingState, EmptyState } from '../../../shared/components';
import { kontoApi } from '../api/konto.api';
import type { OwnerAccountSummary as AccountForExport } from '../api/konto.api';
import { useProperties } from '../../properties/use-properties';
import { usePropertyAccounts, useAccountLedger, useManualAdjustment } from '../api/konto.queries';
import type { OwnerAccountSummary, LedgerEntryRow } from '../api/konto.api';

const SOURCE_LABELS: Record<string, string> = {
  PRESCRIPTION: 'Předpis', BANK_TRANSACTION: 'Platba', CREDIT_APPLICATION: 'Zápočet',
  LATE_FEE: 'Úrok z prodlení', MANUAL_ADJUSTMENT: 'Ruční úprava',
};

function fmtCzk(n: number) {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', minimumFractionDigits: 2 }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('cs-CZ');
}

function balanceColor(b: number) {
  if (b > 0.005) return '#ef4444';
  if (b < -0.005) return '#10b981';
  return 'var(--text-muted)';
}

export default function KontoTab() {
  const { data: properties = [] } = useProperties();
  const [propertyId, setPropertyId] = useState<string>('');
  const { data: accounts = [], isLoading } = usePropertyAccounts(propertyId || undefined);
  const [selectedAccount, setSelectedAccount] = useState<OwnerAccountSummary | null>(null);

  // Auto-select first property
  if (!propertyId && properties.length > 0) setPropertyId(properties[0].id);

  const selectStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '.85rem', marginBottom: 16 };

  if (!propertyId) return <EmptyState title="Žádná nemovitost" description="Nejprve vytvořte nemovitost." />;
  if (isLoading) return <LoadingState text="Načítání kont..." />;

  const totalDebt = accounts.reduce((s, a) => s + (Number(a.currentBalance) > 0 ? Number(a.currentBalance) : 0), 0);
  const totalCredit = accounts.reduce((s, a) => s + (Number(a.currentBalance) < 0 ? Math.abs(Number(a.currentBalance)) : 0), 0);
  const net = totalDebt - totalCredit;

  return (
    <div>
      {/* Property selector */}
      {properties.length > 1 && (
        <select value={propertyId} onChange={e => { setPropertyId(e.target.value); setSelectedAccount(null); }} style={selectStyle}>
          {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}

      {accounts.length === 0 ? <EmptyState title="Žádná konta" description="Konta se vytvoří automaticky při generování předpisů." /> : null}
      {accounts.length === 0 ? null : <>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: '0.85rem' }}>
        <span>Celkem dluh: <strong style={{ color: '#ef4444' }}>{fmtCzk(totalDebt)}</strong></span>
        <span>Celkem přeplatky: <strong style={{ color: '#10b981' }}>{fmtCzk(totalCredit)}</strong></span>
        <span>Čistý stav: <strong style={{ color: balanceColor(net) }}>{fmtCzk(net)}</strong></span>
      </div>

      {/* Accounts table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              <th style={th}>Vlastník/Nájemce</th>
              <th style={th}>Jednotka</th>
              <th style={{ ...th, textAlign: 'right' }}>Aktuální zůstatek</th>
              <th style={th}>Poslední pohyb</th>
              <th style={th}>Stav</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(a => {
              const bal = Number(a.currentBalance);
              const name = a.resident.isLegalEntity && a.resident.companyName ? a.resident.companyName : `${a.resident.lastName} ${a.resident.firstName}`;
              return (
                <tr key={a.id} onClick={() => setSelectedAccount(a)} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                  <td style={td}><span style={{ fontWeight: 500 }}>{name}</span></td>
                  <td style={td}>{a.unit.name}{a.unit.knDesignation ? ` (${a.unit.knDesignation})` : ''}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 600, fontFamily: 'monospace', color: balanceColor(bal) }}>{fmtCzk(bal)}</td>
                  <td style={td}>{a.lastPostingAt ? fmtDate(a.lastPostingAt) : '—'}</td>
                  <td style={td}>
                    {bal > 0.005 ? <Badge variant="red">Dluh</Badge> : bal < -0.005 ? <Badge variant="green">Přeplatek</Badge> : <Badge variant="muted">Vyrovnáno</Badge>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      </>}

      {/* Detail modal */}
      {selectedAccount && (
        <KontoDetailModal account={selectedAccount} onClose={() => setSelectedAccount(null)} />
      )}
    </div>
  );
}

/* ─── Detail Modal ───────────────────────────────────────────── */

function KontoDetailModal({ account, onClose }: { account: OwnerAccountSummary; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const [showAdjust, setShowAdjust] = useState(false);
  const { data: ledger, isLoading } = useAccountLedger(account.id, page, 20);

  const bal = Number(account.currentBalance);
  const name = account.resident.isLegalEntity && account.resident.companyName ? account.resident.companyName : `${account.resident.lastName} ${account.resident.firstName}`;
  const totalPages = ledger ? Math.ceil(ledger.total / 20) : 0;

  return (
    <Modal open onClose={onClose} wide title="">
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{name}</h2>
        <div className="text-muted" style={{ fontSize: '0.85rem' }}>Jednotka: {account.unit.name}</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: balanceColor(bal), marginTop: 8 }}>
          {fmtCzk(bal)}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Button size="sm" onClick={() => setShowAdjust(true)}>Ruční úprava</Button>
          <Button size="sm" onClick={() => exportCsv(account, name)}>Export CSV</Button>
        </div>
      </div>

      {/* Ledger table */}
      {isLoading ? <LoadingState text="Načítání..." /> : !ledger?.entries.length ? (
        <div className="text-muted" style={{ padding: 20, textAlign: 'center' }}>Žádné záznamy</div>
      ) : (
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={th}>Datum</th>
                <th style={th}>Typ</th>
                <th style={th}>Popis</th>
                <th style={{ ...th, textAlign: 'right', color: '#ef4444' }}>Má dáti</th>
                <th style={{ ...th, textAlign: 'right', color: '#10b981' }}>Dal</th>
                <th style={{ ...th, textAlign: 'right' }}>Zůstatek</th>
              </tr>
            </thead>
            <tbody>
              {ledger.entries.map((e: LedgerEntryRow) => {
                const rowBg = e.type === 'DEBIT' ? '#FEF2F2' : e.type === 'CREDIT' ? '#F0FDF4' : '#FFFBEB';
                return (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--border)', background: rowBg }}>
                    <td style={td}>{fmtDate(e.postingDate)}</td>
                    <td style={td}>{SOURCE_LABELS[e.sourceType] ?? e.sourceType}</td>
                    <td style={td}>{e.description ?? '—'}</td>
                    <td style={{ ...td, textAlign: 'right', color: '#ef4444', fontFamily: 'monospace' }}>
                      {e.type === 'DEBIT' ? fmtCzk(Number(e.amount)) : ''}
                    </td>
                    <td style={{ ...td, textAlign: 'right', color: '#10b981', fontFamily: 'monospace' }}>
                      {e.type === 'CREDIT' ? fmtCzk(Number(e.amount)) : ''}
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', color: balanceColor(Number(e.balance)) }}>
                      {fmtCzk(Number(e.balance))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: page > 1 ? 'var(--text)' : 'var(--text-muted)', cursor: page > 1 ? 'pointer' : 'default', fontSize: '.78rem' }}>Předchozí</button>
              <span className="text-muted" style={{ fontSize: '.78rem', alignSelf: 'center' }}>{page} z {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: page < totalPages ? 'var(--text)' : 'var(--text-muted)', cursor: page < totalPages ? 'pointer' : 'default', fontSize: '.78rem' }}>Další</button>
            </div>
          )}
        </div>
      )}

      {/* Manual adjustment form */}
      {showAdjust && (
        <AdjustmentForm accountId={account.id} onClose={() => setShowAdjust(false)} onSuccess={() => { setShowAdjust(false); setPage(1); }} />
      )}
    </Modal>
  );
}

/* ─── Adjustment Form ────────────────────────────────────────── */

function AdjustmentForm({ accountId, onClose, onSuccess }: { accountId: string; onClose: () => void; onSuccess: () => void }) {
  const adjustMut = useManualAdjustment();
  const [form, setForm] = useState({ type: 'DEBIT' as 'DEBIT' | 'CREDIT', amount: '', description: '', date: new Date().toISOString().slice(0, 10) });

  const handleSubmit = async () => {
    if (!form.amount || !form.description) return;
    await adjustMut.mutateAsync({ accountId, data: { type: form.type, amount: parseFloat(form.amount), description: form.description, date: form.date || undefined } });
    onSuccess();
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))', color: 'var(--text)', boxSizing: 'border-box' };

  return (
    <div style={{ marginTop: 16, padding: 14, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)' }}>
      <h4 style={{ fontSize: '.9rem', fontWeight: 600, marginBottom: 10 }}>Ruční úprava</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label className="form-label">Typ</label>
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="DEBIT">Předepsat (MD)</option>
            <option value="CREDIT">Odepsat (D)</option>
          </select>
        </div>
        <div>
          <label className="form-label">Částka (Kč)</label>
          <input type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={inputStyle} />
        </div>
        <div>
          <label className="form-label">Popis *</label>
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Důvod úpravy" style={inputStyle} />
        </div>
        <div>
          <label className="form-label">Datum</label>
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="primary" onClick={handleSubmit} disabled={adjustMut.isPending || !form.amount || !form.description}>
          {adjustMut.isPending ? 'Ukládám...' : 'Zaúčtovat'}
        </Button>
        <Button onClick={onClose}>Zrušit</Button>
      </div>
    </div>
  );
}

/* ─── CSV Export ─────────────────────────────────────────────── */

async function exportCsv(account: AccountForExport, residentName: string) {
  try {
    const data = await kontoApi.getAccountLedger(account.id, 1, 10000)
    const header = 'Datum;Typ;Popis;Má dáti;Dal;Zůstatek'
    const rows = data.entries.map(e => {
      const date = new Date(e.postingDate)
      const d = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`
      const typ = SOURCE_LABELS[e.sourceType] ?? e.sourceType
      const desc = e.description ? `"${e.description.replace(/"/g, '""')}"` : ''
      const md = e.type === 'DEBIT' ? Number(e.amount).toFixed(2).replace('.', ',') : ''
      const dal = e.type === 'CREDIT' ? Number(e.amount).toFixed(2).replace('.', ',') : ''
      const bal = Number(e.balance).toFixed(2).replace('.', ',')
      return `${d};${typ};${desc};${md};${dal};${bal}`
    })

    const csv = '\uFEFF' + header + '\n' + rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const safeName = residentName.replace(/[^a-zA-Z0-9áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/g, '_')
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    a.href = url
    a.download = `konto_${safeName}_${account.unit.name}_${today}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    alert('Export se nezdařil')
  }
}

/* ─── Styles ─────────────────────────────────────────────────── */

const th: React.CSSProperties = { padding: '8px 12px', fontWeight: 600, fontSize: '.8rem', color: 'var(--text-muted)' };
const td: React.CSSProperties = { padding: '8px 12px' };
