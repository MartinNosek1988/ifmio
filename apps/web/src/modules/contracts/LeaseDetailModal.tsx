import { useState } from 'react';
import { Modal, Badge, Button } from '../../shared/components';
import type { BadgeVariant } from '../../shared/components';
import { useTerminateContract } from './api/contracts.queries';
import type { ApiLeaseAgreement } from './api/contracts.api';
import { formatCzDate, formatKc } from '../../shared/utils/format';
import LeaseForm from './LeaseForm';

interface Props {
  lease: ApiLeaseAgreement;
  onClose: () => void;
  onUpdated: () => void;
}

const STATUS_COLOR: Record<string, BadgeVariant> = {
  aktivni: 'green', ukoncena: 'muted', pozastavena: 'yellow', pripravovana: 'blue',
};
const STATUS_LABEL: Record<string, string> = {
  aktivni: 'Aktivní', ukoncena: 'Ukončená', pozastavena: 'Pozastavená', pripravovana: 'Připravovaná',
};

const TYPE_LABEL: Record<string, string> = {
  najem: 'Najem', podnajem: 'Podnajem', sluzebni: 'Sluzebni byt', jiny: 'Jiny',
};

const RENEWAL_LABEL: Record<string, string> = {
  pisemna: 'Pisemna dohoda', automaticka: 'Automaticke', nevztahuje: 'Nevztahuje se',
};

