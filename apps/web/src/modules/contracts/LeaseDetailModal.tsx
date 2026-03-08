import { useState } from 'react';
import { Modal, Badge, Button } from '../../shared/components';
import type { BadgeVariant } from '../../shared/components';
import { useContractsStore, type LeaseAgreement, daysToExpiry, isExpiringSoon } from './contracts-store';
import { loadFromStorage } from '../../core/storage';
import { formatCzDate, formatKc } from '../../shared/utils/format';
import LeaseForm from './LeaseForm';

interface Props {
  lease: LeaseAgreement;
  onClose: () => void;
  onUpdated: () => void;
}

type R = Record<string, unknown>;

const STATUS_COLOR: Record<string, BadgeVariant> = {
  aktivni: 'green', ukoncena: 'muted', pozastavena: 'yellow', pripravovana: 'blue',
};
const STATUS_LABEL: Record<string, string> = {
  aktivni: 'Aktivni', ukoncena: 'Ukoncena', pozastavena: 'Pozastavena', pripravovana: 'Pripravovana',
};

export default function LeaseDetailModal({ lease, onClose, onUpdated }: Props) {
  const { terminate } = useContractsStore();
  const [tab, setTab] = useState<'detail' | 'finance' | 'historie'>('detail');
  const [showEdit, setShowEdit] = useState(false);
  const [showTerminate, setShowTerminate] = useState(false);
  const [terminateDate, setTerminateDate] = useState(new Date().toISOString().slice(0, 10));

  const properties = loadFromStorage<R[]>('estateos_properties', []);
  const units = loadFromStorage<R[]>('estateos_units', []);
  const transactions = loadFromStorage<R[]>('estateos_fin_transactions', []);

  const prop = properties.find(p => String(p.id) === String(lease.propId));
  const unit = units.find(u => String(u.id) === String(lease.jednotkaId));

  const propName = String(prop?.nazev || prop?.name || '');
  const unitCislo = unit ? String(unit.cislo || unit.id) : null;

  const daysLeft = daysToExpiry(lease.datumDo);
  const expiring = isExpiringSoon(lease);

  // Duration progress
  const progressPct = lease.datumOd && lease.datumDo
    ? Math.min(100, Math.max(0, Math.round(
        (Date.now() - new Date(lease.datumOd).getTime()) /
        (new Date(lease.datumDo).getTime() - new Date(lease.datumOd).getTime()) * 100
      )))
    : null;

  // Related transactions (fuzzy match by name)
  const firstName = lease.najemnik.split(' ')[0]?.toLowerCase() || '___';
  const myTx = transactions.filter(t =>
    String(t.popis || '').toLowerCase().includes(firstName)
  ).sort((a, b) => String(b.datum || '').localeCompare(String(a.datum || '')));
  const totalPaid = myTx.filter(t => Number(t.castka) > 0).reduce((s, t) => s + Number(t.castka), 0);

  const handleTerminate = () => {
    terminate(lease.id, terminateDate);
    setShowTerminate(false);
    onUpdated();
  };

  const initials = lease.najemnik.split(' ').map(w => w[0] || '').slice(0, 2).join('').toUpperCase();

  const tabs = ['detail', 'finance', 'historie'] as const;
  const tabLabels = { detail: 'Detail', finance: 'Finance', historie: 'Historie' };

  return (
    <>
      <Modal open onClose={onClose} wide
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, flexShrink: 0 }}>
              {initials}
            </div>
            <div>
              <div>{lease.najemnik}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                {lease.cisloSmlouvy || lease.id} · {propName}{unitCislo ? ` · Jednotka ${unitCislo}` : ''}
              </div>
            </div>
          </div>
        }
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {lease.status === 'aktivni' && <Button onClick={() => setShowEdit(true)}>Upravit</Button>}
            <Button onClick={onClose}>Zavrit</Button>
          </div>
        }>

        {/* Status badges */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Badge variant={STATUS_COLOR[lease.status] || 'muted'}>{STATUS_LABEL[lease.status] || lease.status}</Badge>
          {expiring && daysLeft !== null && (
            <Badge variant="yellow">Konci za {daysLeft} dni</Badge>
          )}
        </div>

        {/* Duration progress */}
        {progressPct !== null && lease.status === 'aktivni' && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 3 }}>
              <span>{formatCzDate(lease.datumOd)}</span>
              <span style={{ fontWeight: 600 }}>{progressPct}%</span>
              <span>{lease.datumDo ? formatCzDate(lease.datumDo) : 'neurcito'}</span>
            </div>
            <div style={{ height: 5, background: 'var(--surface-2, var(--surface))', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progressPct}%`, background: expiring ? 'var(--accent-orange)' : 'var(--accent-green)', borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 16 }}>
          {tabs.map(t => (
            <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {tabLabels[t]}
            </button>
          ))}
        </div>

        {tab === 'detail' && (
          <div>
            {/* Location */}
            <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 8, padding: 14, marginBottom: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <InfoCell label="Nemovitost" value={propName} />
                {unitCislo && <InfoCell label="Jednotka" value={unitCislo} />}
                {unit && <InfoCell label="Plocha" value={unit.plocha ? `${unit.plocha} m2` : unit.podlahova_plocha ? `${unit.podlahova_plocha} m2` : undefined} />}
              </div>
            </div>

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
              <InfoCell label="Datum od" value={formatCzDate(lease.datumOd)} />
              <InfoCell label="Datum do" value={lease.datumDo ? formatCzDate(lease.datumDo) : 'Neurcito'} />
              {daysLeft !== null && lease.status === 'aktivni' && (
                <InfoCell label="Zbyvajicich dni" value={String(daysLeft)} />
              )}
            </div>

            {/* Financials */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <InfoCell label="Mesicni najem" value={formatKc(lease.mesicniNajem)} />
              <InfoCell label="Kauce" value={lease.kauce ? formatKc(lease.kauce) : '—'} />
            </div>

            {/* Note */}
            {lease.poznamka && (
              <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 8, padding: 12, marginBottom: 14 }}>
                <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 4 }}>POZNAMKA</div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{lease.poznamka}</div>
              </div>
            )}

            {/* Terminate */}
            {lease.status === 'aktivni' && !showTerminate && (
              <Button size="sm" onClick={() => setShowTerminate(true)} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                Ukoncit smlouvu
              </Button>
            )}

            {showTerminate && (
              <div style={{ border: '1px solid var(--danger)', borderRadius: 8, padding: 14, background: 'var(--surface-2, var(--surface))' }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--danger)' }}>Ukonceni smlouvy</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Datum ukonceni</label>
                    <input type="date" value={terminateDate} onChange={e => setTerminateDate(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 5, background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }} />
                  </div>
                  <Button variant="primary" size="sm" onClick={handleTerminate}>Potvrdit</Button>
                  <Button size="sm" onClick={() => setShowTerminate(false)}>Zrusit</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'finance' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <KpiMini label="Mesicni najem" value={formatKc(lease.mesicniNajem)} />
              <KpiMini label="Kauce" value={lease.kauce ? formatKc(lease.kauce) : '—'} />
              <KpiMini label="Zaplaceno celkem" value={totalPaid > 0 ? formatKc(totalPaid) : '—'} />
            </div>

            {myTx.length === 0 ? (
              <div className="text-muted" style={{ textAlign: 'center', padding: 32 }}>Zadne platebni zaznamy</div>
            ) : (
              <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>DATUM</th>
                    <th style={{ textAlign: 'left', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>POPIS</th>
                    <th style={{ textAlign: 'right', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>CASTKA</th>
                  </tr>
                </thead>
                <tbody>
                  {myTx.slice(0, 10).map(t => (
                    <tr key={String(t.id)}>
                      <td style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }} className="text-muted text-sm">{formatCzDate(String(t.datum || ''))}</td>
                      <td style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>{String(t.popis || '—')}</td>
                      <td style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 600, color: Number(t.castka) > 0 ? 'var(--accent-green)' : 'var(--danger)' }}>
                        {formatKc(Math.abs(Number(t.castka)))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'historie' && (
          <div>
            <TimelineItem date={formatCzDate(lease.created_at)} title="Smlouva vytvorena" desc={`${lease.cisloSmlouvy || ''} · ${formatKc(lease.mesicniNajem)}/mes`} />
            <TimelineItem date={formatCzDate(lease.datumOd)} title="Platnost zahjena" desc={`Najemnik: ${lease.najemnik}`} />
            {lease.status === 'ukoncena' && lease.datumDo && (
              <TimelineItem date={formatCzDate(lease.datumDo)} title="Smlouva ukoncena" desc="" />
            )}
            {lease.status === 'aktivni' && lease.datumDo && (
              <TimelineItem date={formatCzDate(lease.datumDo)} title="Planovane ukonceni" desc={daysLeft != null ? `Za ${daysLeft} dni` : ''} muted />
            )}
            {lease.updated_at !== lease.created_at && (
              <TimelineItem date={formatCzDate(lease.updated_at)} title="Smlouva upravena" desc="" />
            )}
          </div>
        )}
      </Modal>

      {showEdit && (
        <LeaseForm lease={lease} onClose={() => { setShowEdit(false); onUpdated(); }} />
      )}
    </>
  );
}

function InfoCell({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 500 }}>{value || '—'}</div>
    </div>
  );
}

function KpiMini({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
      <div className="text-muted" style={{ fontSize: '0.72rem', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function TimelineItem({ date, title, desc, muted }: { date: string; title: string; desc: string; muted?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 16, opacity: muted ? 0.5 : 1 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: muted ? 'var(--text-muted)' : 'var(--accent-green)', marginTop: 6, flexShrink: 0 }} />
      <div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{title}</span>
          <span className="text-muted text-sm">{date}</span>
        </div>
        {desc && <div className="text-muted" style={{ fontSize: '0.82rem', marginTop: 2 }}>{desc}</div>}
      </div>
    </div>
  );
}
