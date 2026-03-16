import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Badge, Button } from '../../shared/components';
import type { ApiResident } from './api/residents.api';
import { useResidentInvoices } from './api/residents.queries';
import ResidentForm from './ResidentForm';
import { formatKc, formatCzDate } from '../../shared/utils/format';

interface Props {
  resident: ApiResident;
  onClose: () => void;
  onUpdated: () => void;
  onDelete?: () => void;
}

type DetailTab = 'prehled' | 'komunikace' | 'faktury';

const TABS: { key: DetailTab; label: string }[] = [
  { key: 'prehled', label: 'Přehled' },
  { key: 'komunikace', label: 'Komunikace' },
  { key: 'faktury', label: 'Faktury' },
];

const ROLE_LABELS: Record<string, string> = {
  owner: 'Vlastník',
  tenant: 'Nájemce',
  member: 'Člen',
  contact: 'Kontakt',
};

export default function ResidentDetailModal({ resident, onClose, onUpdated, onDelete }: Props) {
  const [tab, setTab] = useState<DetailTab>('prehled');
  const [showEdit, setShowEdit] = useState(false);
  const navigate = useNavigate();
  const { data: invoices = [] } = useResidentInvoices(resident.id);

  const isLegal = resident.isLegalEntity;
  const displayName = isLegal && resident.companyName ? resident.companyName : `${resident.firstName} ${resident.lastName}`;
  const fullName = displayName;
  const initials = isLegal && resident.companyName
    ? resident.companyName.slice(0, 2).toUpperCase()
    : [resident.firstName, resident.lastName].map(w => w?.[0] ?? '').join('').toUpperCase();

  return (
    <>
      <Modal open onClose={onClose} wide
        title=""
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              {onDelete && (
                <Button variant="danger" onClick={onDelete}>Smazat</Button>
              )}
            </div>
            <Button onClick={onClose}>Zavřít</Button>
          </div>
        }
      >
        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: '1.2rem', flexShrink: 0,
              }}>
                {initials}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{fullName}</h2>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 2 }}>
                  {resident.property?.name ?? '—'}
                  {resident.unit ? ` · Jednotka ${resident.unit.name}` : ''}
                </div>
              </div>
            </div>
            <Button size="sm" onClick={() => setShowEdit(true)}>Upravit</Button>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <Badge variant={resident.isActive ? 'green' : 'red'}>
              {resident.isActive ? 'Aktivní' : 'Neaktivní'}
            </Badge>
            <Badge variant="blue">{ROLE_LABELS[resident.role] || resident.role}</Badge>
            {isLegal && <Badge variant="purple">PO</Badge>}
            {resident.hasDebt && <Badge variant="red">Dluh</Badge>}
          </div>

          {/* Tabs */}
          <div className="tabs">
            {TABS.map(t => (
              <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`}
                onClick={() => setTab(t.key)}>
                {t.label}
                {t.key === 'faktury' && invoices.length > 0 && (
                  <span style={{ marginLeft: 4, fontSize: '0.72rem', background: 'var(--primary)', color: '#fff', borderRadius: 10, padding: '1px 6px' }}>
                    {invoices.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* TAB: PŘEHLED */}
        {tab === 'prehled' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {isLegal && resident.companyName && <InfoField label="Firma" value={resident.companyName} />}
              {isLegal && resident.ico && <InfoField label="IČ / DIČ" value={`${resident.ico}${resident.dic ? ` / ${resident.dic}` : ''}`} />}
              <InfoField label={isLegal ? 'Kontaktní osoba' : 'Jméno'} value={`${resident.firstName} ${resident.lastName}`} />
              <InfoField label="Email" value={resident.email} href={resident.email ? `mailto:${resident.email}` : undefined} />
              <InfoField label="Telefon" value={resident.phone} />
              <InfoField label="Role" value={ROLE_LABELS[resident.role] || resident.role} />
              {resident.birthDate && <InfoField label="Datum narození" value={new Date(resident.birthDate).toLocaleDateString('cs-CZ')} />}
              {resident.dataBoxId && <InfoField label="Datová schránka" value={resident.dataBoxId} />}
            </div>

            {/* Korespondenční adresa */}
            {resident.correspondenceAddress && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 600, marginBottom: 6, fontSize: '0.85rem' }}>Korespondenční adresa</div>
                <div>{resident.correspondenceAddress}</div>
                {(resident.correspondenceCity || resident.correspondencePostalCode) && (
                  <div>{[resident.correspondenceCity, resident.correspondencePostalCode].filter(Boolean).join(', ')}</div>
                )}
              </div>
            )}

            {/* Poznámka */}
            {resident.note && (
              <div style={{ background: 'var(--surface-2, rgba(0,0,0,0.05))', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 600, marginBottom: 4, fontSize: '0.82rem', color: 'var(--text-muted)' }}>Poznámka</div>
                <div>{resident.note}</div>
              </div>
            )}

            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 10, fontSize: '0.9rem' }}>Bydliště</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.875rem' }}>
                <div>
                  <div className="text-muted text-sm">Nemovitost</div>
                  <div style={{ fontWeight: 500 }}>{resident.property?.name ?? '—'}</div>
                </div>
                {resident.unit && (
                  <div>
                    <div className="text-muted text-sm">Jednotka</div>
                    <div style={{ fontWeight: 500 }}>{resident.unit.name}</div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <div>Vytvořeno: {new Date(resident.createdAt).toLocaleDateString('cs-CZ')}</div>
              <div>Aktualizováno: {new Date(resident.updatedAt).toLocaleDateString('cs-CZ')}</div>
            </div>
          </div>
        )}

        {/* TAB: KOMUNIKACE */}
        {tab === 'komunikace' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {resident.email && (
                <a href={`mailto:${resident.email}`} style={{ textDecoration: 'none' }}>
                  <Button>Poslat email</Button>
                </a>
              )}
              {resident.phone && (
                <a href={`tel:${resident.phone}`} style={{ textDecoration: 'none' }}>
                  <Button>Zavolat</Button>
                </a>
              )}
            </div>
            <EmptyTab text="Žádná komunikace" sub="Historie komunikace bude zobrazena zde" />
          </div>
        )}

        {/* TAB: FAKTURY */}
        {tab === 'faktury' && (
          <div>
            {invoices.length === 0 ? (
              <EmptyTab text="Žádné faktury" sub="Faktury tohoto kontaktu budou zobrazeny zde" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {invoices.map((inv: any) => {
                  const overdue = !inv.isPaid && inv.dueDate && inv.dueDate < new Date().toISOString().slice(0, 10);
                  return (
                    <div key={inv.id}
                      onClick={() => {
                        onClose();
                        navigate('/finance?tab=doklady');
                      }}
                      style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr auto auto',
                        gap: 12, padding: '10px 12px', borderBottom: '1px solid var(--border)',
                        cursor: 'pointer', borderRadius: 4, alignItems: 'center',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2, rgba(255,255,255,0.05))')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', fontFamily: 'monospace' }}>{inv.number}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {inv.type === 'received' ? 'Přijatá' : inv.type === 'issued' ? 'Vydaná' : inv.type === 'proforma' ? 'Záloha' : 'Dobropis'}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {formatCzDate(inv.issueDate)}
                        {inv.dueDate && <span> · Spl. {formatCzDate(inv.dueDate)}</span>}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', textAlign: 'right' }}>
                        {formatKc(inv.amountTotal)}
                      </div>
                      <Badge variant={inv.isPaid ? 'green' : overdue ? 'red' : 'yellow'}>
                        {inv.isPaid ? 'Uhrazeno' : overdue ? 'Po splatnosti' : 'Čeká'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>

      {showEdit && (
        <ResidentForm
          resident={resident}
          onClose={() => { setShowEdit(false); onUpdated(); }}
        />
      )}
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function InfoField({ label, value, href }: { label: string; value?: string; href?: string }) {
  return (
    <div>
      <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      {href && value
        ? <a href={href} style={{ color: 'var(--primary)', fontSize: '0.9rem', textDecoration: 'none' }}>{value}</a>
        : <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{value || '—'}</div>
      }
    </div>
  );
}

function EmptyTab({ text, sub }: { text: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{text}</div>
      {sub && <div style={{ fontSize: '0.85rem' }}>{sub}</div>}
    </div>
  );
}