function daysToExpiry(endDate: string | null): number | null {
  if (!endDate) return null;
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function isExpiringSoon(c: ApiLeaseAgreement): boolean {
  const days = daysToExpiry(c.endDate);
  return days !== null && days >= 0 && days <= 30 && c.status === 'aktivni';
}

export default function LeaseDetailModal({ lease, onClose, onUpdated }: Props) {
  const terminateMutation = useTerminateContract();
  const [tab, setTab] = useState<'detail' | 'historie'>('detail');
  const [showEdit, setShowEdit] = useState(false);
  const [showTerminate, setShowTerminate] = useState(false);
  const [terminateDate, setTerminateDate] = useState(new Date().toISOString().slice(0, 10));
  const [terminateNote, setTerminateNote] = useState('');

  const residentName = lease.resident
    ? `${lease.resident.firstName} ${lease.resident.lastName}`
    : '—';
  const propName = lease.property?.name || '—';
  const unitName = lease.unit?.name || null;

  const daysLeft = daysToExpiry(lease.endDate);
  const expiring = isExpiringSoon(lease);

  // Duration progress
  const progressPct = lease.startDate && lease.endDate
    ? Math.min(100, Math.max(0, Math.round(
        (Date.now() - new Date(lease.startDate).getTime()) /
        (new Date(lease.endDate).getTime() - new Date(lease.startDate).getTime()) * 100
      )))
    : null;

  const handleTerminate = () => {
    terminateMutation.mutate(
      { id: lease.id, dto: { terminatedAt: terminateDate, terminationNote: terminateNote || undefined } },
      { onSuccess: () => { setShowTerminate(false); onUpdated(); } },
    );
  };

  const initials = residentName.split(' ').map((w) => w[0] || '').slice(0, 2).join('').toUpperCase();

  const tabs = ['detail', 'historie'] as const;
  const tabLabels = { detail: 'Detail', historie: 'Historie' };

  return (
    <>
      <Modal open onClose={onClose} wide
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, flexShrink: 0 }}>
              {initials}
            </div>
            <div>
              <div>{residentName}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                {lease.contractNumber || lease.id.slice(0, 8)} · {propName}{unitName ? ` · ${unitName}` : ''}
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
          <Badge variant="blue">{TYPE_LABEL[lease.contractType] || lease.contractType}</Badge>
          {expiring && daysLeft !== null && (
            <Badge variant="yellow">Konci za {daysLeft} dni</Badge>
          )}
          {lease.indefinite && <Badge variant="muted">Na dobu neurcitou</Badge>}
        </div>

        {/* Duration progress */}
        {progressPct !== null && lease.status === 'aktivni' && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 3 }}>
              <span>{formatCzDate(lease.startDate)}</span>
              <span style={{ fontWeight: 600 }}>{progressPct}%</span>
              <span>{lease.endDate ? formatCzDate(lease.endDate) : 'neurcito'}</span>
            </div>
            <div style={{ height: 5, background: 'var(--surface-2, var(--surface))', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progressPct}%`, background: expiring ? 'var(--accent-orange)' : 'var(--accent-green)', borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 16 }}>
          {tabs.map((t) => (
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
                {unitName && <InfoCell label="Jednotka" value={unitName} />}
                {lease.unit?.area && <InfoCell label="Plocha" value={`${lease.unit.area} m2`} />}
              </div>
            </div>

            {/* Resident info */}
            {lease.resident && (
              <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 8, padding: 14, marginBottom: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <InfoCell label="Najemnik" value={residentName} />
                  <InfoCell label="Email" value={lease.resident.email || undefined} />
                  <InfoCell label="Telefon" value={lease.resident.phone || undefined} />
                </div>
              </div>
            )}

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
              <InfoCell label="Datum od" value={formatCzDate(lease.startDate)} />
              <InfoCell label="Datum do" value={lease.endDate ? formatCzDate(lease.endDate) : 'Neurcito'} />
              {daysLeft !== null && lease.status === 'aktivni' && (
                <InfoCell label="Zbyvajicich dni" value={String(daysLeft)} />
              )}
            </div>

            {/* Financials */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
              <InfoCell label="Mesicni najem" value={formatKc(lease.monthlyRent)} />
              <InfoCell label="Kauce" value={lease.deposit ? formatKc(lease.deposit) : '—'} />
              <InfoCell label="Kauce uhrazena" value={lease.depositPaid ? formatKc(lease.depositPaid) : '—'} />
            </div>

            {/* Contract details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <InfoCell label="Výpovědní lhůta" value={`${lease.noticePeriod} měsíců`} />
              <InfoCell label="Prodloužení" value={RENEWAL_LABEL[lease.renewalType] || lease.renewalType} />
            </div>

            {/* Note */}
            {lease.note && (
              <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 8, padding: 12, marginBottom: 14 }}>
                <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 4 }}>POZNAMKA</div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{lease.note}</div>
              </div>
            )}

            {/* Termination info */}
            {lease.terminatedAt && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: 12, marginBottom: 14 }}>
                <div style={{ fontWeight: 600, color: 'var(--danger)', marginBottom: 4 }}>Ukončená</div>
                <div style={{ fontSize: '0.875rem' }}>Datum: {formatCzDate(lease.terminatedAt)}</div>
                {lease.terminationNote && <div style={{ fontSize: '0.875rem', marginTop: 4 }}>{lease.terminationNote}</div>}
              </div>
            )}

            {/* Terminate */}
            {lease.status === 'aktivni' && !showTerminate && (
              <Button size="sm" onClick={() => setShowTerminate(true)} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                Ukončit smlouvu
              </Button>
            )}

            {showTerminate && (
              <div style={{ border: '1px solid var(--danger)', borderRadius: 8, padding: 14, background: 'var(--surface-2, var(--surface))' }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--danger)' }}>Ukončení smlouvy</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Datum ukonceni</label>
                    <input type="date" value={terminateDate} onChange={(e) => setTerminateDate(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 5, background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label className="form-label">Duvod ukonceni</label>
                  <input value={terminateNote} onChange={(e) => setTerminateNote(e.target.value)}
                    placeholder="Nepovinne"
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 5, background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="primary" size="sm" onClick={handleTerminate}>Potvrdit</Button>
                  <Button size="sm" onClick={() => setShowTerminate(false)}>Zrusit</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'historie' && (
          <div>
            <TimelineItem date={formatCzDate(lease.createdAt)} title="Smlouva vytvořena" desc={`${lease.contractNumber || ''} · ${formatKc(lease.monthlyRent)}/měs`} />
            <TimelineItem date={formatCzDate(lease.startDate)} title="Platnost zahjena" desc={`Najemnik: ${residentName}`} />
            {lease.status === 'ukoncena' && lease.terminatedAt && (
              <TimelineItem date={formatCzDate(lease.terminatedAt)} title="Smlouva ukoncena" desc={lease.terminationNote || ''} />
            )}
            {lease.status === 'aktivni' && lease.endDate && (
              <TimelineItem date={formatCzDate(lease.endDate)} title="Planovane ukonceni" desc={daysLeft != null ? `Za ${daysLeft} dni` : ''} muted />
            )}
            {lease.updatedAt !== lease.createdAt && (
              <TimelineItem date={formatCzDate(lease.updatedAt)} title="Smlouva upravena" desc="" />
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
