import { useState } from 'react';
import { Modal, Badge, Button } from '../../shared/components';
import type { ApiResident } from './api/residents.api';
import ResidentForm from './ResidentForm';

interface Props {
  resident: ApiResident;
  onClose: () => void;
  onUpdated: () => void;
  onDelete?: () => void;
}

type DetailTab = 'prehled' | 'komunikace';

const TABS: { key: DetailTab; label: string }[] = [
  { key: 'prehled', label: 'Přehled' },
  { key: 'komunikace', label: 'Komunikace' },
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

  const fullName = `${resident.firstName} ${resident.lastName}`;
  const initials = [resident.firstName, resident.lastName]
    .map(w => w?.[0] ?? '')
    .join('')
    .toUpperCase();

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
            {resident.hasDebt && <Badge variant="red">Dluh</Badge>}
          </div>

          {/* Tabs */}
          <div className="tabs">
            {TABS.map(t => (
              <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`}
                onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* TAB: PŘEHLED */}
        {tab === 'prehled' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <InfoField label="Jméno" value={fullName} />
              <InfoField label="Email" value={resident.email} href={resident.email ? `mailto:${resident.email}` : undefined} />
              <InfoField label="Telefon" value={resident.phone} />
              <InfoField label="Role" value={ROLE_LABELS[resident.role] || resident.role} />
            </div>

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
